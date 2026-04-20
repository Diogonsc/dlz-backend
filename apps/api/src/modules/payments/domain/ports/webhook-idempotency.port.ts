import type { Prisma } from '@prisma/client';

export type WebhookSourceKind = 'stripe' | 'mercadopago' | 'cakto';

/**
 * Garante processamento idempotente de webhooks (entrega HTTP repetida).
 * Em falha após `tryClaim`, chamar `releaseClaim` para permitir retry seguro.
 * `tx` opcional: mesma transação que outbox / pedido (rollback libera o claim).
 */
export abstract class WebhookIdempotencyPort {
  abstract tryClaim(
    source: WebhookSourceKind,
    externalId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<boolean>;

  abstract releaseClaim(
    source: WebhookSourceKind,
    externalId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void>;
}
