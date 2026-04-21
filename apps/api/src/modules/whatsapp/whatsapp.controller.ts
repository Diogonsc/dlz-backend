import { Controller, Get, Post, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiProduces, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { MetaWhatsAppWebhookDto } from './dto/meta-webhook.dto';
import {
  ApiJsonOkResponse,
  ApiPublicEndpoint,
  ApiStandardErrorResponses,
} from '../../common/swagger/http-responses.decorators';
import { StripeWebhookAckResponseDto } from '../../common/dtos/simple-contract.dto';

@ApiTags('whatsapp')
@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly config: ConfigService) {}

  @Get('webhook')
  @ApiPublicEndpoint()
  @ApiOperation({ operationId: 'whatsappMetaWebhookVerify', summary: 'Verificação do webhook Meta (challenge em texto plano)' })
  @ApiProduces('text/plain')
  @ApiStandardErrorResponses({ omitJwtErrorResponses: true })
  @ApiResponse({
    status: 200,
    description: 'Retorna `hub.challenge` quando verificado; caso contrário texto "Forbidden"',
    content: { 'text/plain': { schema: { type: 'string' } } },
  })
  @ApiQuery({ name: 'hub.mode', required: true, type: String, example: 'subscribe' })
  @ApiQuery({ name: 'hub.verify_token', required: true, type: String })
  @ApiQuery({ name: 'hub.challenge', required: true, type: String })
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
  @ApiPublicEndpoint()
  @ApiOperation({
    operationId: 'whatsappMetaWebhookReceive',
    summary: 'Recebe mensagens do WhatsApp (Meta Cloud API)',
    description: 'Payload segue o formato oficial Meta; campos variam por tipo de evento.',
  })
  @ApiStandardErrorResponses({ omitJwtErrorResponses: true })
  @ApiJsonOkResponse({ type: StripeWebhookAckResponseDto, description: 'Ack de recebimento' })
  @ApiBody({ type: MetaWhatsAppWebhookDto, description: 'Corpo JSON bruto enviado pela Meta' })
  receiveWebhook(@Body() _body: object) {
    return { received: true };
  }
}
