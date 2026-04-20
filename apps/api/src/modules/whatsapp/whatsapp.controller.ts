import { Controller, Get, Post, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

@ApiTags('whatsapp')
@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly config: ConfigService) {}

  @Get('webhook')
  @ApiOperation({ summary: 'Verificação do webhook Meta' })
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    const verifyToken = this.config.get<string>('WHATSAPP_WEBHOOK_VERIFY_TOKEN', '');
    if (mode === 'subscribe' && token === verifyToken) {
      return challenge;
    }
    return 'Forbidden';
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recebe mensagens do WhatsApp (Meta Cloud API)' })
  receiveWebhook(@Body() body: any) {
    // Aqui você pode processar mensagens recebidas dos clientes
    // e integrar com o WhatsApp Bot (Fase 5)
    return { received: true };
  }
}
