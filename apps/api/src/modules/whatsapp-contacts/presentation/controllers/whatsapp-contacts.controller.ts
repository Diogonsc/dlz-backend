import { SkipThrottle } from '@nestjs/throttler';
import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { TenantId } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { WhatsappContactsService } from '../../application/services/whatsapp-contacts.service';
import { SendMessageDto } from '../dtos/send-message.dto';
import {
  ApiJsonOkResponse,
  ApiPublicEndpoint,
  ApiStandardErrorResponses,
} from '../../../../common/swagger/http-responses.decorators';
import { OkFlagResponseDto } from '../../../../common/dtos/simple-contract.dto';
import {
  WhatsappContactsListResponseDto,
  WhatsappMessagesListResponseDto,
  WhatsappSendMessageResponseDto,
} from '../dtos/whatsapp-contacts-response.dto';

@ApiTags('whatsapp-contacts')
@SkipThrottle()
@Controller('whatsapp-contacts')
export class WhatsappContactsController {
  constructor(private readonly service: WhatsappContactsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ operationId: 'whatsappContactsList', summary: 'Lista contatos WhatsApp da loja' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({ type: WhatsappContactsListResponseDto, description: 'Contatos paginados' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  getContacts(@TenantId() tenantId: string, @Query('page') page = 1, @Query('limit') limit = 50) {
    return this.service.getContacts(tenantId, +page, +limit);
  }

  @Get('messages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ operationId: 'whatsappContactMessages', summary: 'Histórico de mensagens de um contato' })
  @ApiStandardErrorResponses({ notFound: true })
  @ApiJsonOkResponse({ type: WhatsappMessagesListResponseDto, description: 'Mensagens ordenadas' })
  @ApiQuery({
    name: 'phone',
    required: true,
    type: String,
    description: 'Telefone do contato (formato armazenado)',
  })
  getMessages(@TenantId() tenantId: string, @Query('phone') phone: string) {
    return this.service.getMessages(tenantId, phone);
  }

  @Post('send')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ operationId: 'whatsappContactSend', summary: 'Envia mensagem WhatsApp para um contato' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({ type: WhatsappSendMessageResponseDto, description: 'Mensagem enfileirada / enviada' })
  send(@TenantId() tenantId: string, @Body() dto: SendMessageDto) {
    return this.service.sendMessage(tenantId, dto);
  }

  @Post('twilio/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('application/x-www-form-urlencoded', 'multipart/form-data')
  @ApiPublicEndpoint()
  @ApiOperation({
    operationId: 'whatsappTwilioInboundWebhook',
    summary: 'Webhook Twilio WhatsApp (inbound)',
    description:
      'Twilio envia `application/x-www-form-urlencoded`. O servidor usa o raw body para validar `x-twilio-signature`.',
  })
  @ApiStandardErrorResponses({ omitJwtErrorResponses: true })
  @ApiJsonOkResponse({ type: OkFlagResponseDto, description: 'Ack Twilio' })
  @ApiQuery({
    name: 'store_id',
    required: false,
    type: String,
    description: 'Tenant correlacionado quando presente na URL de callback',
  })
  twilioWebhook(
    @Req() req: FastifyRequest & { rawBody?: Buffer },
    @Headers('x-twilio-signature') sig: string,
    @Query('store_id') storeId?: string,
  ) {
    const rawBody = req.rawBody?.toString() ?? '';
    return this.service.handleTwilioWebhook(rawBody, sig, storeId);
  }

  @Post('twilio/status')
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('application/x-www-form-urlencoded')
  @ApiPublicEndpoint()
  @ApiOperation({ operationId: 'whatsappTwilioStatusWebhook', summary: 'Twilio status callback (delivery status)' })
  @ApiStandardErrorResponses({ omitJwtErrorResponses: true })
  @ApiJsonOkResponse({ type: OkFlagResponseDto, description: 'Ack de status' })
  @ApiBody({
    description:
      'Form-urlencoded Twilio (ex.: MessageSid, MessageStatus, To, From). Campos adicionais são strings.',
    schema: { type: 'object', additionalProperties: { type: 'string' } },
  })
  twilioStatus(@Body() body: Record<string, string>) {
    return this.service.handleTwilioStatusCallback(body);
  }
}
