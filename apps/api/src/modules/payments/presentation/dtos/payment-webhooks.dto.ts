import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Stripe envia o corpo bruto (Buffer); no Swagger documentamos o JSON típico de `event`.
 * O servidor valida assinatura `stripe-signature` e processa o raw body.
 * (Somente documentação — sem class-validator para não interferir no whitelist global.)
 */
export class StripeWebhookEventPayloadDto {
  @ApiPropertyOptional({ example: 'evt_1ABC...' })
  id?: string;

  @ApiPropertyOptional({ example: 'checkout.session.completed' })
  type?: string;

  @ApiPropertyOptional({
    description: 'Objeto do evento (estrutura varia por `type`)',
    type: 'object',
    additionalProperties: true,
  })
  data?: object;
}

/** Payload Cakto — campos reais dependem do evento; mantemos chaves comuns. */
export class CaktoWebhookPayloadDto {
  @ApiPropertyOptional({ example: 'purchase.approved' })
  event?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  data?: object;

  @ApiPropertyOptional({ description: 'Identificadores adicionais enviados pela Cakto' })
  metadata?: object;
}

/** Corpo típico de notificação Mercado Pago (estrutura pode mudar por tópico). */
export class MercadoPagoWebhookPayloadDto {
  @ApiPropertyOptional({ example: 'payment' })
  type?: string;

  @ApiPropertyOptional({ example: '123456789' })
  action?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  data?: object;
}
