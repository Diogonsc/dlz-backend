import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@dlz/prisma';
import { Queue } from 'bullmq';
import { SendMessageDto } from '../../presentation/dtos/send-message.dto';

@Injectable()
export class WhatsappContactsService {
  private readonly logger = new Logger(WhatsappContactsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue('whatsapp-contacts') private readonly queue: Queue,
  ) {}

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

  async sendMessage(tenantId: string, dto: SendMessageDto) {
    const phoneE164 = this.normalizePhone(dto.phone);

    const contact = await this.prisma.whatsappContact.findUnique({
      where: { tenantId_phoneE164: { tenantId, phoneE164 } },
    });
    if (contact?.optOut) {
      return { ok: false, reason: 'opt-out' };
    }

    await this.queue.add('send', {
      tenantId,
      phoneE164,
      messageBody: dto.message,
      campaignKey: dto.campaignKey,
    });

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

  async handleTwilioWebhook(rawBody: string, signature: string | null, tenantId?: string) {
    const params = Object.fromEntries(new URLSearchParams(rawBody));
    const from = params['From']?.replace('whatsapp:', '').replace('+', '') ?? '';
    const body = params['Body'] ?? '';
    const messageSid = params['MessageSid'];

    if (!from) return { ok: true };

    if (tenantId) {
      await this.prisma.whatsappMessage
        .create({
          data: {
            tenantId,
            phoneE164: from,
            direction: 'inbound',
            message: body,
            status: 'received',
            provider: 'twilio',
            messageSid,
          },
        })
        .catch(() => {});

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

    const data = (await res.json()) as any;
    return { ok: res.ok, messageId: data?.messages?.[0]?.id };
  }

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    return digits.startsWith('55') ? digits : `55${digits}`;
  }
}
