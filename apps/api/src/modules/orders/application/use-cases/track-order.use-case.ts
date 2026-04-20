import { Injectable, NotFoundException } from '@nestjs/common';
import { OrdersRepositoryPort } from '../../domain/ports/orders.repository.port';

@Injectable()
export class TrackOrderUseCase {
  constructor(private readonly ordersRepository: OrdersRepositoryPort) {}

  async execute(orderCode: string) {
    const order = await this.ordersRepository.findTrackByCode(orderCode);
    if (!order) throw new NotFoundException('Pedido não encontrado');
    return order;
  }
}
