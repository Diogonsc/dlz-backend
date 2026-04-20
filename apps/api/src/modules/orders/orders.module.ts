import { Module } from '@nestjs/common';
import { OrdersController } from './presentation/controllers/orders.controller';
import { OrdersRepositoryPort } from './domain/ports/orders.repository.port';
import { OrderEventPublisherPort } from './domain/ports/order-event.publisher.port';
import { PrismaOrdersRepository } from './infrastructure/persistence/prisma-orders.repository';
import { NestOrderEventPublisher } from './infrastructure/events/nest-order-event.publisher';
import { CreateOrderUseCase } from './application/use-cases/create-order.use-case';
import { TrackOrderUseCase } from './application/use-cases/track-order.use-case';
import { ListOrdersUseCase } from './application/use-cases/list-orders.use-case';
import { GetOrderByIdUseCase } from './application/use-cases/get-order-by-id.use-case';
import { UpdateOrderStatusUseCase } from './application/use-cases/update-order-status.use-case';
import { GetOrCreateOpenTabUseCase } from './application/use-cases/get-or-create-open-tab.use-case';
import { OrderTransactionRunnerPort } from './domain/ports/order-transaction-runner.port';
import { PrismaOrderTransactionRunner } from './infrastructure/persistence/prisma-order-transaction.runner';

@Module({
  controllers: [OrdersController],
  providers: [
    { provide: OrdersRepositoryPort, useClass: PrismaOrdersRepository },
    { provide: OrderEventPublisherPort, useClass: NestOrderEventPublisher },
    { provide: OrderTransactionRunnerPort, useClass: PrismaOrderTransactionRunner },
    CreateOrderUseCase,
    TrackOrderUseCase,
    ListOrdersUseCase,
    GetOrderByIdUseCase,
    UpdateOrderStatusUseCase,
    GetOrCreateOpenTabUseCase,
  ],
  exports: [
    OrdersRepositoryPort,
    CreateOrderUseCase,
    TrackOrderUseCase,
    ListOrdersUseCase,
    GetOrderByIdUseCase,
    UpdateOrderStatusUseCase,
    GetOrCreateOpenTabUseCase,
  ],
})
export class OrdersModule {}
