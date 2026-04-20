import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { OrdersRepositoryPort } from '../../domain/ports/orders.repository.port';
import { OrderEventPublisherPort } from '../../domain/ports/order-event.publisher.port';
import { isOrderPanelStatus, type OrderPanelStatus } from '../../domain/value-objects/order-status.vo';
import type { UpdateOrderStatusCommand } from '../commands/update-order-status.command';
import { OrderEntity } from '../../domain/entities/order.entity';

@Injectable()
export class UpdateOrderStatusUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepositoryPort,
    private readonly orderEvents: OrderEventPublisherPort,
  ) {}

  async execute(id: string, tenantId: string, dto: UpdateOrderStatusCommand) {
    const existing = await this.ordersRepository.findByIdForTenant(id, tenantId);
    if (!existing) throw new NotFoundException('Pedido não encontrado');

    const row = existing as { id: string; tenantId: string; status: string };
    const entity = OrderEntity.fromPersistence(row);
    entity.assertTenant(tenantId);

    if (!isOrderPanelStatus(dto.status)) {
      throw new BadRequestException('Status inválido');
    }

    const updated = await this.ordersRepository.updateStatusForTenant(
      id,
      tenantId,
      dto.status as OrderPanelStatus,
    );
    this.orderEvents.publishOrderStatusChanged(updated, tenantId);
    return updated;
  }
}
