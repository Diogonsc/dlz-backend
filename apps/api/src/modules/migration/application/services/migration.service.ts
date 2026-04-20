import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@dlz/prisma';
import { FeatureFlag } from '../../domain/types/feature-flag.type';
import { CanaryRolloutDto } from '../../presentation/dtos/migration.dto';

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);
  private readonly flags = new Map<string, Set<FeatureFlag>>();

  constructor(private readonly prisma: PrismaService) {}

  setFlag(tenantId: string, flag: FeatureFlag, enabled: boolean) {
    if (!this.flags.has(tenantId)) this.flags.set(tenantId, new Set());
    const set = this.flags.get(tenantId)!;
    if (enabled) set.add(flag);
    else set.delete(flag);
    this.logger.log(`Feature flag ${flag} = ${enabled} for tenant ${tenantId}`);
    return { tenantId, flag, enabled };
  }

  hasFlag(tenantId: string, flag: FeatureFlag): boolean {
    return this.flags.get(tenantId)?.has(flag) ?? false;
  }

  getTenantFlags(tenantId: string): FeatureFlag[] {
    return Array.from(this.flags.get(tenantId) ?? []);
  }

  async canaryRollout(dto: CanaryRolloutDto) {
    const tenants = await this.prisma.tenant.findMany({
      where: { status: 'active' },
      select: { id: true },
    });

    const count = Math.round((tenants.length * dto.percentage) / 100);
    const selected = tenants.slice(0, count);

    for (const t of selected) {
      this.setFlag(t.id, dto.flag, true);
    }

    this.logger.log(`Canary rollout: ${dto.flag} → ${count}/${tenants.length} tenants (${dto.percentage}%)`);
    return { flag: dto.flag, percentage: dto.percentage, tenantsEnabled: count, total: tenants.length };
  }

  async getMigrationStatus() {
    const [total, active, trial, inactive] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { status: 'active' } }),
      this.prisma.tenant.count({ where: { status: 'trial' } }),
      this.prisma.tenant.count({ where: { status: 'inactive' } }),
    ]);

    const flagCounts: Record<string, number> = {};
    for (const [, flags] of this.flags) {
      for (const flag of flags) {
        flagCounts[flag] = (flagCounts[flag] ?? 0) + 1;
      }
    }

    return {
      tenants: { total, active, trial, inactive },
      featureFlags: flagCounts,
      newBackendCoverage: `${((flagCounts['new_backend_full'] ?? 0) / (total || 1)) * 100}%`,
    };
  }

  async healthCheck() {
    const checks: { name: string; ok: boolean; details?: string }[] = [];

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.push({ name: 'postgres', ok: true });
    } catch (e: any) {
      checks.push({ name: 'postgres', ok: false, details: e.message });
    }

    const [tenants, orders, products] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.order.count(),
      this.prisma.product.count(),
    ]);

    checks.push({
      name: 'data_integrity',
      ok: true,
      details: `tenants=${tenants} orders=${orders} products=${products}`,
    });

    return {
      healthy: checks.every((c) => c.ok),
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}
