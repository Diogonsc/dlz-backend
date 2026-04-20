import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BillingEventPublisherPort } from '../../domain/ports/billing-event.publisher.port';
import type { PaymentApprovedDomainEvent } from '../../domain/events/payment-approved.domain-event';
import type { PaymentFailedDomainEvent } from '../../domain/events/payment-failed.domain-event';
import type { SubscriptionUpdatedDomainEvent } from '../../domain/events/subscription-updated.domain-event';
import type { SubscriptionCanceledDomainEvent } from '../../domain/events/subscription-canceled.domain-event';
import {
  toPaymentApprovedRealtimeEnvelope,
  toPaymentFailedRealtimeEnvelope,
  toSubscriptionCanceledRealtimeEnvelope,
  toSubscriptionUpdatedRealtimeEnvelope,
  withBillingCorrelationId,
} from '../../application/mappers/billing-realtime-payload.mapper';
import { getObservabilityContext } from '../../../../common/observability/request-context.storage';
import { StructuredLoggerService } from '../../../../common/observability/structured-logger.service';
import { ReliabilityLoggerService } from '../../../../common/observability/reliability-logger.service';
import {
  PAYMENT_RELIABILITY_QUEUE,
  PAYMENT_RELIABILITY_RE_EMIT_JOB,
} from '../queues/payment-reliability.processor';

@Injectable()
export class NestBillingEventPublisher extends BillingEventPublisherPort {
  constructor(
    private readonly events: EventEmitter2,
    private readonly structured: StructuredLoggerService,
    private readonly reliability: ReliabilityLoggerService,
    @InjectQueue(PAYMENT_RELIABILITY_QUEUE) private readonly reliabilityQueue: Queue,
  ) {
    super();
  }

  private correlationId(): string | null {
    return getObservabilityContext()?.correlationId ?? null;
  }

  private safeEmit(eventName: string, envelope: unknown): void {
    try {
      this.events.emit(eventName, envelope);
    } catch {
      void this.reliabilityQueue.add(
        PAYMENT_RELIABILITY_RE_EMIT_JOB,
        { eventName, payload: envelope },
        {
          attempts: 5,
          backoff: { type: 'exponential', delay: 4000 },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      );
      this.reliability.log('retry_enqueued', { eventName });
    }
  }

  publishPaymentApproved(event: PaymentApprovedDomainEvent): void {
    const cid = this.correlationId();
    const envelope = withBillingCorrelationId(toPaymentApprovedRealtimeEnvelope(event), cid);
    this.safeEmit('payment.approved', envelope);
    this.structured.log({
      type: 'event',
      eventName: 'payment.approved',
      tenantId: event.tenantId,
      correlationId: cid,
    });
  }

  publishPaymentFailed(event: PaymentFailedDomainEvent): void {
    const cid = this.correlationId();
    const envelope = withBillingCorrelationId(toPaymentFailedRealtimeEnvelope(event), cid);
    this.safeEmit('payment.failed', envelope);
    this.structured.log({
      type: 'event',
      eventName: 'payment.failed',
      tenantId: event.tenantId,
      correlationId: cid,
    });
  }

  publishSubscriptionUpdated(event: SubscriptionUpdatedDomainEvent): void {
    const cid = this.correlationId();
    const envelope = toSubscriptionUpdatedRealtimeEnvelope(event);
    if (!envelope) {
      this.structured.warn({
        type: 'event',
        eventName: 'subscription.updated',
        skipped: true,
        reason: 'missing_tenant_id',
        tenantId: null,
        correlationId: cid,
        planSlug: event.planSlug,
      });
      return;
    }
    const withCid = withBillingCorrelationId(envelope, cid);
    this.safeEmit('subscription.updated', withCid);
    this.structured.log({
      type: 'event',
      eventName: 'subscription.updated',
      tenantId: envelope.data.tenantId,
      correlationId: cid,
    });
  }

  publishSubscriptionCanceled(event: SubscriptionCanceledDomainEvent): void {
    const cid = this.correlationId();
    const envelope = withBillingCorrelationId(toSubscriptionCanceledRealtimeEnvelope(event), cid);
    this.safeEmit('subscription.canceled', envelope);
    this.structured.log({
      type: 'event',
      eventName: 'subscription.canceled',
      tenantId: event.tenantId,
      correlationId: cid,
    });
  }
}
