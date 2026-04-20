import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@dlz/prisma';
import {
  OrderTransactionRunnerPort,
  type OrderOutboxContext,
} from '../../domain/ports/order-transaction-runner.port';
import { OrdersRepositoryPort } from '../../domain/ports/orders.repository.port';
import { PrismaOrdersRepository } from './prisma-orders.repository';

@Injectable()
export class PrismaOrderTransactionRunner extends OrderTransactionRunnerPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async run<T>(fn: (orders: OrdersRepositoryPort) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const orders = new PrismaOrdersRepository(tx);
      return fn(orders);
    });
  }

  async runWithOutbox<T>(fn: (ctx: OrderOutboxContext) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const orders = new PrismaOrdersRepository(tx);
      const enqueueOutbox: OrderOutboxContext['enqueueOutbox'] = async (row) => {
        await tx.outboxEvent.create({
          data: {
            type: row.type,
            tenantId: row.tenantId,
            payload: row.payload as object,
            status: 'pending',
            attempts: 0,
          },
        });
      };
      return fn({ orders, enqueueOutbox });
    });
  }
}
