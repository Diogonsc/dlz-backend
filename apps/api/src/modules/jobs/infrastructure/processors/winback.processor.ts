import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '@dlz/prisma';

@Injectable()
@Processor('winback')
export class WinbackProcessor extends WorkerHost {
  private readonly logger = new Logger(WinbackProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job) {
    const { tenantId, customer, couponCode, segment } = job.data;
    this.logger.log(`Winback job: tenant=${tenantId} phone=${customer.phone} segment=${segment}`);

    const coupon = await this.prisma.winbackCoupon.findFirst({
      where: { tenantId, code: couponCode },
    });
    if (!coupon) return;

    await this.prisma.winbackLog.create({
      data: {
        tenantId,
        couponId: coupon.id,
        customerPhone: customer.phone,
      },
    });

    this.logger.log(`Winback log created for ${customer.phone}`);
  }
}
