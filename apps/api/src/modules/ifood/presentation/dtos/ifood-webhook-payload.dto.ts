import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * iFood envia diversos formatos por tipo de evento.
 * Documentação orientativa — o handler aceita JSON arbitrário em runtime.
 */
export class IfoodWebhookPayloadDto {
  @ApiPropertyOptional({ example: 'PLC' })
  code?: string;

  @ApiPropertyOptional({ example: 'ORDER_STATUS' })
  event?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  order?: object;
}
