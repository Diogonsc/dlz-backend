import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { StructuredLoggerService } from '../../observability/structured-logger.service';
import { getEventBusSettings } from '../event-bus.settings';
import { EventBusMetricsService } from './event-bus-metrics.service';

/**
 * Sinais operacionais (logs JSON) para backlog alto, pending preso e falhas repetidas
 * (esta última também é emitida na DLQ em {@link EventBusStreamDeliveryService}).
 */
@Injectable()
export class EventBusAlertsService {
  private readonly logger = new Logger(EventBusAlertsService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly metrics: EventBusMetricsService,
    private readonly structured: StructuredLoggerService,
  ) {}

  @Cron('0 * * * * *')
  async scan(): Promise<void> {
    const s = getEventBusSettings(this.config);
    if (s.mode !== 'redis') {
      return;
    }

    try {
      const snap = await this.metrics.snapshotForAlerts();

      if (snap.streamLen >= s.alertBacklogThreshold) {
        this.structured.warn({
          type: 'event_bus',
          action: 'alert',
          signal: 'backlog_high',
          eventId: '',
          tenantId: null,
          streamLen: snap.streamLen,
          threshold: s.alertBacklogThreshold,
        });
      }

      if (snap.dlqLen > 0) {
        this.structured.warn({
          type: 'event_bus',
          action: 'alert',
          signal: 'dlq_non_empty',
          eventId: '',
          tenantId: null,
          dlqLen: snap.dlqLen,
        });
      }

      for (const p of snap.pendingDetails) {
        if (p.idleMs >= s.alertStuckPendingMs) {
          this.structured.warn({
            type: 'event_bus',
            action: 'alert',
            signal: 'stuck_pending',
            eventId: '',
            tenantId: null,
            messageId: p.messageId,
            consumer: p.consumer,
            idleMs: p.idleMs,
            deliveries: p.deliveries,
            thresholdMs: s.alertStuckPendingMs,
          });
        }
      }

      if (snap.pendingTotal > 0 && snap.pendingDetails.length === 0 && snap.pendingTotal >= 10) {
        this.structured.warn({
          type: 'event_bus',
          action: 'alert',
          signal: 'pending_summary_high',
          eventId: '',
          tenantId: null,
          pendingTotal: snap.pendingTotal,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`event_bus alerts: ${msg}`);
    }
  }
}
