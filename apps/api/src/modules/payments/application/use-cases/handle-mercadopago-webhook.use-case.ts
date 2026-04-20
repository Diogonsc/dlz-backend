import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@dlz/prisma';
import { PaymentGatewayPort } from '../../domain/ports/payment-gateway.port';
import { PaymentsRepositoryPort } from '../../domain/ports/payments.repository.port';
import { WebhookIdempotencyPort } from '../../domain/ports/webhook-idempotency.port';
import { TenantPaymentConfigRepositoryPort } from '../../domain/ports/tenant-payment-config.repository.port';
import { PaymentApprovedDomainEvent } from '../../domain/events/payment-approved.domain-event';
import { PaymentFailedDomainEvent } from '../../domain/events/payment-failed.domain-event';
import { ReliabilityLoggerService } from '../../../../common/observability/reliability-logger.service';
import { getObservabilityContext } from '../../../../common/observability/request-context.storage';
import { WebhookSecurityService } from '../services/webhook-security.service';
import {
  toPaymentApprovedRealtimeEnvelope,
  toPaymentFailedRealtimeEnvelope,
  withBillingCorrelationId,
} from '../mappers/billing-realtime-payload.mapper';

@Injectable()
export class HandleMercadoPagoWebhookUseCase {
  private readonly logger = new Logger(HandleMercadoPagoWebhookUseCase.name);

  constructor(
    private readonly paymentGateway: PaymentGatewayPort,
    private readonly payments: PaymentsRepositoryPort,
    private readonly tenantPaymentConfig: TenantPaymentConfigRepositoryPort,
    private readonly prisma: PrismaService,
    private readonly webhooks: WebhookIdempotencyPort,
    private readonly reliability: ReliabilityLoggerService,
    private readonly webhookSecurity: WebhookSecurityService,
  ) {}

  async execute(
    payload: { type?: string; topic?: string; data?: { id?: string | number } },
    hints?: { tenantId?: string; orderId?: string },
    security?: {
      rawBody: Buffer;
      signature?: string | null;
      timestamp?: string | null;
      nonce?: string | null;
    },
  ): Promise<{ received: boolean }> {
    if (!payload?.data?.id) return { received: true };
    const type = payload.type ?? payload.topic;
    if (type !== 'payment') return { received: true };
    if (!hints?.tenantId || !hints?.orderId) return { received: true };

    if (security) {
      const secret = await this.tenantPaymentConfig.getMercadoPagoWebhookSecret(hints.tenantId);
      await this.webhookSecurity.validate({
        provider: 'mercado_pago',
        tenantId: hints.tenantId,
        rawBody: security.rawBody,
        signature: security.signature,
        timestamp: security.timestamp,
        nonce: security.nonce,
        secret,
      });
    }

    const order = await this.payments.findOrderByIdForGateway(String(hints.orderId));
    if (!order) return { received: true };
    if (order.tenantId !== hints.tenantId) {
      return { received: true };
    }

    const payment = await this.paymentGateway.getPayment({
      tenantId: order.tenantId,
      gatewayPaymentId: payload.data.id,
    });
    if (!payment) return { received: true };
    const tenantFromMeta = payment.metadata?.tenantId;
    if (tenantFromMeta && tenantFromMeta !== order.tenantId) return { received: true };

    const rawStatus = payment.status;
    const externalId = `mp:${payment.gatewayPaymentId}:${rawStatus}`;

    const outcome = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const claimed = await this.webhooks.tryClaim('mercadopago', externalId, tx);
      if (!claimed) {
        return { kind: 'duplicate' as const };
      }

      const detail = payment.detail;

      await this.payments.updateOrderMercadoPagoStatus(
        order.id,
        order.tenantId,
        {
          onlinePaymentStatus: payment.status,
          mpPaymentId: payment.gatewayPaymentId,
          mpPaymentStatusDetail: detail || null,
        },
        tx,
      );

      const cid = getObservabilityContext()?.correlationId ?? null;

      if (payment.status === 'approved') {
        const ev = new PaymentApprovedDomainEvent(
          order.tenantId,
          order.id,
          'mercado_pago',
          payment.gatewayPaymentId,
          'approved',
          detail,
        );
        const envelope = withBillingCorrelationId(toPaymentApprovedRealtimeEnvelope(ev), cid);
        await tx.outboxEvent.create({
          data: {
            type: 'payment.approved',
            tenantId: order.tenantId,
            payload: envelope as object,
            status: 'pending',
            attempts: 0,
          },
        });
      } else if (payment.status === 'refunded' || payment.status === 'rejected') {
        const ev = new PaymentFailedDomainEvent(
          order.tenantId,
          order.id,
          'mercado_pago',
          payment.gatewayPaymentId,
          payment.status,
          detail,
        );
        const envelope = withBillingCorrelationId(toPaymentFailedRealtimeEnvelope(ev), cid);
        await tx.outboxEvent.create({
          data: {
            type: 'payment.failed',
            tenantId: order.tenantId,
            payload: envelope as object,
            status: 'pending',
            attempts: 0,
          },
        });
      }

      return { kind: 'ok' as const };
    });

    if (outcome.kind === 'duplicate') {
      this.reliability.log('duplicate_ignored', {
        source: 'mercadopago',
        externalId,
        tenantId: order.tenantId,
      });
      return { received: true };
    }

    this.reliability.log('webhook_processed', {
      source: 'mercadopago',
      externalId,
      tenantId: order.tenantId,
    });

    this.logger.log(`MercadoPago payment ${payment.gatewayPaymentId} → ${rawStatus} for order ${order.id}`);
    return { received: true };
  }
}
