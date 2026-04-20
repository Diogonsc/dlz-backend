import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface WhatsAppMessage {
  to: string;         // número com ou sem +55
  body: string;
  tenantId?: string;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectQueue('whatsapp') private readonly queue: Queue,
  ) {}

  // ── Enfileira mensagem para envio assíncrono ───────────────────────────────

  async send(msg: WhatsAppMessage) {
    await this.queue.add('send', msg, {
      attempts: 4,
      backoff: { type: 'exponential', delay: 60_000 },
    });
  }

  // ── Envio direto via Meta Cloud API ───────────────────────────────────────

  async sendDirect(to: string, body: string): Promise<{ ok: boolean; messageId?: string; error?: string }> {
    const token = this.config.get<string>('WHATSAPP_TOKEN', '');
    const phoneNumberId = this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID', '');

    if (!token || !phoneNumberId) {
      this.logger.warn('WhatsApp não configurado — mensagem ignorada');
      return { ok: false, error: 'WhatsApp não configurado' };
    }

    const phone = to.replace(/\D/g, '');
    const fullPhone = phone.startsWith('55') ? phone : `55${phone}`;

    try {
      const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: fullPhone,
          type: 'text',
          text: { body: body.length > 4096 ? body.slice(0, 4093) + '...' : body },
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        this.logger.error(`Meta API error ${res.status}: ${err}`);
        return { ok: false, error: `Meta ${res.status}` };
      }

      const data = await res.json() as any;
      const messageId = data.messages?.[0]?.id;
      return { ok: true, messageId };
    } catch (err: any) {
      this.logger.error(`WhatsApp send failed: ${err.message}`);
      return { ok: false, error: err.message };
    }
  }

  // ── Templates de mensagem ─────────────────────────────────────────────────

  buildOrderConfirmation(customerName: string, orderCode: string, total: number): string {
    const firstName = customerName.split(' ')[0];
    return [
      `Olá ${firstName}! 🎉`,
      ``,
      `Seu pedido *#${orderCode}* foi recebido com sucesso!`,
      `Total: *R$ ${total.toFixed(2)}*`,
      ``,
      `Acompanhe o status do seu pedido pelo link:`,
      `${this.config.get('FRONTEND_URL')}/rastrear/${orderCode}`,
      ``,
      `Qualquer dúvida, é só chamar aqui! 😊`,
    ].join('\n');
  }

  buildOrderStatusUpdate(orderCode: string, status: string): string {
    const labels: Record<string, string> = {
      preparing: '👨‍🍳 Seu pedido está sendo preparado!',
      delivery: '🛵 Seu pedido saiu para entrega!',
      delivered: '✅ Pedido entregue! Bom apetite!',
    };
    return labels[status] ?? `Status do pedido *#${orderCode}*: ${status}`;
  }

  buildWinbackMessage(customerName: string, code: string, segment: string): string {
    const firstName = customerName.split(' ')[0] || 'Cliente';
    const msgs: Record<string, string> = {
      at_risk: `Olá ${firstName}! 🚀 Sentimos sua falta! Use o cupom *${code}* e ganhe *FRETE GRÁTIS*! Válido por 48h. 🛵`,
      inactive: `Olá ${firstName}! 😊 Faz tempo que não te vemos! Use *${code}* e ganhe *R$ 10 de desconto*. Válido por 48h! 🎉`,
      lost: `${firstName}, que saudade! 💛 Use *${code}* e ganhe *15% de desconto*! Válido por 48h. 🍕`,
    };
    return msgs[segment] ?? `Olá ${firstName}! Use o cupom *${code}* no próximo pedido!`;
  }
}
