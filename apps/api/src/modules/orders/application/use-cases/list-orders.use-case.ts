import { Injectable } from '@nestjs/common';
import { OrdersRepositoryPort } from '../../domain/ports/orders.repository.port';
import { isOrderPanelStatus } from '../../domain/value-objects/order-status.vo';

@Injectable()
export class ListOrdersUseCase {
  constructor(private readonly ordersRepository: OrdersRepositoryPort) {}

  async execute(tenantId: string, status: string | undefined, page: number, limit: number) {
    const parsedStatus =
      status && isOrderPanelStatus(status) ? status : undefined;
    const { items, total } = await this.ordersRepository.listForTenant({
      tenantId,
      status: parsedStatus,
      page,
      limit,
    });
    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
