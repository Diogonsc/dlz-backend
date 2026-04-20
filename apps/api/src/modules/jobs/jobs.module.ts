import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { JobsScheduler } from './application/services/jobs.scheduler';
import { WinbackProcessor } from './infrastructure/processors/winback.processor';

// ── Module ────────────────────────────────────────────────────────────────────

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.registerQueue({ name: 'winback' }),
  ],
  providers: [WinbackProcessor, JobsScheduler],
  exports: [JobsScheduler],
})
export class JobsModule {}
