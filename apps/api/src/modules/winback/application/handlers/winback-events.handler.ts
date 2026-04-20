import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { OnEvent } from '@nestjs/event-emitter';
import { StructuredLoggerService } from '../../../../common/observability/structured-logger.service';
import { getObservabilityContext } from '../../../../common/observability/request-context.storage';

@Injectable()
export class WinbackEventsHandler {
  constructor(
    @InjectQueue('winback-notifications') private readonly winbackQueue: Queue,
    private readonly structured: StructuredLoggerService,
  ) {}

  @OnEvent('order.created')
  async onOrderCreated(payload: {
    tenantId?: string;
    correlationId?: string;
    order?: { customerPhone?: string; customerName?: string };
  }) {
    await this.enqueueFromEvent(
      'order_created',
      payload.tenantId,
      payload.order?.customerPhone,
      payload.order?.customerName,
      payload.correlationId,
    );
  }

  @OnEvent('order.status_changed')
  async onOrderStatusChanged(payload: {
    tenantId?: string;
    correlationId?: string;
    order?: { customerPhone?: string; customerName?: string };
  }) {
    await this.enqueueFromEvent(
      'order_status_changed',
      payload.tenantId,
      payload.order?.customerPhone,
      payload.order?.customerName,
      payload.correlationId,
    );
  }

  @OnEvent('payment.failed')
  async onPaymentFailed(payload: { data?: { tenantId?: string; orderId?: string } }) {
    // Evento de billing não traz telefone; apenas registra para futura expansão.
    this.structured.log({
      type: 'winback',
      action: 'scheduled',
      tenantId: payload?.data?.tenantId ?? null,
      userId: payload?.data?.orderId ?? null,
      reason: 'payment_failed_no_phone',
    });
  }

  private async enqueueFromEvent(
    campaign: string,
    tenantId?: string,
    phone?: string,
    customerName?: string,
    incomingCorrelationId?: string,
  ): Promise<void> {
    if (!tenantId || !phone) return;
    const correlationId = incomingCorrelationId ?? getObservabilityContext()?.correlationId ?? null;
    await this.winbackQueue.add(
      'send',
      {
        correlationId,
        tenantId,
        phone,
        triggerType: campaign,
        customerName: customerName ?? '',
        segment: campaign,
        campaign: `winback_${campaign}`,
      },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000, jitter: 0.3 },
        removeOnComplete: 200,
        removeOnFail: 400,
      },
    );
    this.structured.log({
      type: 'winback',
      action: 'scheduled',
      tenantId,
      userId: null,
      correlationId,
      campaign,
    });
  }
}
