export type SendWhatsAppMessageInput = {
  tenantId: string;
  toPhone: string;
  body: string;
  timeoutMs?: number;
};

export type SendWhatsAppMessageOutput = {
  status: 'sent' | 'failed';
  providerMessageId?: string | null;
  errorMessage?: string | null;
};

export abstract class NotificationGatewayPort {
  abstract sendWhatsAppMessage(input: SendWhatsAppMessageInput): Promise<SendWhatsAppMessageOutput>;
}
