import { Module } from '@nestjs/common';
import { EventBusModule } from '../event-bus/event-bus.module';
import { OutboxDispatcherService } from './outbox-dispatcher.service';
import { OutboxCleanupService } from './outbox-cleanup.service';

@Module({
  imports: [EventBusModule],
  providers: [OutboxDispatcherService, OutboxCleanupService],
})
export class OutboxModule {}
