import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WhatsappContactsService } from './application/services/whatsapp-contacts.service';
import { WhatsappContactsController } from './presentation/controllers/whatsapp-contacts.controller';

@Module({
  imports: [BullModule.registerQueue({ name: 'whatsapp-contacts' })],
  controllers: [WhatsappContactsController],
  providers: [WhatsappContactsService],
  exports: [WhatsappContactsService],
})
export class WhatsappContactsModule {}
