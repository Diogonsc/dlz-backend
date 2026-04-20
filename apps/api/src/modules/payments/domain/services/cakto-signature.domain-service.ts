import { createHmac, timingSafeEqual } from 'crypto';

/** Verificação HMAC Cakto — falhas como Error para mapeamento na camada application. */
export function verifyCaktoWebhookSignature(
  rawBody: Buffer,
  signature: string | null,
  secret: string,
): void {
  if (!secret) return;
  if (!signature) throw new Error('CAKTO_SIGNATURE_MISSING');
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const sigBuf = Buffer.from(signature, 'hex');
  const expBuf = Buffer.from(expected, 'hex');
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    throw new Error('CAKTO_SIGNATURE_INVALID');
  }
}
