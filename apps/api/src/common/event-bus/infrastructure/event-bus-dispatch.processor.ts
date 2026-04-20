import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import {
  EVENT_BUS_DISPATCH_JOB,
  EVENT_BUS_DISPATCH_QUEUE,
  type EventBusDispatchJobData,
} from '../event-bus.constants';
import { getEventBusSettings } from '../event-bus.settings';
import { EventBusStreamDeliveryService } from './event-bus-stream-delivery.service';

/**
 * Worker BullMQ opcional: desacopla leitura do stream (API) do processamento (réplicas worker).
 */
@Processor(EVENT_BUS_DISPATCH_QUEUE)
export class EventBusDispatchProcessor extends WorkerHost {
  constructor(
    private readonly config: ConfigService,
    private readonly delivery: EventBusStreamDeliveryService,
  ) {
    super();
  }

  async process(job: Job<EventBusDispatchJobData>): Promise<void> {
    const s = getEventBusSettings(this.config);
    if (s.consumerTransport !== 'bull' || !s.dispatchWorkerEnabled) {
      return;
    }
    if (job.name !== EVENT_BUS_DISPATCH_JOB) {
      return;
    }
    const { stream, group, messageId, fields } = job.data;
    await this.delivery.processOne(stream, group, messageId, fields);
  }
}
