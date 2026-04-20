export abstract class TenantPaymentConfigRepositoryPort {
  abstract getMercadoPagoAccessToken(tenantId: string): Promise<string>;

  /** Credenciais MP ativas e não vazias (access + public key). */
  abstract hasMercadoPagoConfig(tenantId: string): Promise<boolean>;

  /** Lista tenants MP ativos priorizando configurações recentes. */
  abstract findActiveMercadoPagoTenants(limit: number): Promise<string[]>;

  abstract getMercadoPagoWebhookSecret(tenantId: string): Promise<string>;
}
