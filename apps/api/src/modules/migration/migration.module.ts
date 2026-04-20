import { Module } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { Controller, Get, Post, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@dlz/prisma';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { IsString, IsBoolean, IsOptional, IsNumber, Min, Max } from 'class-validator';

// ── Feature flag por tenant ───────────────────────────────────────────────────

export type FeatureFlag =
  | 'new_backend_auth'
  | 'new_backend_orders'
  | 'new_backend_payments'
  | 'new_backend_realtime'
  | 'new_backend_full';

class SetFeatureFlagDto {
  @IsString() tenantId: string;
  @IsString() flag: FeatureFlag;
  @IsBoolean() enabled: boolean;
}

class CanaryRolloutDto {
  @IsString() flag: FeatureFlag;
  @IsNumber() @Min(0) @Max(100) percentage: number; // % de tenants que recebem a flag
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
class MigrationService {
  private readonly logger = new Logger(MigrationService.name);

  // Feature flags em memória + Redis (simplificado — em produção use Redis Hash)
  private readonly flags = new Map<string, Set<FeatureFlag>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ── Feature flags ──────────────────────────────────────────────────────────

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

  // ── Canary rollout: ativa flag para X% dos tenants ativos ─────────────────

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

  // ── Status da migração ─────────────────────────────────────────────────────

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

  // ── Verificação de saúde pós-migração ─────────────────────────────────────

  async healthCheck() {
    const checks: { name: string; ok: boolean; details?: string }[] = [];

    // Banco
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.push({ name: 'postgres', ok: true });
    } catch (e: any) {
      checks.push({ name: 'postgres', ok: false, details: e.message });
    }

    // Contagens básicas
    const [tenants, orders, products] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.order.count(),
      this.prisma.product.count(),
    ]);

    checks.push({ name: 'data_integrity', ok: true, details: `tenants=${tenants} orders=${orders} products=${products}` });

    return {
      healthy: checks.every((c) => c.ok),
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}

// ── Controller ────────────────────────────────────────────────────────────────

@ApiTags('migration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('migration')
class MigrationController {
  constructor(private readonly migrationService: MigrationService) {}

  @Get('status')
  @ApiOperation({ summary: 'Status geral da migração Supabase → NestJS' })
  status() {
    return this.migrationService.getMigrationStatus();
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check pós-migração' })
  health() {
    return this.migrationService.healthCheck();
  }

  @Post('flags')
  @ApiOperation({ summary: 'Define feature flag para um tenant específico' })
  setFlag(@Body() dto: SetFeatureFlagDto) {
    return this.migrationService.setFlag(dto.tenantId, dto.flag, dto.enabled);
  }

  @Get('flags/:tenantId')
  @ApiOperation({ summary: 'Lista flags ativas para um tenant' })
  getFlags(@Param('tenantId') tenantId: string) {
    return { tenantId, flags: this.migrationService.getTenantFlags(tenantId) };
  }

  @Post('canary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Canary rollout: ativa flag para X% dos tenants' })
  canary(@Body() dto: CanaryRolloutDto) {
    return this.migrationService.canaryRollout(dto);
  }
}

// ── Module ────────────────────────────────────────────────────────────────────

@Module({
  controllers: [MigrationController],
  providers: [MigrationService],
  exports: [MigrationService],
})
export class MigrationModule {}
