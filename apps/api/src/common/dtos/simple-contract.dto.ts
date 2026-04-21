import { ApiProperty } from '@nestjs/swagger';

/** Corpo típico de ack de webhook Stripe (`{ received: true }`). */
export class StripeWebhookAckResponseDto {
  @ApiProperty({ example: true })
  received!: boolean;
}

/** Ack genérico com flag \`ok\`. */
export class OkFlagResponseDto {
  @ApiProperty({ example: true })
  ok!: boolean;
}

/** Payload mínimo com URL (portal, checkout, OAuth). */
export class UrlPayloadResponseDto {
  @ApiProperty({ example: 'https://billing.stripe.com/session/...' })
  url!: string;
}

/** Payload mínimo com id (ex.: comanda aberta). */
export class IdResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;
}
