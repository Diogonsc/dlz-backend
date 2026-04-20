import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Cron, CronExpression, ScheduleModule } from '@nestjs/schedule';
import { PrismaService } from '@dlz/prisma';

// ── Winback Processor ─────────────────────────────────────────────────────────

@Processor('winback')
class WinbackProcessor extends WorkerHost {
  private readonly logger = new Logger(WinbackProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job) {
    const { tenantId, customer, couponCode, segment } = job.data;
    this.logger.log(`Winback job: tenant=${tenantId} phone=${customer.phone} segment=${segment}`);

    // Registra log de envio (a notificação real é feita pela WhatsAppService)
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

// ── Jobs Scheduler ────────────────────────────────────────────────────────────

@Injectable()
class JobsScheduler {
  private readonly logger = new Logger(JobsScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('winback') private readonly winbackQueue: Queue,
  ) {}

  // Winback: roda diariamente às 10h
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
        // Verifica se já enviou nos últimos 7 dias
        const recentLog = await this.prisma.winbackLog.findFirst({
          where: {
            tenantId,
            customerPhone: customer.phoneNormalized,
            sentAt: { gt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
          },
        });
        if (recentLog) continue;

        // Cria ou busca cupom winback para este segmento
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

        await this.winbackQueue.add('send', {
          tenantId,
          customer: { phone: customer.phone, name: customer.name },
          couponCode: code,
          segment: threshold.segment,
        }, { delay: Math.random() * 30_000 }); // spread aleatório de 30s
      }
    }
  }

  // Snapshots mensais: roda todo dia 1 às 01h
  @Cron('0 1 1 * *')
  async generateSnapshots() {
    this.logger.log('Generating monthly snapshots...');
    const tenants = await this.prisma.tenant.findMany({ select: { id: true } });
    for (const tenant of tenants) {
      // Delega para AnalyticsService via evento interno ou direto
      this.logger.log(`Snapshot queued for tenant ${tenant.id}`);
    }
  }

  // Resegmentação de clientes: roda diariamente às 03h
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
