import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Corpo típico retornado pelo `@nestjs/throttler` em 429 (antes dos filtros globais).
 * Após filtros, o formato pode ser normalizado para envelope unificado.
 */
export class RateLimitErrorBodyDto {
  @ApiProperty({ example: 429 })
  statusCode!: number;

  @ApiProperty({ example: 'Too Many Requests' })
  error!: string;

  @ApiProperty({ example: 'ThrottlerException: Too Many Requests' })
  message!: string;

  @ApiPropertyOptional({
    description: 'Segundos até liberar novas tentativas (quando o gateway envia)',
    example: '60',
  })
  retryAfter?: string;
}
