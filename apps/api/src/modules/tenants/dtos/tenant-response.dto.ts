import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StoreConfigResponseDto } from '../../stores/dtos/store-response.dto';

const TENANT_PLAN = ['starter', 'pro', 'agency'] as const;
const TENANT_STATUS = ['active', 'trial', 'inactive', 'pending_payment'] as const;

/** Tenant persistido (campos escalares). */
export class TenantPersistedResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'Loja Demo' })
  name!: string;

  @ApiProperty({ example: 'Dono' })
  owner!: string;

  @ApiProperty({ example: 'loja@exemplo.com' })
  email!: string;

  @ApiProperty({ example: '+5511999999999' })
  phone!: string;

  @ApiProperty({ enum: TENANT_PLAN, example: 'starter' })
  plan!: (typeof TENANT_PLAN)[number];

  @ApiPropertyOptional({ nullable: true, example: '550e8400-e29b-41d4-a716-446655440001' })
  planId?: string | null;

  @ApiProperty({ enum: TENANT_STATUS, example: 'trial' })
  status!: (typeof TENANT_STATUS)[number];

  @ApiProperty({ example: '' })
  url!: string;

  @ApiPropertyOptional({ nullable: true, example: 'demo' })
  subdomain?: string | null;

  @ApiProperty({ example: 'none' })
  domainStatus!: string;

  @ApiPropertyOptional({ nullable: true, example: '2026-05-01T00:00:00.000Z' })
  trialEndsAt?: string | null;

  @ApiProperty({ example: '' })
  since!: string;

  @ApiProperty({ example: '0.00', description: 'Receita acumulada (decimal como string)' })
  revenue!: string;

  @ApiProperty({ example: 0 })
  orders!: number;

  @ApiProperty({ example: '0.00' })
  mrr!: string;

  @ApiPropertyOptional({ nullable: true, example: 'https://cdn.example.com/t.png' })
  avatar?: string | null;

  @ApiProperty({ example: '#1a1a2e' })
  themePrimary!: string;

  @ApiProperty({ example: '#e8a838' })
  themeAccent!: string;

  @ApiPropertyOptional({ nullable: true, example: '550e8400-e29b-41d4-a716-446655440002' })
  userId?: string | null;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  updatedAt!: string;
}

export class TenantUserEmailResponseDto {
  @ApiProperty({ example: 'dono@loja.com' })
  email!: string;
}

export class TenantOrdersCountResponseDto {
  @ApiProperty({ example: 12, description: 'Quantidade de pedidos (relação ordersRel)' })
  ordersRel!: number;
}

/** Tenant com \`store_config\` e contagens (lista admin). */
export class TenantWithStoreConfigResponseDto extends TenantPersistedResponseDto {
  @ApiPropertyOptional({ type: StoreConfigResponseDto })
  storeConfig?: StoreConfigResponseDto | null;

  @ApiPropertyOptional({ type: TenantOrdersCountResponseDto })
  _count?: TenantOrdersCountResponseDto;

  @ApiPropertyOptional({ type: TenantUserEmailResponseDto })
  user?: TenantUserEmailResponseDto;
}
