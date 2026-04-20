import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PushService } from './push.service';
import type { PushDeliverySub, SendPushDto } from './push.dto';

@Processor('push')
export class PushProcessor extends WorkerHost {
  constructor(private readonly pushService: PushService) {
    super();
  }

  async process(job: Job<{ sub: PushDeliverySub; payload: SendPushDto }>) {
    const { sub, payload } = job.data;
    await this.pushService.sendDirect(sub, payload);
  }
}
