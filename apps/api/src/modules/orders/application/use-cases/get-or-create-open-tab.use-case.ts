import { Injectable } from '@nestjs/common';
import { OrdersRepositoryPort } from '../../domain/ports/orders.repository.port';

@Injectable()
export class GetOrCreateOpenTabUseCase {
  constructor(private readonly orders: OrdersRepositoryPort) {}

  async execute(tenantId: string, tableId: string): Promise<string> {
    return this.orders.getOrCreateOpenTabId(tenantId, tableId);
  }
}
