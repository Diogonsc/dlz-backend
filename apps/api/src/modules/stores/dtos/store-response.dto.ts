import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const TENANT_PLAN = ['starter', 'pro', 'agency'] as const;
const TENANT_STATUS = ['active', 'trial', 'inactive', 'pending_payment'] as const;
const PIX_KEY_TYPE = ['cpf', 'cnpj', 'email', 'phone', 'random'] as const;

/** Resumo do tenant exposto na config pública da loja. */
export class StoreTenantPublicSummaryDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ enum: TENANT_PLAN, example: 'starter' })
  plan!: (typeof TENANT_PLAN)[number];

  @ApiProperty({ enum: TENANT_STATUS, example: 'active' })
  status!: (typeof TENANT_STATUS)[number];

  @ApiProperty({ example: '#1a1a2e' })
  themePrimary!: string;

  @ApiProperty({ example: '#e8a838' })
  themeAccent!: string;

  @ApiPropertyOptional({ nullable: true, example: '2026-05-01T00:00:00.000Z' })
  trialEndsAt?: string | null;
}

/** \`store_config\` + tenant opcional (vitrine inclui tenant; painel pode omitir). */
export class StoreConfigResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  tenantId!: string;

  @ApiProperty({ example: 'Minha Loja' })
  storeName!: string;

  @ApiProperty({ example: 'Descrição curta' })
  storeDescription!: string;

  @ApiProperty({ example: 'Rua X, 1' })
  storeAddress!: string;

  @ApiPropertyOptional({ nullable: true, example: 'minha-loja' })
  slug?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'https://cdn.example.com/banner.jpg' })
  banner?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'https://cdn.example.com/avatar.jpg' })
  avatar?: string | null;

  @ApiProperty({ example: '#ea580c' })
  primaryColor!: string;

  @ApiProperty({ example: '#f97316' })
  accentColor!: string;

  @ApiProperty({ example: '5.90', description: 'Decimal como string no JSON' })
  deliveryFee!: string;

  @ApiProperty({ example: '25.00' })
  minOrder!: string;

  @ApiProperty({ example: '30–45 min' })
  deliveryTime!: string;

  @ApiProperty({ example: false })
  deliveryDynamicEnabled!: boolean;

  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: { type: 'string' } },
    example: [],
    description: 'Regiões de entrega (JSON)',
  })
  deliveryRegions!: Record<string, string>[];

  @ApiPropertyOptional({ nullable: true, example: -23.55 })
  deliveryOriginLat?: number | null;

  @ApiPropertyOptional({ nullable: true, example: -46.63 })
  deliveryOriginLng?: number | null;

  @ApiProperty({ example: 'loja@email.com' })
  pixKey!: string;

  @ApiProperty({ enum: PIX_KEY_TYPE, example: 'email' })
  pixKeyType!: (typeof PIX_KEY_TYPE)[number];

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    example: {},
    description: 'Horários de funcionamento (mapa dia→texto)',
  })
  operatingHours!: Record<string, string>;

  @ApiProperty({ example: '21:00' })
  orderCutoffTime!: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'boolean' },
    example: { pix: true, card: true, cash: true },
  })
  acceptedPaymentMethods!: Record<string, boolean>;

  @ApiProperty({ example: '+5511999999999' })
  whatsapp!: string;

  @ApiProperty({ example: 'Olá {nome}...' })
  whatsappMessageTemplate!: string;

  @ApiProperty({ example: true })
  whatsappAutoSend!: boolean;

  @ApiProperty({ example: '@loja' })
  instagram!: string;

  @ApiProperty({ example: 'loja' })
  facebook!: string;

  @ApiPropertyOptional({ nullable: true, example: 'pedidos.loja.com' })
  customDomain?: string | null;

  @ApiProperty({ example: true })
  isOpen!: boolean;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  updatedAt!: string;

  @ApiPropertyOptional({ type: StoreTenantPublicSummaryDto, description: 'Presente nas rotas públicas por slug/domínio' })
  tenant?: StoreTenantPublicSummaryDto;
}
