import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@dlz/prisma';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import {
  WebhookIdempotencyPort,
  type WebhookSourceKind,
} from '../../domain/ports/webhook-idempotency.port';

/** Valores alinhados ao enum `WebhookSource` no schema Prisma. */
const PRISMA_WEBHOOK_SOURCE: Record<WebhookSourceKind, string> = {
  stripe: 'stripe',
  mercadopago: 'mercadopago',
  cakto: 'cakto',
};

@Injectable()
export class PrismaWebhookIdempotencyRepository extends WebhookIdempotencyPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async tryClaim(
    source: WebhookSourceKind,
    externalId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<boolean> {
    const db = tx ?? this.prisma;
    try {
      await db.processedWebhook.create({
        data: {
          source: PRISMA_WEBHOOK_SOURCE[source] as 'stripe' | 'mercadopago' | 'cakto',
          externalId: externalId.slice(0, 512),
        },
      });
      return true;
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
        return false;
      }
      throw e;
    }
  }

  async releaseClaim(
    source: WebhookSourceKind,
    externalId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const db = tx ?? this.prisma;
    await db.processedWebhook.deleteMany({
      where: {
        source: PRISMA_WEBHOOK_SOURCE[source] as 'stripe' | 'mercadopago' | 'cakto',
        externalId: externalId.slice(0, 512),
      },
    });
  }
}
