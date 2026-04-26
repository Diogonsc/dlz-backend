import { SkipThrottle } from '@nestjs/throttler';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { CurrentUser, TenantId } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { IfoodService } from '../../application/services/ifood.service';
import { IfoodSyncService } from '../../ifood-sync.service';
import { IfoodAuthActionDto } from '../dtos/ifood-auth-action.dto';
import { IfoodSyncOrderDto } from '../dtos/ifood-sync-order.dto';
import { IfoodWebhookPayloadDto } from '../dtos/ifood-webhook-payload.dto';
import {
  ApiJsonOkResponse,
  ApiPublicEndpoint,
  ApiStandardErrorResponses,
} from '../../../../common/swagger/http-responses.decorators';
import { StripeWebhookAckResponseDto } from '../../../../common/dtos/simple-contract.dto';
import {
  IfoodAuthActionResultResponseDto,
  IfoodDisconnectOkResponseDto,
  IfoodIntegrationStatusResponseDto,
  IfoodOAuthCallbackOkResponseDto,
  IfoodOAuthUrlResponseDto,
  IfoodSyncOrderStatusResponseDto,
} from '../dtos/ifood-response.dto';

@ApiTags('ifood')
@SkipThrottle()
@Controller('ifood')
export class IfoodController {
  constructor(
    private readonly ifoodService: IfoodService,
    private readonly ifoodSyncService: IfoodSyncService,
  ) {}

  @Get('auth')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ operationId: 'ifoodOAuthUrl', summary: 'URL de autorização OAuth iFood (início do fluxo)' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({ type: IfoodOAuthUrlResponseDto, description: 'URL de redirecionamento OAuth' })
  getAuthUrl(@TenantId() tenantId: string) {
    return this.ifoodService.getAuthUrl(tenantId);
  }

  @Get('callback')
  @ApiPublicEndpoint()
  @ApiOperation({ operationId: 'ifoodOAuthCallback', summary: 'Callback OAuth iFood (público)' })
  @ApiStandardErrorResponses({ omitJwtErrorResponses: true })
  @ApiJsonOkResponse({ type: IfoodOAuthCallbackOkResponseDto, description: 'Tokens persistidos; corpo mínimo `{ ok: true }`' })
  @ApiQuery({ name: 'code', required: true, type: String, description: 'Código de autorização OAuth' })
  @ApiQuery({ name: 'state', required: true, type: String, description: 'Estado anti-CSRF (tenant / nonce)' })
  callback(@Query('code') code?: string, @Query('state') state?: string) {
    if (!code || !state) {
      throw new BadRequestException('code e state são obrigatórios');
    }
    return this.ifoodService.handleCallback(code, state);
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ operationId: 'ifoodStatus', summary: 'Status da integração iFood' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({ type: IfoodIntegrationStatusResponseDto, description: 'Status e metadados da integração' })
  status(@TenantId() tenantId: string) {
    return this.ifoodService.getStatus(tenantId);
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'ifoodDisconnect', summary: 'Desconecta integração iFood' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({ type: IfoodDisconnectOkResponseDto, description: 'Confirmação de desconexão' })
  disconnect(@TenantId() tenantId: string) {
    return this.ifoodService.disconnect(tenantId);
  }

  @Post('auth/refresh')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'ifoodAuthRefresh', summary: 'Renova access token iFood (refresh_token)' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({ type: IfoodAuthActionResultResponseDto, description: 'Tokens renovados' })
  authRefresh(@TenantId() tenantId: string) {
    return this.ifoodService.authAction(tenantId, 'refresh');
  }

  @Post('auth/test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'ifoodAuthTest', summary: 'Testa access token iFood contra API merchant' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({ type: IfoodAuthActionResultResponseDto, description: 'Resultado do teste de conectividade' })
  authTest(@TenantId() tenantId: string) {
    return this.ifoodService.authAction(tenantId, 'test');
  }

  @Post('auth-action')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'ifoodAuthActionLegacy',
    summary: 'Executa ação de autenticação iFood (refresh/test) — legado; preferir POST /ifood/auth/refresh ou /ifood/auth/test',
    deprecated: true,
  })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({ type: IfoodAuthActionResultResponseDto, description: 'Resultado da ação' })
  authAction(@TenantId() tenantId: string, @Body() dto: IfoodAuthActionDto) {
    return this.ifoodService.authAction(tenantId, dto.action);
  }

  @Post('sync-order')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'ifoodSyncOrderStatus',
    summary: 'Sincroniza mudança de status do pedido com a API iFood (pedidos orderSource=ifood)',
  })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({ type: IfoodSyncOrderStatusResponseDto, description: 'Resultado da sincronização' })
  syncOrder(
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: IfoodSyncOrderDto,
  ) {
    if (dto.store_id && dto.store_id !== tenantId) {
      throw new BadRequestException('store_id não confere com o tenant do token');
    }
    return this.ifoodSyncService.syncOrderStatus(dto.order_id, dto.new_status, user.id);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiPublicEndpoint()
  @ApiOperation({
    operationId: 'ifoodWebhook',
    summary: 'Webhook iFood',
    description: 'Validação por `x-ifood-signature` e corpo JSON bruto.',
  })
  @ApiStandardErrorResponses({ omitJwtErrorResponses: true })
  @ApiJsonOkResponse({ type: StripeWebhookAckResponseDto, description: 'Ack do processamento (`{ received: true }`)' })
  @ApiBody({ type: IfoodWebhookPayloadDto, description: 'Evento iFood (formato varia por tipo de notificação)' })
  webhook(
    @Req() req: FastifyRequest & { rawBody?: Buffer },
    @Headers('x-ifood-signature') sig: string,
    @Body() payload: object,
  ) {
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(payload));
    return this.ifoodService.handleWebhook(rawBody, sig, payload as never);
  }
}
