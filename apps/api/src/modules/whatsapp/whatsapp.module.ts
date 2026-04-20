import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppProcessor } from './whatsapp.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'whatsapp' }),
  ],
  controllers: [WhatsAppController],
  providers: [WhatsAppService, WhatsAppProcessor],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
