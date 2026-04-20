import { Injectable, NotFoundException } from '@nestjs/common';
import { SubscriptionRepositoryPort } from '../../domain/ports/subscription.repository.port';

export type ApiEnvelope<T> = {
  data: T | null;
  meta: Record<string, unknown> | null;
  error: { code: string; message: string } | null;
};

/**
 * Resumo de assinatura/plano do tenant (somente dados internos — sem chamada Stripe).
 * Resposta no envelope padrão para novos endpoints; rotas legadas de checkout mantêm `{ url }`.
 */
@Injectable()
export class GetTenantSubscriptionSummaryUseCase {
  constructor(private readonly subscriptions: SubscriptionRepositoryPort) {}

  async execute(tenantId: string): Promise<ApiEnvelope<{ plan: string; status: string; billingEmail: string }>> {
    const row = await this.subscriptions.getTenantBillingSummary(tenantId);
    if (!row) {
      throw new NotFoundException('Tenant não encontrado');
    }
    return {
      data: { plan: row.plan, status: row.status, billingEmail: row.email },
      meta: null,
      error: null,
    };
  }
}
