import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ReliabilityLoggerService } from '../../../../common/observability/reliability-logger.service';

export const PAYMENT_RELIABILITY_QUEUE = 'payment-reliability';

/** Re-emissão de evento para o EventEmitter após falha transitória. */
export const PAYMENT_RELIABILITY_RE_EMIT_JOB = 're-emit-billing';

export type ReEmitBillingJobData = {
  eventName: string;
  payload: unknown;
};

@Processor(PAYMENT_RELIABILITY_QUEUE)
export class PaymentReliabilityProcessor extends WorkerHost {
  constructor(
    private readonly events: EventEmitter2,
    private readonly reliability: ReliabilityLoggerService,
  ) {
    super();
  }

  async process(job: Job<ReEmitBillingJobData>): Promise<void> {
    if (job.name !== PAYMENT_RELIABILITY_RE_EMIT_JOB) return;
    const { eventName, payload } = job.data;
    this.events.emit(eventName, payload);
    this.reliability.log('retry', {
      eventName,
      jobId: job.id != null ? String(job.id) : null,
      attemptsMade: job.attemptsMade,
    });
  }
}
