export class SubscriptionCanceledDomainEvent {
  constructor(
    public readonly tenantId: string,
    public readonly email: string | null,
    public readonly planSlug: string,
    public readonly source: 'stripe' | 'cakto',
  ) {}
}
