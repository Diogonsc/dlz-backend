import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@dlz/prisma';
import {
  PaymentsRepositoryPort,
  type OrderForMpWebhook,
} from '../../domain/ports/payments.repository.port';

@Injectable()
export class PrismaOrderPaymentsRepository extends PaymentsRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findOrderByIdForGateway(orderId: string): Promise<OrderForMpWebhook | null> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, tenantId: true },
    });
    return order;
  }

  async updateOrderMercadoPagoStatus(
    orderId: string,
    tenantId: string,
    input: {
      onlinePaymentStatus: 'pending' | 'approved' | 'rejected' | 'refunded';
      mpPaymentId: string;
      mpPaymentStatusDetail: string | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const db = tx ?? this.prisma;
    const res = await db.order.updateMany({
      where: { id: orderId, tenantId },
      data: {
        onlinePaymentStatus: input.onlinePaymentStatus,
        mpPaymentId: input.mpPaymentId,
        mpPaymentStatusDetail: input.mpPaymentStatusDetail,
      },
    });
    return res.count;
  }
}
