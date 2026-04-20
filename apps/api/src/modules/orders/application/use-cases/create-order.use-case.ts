import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { generateOrderCode, normalizePhone } from '@dlz/shared';
import { OrdersRepositoryPort } from '../../domain/ports/orders.repository.port';
import { OrderTransactionRunnerPort } from '../../domain/ports/order-transaction-runner.port';
import { calculateSubtotalFromLines } from '../../domain/policies/order-line-totals.policy';
import type { OrderLineInput } from '../../domain/policies/order-line-totals.policy';
import { OrderEntity } from '../../domain/entities/order.entity';
import type { CreateOrderCommand } from '../commands/create-order.command';
import { toOrderRealtimePayload } from '../mappers/order-realtime-payload.mapper';
import { getObservabilityContext } from '../../../../common/observability/request-context.storage';

@Injectable()
export class CreateOrderUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepositoryPort,
    private readonly orderTx: OrderTransactionRunnerPort,
  ) {}

  async execute(dto: CreateOrderCommand): Promise<{ orderCode: string; id: string; total: unknown }> {
    const store = await this.ordersRepository.getStoreForOrder(dto.tenantId);
    if (!store) throw new NotFoundException('Loja não encontrada');
    if (!store.isOpen) throw new BadRequestException('A loja está fechada no momento');

    const lines: OrderLineInput[] = dto.items.map((i) => ({
      price: i.price,
      quantity: i.quantity,
      extras: i.extras as OrderLineInput['extras'],
      variations: i.variations as OrderLineInput['variations'],
    }));
    const subtotal = calculateSubtotalFromLines(lines);

    if (subtotal < store.minOrder) {
      throw new BadRequestException(`Pedido mínimo é R$ ${store.minOrder}`);
    }

    let discountAmount = 0;
    let couponIdToConsume: string | undefined;
    if (dto.couponCode) {
      const coupon = await this.ordersRepository.getCouponForTenant(dto.tenantId, dto.couponCode);
      if (coupon) {
        if (coupon.expiresAt && coupon.expiresAt < new Date()) {
          throw new BadRequestException('Cupom expirado');
        }
        if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
          throw new BadRequestException('Cupom esgotado');
        }
        if (Number(coupon.minOrderValue ?? 0) > subtotal) {
          throw new BadRequestException(`Pedido mínimo para este cupom é R$ ${coupon.minOrderValue}`);
        }
        discountAmount =
          coupon.discountType === 'percentage'
            ? (subtotal * Number(coupon.discountValue)) / 100
            : Number(coupon.discountValue);
        couponIdToConsume = coupon.id;
      }
    }

    let tableId: string | undefined;
    let tabId: string | undefined;
    if (dto.tableToken) {
      const table = await this.ordersRepository.findTableByQrToken(dto.tableToken);
      if (table && table.tenantId === dto.tenantId) {
        tableId = table.id;
        let tab = await this.ordersRepository.findOpenTabForTable(table.id);
        if (!tab) {
          tab = await this.ordersRepository.createTab(dto.tenantId, table.id);
        }
        tabId = tab.id;
      }
    }

    const deliveryFee = store.deliveryFee;
    const total = OrderEntity.calculateTotal(subtotal, discountAmount, deliveryFee);

    let orderCode: string;
    let attempts = 0;
    do {
      orderCode = generateOrderCode();
      attempts++;
      if (attempts > 10) throw new BadRequestException('Erro ao gerar código do pedido');
    } while (await this.ordersRepository.orderCodeExists(orderCode));

    const input = {
      tenantId: dto.tenantId,
      orderCode,
      customerName: dto.customerName,
      customerPhone: normalizePhone(dto.customerPhone),
      address: dto.address,
      payment: dto.payment,
      changeFor: dto.changeFor,
      items: dto.items as unknown,
      subtotal,
      deliveryFee,
      total,
      couponCode: dto.couponCode,
      discountAmount,
      tableId,
      tabId,
      orderSource: dto.orderSource ?? 'website',
      notes: dto.notes,
    };

    const order = await this.orderTx.runWithOutbox(async ({ orders, enqueueOutbox }) => {
      if (couponIdToConsume) {
        await orders.incrementCouponUses(couponIdToConsume);
      }
      const created = await orders.createOrder(input);
      const payload = toOrderRealtimePayload(created as Record<string, unknown>);
      await enqueueOutbox({
        type: 'order.created',
        tenantId: dto.tenantId,
        payload: {
          order: payload,
          tenantId: dto.tenantId,
          correlationId: getObservabilityContext()?.correlationId ?? null,
        },
      });
      return created;
    });

    const row = order as { id: string; orderCode: string; total: unknown };

    this.ordersRepository
      .upsertCustomerProfileAfterOrder(dto.tenantId, dto.customerName, dto.customerPhone, Number(row.total))
      .catch(() => {});

    return { orderCode: row.orderCode, id: row.id, total: row.total };
  }
}
