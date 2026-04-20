import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { WhatsAppService, WhatsAppMessage } from './whatsapp.service';

@Processor('whatsapp')
export class WhatsAppProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsAppProcessor.name);

  constructor(private readonly whatsAppService: WhatsAppService) {
    super();
  }

  async process(job: Job<WhatsAppMessage>) {
    const { to, body } = job.data;
    this.logger.log(`Processing WhatsApp job ${job.id} → ${to}`);

    const result = await this.whatsAppService.sendDirect(to, body);

    if (!result.ok) {
      throw new Error(result.error ?? 'WhatsApp send failed');
    }

    this.logger.log(`WhatsApp sent: ${result.messageId}`);
    return result;
  }
}
