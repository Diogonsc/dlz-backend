import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AnalyticsService } from '../../application/services/analytics.service';
import { TrackEventDto } from '../dtos/track-event.dto';
import {
  ApiJsonOkResponse,
  ApiPublicEndpoint,
  ApiStandardErrorResponses,
} from '../../../../common/swagger/http-responses.decorators';
import {
  AnalyticsDashboardResponseDto,
  AnalyticsEventPersistedResponseDto,
  AnalyticsMonthlySnapshotResponseDto,
  AnalyticsPeakHourRowDto,
  AnalyticsPriceSuggestionRowDto,
  AnalyticsTopProductRowDto,
} from '../dtos/analytics-response.dto';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('events')
  @ApiPublicEndpoint()
  @ApiOperation({ operationId: 'analyticsTrackEvent', summary: 'Registra evento de analytics (público — vitrine)' })
  @ApiStandardErrorResponses({ omitJwtErrorResponses: true })
  @ApiJsonOkResponse({ type: AnalyticsEventPersistedResponseDto, description: 'Evento persistido' })
  track(@Body() dto: TrackEventDto) {
    return this.analyticsService.trackEvent(dto.tenantId, dto.eventType, dto.payload ?? {});
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ operationId: 'analyticsDashboard', summary: 'Dashboard principal da loja' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({ type: AnalyticsDashboardResponseDto, description: 'KPIs agregados' })
  dashboard(@TenantId() tenantId: string) {
    return this.analyticsService.getDashboard(tenantId);
  }

  @Get('top-products')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ operationId: 'analyticsTopProducts', summary: 'Produtos mais vendidos' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({ isArray: true, type: AnalyticsTopProductRowDto, description: 'Ranking de produtos' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Quantidade de itens no ranking',
    example: 10,
  })
  topProducts(@TenantId() tenantId: string, @Query('limit') limit = 10) {
    return this.analyticsService.getTopProducts(tenantId, +limit);
  }

  @Get('peak-hours')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ operationId: 'analyticsPeakHours', summary: 'Horários de pico de pedidos' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({ isArray: true, type: AnalyticsPeakHourRowDto, description: 'Distribuição por hora' })
  peakHours(@TenantId() tenantId: string) {
    return this.analyticsService.getPeakHours(tenantId);
  }

  @Get('price-suggestions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ operationId: 'analyticsPriceSuggestions', summary: 'Sugestões de ajuste de preço por produto' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({ isArray: true, type: AnalyticsPriceSuggestionRowDto, description: 'Sugestões heurísticas' })
  priceSuggestions(@TenantId() tenantId: string) {
    return this.analyticsService.getPriceSuggestions(tenantId);
  }

  @Get('snapshots')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ operationId: 'analyticsSnapshots', summary: 'Snapshots mensais (últimos 12 meses)' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({ isArray: true, type: AnalyticsMonthlySnapshotResponseDto, description: 'Histórico de snapshots' })
  snapshots(@TenantId() tenantId: string) {
    return this.analyticsService.getSnapshots(tenantId);
  }

  @Post('snapshots/generate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ operationId: 'analyticsGenerateSnapshot', summary: 'Gera snapshot do mês atual' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({ type: AnalyticsMonthlySnapshotResponseDto, description: 'Snapshot gerado' })
  generateSnapshot(@TenantId() tenantId: string) {
    return this.analyticsService.generateMonthlySnapshot(tenantId);
  }
}
