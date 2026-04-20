import { Injectable, NotFoundException } from '@nestjs/common';
import { OrdersRepositoryPort } from '../../domain/ports/orders.repository.port';

@Injectable()
export class GetOrderByIdUseCase {
  constructor(private readonly ordersRepository: OrdersRepositoryPort) {}

  async execute(id: string, tenantId: string) {
    const order = await this.ordersRepository.findByIdForTenant(id, tenantId);
    if (!order) throw new NotFoundException('Pedido não encontrado');
    return order;
  }
}
