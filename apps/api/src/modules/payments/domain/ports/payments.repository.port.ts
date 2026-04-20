import type { Prisma } from '@prisma/client';

export type OrderForMpWebhook = {
  id: string;
  tenantId: string;
};

export abstract class PaymentsRepositoryPort {
  abstract findOrderByIdForGateway(orderId: string): Promise<OrderForMpWebhook | null>;

  abstract updateOrderMercadoPagoStatus(
    orderId: string,
    tenantId: string,
    input: {
      onlinePaymentStatus: 'pending' | 'approved' | 'rejected' | 'refunded';
      mpPaymentId: string;
      mpPaymentStatusDetail: string | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<number>;
}
