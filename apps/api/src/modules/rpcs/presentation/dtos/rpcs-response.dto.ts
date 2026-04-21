import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IdResponseDto } from '../../../../common/dtos/simple-contract.dto';
/** GET rpc/resolve-store */
export class RpcResolveStoreResponseDto extends IdResponseDto {}

/** GET rpc/pix-config */
export class RpcPixConfigResponseDto {
  @ApiProperty({ example: 'loja@email.com' })
  pixKey!: string;

  @ApiProperty({ example: 'email' })
  pixKeyType!: string;
}

export class RpcTableTenantSummaryDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'active' })
  status!: string;
}

/** GET rpc/table-token/:token */
export class RpcResolveTableTokenResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  tenantId!: string;

  @ApiProperty({ example: 12 })
  number!: number;

  @ApiProperty({ example: 'Mesa 12' })
  name!: string;

  @ApiProperty({ example: 4 })
  capacity!: number;

  @ApiProperty({ example: 'available' })
  status!: string;

  @ApiProperty({ example: 'qr-token-abc' })
  qrCodeToken!: string;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  updatedAt!: string;

  @ApiProperty({ type: RpcTableTenantSummaryDto })
  tenant!: RpcTableTenantSummaryDto;
}

/** GET rpc/customer-profile + POST upsert (persistido). */
export class RpcCustomerProfileResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  tenantId!: string;

  @ApiProperty({ example: 'Maria' })
  name!: string;

  @ApiProperty({ example: '+5511999999999' })
  phone!: string;

  @ApiProperty({ example: '+5511999999999' })
  phoneNormalized!: string;

  @ApiPropertyOptional({ nullable: true, example: 'maria@email.com' })
  email?: string | null;

  @ApiProperty({ example: 3 })
  totalOrders!: number;

  @ApiProperty({ example: '199.90' })
  totalSpent!: string;

  @ApiPropertyOptional({ nullable: true, example: '2026-04-01T12:00:00.000Z' })
  lastOrderAt?: string | null;

  @ApiProperty({ example: 'new' })
  segment!: string;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  updatedAt!: string;
}

/** GET rpc/plan-limits */
export class RpcPlanLimitsResponseDto {
  @ApiProperty({ example: 'starter' })
  plan!: string;

  @ApiProperty({ example: 30 })
  maxProducts!: number;

  @ApiProperty({ example: 10 })
  maxCategories!: number;

  @ApiProperty({ example: 3 })
  maxCoupons!: number;
}

/** GET rpc/can-create/:resource */
export class RpcCanCreateResourceResponseDto {
  @ApiProperty({ example: true })
  allowed!: boolean;

  @ApiProperty({ example: 5 })
  current!: number;

  @ApiProperty({ example: 30 })
  max!: number;
}

/** GET rpc/inactive-customers — item agregado. */
export class RpcInactiveCustomerRowDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  store_id!: string;

  @ApiProperty({ example: '+5511999999999' })
  customer_phone!: string;

  @ApiProperty({ example: 'Maria' })
  customer_name!: string;

  @ApiProperty({ example: 20 })
  days_since_last_order!: number;

  @ApiProperty({ example: 'inactive' })
  segment!: string;

  @ApiProperty({ example: 450.5 })
  total_spent!: number;

  @ApiProperty({ example: 4 })
  total_orders!: number;

  @ApiProperty({ example: 89.9 })
  last_order_total!: number;
}

/** GET rpc/ifood-credentials */
export class RpcIfoodCredentialsSafeResponseDto {
  @ApiProperty({ example: 'client-id-xxx' })
  clientId!: string;

  @ApiProperty({ example: 'merchant-xxx' })
  merchantId!: string;

  @ApiProperty({ example: true })
  enabled!: boolean;
}

/** POST rpc/ifood-credentials — persistido (não documente segredos no exemplo). */
export class RpcIfoodCredentialPersistedResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  tenantId!: string;

  @ApiProperty({ example: 'client-id' })
  clientId!: string;

  @ApiProperty({ example: '***' })
  clientSecret!: string;

  @ApiProperty({ example: 'merchant' })
  merchantId!: string;

  @ApiPropertyOptional({ nullable: true, example: null })
  accessToken?: string | null;

  @ApiPropertyOptional({ nullable: true, example: null })
  refreshToken?: string | null;

  @ApiPropertyOptional({ nullable: true, example: null })
  tokenExpiresAt?: string | null;

  @ApiProperty({ example: true })
  enabled!: boolean;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  updatedAt!: string;
}

/** GET rpc/mp-gateway — visão admin mascarada. */
export class RpcMpGatewayAdminResponseDto {
  @ApiProperty({ example: true })
  found!: boolean;

  @ApiProperty({ example: 'APP_USR-xxx' })
  publicKey!: string;

  @ApiProperty({ example: true })
  hasAccessToken!: boolean;

  @ApiProperty({ example: true })
  hasWebhookSecret!: boolean;

  @ApiProperty({ example: 'APP_...xxxx' })
  accessTokenMasked!: string;

  @ApiProperty({ example: 'whsec...xxxx' })
  webhookSecretMasked!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: 'sandbox' })
  environment!: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'boolean' },
    example: { credit_card: true, debit_card: true, pix: true },
  })
  enabledMethods!: Record<string, boolean>;
}

/** POST rpc/mp-gateway — gateway Mercado Pago persistido. */
export class RpcPaymentGatewayPersistedResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  tenantId!: string;

  @ApiProperty({ example: 'mercado_pago' })
  provider!: string;

  @ApiProperty({ example: 'APP_USR-xxx' })
  publicKey!: string;

  @ApiProperty({ example: '' })
  accessToken!: string;

  @ApiProperty({ example: '' })
  webhookSecret!: string;

  @ApiProperty({ example: false })
  isActive!: boolean;

  @ApiProperty({ example: 'sandbox' })
  environment!: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'boolean' },
    example: { credit_card: true, debit_card: true, pix: true },
  })
  enabledMethods!: Record<string, boolean>;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  updatedAt!: string;
}

/** POST rpc/create-store-admin */
export class RpcCreateStoreAdminResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'admin@loja.com' })
  email!: string;

  @ApiProperty({ example: true })
  mustChangePassword!: boolean;
}
