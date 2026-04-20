import { Injectable } from '@nestjs/common';
import { PrismaService } from '@dlz/prisma';
import {
  WinbackRepositoryPort,
  type CreateWinbackMessageInput,
  type CreateWinbackMessageResult,
  type WinbackLogListItem,
} from '../../domain/ports/winback.repository.port';

@Injectable()
export class PrismaWinbackRepository extends WinbackRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getLogs(tenantId: string, limit: number): Promise<WinbackLogListItem[]> {
    const logs = await this.prisma.winbackLog.findMany({
      where: { tenantId },
      orderBy: { sentAt: 'desc' },
      take: limit,
    });
    return logs.map((l: (typeof logs)[number]) => ({
      id: l.id,
      store_id: l.tenantId,
      customer_phone: l.customerPhone,
      customer_name: l.customerName,
      coupon_id: l.couponId,
      channel: l.channel,
      campaign: l.campaign,
      segment: l.segment,
      sent_at: l.sentAt,
      converted_at: l.convertedAt,
    }));
  }

  async getMonthlyCount(tenantId: string): Promise<{ count: number; monthStart: Date }> {
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const count = await this.prisma.winbackLog.count({
      where: { tenantId, sentAt: { gte: monthStart } },
    });
    return { count, monthStart };
  }

  async findCustomerByPhone(
    tenantId: string,
    phoneE164: string,
  ): Promise<{ userId: string | null; name: string | null } | null> {
    const customer = await this.prisma.customerProfile.findFirst({
      where: { tenantId, phoneNormalized: phoneE164 },
      select: { id: true, name: true },
    });
    if (!customer) return null;
    return { userId: customer.id, name: customer.name };
  }

  async createCouponForCampaign(tenantId: string, segment: string): Promise<{ id: string; code: string }> {
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const code = `DLZ-${random}`;
    const couponConfig: Record<string, { discountType: string; discountValue: number }> = {
      at_risk: { discountType: 'fixed', discountValue: 0 },
      inactive: { discountType: 'fixed', discountValue: 10 },
      lost: { discountType: 'percentage', discountValue: 15 },
      payment_failed: { discountType: 'fixed', discountValue: 8 },
      order_status_changed: { discountType: 'fixed', discountValue: 5 },
      manual: { discountType: 'fixed', discountValue: 5 },
    };
    const cfg = couponConfig[segment] ?? couponConfig.manual;
    const coupon = await this.prisma.winbackCoupon.create({
      data: {
        tenantId,
        code,
        discountType: cfg.discountType,
        discountValue: cfg.discountValue,
      },
      select: { id: true, code: true },
    });
    return coupon;
  }

  async hasRecentMessage(tenantId: string, phone: string, campaign: string, since: Date): Promise<boolean> {
    const count = await this.prisma.winbackMessage.count({
      where: {
        tenantId,
        phone,
        campaign,
        createdAt: { gte: since },
        status: { in: ['sent'] },
      },
    });
    return count > 0;
  }

  async isOptedOut(tenantId: string, phoneE164: string): Promise<boolean> {
    const row = await this.prisma.whatsappContact.findUnique({
      where: { tenantId_phoneE164: { tenantId, phoneE164 } },
      select: { optOut: true },
    });
    return Boolean(row?.optOut);
  }

  async createWinbackMessage(input: CreateWinbackMessageInput): Promise<CreateWinbackMessageResult> {
    try {
      const msg = await this.prisma.winbackMessage.create({
        data: {
          tenantId: input.tenantId,
          userId: input.userId,
          phone: input.phone,
          template: input.template,
          campaign: input.campaign,
          windowKey: input.windowKey,
          messageBody: input.messageBody,
          status: 'pending',
          idempotencyKey: input.idempotencyKey,
        },
        select: { id: true, status: true, messageBody: true },
      });
      return {
        id: msg.id,
        status: msg.status as CreateWinbackMessageResult['status'],
        createdNow: true,
        messageBody: msg.messageBody,
      };
    } catch (err) {
      if (typeof err === 'object' && err && 'code' in err && (err as { code?: string }).code === 'P2002') {
        const existing = await this.prisma.winbackMessage.findUniqueOrThrow({
          where: { idempotencyKey: input.idempotencyKey },
          select: { id: true, status: true, messageBody: true },
        });
        return {
          id: existing.id,
          status: existing.status as CreateWinbackMessageResult['status'],
          createdNow: false,
          messageBody: existing.messageBody,
        };
      }
      throw err;
    }
  }

  async updateWinbackMessageContent(input: {
    messageId: string;
    template: string;
    messageBody: string;
  }): Promise<void> {
    await this.prisma.winbackMessage.update({
      where: { id: input.messageId },
      data: {
        template: input.template,
        messageBody: input.messageBody,
      },
    });
  }

  async markWinbackMessageSent(messageId: string, providerMessageId: string | null): Promise<void> {
    await this.prisma.winbackMessage.update({
      where: { id: messageId },
      data: {
        status: 'sent',
        providerMessageId,
        sentAt: new Date(),
      },
    });
  }

  async markWinbackMessageFailed(messageId: string, errorMessage: string): Promise<void> {
    await this.prisma.winbackMessage.update({
      where: { id: messageId },
      data: {
        status: 'failed',
        errorMessage,
      },
    });
  }

  async createWinbackLog(input: {
    tenantId: string;
    customerPhone: string;
    customerName: string;
    couponId: string | null;
    campaign: string;
    segment: string;
  }): Promise<void> {
    await this.prisma.winbackLog.create({
      data: {
        tenantId: input.tenantId,
        customerPhone: input.customerPhone,
        customerName: input.customerName,
        couponId: input.couponId,
        channel: 'whatsapp',
        campaign: input.campaign,
        segment: input.segment,
      },
    });
  }
}
