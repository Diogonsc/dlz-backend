import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { CurrentUser, TenantId } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { IfoodService } from '../../application/services/ifood.service';
import { IfoodSyncService } from '../../ifood-sync.service';
import { IfoodAuthActionDto } from '../dtos/ifood-auth-action.dto';
import { IfoodSyncOrderDto } from '../dtos/ifood-sync-order.dto';

@ApiTags('ifood')
@Controller('ifood')
export class IfoodController {
  constructor(
    private readonly ifoodService: IfoodService,
    private readonly ifoodSyncService: IfoodSyncService,
  ) {}

  @Get('auth')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'URL de autorização OAuth iFood (início do fluxo)' })
  getAuthUrl(@TenantId() tenantId: string) {
    return this.ifoodService.getAuthUrl(tenantId);
  }

  @Get('callback')
  @ApiOperation({ summary: 'Callback OAuth iFood' })
  callback(@Req() req: FastifyRequest) {
    const q = req.query as { code?: string; state?: string };
    if (!q.code || !q.state) {
      throw new BadRequestException('code e state são obrigatórios');
    }
    return this.ifoodService.handleCallback(q.code, q.state);
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Status da integração iFood' })
  status(@TenantId() tenantId: string) {
    return this.ifoodService.getStatus(tenantId);
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desconecta integração iFood' })
  disconnect(@TenantId() tenantId: string) {
    return this.ifoodService.disconnect(tenantId);
  }

  @Post('auth/refresh')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renova access token iFood (refresh_token)' })
  authRefresh(@TenantId() tenantId: string) {
    return this.ifoodService.authAction(tenantId, 'refresh');
  }

  @Post('auth/test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Testa access token iFood contra API merchant' })
  authTest(@TenantId() tenantId: string) {
    return this.ifoodService.authAction(tenantId, 'test');
  }

  @Post('auth-action')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Executa ação de autenticação iFood (refresh/test) — legado; preferir POST /ifood/auth/refresh ou /ifood/auth/test',
    deprecated: true,
  })
  authAction(@TenantId() tenantId: string, @Body() dto: IfoodAuthActionDto) {
    return this.ifoodService.authAction(tenantId, dto.action);
  }

  @Post('sync-order')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sincroniza mudança de status do pedido com a API iFood (pedidos orderSource=ifood)' })
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
  @ApiOperation({ summary: 'Webhook iFood' })
  webhook(
    @Req() req: FastifyRequest & { rawBody?: Buffer },
    @Headers('x-ifood-signature') sig: string,
    @Body() payload: Record<string, unknown>,
  ) {
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(payload));
    return this.ifoodService.handleWebhook(rawBody, sig, payload);
  }
}
