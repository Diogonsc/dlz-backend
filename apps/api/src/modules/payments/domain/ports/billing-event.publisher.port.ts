import type { PaymentApprovedDomainEvent } from '../events/payment-approved.domain-event';
import type { PaymentFailedDomainEvent } from '../events/payment-failed.domain-event';
import type { SubscriptionUpdatedDomainEvent } from '../events/subscription-updated.domain-event';
import type { SubscriptionCanceledDomainEvent } from '../events/subscription-canceled.domain-event';

export abstract class BillingEventPublisherPort {
  abstract publishPaymentApproved(event: PaymentApprovedDomainEvent): void;

  abstract publishPaymentFailed(event: PaymentFailedDomainEvent): void;

  abstract publishSubscriptionUpdated(event: SubscriptionUpdatedDomainEvent): void;

  abstract publishSubscriptionCanceled(event: SubscriptionCanceledDomainEvent): void;
}
