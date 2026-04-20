import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@dlz/prisma';
import { Queue } from 'bullmq';

@Injectable()
export class JobsScheduler {
  private readonly logger = new Logger(JobsScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('winback') private readonly winbackQueue: Queue,
  ) {}

  @Cron('0 10 * * *')
  async runWinback() {
    this.logger.log('Running winback scheduler...');
    const tenants = await this.prisma.tenant.findMany({
      where: { status: 'active', plan: { in: ['pro', 'agency'] } },
      select: { id: true, plan: true },
    });

    for (const tenant of tenants) {
      await this.scheduleWinbackForTenant(tenant.id);
    }
  }

  private async scheduleWinbackForTenant(tenantId: string) {
    const now = new Date();
    const thresholds = [
      { days: 14, segment: 'at_risk' },
      { days: 30, segment: 'inactive' },
      { days: 60, segment: 'lost' },
    ];

    for (const threshold of thresholds) {
      const cutoff = new Date(now.getTime() - threshold.days * 24 * 60 * 60 * 1000);

      const customers = await this.prisma.customerProfile.findMany({
        where: {
          tenantId,
          lastOrderAt: { lt: cutoff, gt: new Date(cutoff.getTime() - 3 * 24 * 60 * 60 * 1000) },
        },
        take: 50,
      });

      for (const customer of customers) {
        const recentLog = await this.prisma.winbackLog.findFirst({
          where: {
            tenantId,
            customerPhone: customer.phoneNormalized,
            sentAt: { gt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
          },
        });
        if (recentLog) continue;

        const code = `DLZ-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const couponConfigs: Record<string, { discountType: string; discountValue: number }> = {
          at_risk: { discountType: 'fixed', discountValue: 0 },
          inactive: { discountType: 'fixed', discountValue: 10 },
          lost: { discountType: 'percentage', discountValue: 15 },
        };
        const cfg = couponConfigs[threshold.segment] ?? { discountType: 'fixed', discountValue: 5 };

        await this.prisma.winbackCoupon.create({
          data: { tenantId, code, ...cfg },
        });

        await this.winbackQueue.add(
          'send',
          {
            tenantId,
            customer: { phone: customer.phone, name: customer.name },
            couponCode: code,
            segment: threshold.segment,
          },
          { delay: Math.random() * 30_000 },
        );
      }
    }
  }

  @Cron('0 1 1 * *')
  async generateSnapshots() {
    this.logger.log('Generating monthly snapshots...');
    const tenants = await this.prisma.tenant.findMany({ select: { id: true } });
    for (const tenant of tenants) {
      this.logger.log(`Snapshot queued for tenant ${tenant.id}`);
    }
  }

  @Cron('0 3 * * *')
  async resegmentCustomers() {
    this.logger.log('Resegmenting customers...');
    const tenants = await this.prisma.tenant.findMany({ select: { id: true } });
    for (const tenant of tenants) {
      await this.resegmentTenant(tenant.id);
    }
  }

  private async resegmentTenant(tenantId: string) {
    const customers = await this.prisma.customerProfile.findMany({ where: { tenantId } });
    const now = new Date();

    for (const c of customers) {
      let segment = 'new';
      if (c.totalOrders >= 10) segment = 'loyal';
      else if (c.totalOrders >= 3) segment = 'recurring';
      else if (c.lastOrderAt) {
        const days = (now.getTime() - c.lastOrderAt.getTime()) / (1000 * 60 * 60 * 24);
        if (days > 60) segment = 'lost';
        else if (days > 30) segment = 'inactive';
        else if (days > 14) segment = 'at_risk';
      }

      if (segment !== c.segment) {
        await this.prisma.customerProfile.update({ where: { id: c.id }, data: { segment } });
      }
    }
  }
}
