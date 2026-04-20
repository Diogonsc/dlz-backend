export type PlanRow = {
  id: string;
  slug: string;
  stripePriceId: string | null;
};

export abstract class SubscriptionRepositoryPort {
  abstract findPlanByStripePriceId(priceId: string): Promise<PlanRow | null>;

  abstract findPlanBySlug(slug: string): Promise<PlanRow | null>;

  abstract updateTenantPlanById(
    tenantId: string,
    planSlug: string,
    status: string,
  ): Promise<void>;

  abstract updateTenantsPlanByEmail(email: string, planSlug: string, status: string): Promise<void>;

  abstract downgradeTenantsByEmail(email: string): Promise<void>;

  /** Tenants com o email de faturação (para eventos tenant-scoped). */
  abstract findTenantIdsByEmail(email: string): Promise<string[]>;

  abstract getTenantBillingSummary(tenantId: string): Promise<{
    plan: string;
    status: string;
    email: string;
  } | null>;
}
