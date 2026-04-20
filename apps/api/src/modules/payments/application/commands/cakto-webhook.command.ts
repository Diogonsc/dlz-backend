export type CaktoWebhookCommand = {
  rawBody: Buffer;
  signature: string | null;
  timestamp?: string | null;
  nonce?: string | null;
  payload: {
    event: string;
    checkoutUrl?: string;
    offer?: { id?: string };
    product?: { name?: string };
    customer?: { email?: string; name?: string };
    subscription?: { status?: string };
  };
};
