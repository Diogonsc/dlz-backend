import {
  Body,
  Controller,
  ForbiddenException,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeController, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { StructuredLoggerService } from '../../observability/structured-logger.service';
import { getObservabilityContext } from '../../observability/request-context.storage';
import { EventBusDlqReplayService } from '../infrastructure/event-bus-dlq-replay.service';
import { InternalAuthGuard } from '../guards/internal-auth.guard';
import { InternalReplayGuard } from '../guards/internal-replay.guard';

type InternalReplayRequest = Request & {
  internalAuth?: {
    actor: string;
  };
};

/**
 * Operações internas (replay DLQ). Proteger com `EVENT_BUS_ADMIN_TOKEN` e rede privada / mesh.
 */
@ApiTags('internal')
@ApiExcludeController()
@Controller('internal/event-bus')
@UseGuards(InternalAuthGuard, InternalReplayGuard)
export class EventBusInternalController {
  constructor(
    private readonly replay: EventBusDlqReplayService,
    private readonly structured: StructuredLoggerService,
  ) {}

  @Post('dlq/replay')
  @Throttle({ replay: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Reprocessa até N mensagens da DLQ (re-publica no stream principal)' })
  async replayDlq(
    @Body() body: { limit?: number; tenantId?: string },
    @Req() req: InternalReplayRequest,
  ): Promise<{ replayed: number; errors: string[] }> {
    const limit = Math.min(500, Math.max(1, Number(body?.limit) || 50));
    const tenantId = body?.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('tenantId é obrigatório');
    }
    const out = await this.replay.replayBatch(limit, tenantId);
    this.structured.log({
      type: 'audit',
      action: 'eventbus_replay',
      tenantId,
      actor: req.internalAuth?.actor ?? 'internal-service',
      count: out.replayed,
      correlationId: getObservabilityContext()?.correlationId ?? null,
    });
    return out;
  }
}
