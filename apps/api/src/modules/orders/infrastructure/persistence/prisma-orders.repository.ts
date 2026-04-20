import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dlz/prisma';
import { normalizePhone } from '@dlz/shared';
import type { Prisma } from '@prisma/client';
import {
  OrdersRepositoryPort,
  type StoreConfigForOrder,
  type CouponForOrder,
  type TableForOrder,
  type CreateOrderInput,
  type OrderTrackProjection,
} from '../../domain/ports/orders.repository.port';
import type { OrderPanelStatus } from '../../domain/value-objects/order-status.vo';

/** PrismaService (singleton) ou cliente transacional dentro de `$transaction`. */
type Db = PrismaService | Prisma.TransactionClient;

@Injectable()
export class PrismaOrdersRepository extends OrdersRepositoryPort {
  constructor(private readonly db: Db) {
    super();
  }

  async getStoreForOrder(tenantId: string): Promise<StoreConfigForOrder | null> {
    const store = await this.db.storeConfig.findUnique({
      where: { tenantId },
    });
    if (!store) return null;
    return {
      tenantId,
      isOpen: store.isOpen,
      minOrder: Number(store.minOrder),
      deliveryFee: Number(store.deliveryFee),
    };
  }

  async getCouponForTenant(tenantId: string, code: string): Promise<CouponForOrder | null> {
    const coupon = await this.db.coupon.findFirst({
      where: { tenantId, code, isActive: true },
    });
    if (!coupon) return null;
    return {
      id: coupon.id,
      tenantId: coupon.tenantId,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue),
      minOrderValue: coupon.minOrderValue != null ? Number(coupon.minOrderValue) : null,
      maxUses: coupon.maxUses,
      usedCount: coupon.usedCount,
      expiresAt: coupon.expiresAt,
      isActive: coupon.isActive,
    };
  }

  async incrementCouponUses(couponId: string): Promise<void> {
    await this.db.coupon.update({
      where: { id: couponId },
      data: { usedCount: { increment: 1 } },
    });
  }

  async findTableByQrToken(token: string): Promise<TableForOrder | null> {
    const table = await this.db.restaurantTable.findUnique({
      where: { qrCodeToken: token },
    });
    if (!table) return null;
    return { id: table.id, tenantId: table.tenantId };
  }

  async findOpenTabForTable(tableId: string): Promise<{ id: string } | null> {
    const tab = await this.db.tab.findFirst({
      where: { tableId, status: 'open' },
    });
    return tab ? { id: tab.id } : null;
  }

  async createTab(tenantId: string, tableId: string): Promise<{ id: string }> {
    const tab = await this.db.tab.create({
      data: { tenantId, tableId, status: 'open' },
    });
    return { id: tab.id };
  }

  async orderCodeExists(orderCode: string): Promise<boolean> {
    const row = await this.db.order.findUnique({
      where: { orderCode },
      select: { id: true },
    });
    return !!row;
  }

  async createOrder(input: CreateOrderInput): Promise<unknown> {
    return this.db.order.create({
      data: {
        tenantId: input.tenantId,
        orderCode: input.orderCode,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        address: input.address,
        payment: input.payment as 'pix' | 'card' | 'cash',
        changeFor: input.changeFor,
        items: input.items as object,
        subtotal: input.subtotal,
        deliveryFee: input.deliveryFee,
        total: input.total,
        couponCode: input.couponCode,
        discountAmount: input.discountAmount,
        tableId: input.tableId,
        tabId: input.tabId,
        orderSource: input.orderSource,
        notes: input.notes,
      },
    });
  }

  async upsertCustomerProfileAfterOrder(
    tenantId: string,
    name: string,
    phone: string,
    orderTotal: number,
  ): Promise<void> {
    const normalized = normalizePhone(phone);
    await this.db.customerProfile.upsert({
      where: { tenantId_phoneNormalized: { tenantId, phoneNormalized: normalized } },
      create: {
        tenantId,
        name,
        phone,
        phoneNormalized: normalized,
        totalOrders: 1,
        totalSpent: orderTotal,
        lastOrderAt: new Date(),
      },
      update: {
        totalOrders: { increment: 1 },
        totalSpent: { increment: orderTotal },
        lastOrderAt: new Date(),
        name,
      },
    });
  }

  async findTrackByCode(orderCode: string): Promise<OrderTrackProjection | null> {
    const order = await this.db.order.findUnique({
      where: { orderCode },
      select: {
        orderCode: true,
        status: true,
        customerName: true,
        items: true,
        total: true,
        subtotal: true,
        deliveryFee: true,
        discountAmount: true,
        payment: true,
        address: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return order as OrderTrackProjection | null;
  }

  async listForTenant(params: {
    tenantId: string;
    status?: OrderPanelStatus;
    page: number;
    limit: number;
  }): Promise<{ items: unknown[]; total: number }> {
    const { tenantId, status, page, limit } = params;
    const where = {
      tenantId,
      ...(status ? { status: status as OrderPanelStatus } : {}),
    };
    const [items, total] = await Promise.all([
      this.db.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.order.count({ where }),
    ]);
    return { items, total };
  }

  async findByIdForTenant(id: string, tenantId: string): Promise<unknown | null> {
    const order = await this.db.order.findUnique({
      where: { id },
      include: { payments: true },
    });
    if (!order || order.tenantId !== tenantId) return null;
    return order;
  }

  async updateStatusForTenant(
    id: string,
    tenantId: string,
    status: OrderPanelStatus,
  ): Promise<unknown> {
    return this.db.order.update({
      where: { id },
      data: { status },
    });
  }

  async getOrCreateOpenTabId(tenantId: string, tableId: string): Promise<string> {
    const table = await this.db.restaurantTable.findFirst({
      where: { id: tableId, tenantId },
    });
    if (!table) throw new NotFoundException('Mesa não encontrada');

    const existing = await this.db.tab.findFirst({
      where: { tenantId, tableId, status: 'open' },
    });
    if (existing) return existing.id;

    const tab = await this.db.tab.create({
      data: { tenantId, tableId, status: 'open' },
    });
    return tab.id;
  }
}
