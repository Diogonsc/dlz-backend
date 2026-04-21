import { ApiProperty } from '@nestjs/swagger';

/** `GET /payment-gateways/mp/availability` */
export class MpCheckoutAvailabilityResponseDto {
  @ApiProperty({ example: true })
  available!: boolean;

  @ApiProperty({ example: 'sandbox' })
  environment!: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'boolean' },
    example: { credit_card: true, debit_card: true, pix: true },
  })
  enabledMethods!: Record<string, boolean>;
}

/** `GET /payment-gateways/stripe/subscription` */
export class StripeUserSubscriptionCheckResponseDto {
  @ApiProperty({ example: false })
  subscribed!: boolean;

  @ApiProperty({ required: false, description: 'Presente quando `subscribed: true`' })
  productId?: string;

  @ApiProperty({ required: false })
  priceId?: string;

  @ApiProperty({ required: false, example: '2026-05-01T00:00:00.000Z' })
  subscriptionEnd?: string;
}

/** `POST /payment-gateways/resume-checkout` */
export class ResumeCaktoCheckoutResponseDto {
  @ApiProperty({ required: false, example: true, description: 'Quando a loja já não está em pending_payment' })
  active?: boolean;

  @ApiProperty({ required: false, example: 'Loja já está ativa' })
  message?: string;

  @ApiProperty({ required: false, example: 'https://pay.cakto.com.br/...' })
  checkoutUrl?: string;

  @ApiProperty({ required: false })
  tenantId?: string;
}
