import { Injectable } from '@nestjs/common';
import { StructuredLoggerService } from '../../../../common/observability/structured-logger.service';
import { getObservabilityContext } from '../../../../common/observability/request-context.storage';
import { NotificationGatewayPort } from '../../domain/ports/notification-gateway.port';
import { WinbackRepositoryPort } from '../../domain/ports/winback.repository.port';
import { buildWinbackMessage } from '../mappers/winback-message.mapper';
import { TerminalExternalError, TransientExternalError } from '../../domain/errors/notification.errors';

@Injectable()
export class SendWinbackMessageUseCase {
  private static readonly PENDING_TEMPLATE = '__pending_template__';
  private static readonly PENDING_MESSAGE_BODY = '__pending_message_body__';

  constructor(
    private readonly repo: WinbackRepositoryPort,
    private readonly notificationGateway: NotificationGatewayPort,
    private readonly structured: StructuredLoggerService,
  ) {}

  async execute(input: {
    tenantId: string;
    phone: string;
    segment: string;
    campaign: string;
    triggerType?: string;
    userId?: string | null;
    customerName?: string | null;
    storeName?: string | null;
  }): Promise<{ sent: boolean; reason?: string }> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const normalizedPhone = input.phone.replace(/\D/g, '');
    const windowKey = now.toISOString().slice(0, 10);
    const triggerType = input.triggerType ?? 'unknown_trigger';
    const idempotencyKey = `winback:${input.tenantId}:${input.userId ?? normalizedPhone}:${input.campaign}:${triggerType}:${windowKey}`;

    const alreadySent = await this.repo.hasRecentMessage(input.tenantId, normalizedPhone, input.campaign, windowStart);
    if (alreadySent) {
      return { sent: false, reason: 'duplicate_recent' };
    }

    const optedOut = await this.repo.isOptedOut(input.tenantId, normalizedPhone);
    if (optedOut) {
      this.structured.warn({
        type: 'winback',
        action: 'failed',
        tenantId: input.tenantId,
        userId: input.userId ?? null,
        correlationId: getObservabilityContext()?.correlationId ?? null,
        reason: 'opt_out',
      });
      return { sent: false, reason: 'opted_out' };
    }

    const msg = await this.repo.createWinbackMessage({
      tenantId: input.tenantId,
      userId: input.userId ?? null,
      phone: normalizedPhone,
      template: SendWinbackMessageUseCase.PENDING_TEMPLATE,
      campaign: input.campaign,
      windowKey,
      messageBody: SendWinbackMessageUseCase.PENDING_MESSAGE_BODY,
      idempotencyKey,
    });
    if (msg.status === 'sent') {
      return { sent: false, reason: 'idempotent_conflict' };
    }

    const customer = await this.repo.findCustomerByPhone(input.tenantId, normalizedPhone);
    let messageBody = msg.messageBody;
    let couponId: string | null = null;
    if (msg.createdNow) {
      const coupon = await this.repo.createCouponForCampaign(input.tenantId, input.segment);
      couponId = coupon.id;
      const message = buildWinbackMessage({
        customerName: input.customerName ?? customer?.name ?? null,
        couponCode: coupon.code,
        segment: input.segment,
        storeName: input.storeName ?? null,
      });
      messageBody = message.body;
      await this.repo.updateWinbackMessageContent({
        messageId: msg.id,
        template: message.template,
        messageBody: message.body,
      });
    } else if (messageBody === SendWinbackMessageUseCase.PENDING_MESSAGE_BODY) {
      throw new TransientExternalError('winback', 'message_not_ready');
    }

    try {
      const out = await this.notificationGateway.sendWhatsAppMessage({
        tenantId: input.tenantId,
        toPhone: normalizedPhone,
        body: messageBody,
        timeoutMs: 8000,
      });

      if (out.status === 'sent') {
        await this.repo.markWinbackMessageSent(msg.id, out.providerMessageId ?? null);
        await this.repo.createWinbackLog({
          tenantId: input.tenantId,
          customerPhone: normalizedPhone,
          customerName: input.customerName ?? customer?.name ?? '',
          couponId,
          campaign: input.campaign,
          segment: input.segment,
        });
        this.structured.log({
          type: 'winback',
          action: 'sent',
          tenantId: input.tenantId,
          userId: input.userId ?? customer?.userId ?? null,
          correlationId: getObservabilityContext()?.correlationId ?? null,
        });
        return { sent: true };
      }

      await this.repo.markWinbackMessageFailed(msg.id, out.errorMessage ?? 'unknown_error');
      this.structured.warn({
        type: 'winback',
        action: 'failed',
        tenantId: input.tenantId,
        userId: input.userId ?? customer?.userId ?? null,
        correlationId: getObservabilityContext()?.correlationId ?? null,
        errorMessage: out.errorMessage ?? 'unknown_error',
      });
      return { sent: false, reason: 'gateway_failed' };
    } catch (err) {
      if (err instanceof TerminalExternalError) {
        await this.repo.markWinbackMessageFailed(msg.id, err.message);
        this.structured.warn({
          type: 'winback',
          action: 'failed',
          tenantId: input.tenantId,
          userId: input.userId ?? customer?.userId ?? null,
          correlationId: getObservabilityContext()?.correlationId ?? null,
          errorMessage: err.message,
        });
        return { sent: false, reason: 'terminal_error' };
      }
      if (err instanceof TransientExternalError) {
        this.structured.warn({
          type: 'winback',
          action: 'retry',
          tenantId: input.tenantId,
          userId: input.userId ?? customer?.userId ?? null,
          correlationId: getObservabilityContext()?.correlationId ?? null,
          reason: 'retry_transient',
          errorMessage: err.message,
        });
      }
      throw err;
    }
  }
}
