import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AnalyticsService } from '../../application/services/analytics.service';
import { TrackEventDto } from '../dtos/track-event.dto';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('events')
  @ApiOperation({ summary: 'Registra evento de analytics (público — vitrine)' })
  track(@Body() dto: TrackEventDto) {
    return this.analyticsService.trackEvent(dto.tenantId, dto.eventType, dto.payload ?? {});
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dashboard principal da loja' })
  dashboard(@TenantId() tenantId: string) {
    return this.analyticsService.getDashboard(tenantId);
  }

  @Get('top-products')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Produtos mais vendidos' })
  topProducts(@TenantId() tenantId: string, @Query('limit') limit = 10) {
    return this.analyticsService.getTopProducts(tenantId, +limit);
  }

  @Get('peak-hours')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Horários de pico de pedidos' })
  peakHours(@TenantId() tenantId: string) {
    return this.analyticsService.getPeakHours(tenantId);
  }

  @Get('price-suggestions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sugestões de ajuste de preço por produto' })
  priceSuggestions(@TenantId() tenantId: string) {
    return this.analyticsService.getPriceSuggestions(tenantId);
  }

  @Get('snapshots')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Snapshots mensais (últimos 12 meses)' })
  snapshots(@TenantId() tenantId: string) {
    return this.analyticsService.getSnapshots(tenantId);
  }

  @Post('snapshots/generate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Gera snapshot do mês atual' })
  generateSnapshot(@TenantId() tenantId: string) {
    return this.analyticsService.generateMonthlySnapshot(tenantId);
  }
}
