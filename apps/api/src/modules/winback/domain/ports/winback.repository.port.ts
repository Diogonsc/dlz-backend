export type WinbackLogListItem = {
  id: string;
  store_id: string;
  customer_phone: string;
  customer_name: string;
  coupon_id: string | null;
  channel: string;
  campaign: string | null;
  segment: string | null;
  sent_at: Date;
  converted_at: Date | null;
};

export type CreateWinbackMessageInput = {
  tenantId: string;
  userId: string | null;
  phone: string;
  template: string;
  campaign: string;
  windowKey: string;
  messageBody: string;
  idempotencyKey: string;
};

export type CreateWinbackMessageResult = {
  id: string;
  status: 'pending' | 'sent' | 'failed';
  createdNow: boolean;
  messageBody: string;
};

export abstract class WinbackRepositoryPort {
  abstract getLogs(tenantId: string, limit: number): Promise<WinbackLogListItem[]>;
  abstract getMonthlyCount(tenantId: string): Promise<{ count: number; monthStart: Date }>;
  abstract findCustomerByPhone(
    tenantId: string,
    phoneE164: string,
  ): Promise<{ userId: string | null; name: string | null } | null>;
  abstract createCouponForCampaign(tenantId: string, segment: string): Promise<{ id: string; code: string }>;
  abstract hasRecentMessage(tenantId: string, phone: string, campaign: string, since: Date): Promise<boolean>;
  abstract isOptedOut(tenantId: string, phoneE164: string): Promise<boolean>;
  abstract createWinbackMessage(input: CreateWinbackMessageInput): Promise<CreateWinbackMessageResult>;
  abstract updateWinbackMessageContent(input: {
    messageId: string;
    template: string;
    messageBody: string;
  }): Promise<void>;
  abstract markWinbackMessageSent(messageId: string, providerMessageId: string | null): Promise<void>;
  abstract markWinbackMessageFailed(messageId: string, errorMessage: string): Promise<void>;
  abstract createWinbackLog(input: {
    tenantId: string;
    customerPhone: string;
    customerName: string;
    couponId: string | null;
    campaign: string;
    segment: string;
  }): Promise<void>;
}
