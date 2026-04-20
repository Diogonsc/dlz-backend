import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@dlz/prisma';
import { StructuredLoggerService } from '../observability/structured-logger.service';

const PROCESSED_RETENTION_DAYS = 7;
const FAILED_RETENTION_DAYS = 30;

@Injectable()
export class OutboxCleanupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly structured: StructuredLoggerService,
  ) {}

  @Cron('0 */6 * * *')
  async cleanup(): Promise<void> {
    const processedBefore = new Date(Date.now() - PROCESSED_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const failedBefore = new Date(Date.now() - FAILED_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    const [processed, failed] = await Promise.all([
      this.prisma.outboxEvent.deleteMany({
        where: {
          status: 'processed',
          processedAt: { lt: processedBefore },
        },
      }),
      this.prisma.outboxEvent.deleteMany({
        where: {
          status: 'failed',
          updatedAt: { lt: failedBefore },
        },
      }),
    ]);

    this.structured.log({
      type: 'outbox',
      action: 'cleanup',
      processedDeleted: processed.count,
      failedDeleted: failed.count,
      processedRetentionDays: PROCESSED_RETENTION_DAYS,
      failedRetentionDays: FAILED_RETENTION_DAYS,
    });
  }
}
