import { SkipThrottle } from '@nestjs/throttler';
import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CrmService } from '../../application/services/crm.service';
import {
  ApiJsonOkResponse,
  ApiStandardErrorResponses,
} from '../../../../common/swagger/http-responses.decorators';
import {
  CrmCustomerDetailResponseDto,
  CrmCustomersListResponseDto,
  CrmMetricsResponseDto,
  CrmResegmentJobResponseDto,
} from '../dtos/crm-response.dto';

@ApiTags('crm')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@SkipThrottle()
@Controller('crm')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Get('customers')
  @ApiOperation({ operationId: 'crmListCustomers', summary: 'Lista clientes com filtros e paginação' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({ type: CrmCustomersListResponseDto, description: 'Clientes paginados' })
  @ApiQuery({ name: 'segment', required: false, type: String, description: 'Filtro por segmento' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Busca textual (nome/telefone)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 30 })
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
  @ApiOperation({ operationId: 'crmMetrics', summary: 'Métricas gerais de CRM' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({ type: CrmMetricsResponseDto, description: 'Métricas agregadas' })
  getMetrics(@TenantId() tenantId: string) {
    return this.crmService.getMetrics(tenantId);
  }

  @Get('customers/:id')
  @ApiOperation({ operationId: 'crmCustomerDetail', summary: 'Perfil completo + histórico de pedidos' })
  @ApiStandardErrorResponses({ notFound: true })
  @ApiJsonOkResponse({ type: CrmCustomerDetailResponseDto, description: 'Cliente com pedidos' })
  @ApiParam({ name: 'id', required: true, type: String })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.crmService.findOne(id, tenantId);
  }

  @Post('customers/resegment')
  @ApiOperation({ operationId: 'crmResegmentCustomers', summary: 'Recalcula segmentação de todos os clientes' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({ type: CrmResegmentJobResponseDto, description: 'Job de resegmentação disparado' })
  resegment(@TenantId() tenantId: string) {
    return this.crmService.resegment(tenantId);
  }
}
