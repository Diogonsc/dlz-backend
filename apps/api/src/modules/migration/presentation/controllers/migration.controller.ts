import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { RolesGuard, Roles } from '../../../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { MigrationService } from '../../application/services/migration.service';
import { CanaryRolloutDto, SetFeatureFlagDto } from '../dtos/migration.dto';
import {
  ApiJsonOkResponse,
  ApiStandardErrorResponses,
} from '../../../../common/swagger/http-responses.decorators';
import {
  MigrationCanaryRolloutResponseDto,
  MigrationHealthResponseDto,
  MigrationSetFlagResponseDto,
  MigrationStatusResponseDto,
  MigrationTenantFlagsResponseDto,
} from '../dtos/migration-response.dto';

@ApiTags('migration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('migration')
export class MigrationController {
  constructor(private readonly migrationService: MigrationService) {}

  @Get('status')
  @ApiOperation({ operationId: 'migrationStatus', summary: 'Status geral da migração Supabase → NestJS' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({ type: MigrationStatusResponseDto, description: 'Mapa de status por subsistema' })
  status() {
    return this.migrationService.getMigrationStatus();
  }

  @Get('health')
  @ApiOperation({ operationId: 'migrationHealth', summary: 'Health check pós-migração' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({ type: MigrationHealthResponseDto, description: 'Checks de dependências pós-migração' })
  health() {
    return this.migrationService.healthCheck();
  }

  @Post('flags')
  @ApiOperation({ operationId: 'migrationSetFlag', summary: 'Define feature flag para um tenant específico' })
  @ApiStandardErrorResponses({ notFound: true })
  @ApiJsonOkResponse({ type: MigrationSetFlagResponseDto, description: 'Flag persistida' })
  setFlag(@Body() dto: SetFeatureFlagDto) {
    return this.migrationService.setFlag(dto.tenantId, dto.flag, dto.enabled);
  }

  @Get('flags/:tenantId')
  @ApiOperation({ operationId: 'migrationGetTenantFlags', summary: 'Lista flags ativas para um tenant' })
  @ApiStandardErrorResponses({ notFound: true })
  @ApiJsonOkResponse({ type: MigrationTenantFlagsResponseDto, description: 'Flags do tenant' })
  @ApiParam({ name: 'tenantId', required: true, type: String })
  getFlags(@Param('tenantId') tenantId: string) {
    return { tenantId, flags: this.migrationService.getTenantFlags(tenantId) };
  }

  @Post('canary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'migrationCanaryRollout', summary: 'Canary rollout: ativa flag para X% dos tenants' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({ type: MigrationCanaryRolloutResponseDto, description: 'Resultado do rollout' })
  canary(@Body() dto: CanaryRolloutDto) {
    return this.migrationService.canaryRollout(dto);
  }
}
