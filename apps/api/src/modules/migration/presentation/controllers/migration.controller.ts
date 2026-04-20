import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesGuard, Roles } from '../../../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { MigrationService } from '../../application/services/migration.service';
import { CanaryRolloutDto, SetFeatureFlagDto } from '../dtos/migration.dto';

@ApiTags('migration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('migration')
export class MigrationController {
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
