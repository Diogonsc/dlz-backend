import { Injectable } from '@nestjs/common';
import { PrismaService } from '@dlz/prisma';
import {
  SubscriptionRepositoryPort,
  type PlanRow,
} from '../../domain/ports/subscription.repository.port';

@Injectable()
export class PrismaSubscriptionRepository extends SubscriptionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findPlanByStripePriceId(priceId: string): Promise<PlanRow | null> {
    const plan = await this.prisma.plan.findFirst({
      where: { stripePriceId: priceId },
    });
    if (!plan) return null;
    return { id: plan.id, slug: plan.slug, stripePriceId: plan.stripePriceId };
  }

  async findPlanBySlug(slug: string): Promise<PlanRow | null> {
    const plan = await this.prisma.plan.findFirst({ where: { slug } });
    if (!plan) return null;
    return { id: plan.id, slug: plan.slug, stripePriceId: plan.stripePriceId };
  }

  async updateTenantPlanById(tenantId: string, planSlug: string, status: string): Promise<void> {
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { plan: planSlug as 'starter' | 'pro' | 'agency', status: status as 'active' | 'trial' | 'inactive' | 'pending_payment' },
    });
  }

  async updateTenantsPlanByEmail(email: string, planSlug: string, status: string): Promise<void> {
    await this.prisma.tenant.updateMany({
      where: { email },
      data: { plan: planSlug as 'starter' | 'pro' | 'agency', status: status as 'active' | 'trial' | 'inactive' | 'pending_payment' },
    });
  }

  async downgradeTenantsByEmail(email: string): Promise<void> {
    await this.prisma.tenant.updateMany({
      where: { email },
      data: { plan: 'starter', status: 'inactive' },
    });
  }

  async findTenantIdsByEmail(email: string): Promise<string[]> {
    const rows = await this.prisma.tenant.findMany({
      where: { email },
      select: { id: true },
    });
    return rows.map((r: { id: string }) => r.id);
  }

  async getTenantBillingSummary(tenantId: string): Promise<{
    plan: string;
    status: string;
    email: string;
  } | null> {
    const t = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true, status: true, email: true },
    });
    if (!t) return null;
    return { plan: t.plan, status: t.status, email: t.email };
  }
}
