import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { WhatsappContactsService } from '../../application/services/whatsapp-contacts.service';
import { SendMessageDto } from '../dtos/send-message.dto';

@ApiTags('whatsapp-contacts')
@Controller('whatsapp-contacts')
export class WhatsappContactsController {
  constructor(private readonly service: WhatsappContactsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lista contatos WhatsApp da loja' })
  getContacts(@TenantId() tenantId: string, @Query('page') page = 1, @Query('limit') limit = 50) {
    return this.service.getContacts(tenantId, +page, +limit);
  }

  @Get('messages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Histórico de mensagens de um contato' })
  getMessages(@TenantId() tenantId: string, @Query('phone') phone: string) {
    return this.service.getMessages(tenantId, phone);
  }

  @Post('send')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Envia mensagem WhatsApp para um contato' })
  send(@TenantId() tenantId: string, @Body() dto: SendMessageDto) {
    return this.service.sendMessage(tenantId, dto);
  }

  @Post('twilio/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook Twilio WhatsApp (inbound)' })
  twilioWebhook(@Req() req: any, @Headers('x-twilio-signature') sig: string, @Query('store_id') storeId?: string) {
    const rawBody = req.rawBody?.toString() ?? '';
    return this.service.handleTwilioWebhook(rawBody, sig, storeId);
  }

  @Post('twilio/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Twilio status callback (delivery status)' })
  twilioStatus(@Body() body: Record<string, string>) {
    return this.service.handleTwilioStatusCallback(body);
  }
}
