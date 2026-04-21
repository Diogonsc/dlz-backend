import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** `GET /domains/status` */
export class DomainTenantStatusResponseDto {
  @ApiProperty({ required: false, example: 'minha-loja' })
  subdomain?: string;

  @ApiProperty({ required: false, nullable: true, example: 'pedidos.minhaloja.com.br' })
  customDomain?: string | null;

  @ApiProperty({ example: 'active', enum: ['none', 'pending', 'active'] })
  domainStatus!: string;

  @ApiProperty({ required: false, example: 'minha-loja' })
  slug?: string;
}

/**
 * `POST /domains/manage` — campos presentes variam por ação (`add` | `remove` | `verify`).
 */
export class DomainManageOperationResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ required: false, example: 'pending' })
  status?: string;

  @ApiProperty({ required: false, description: 'Quando Vercel não configurado (dev)' })
  devMode?: boolean;

  @ApiProperty({ required: false })
  verified?: boolean;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true, example: {} })
  configuration?: Record<string, unknown>;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true, example: {} })
  vercel?: Record<string, unknown>;
}
