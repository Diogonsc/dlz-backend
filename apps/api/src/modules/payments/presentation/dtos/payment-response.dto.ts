import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BillingSummaryDataDto {
  @ApiProperty({ example: 'starter' })
  plan!: string;

  @ApiProperty({ example: 'active' })
  status!: string;

  @ApiProperty({ example: 'dono@loja.com' })
  billingEmail!: string;
}

export class BillingSummaryErrorDto {
  @ApiProperty({ example: 'NOT_FOUND' })
  code!: string;

  @ApiProperty({ example: 'Tenant não encontrado' })
  message!: string;
}

/** Resposta do GET payments/billing/summary (envelope interno do caso de uso). */
export class BillingSubscriptionSummaryResponseDto {
  @ApiProperty({ type: BillingSummaryDataDto, nullable: true })
  data!: BillingSummaryDataDto | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Metadados (atualmente null)',
    type: 'object',
    additionalProperties: { type: 'string' },
    example: null,
  })
  meta!: Record<string, string> | null;

  @ApiProperty({ type: BillingSummaryErrorDto, nullable: true })
  error!: BillingSummaryErrorDto | null;
}

export class StripeUrlNullableResponseDto {
  @ApiPropertyOptional({ nullable: true, example: 'https://checkout.stripe.com/...' })
  url!: string | null;
}

export class MercadoPagoPreferenceResponseDto {
  @ApiProperty({ example: '1234-abc-pref' })
  preferenceId!: string;

  @ApiPropertyOptional({ nullable: true, example: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=...' })
  initPoint!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=...' })
  sandboxInitPoint!: string | null;
}
