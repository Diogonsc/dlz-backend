import { Module, Injectable } from '@nestjs/common';
import { Controller, Get, Post, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InjectQueue, BullModule } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';
import { IsArray, IsString, IsOptional } from 'class-validator';
import { NotificationGatewayPort } from './domain/ports/notification-gateway.port';
import { WinbackRepositoryPort } from './domain/ports/winback.repository.port';
import { PrismaWinbackRepository } from './infrastructure/persistence/prisma-winback.repository';
import { TwilioWhatsAppGateway } from './infrastructure/gateways/twilio-whatsapp.gateway';
import { SendWinbackMessageUseCase } from './application/use-cases/send-winback-message.use-case';
import { WinbackNotificationsProcessor } from './infrastructure/queues/winback-notifications.processor';
import { WinbackEventsHandler } from './application/handlers/winback-events.handler';
import { getObservabilityContext } from '../../common/observability/request-context.storage';

class SendWinbackDto {
  @IsArray() customerPhones: string[];
  @IsOptional() @IsString() segment?: string;
}

@Injectable()
class WinbackService {
  constructor(
    private readonly repo: WinbackRepositoryPort,
    @InjectQueue('winback-notifications') private readonly winbackQueue: Queue,
  ) {}

  async getLogs(tenantId: string, limit = 100) {
    return this.repo.getLogs(tenantId, limit);
  }

  async getMonthlyCount(tenantId: string) {
    return this.repo.getMonthlyCount(tenantId);
  }

  async sendWinback(tenantId: string, dto: SendWinbackDto) {
    const segment = dto.segment ?? 'manual';
    const correlationId = getObservabilityContext()?.correlationId ?? null;
    for (const phone of dto.customerPhones) {
      await this.winbackQueue.add(
        'send',
        {
          correlationId,
          tenantId,
          phone,
          triggerType: 'manual',
          segment,
          campaign: `winback_${segment}`,
        },
        {
          attempts: 5,
          backoff: { type: 'exponential', delay: 2000, jitter: 0.3 },
          removeOnComplete: 200,
          removeOnFail: 400,
        },
      );
    }
    return { queued: dto.customerPhones.length };
  }
}

@ApiTags('winback')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('winback')
class WinbackController {
  constructor(private readonly winbackService: WinbackService) {}

  @Get('logs')
  @ApiOperation({ summary: 'Histórico de envios winback (substitui from("winback_logs").select)' })
  getLogs(@TenantId() tenantId: string, @Query('limit') limit = 100) {
    return this.winbackService.getLogs(tenantId, +limit);
  }

  @Get('logs/monthly-count')
  @ApiOperation({ summary: 'Contagem de envios do mês atual' })
  getMonthlyCount(@TenantId() tenantId: string) {
    return this.winbackService.getMonthlyCount(tenantId);
  }

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dispara winback para lista de telefones (substitui invoke winback-scheduler)' })
  send(@TenantId() tenantId: string, @Body() dto: SendWinbackDto) {
    return this.winbackService.sendWinback(tenantId, dto);
  }
}

@Module({
  imports: [BullModule.registerQueue({ name: 'winback-notifications' })],
  controllers: [WinbackController],
  providers: [
    WinbackService,
    SendWinbackMessageUseCase,
    WinbackNotificationsProcessor,
    WinbackEventsHandler,
    PrismaWinbackRepository,
    { provide: WinbackRepositoryPort, useExisting: PrismaWinbackRepository },
    { provide: NotificationGatewayPort, useClass: TwilioWhatsAppGateway },
  ],
  exports: [WinbackService],
})
export class WinbackModule {}
