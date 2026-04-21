import { ApiProperty } from '@nestjs/swagger';

/**
 * Forma de sucesso quando `API_RESPONSE_ENVELOPE=true`.
 * O campo `data` replica o payload documentado em cada endpoint (JSON “cru” quando o envelope está desligado).
 */
export class SuccessEnvelopeWrapperDto {
  @ApiProperty({
    description: 'Payload de negócio (mesmo JSON retornado sem envelope)',
    type: 'object',
    additionalProperties: true,
  })
  data!: object;

  /** JSON sempre `null`; `type: String` evita metadata sem tipo no plugin Swagger. */
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Em sucesso com envelope: sempre null',
    example: null,
  })
  error!: null;
}
