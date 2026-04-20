import { Inject, Injectable } from '@nestjs/common';
import type { AppConfig } from '../../../../config/app.config';
import { APP_CONFIG } from '../../../../config/app-config.module';
import { StructuredLoggerService } from '../../../../common/observability/structured-logger.service';
import { NotificationGatewayPort, type SendWhatsAppMessageInput, type SendWhatsAppMessageOutput } from '../../domain/ports/notification-gateway.port';
import { TerminalExternalError, TransientExternalError } from '../../domain/errors/notification.errors';

@Injectable()
export class TwilioWhatsAppGateway extends NotificationGatewayPort {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly structured: StructuredLoggerService,
  ) {
    super();
  }

  async sendWhatsAppMessage(input: SendWhatsAppMessageInput): Promise<SendWhatsAppMessageOutput> {
    const sid = this.config.twilio.accountSid;
    const token = this.config.twilio.authToken;
    const from = this.config.twilio.whatsappNumber;
    if (!sid || !token || !from) {
      throw new TerminalExternalError('twilio', 'twilio_not_configured');
    }
    const t0 = Date.now();
    const to = this.normalizePhone(input.toPhone);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 8000);
    try {
      const body = new URLSearchParams({
        From: from.startsWith('whatsapp:') ? from : `whatsapp:${from}`,
        To: `whatsapp:${to}`,
        Body: input.body,
      });
      const auth = Buffer.from(`${sid}:${token}`).toString('base64');
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.text();
        this.structured.warn({
          type: 'external_call',
          provider: 'twilio',
          action: 'send_whatsapp_failed',
          tenantId: input.tenantId,
          durationMs: Date.now() - t0,
          errorMessage: err,
        });
        if (res.status >= 500 || res.status === 429) {
          throw new TransientExternalError('twilio', `twilio_${res.status}`);
        }
        if (this.isOptOutError(err)) {
          throw new TerminalExternalError('twilio', 'twilio_opt_out');
        }
        throw new TerminalExternalError('twilio', `twilio_${res.status}`);
      }
      const data = (await res.json()) as { sid?: string };
      this.structured.log({
        type: 'external_call',
        provider: 'twilio',
        action: 'send_whatsapp',
        tenantId: input.tenantId,
        durationMs: Date.now() - t0,
      });
      return { status: 'sent', providerMessageId: data.sid ?? null };
    } catch (err) {
      if (err instanceof TransientExternalError || err instanceof TerminalExternalError) {
        throw err;
      }
      if (err instanceof Error && err.name === 'AbortError') {
        throw new TransientExternalError('twilio', 'twilio_timeout');
      }
      if (err instanceof Error) {
        throw new TransientExternalError('twilio', err.message);
      }
      this.structured.warn({
        type: 'external_call',
        provider: 'twilio',
        action: 'send_whatsapp_failed',
        tenantId: input.tenantId,
        durationMs: Date.now() - t0,
        errorMessage: err instanceof Error ? err.message : 'unknown_error',
      });
      throw new TransientExternalError('twilio', 'unknown_error');
    } finally {
      clearTimeout(timeout);
    }
  }

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    return digits.startsWith('55') ? `+${digits}` : `+55${digits}`;
  }

  private isOptOutError(errorBody: string): boolean {
    const body = errorBody.toLowerCase();
    return body.includes('21610') || body.includes('opt out');
  }
}
