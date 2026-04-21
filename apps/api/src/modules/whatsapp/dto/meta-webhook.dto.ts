import { ApiPropertyOptional } from '@nestjs/swagger';

/** Payload genérico Meta Cloud API — estrutura varia; documentação ilustrativa. */
export class MetaWhatsAppWebhookDto {
  @ApiPropertyOptional({ example: 'whatsapp_business_account' })
  object?: string;

  @ApiPropertyOptional({
    description: 'Lista de alterações (formato oficial Meta)',
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  entry?: object[];
}
