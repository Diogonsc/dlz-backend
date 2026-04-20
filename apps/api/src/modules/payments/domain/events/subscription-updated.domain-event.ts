export class SubscriptionUpdatedDomainEvent {
  constructor(
    public readonly tenantId: string | null,
    public readonly email: string | null,
    public readonly planSlug: string,
    public readonly tenantStatus: string,
    public readonly source: 'stripe' | 'cakto',
  ) {}
}
