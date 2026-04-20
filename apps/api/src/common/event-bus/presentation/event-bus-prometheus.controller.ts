import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { EventBusMetricsService } from '../infrastructure/event-bus-metrics.service';
import { InternalMetricsGuard } from '../guards/internal-metrics.guard';

/** Métricas Prometheus (fora do prefixo `/api/v1`). */
@ApiExcludeController()
@Controller('metrics')
@UseGuards(InternalMetricsGuard)
export class EventBusPrometheusController {
  constructor(private readonly metrics: EventBusMetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain; charset=utf-8')
  async prometheus(): Promise<string> {
    return this.metrics.buildPrometheusText();
  }
}
