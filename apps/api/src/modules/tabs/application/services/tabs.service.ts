import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dlz/prisma';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getObservabilityContext } from '../../../../common/observability/request-context.storage';
import { CloseTabDto } from '../../presentation/dtos/close-tab.dto';

@Injectable()
export class TabsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  async findAll(tenantId: string, status?: string) {
    const tabs = await this.prisma.tab.findMany({
      where: {
        tenantId,
        ...(status ? { status } : {}),
      },
      include: {
        table: { select: { number: true, name: true } },
        orders: {
          where: { status: { notIn: ['delivered', 'cancelled'] } },
          select: { id: true, total: true, status: true },
        },
      },
      orderBy: { openedAt: 'desc' },
    });

    return tabs.map((t: (typeof tabs)[number]) => ({
      id: t.id,
      store_id: t.tenantId,
      table_id: t.tableId,
      customer_name: t.customerName,
      status: t.status,
      subtotal: Number(t.subtotal),
      tip: Number(t.tip),
      total: Number(t.total),
      opened_at: t.openedAt,
      closed_at: t.closedAt,
      restaurant_tables: t.table ? { number: t.table.number } : null,
    }));
  }

  async findOne(id: string, tenantId: string) {
    const tab = await this.prisma.tab.findFirst({
      where: { id, tenantId },
      include: {
        table: { select: { number: true, name: true } },
        orders: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!tab) throw new NotFoundException('Comanda não encontrada');
    return tab;
  }

  async closeTab(id: string, tenantId: string, dto: CloseTabDto) {
    const tab = await this.prisma.tab.findFirst({ where: { id, tenantId } });
    if (!tab) throw new NotFoundException('Comanda não encontrada');
    if (tab.status === 'closed') throw new Error('Comanda já está fechada');

    const tip = dto.tip ?? 0;
    const subtotal = dto.ordersSubtotal;
    const total = subtotal + tip;

    const updated = await this.prisma.tab.update({
      where: { id },
      data: {
        status: 'closed',
        tip,
        subtotal,
        total,
        closedAt: new Date(),
      },
    });

    if (dto.tableId) {
      await this.prisma.order.updateMany({
        where: {
          tableId: dto.tableId,
          orderSource: 'table',
          status: { notIn: ['delivered', 'cancelled'] },
        },
        data: { status: 'delivered' },
      });
    }

    this.events.emit('tab.updated', {
      tab: updated,
      tenantId,
      correlationId: getObservabilityContext()?.correlationId ?? null,
    });

    return updated;
  }

  async createTab(tenantId: string, tableId: string, customerName?: string) {
    const existing = await this.prisma.tab.findFirst({
      where: { tenantId, tableId, status: 'open' },
    });
    if (existing) return existing;

    const tab = await this.prisma.tab.create({
      data: { tenantId, tableId, customerName: customerName ?? '', status: 'open' },
    });
    this.events.emit('tab.created', {
      tab,
      tenantId,
      correlationId: getObservabilityContext()?.correlationId ?? null,
    });
    return tab;
  }
}
