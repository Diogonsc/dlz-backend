import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Erro HTTP no formato legado (API_RESPONSE_ENVELOPE desligado — padrão). */
export class LegacyHttpErrorDto {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({ example: 'Bad Request' })
  error!: string;

  @ApiProperty({
    type: 'string',
    description:
      'Mensagem do erro. Em validação, o servidor pode agregar múltiplas falhas em uma única string.',
    example: 'Mensagem de validação',
  })
  message!: string | string[];

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: '/api/v1/orders' })
  path!: string;

  @ApiPropertyOptional({ nullable: true, example: '01HX...' })
  correlationId?: string | null;
}

/** Bloco `error` quando envelope de erro está ativo (`API_RESPONSE_ENVELOPE` ou `API_UNIFIED_ERROR_BODY`). */
export class EnvelopeErrorBlockDto {
  @ApiProperty({ example: 'Cupom inválido' })
  message!: string;

  @ApiProperty({ example: 'DOMAIN_ERROR' })
  code!: string;

  @ApiPropertyOptional({
    description: 'Detalhes adicionais (mapa string→string; contrato estável para SDK)',
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { field: 'couponCode', reason: 'Cupom inválido' },
  })
  details?: Record<string, string>;

  @ApiPropertyOptional({
    nullable: true,
    example: '01HX...',
    description: 'Rastreio de requisição (observabilidade)',
  })
  correlationId?: string | null;
}

/** Corpo completo de erro com envelope ativo. */
export class FullEnvelopeErrorResponseDto {
  /** JSON sempre `null`; `type: String` no decorator evita metadata sem tipo (plugin Swagger + `null` sem `design:type`). */
  @ApiProperty({
    type: String,
    nullable: true,
    example: null,
    description: 'Sempre null em erro',
  })
  data!: null;

  @ApiProperty({ type: EnvelopeErrorBlockDto })
  error!: EnvelopeErrorBlockDto;
}
