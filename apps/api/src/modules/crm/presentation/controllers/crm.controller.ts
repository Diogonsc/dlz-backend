import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CrmService } from '../../application/services/crm.service';

@ApiTags('crm')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('crm')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Get('customers')
  @ApiOperation({ summary: 'Lista clientes com filtros e paginação' })
  findAll(
    @TenantId() tenantId: string,
    @Query('segment') segment?: string,
    @Query('search') search?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 30,
  ) {
    return this.crmService.findAll(tenantId, { segment, search, page: +page, limit: +limit });
  }

  @Get('customers/metrics')
  @ApiOperation({ summary: 'Métricas gerais de CRM' })
  getMetrics(@TenantId() tenantId: string) {
    return this.crmService.getMetrics(tenantId);
  }

  @Get('customers/:id')
  @ApiOperation({ summary: 'Perfil completo + histórico de pedidos' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.crmService.findOne(id, tenantId);
  }

  @Post('customers/resegment')
  @ApiOperation({ summary: 'Recalcula segmentação de todos os clientes' })
  resegment(@TenantId() tenantId: string) {
    return this.crmService.resegment(tenantId);
  }
}
