import { Module } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { Controller, Get, Post, Delete, Body, Query, UseGuards, HttpCode, HttpStatus, Headers, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@dlz/prisma';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BullModule } from '@nestjs/bullmq';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';
import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { createHmac } from 'crypto';

// ── DTOs ─────────────────────────────────────────────────────────────────────

class SendMessageDto {
  @IsString() phone: string;
  @IsString() message: string;
  @IsOptional() @IsString() campaignKey?: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class WhatsappContactsService {
  private readonly logger = new Logger(WhatsappContactsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue('whatsapp-contacts') private readonly queue: Queue,
  ) {}

  // ── Contatos ───────────────────────────────────────────────────────────────

  async getContacts(tenantId: string, page = 1, limit = 50) {
    const [data, total] = await Promise.all([
      this.prisma.whatsappContact.findMany({
        where: { tenantId },
        orderBy: { lastInteraction: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.whatsappContact.count({ where: { tenantId } }),
    ]);
    return { data, meta: { total, page, limit } };
  }

  async getMessages(tenantId: string, phone: string, page = 1, limit = 30) {
    const phoneE164 = this.normalizePhone(phone);
    const [data, total] = await Promise.all([
      this.prisma.whatsappMessage.findMany({
        where: { tenantId, phoneE164 },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.whatsappMessage.count({ where: { tenantId, phoneE164 } }),
    ]);
    return { data, meta: { total, page, limit } };
  }

  // ── Envio ──────────────────────────────────────────────────────────────────

  async sendMessage(tenantId: string, dto: SendMessageDto) {
    const phoneE164 = this.normalizePhone(dto.phone);

    // Verifica opt-out
    const contact = await this.prisma.whatsappContact.findUnique({
      where: { tenantId_phoneE164: { tenantId, phoneE164 } },
    });
    if (contact?.optOut) {
      return { ok: false, reason: 'opt-out' };
    }

    // Enfileira via BullMQ
    await this.queue.add('send', {
      tenantId,
      phoneE164,
      messageBody: dto.message,
      campaignKey: dto.campaignKey,
    });

    // Salva na fila DB
    await this.prisma.whatsappOutboundQueue.create({
      data: {
        tenantId,
        phoneE164,
        messageBody: dto.message,
        campaignKey: dto.campaignKey,
        status: 'pending',
      },
    });

    return { ok: true, queued: true };
  }

  // ── Twilio Webhook ─────────────────────────────────────────────────────────

  async handleTwilioWebhook(rawBody: string, signature: string | null, tenantId?: string) {
    const params = Object.fromEntries(new URLSearchParams(rawBody));
    const from = params['From']?.replace('whatsapp:', '').replace('+', '') ?? '';
    const body = params['Body'] ?? '';
    const messageSid = params['MessageSid'];

    if (!from) return { ok: true };

    // Salva mensagem inbound
    if (tenantId) {
      await this.prisma.whatsappMessage.create({
        data: {
          tenantId,
          phoneE164: from,
          direction: 'inbound',
          message: body,
          status: 'received',
          provider: 'twilio',
          messageSid,
        },
      }).catch(() => {});

      // Processa opt-out
      const lowerBody = body.trim().toLowerCase();
      if (['parar', 'stop', 'cancelar'].includes(lowerBody)) {
        await this.prisma.whatsappContact.upsert({
          where: { tenantId_phoneE164: { tenantId, phoneE164: from } },
          create: { tenantId, phoneE164: from, optOut: true, optIn: false },
          update: { optOut: true, optIn: false },
        });
        this.logger.log(`Opt-out: ${from} de ${tenantId}`);
      } else if (['voltar', 'start', 'receber'].includes(lowerBody)) {
        await this.prisma.whatsappContact.upsert({
          where: { tenantId_phoneE164: { tenantId, phoneE164: from } },
          create: { tenantId, phoneE164: from, optIn: true, optOut: false },
          update: { optIn: true, optOut: false, lastInteraction: new Date() },
        });
      }
    }

    return { ok: true };
  }

  // ── Twilio Status Callback ─────────────────────────────────────────────────

  async handleTwilioStatusCallback(params: Record<string, string>) {
    const messageSid = params['MessageSid'];
    const status = params['MessageStatus'];
    if (!messageSid) return { ok: true };

    await this.prisma.whatsappMessage.updateMany({
      where: { messageSid },
      data: { status: status ?? 'unknown' },
    });

    return { ok: true };
  }

  // ── Envio direto via Meta ──────────────────────────────────────────────────

  async sendViaMeta(to: string, body: string): Promise<{ ok: boolean; messageId?: string }> {
    const token = this.config.get<string>('WHATSAPP_TOKEN', '');
    const phoneNumberId = this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID', '');
    if (!token || !phoneNumberId) return { ok: false };

    const phone = to.startsWith('55') ? to : `55${to.replace(/\D/g, '')}`;
    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'text', text: { body } }),
    });

    const data = await res.json() as any;
    return { ok: res.ok, messageId: data?.messages?.[0]?.id };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    return digits.startsWith('55') ? digits : `55${digits}`;
  }
}

// ── Controller ────────────────────────────────────────────────────────────────

@ApiTags('whatsapp-contacts')
@Controller('whatsapp-contacts')
class WhatsappContactsController {
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
  twilioWebhook(
    @Req() req: any,
    @Headers('x-twilio-signature') sig: string,
    @Query('store_id') storeId?: string,
  ) {
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

// ── Module ────────────────────────────────────────────────────────────────────

@Module({
  imports: [BullModule.registerQueue({ name: 'whatsapp-contacts' })],
  controllers: [WhatsappContactsController],
  providers: [WhatsappContactsService],
  exports: [WhatsappContactsService],
})
export class WhatsappContactsModule {}
