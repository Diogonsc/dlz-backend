import type { OrdersRepositoryPort } from './orders.repository.port';

export type OrderOutboxEnqueueInput = {
  type: string;
  tenantId: string | null;
  payload: unknown;
};

export type OrderOutboxContext = {
  orders: OrdersRepositoryPort;
  enqueueOutbox: (row: OrderOutboxEnqueueInput) => Promise<void>;
};

export abstract class OrderTransactionRunnerPort {
  abstract run<T>(fn: (orders: OrdersRepositoryPort) => Promise<T>): Promise<T>;

  /** Mesma transação Prisma que `orders` + gravação atómica na tabela `outbox_events`. */
  abstract runWithOutbox<T>(fn: (ctx: OrderOutboxContext) => Promise<T>): Promise<T>;
}
