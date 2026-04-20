import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PushService } from './push.service';
import { PushController } from './push.controller';
import { PushProcessor } from './push.processor';

@Module({
  imports: [BullModule.registerQueue({ name: 'push' })],
  controllers: [PushController],
  providers: [PushService, PushProcessor],
  exports: [PushService],
})
export class PushModule {}
