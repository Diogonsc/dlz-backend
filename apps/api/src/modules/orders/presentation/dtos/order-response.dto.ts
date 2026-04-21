import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../../common/dtos/pagination.dto';

/** Status persistido do pedido (painel / vitrine). */
export const ORDER_STATUS_ENUM = ['pending', 'preparing', 'delivery', 'delivered', 'cancelled'] as const;

/** Método de pagamento persistido (inclui gateway online). */
export const PAYMENT_METHOD_ENUM = ['pix', 'card', 'cash', 'mercado_pago'] as const;

/** Status de pagamento online (Mercado Pago / gateway). */
export const ONLINE_PAYMENT_STATUS_ENUM = ['pending', 'approved', 'rejected', 'refunded'] as const;

/** Item de carrinho / linha do pedido (espelha o JSON persistido em \`items\`). */
export class OrderLineItemResponseDto {
  @ApiProperty({ example: 'prod_01HX' })
  productId!: string;

  @ApiProperty({ example: 'X-Burger' })
  name!: string;

  @ApiProperty({ example: 2 })
  quantity!: number;

  @ApiProperty({ example: '24.90', description: 'Preço unitário (decimal serializado como string no JSON)' })
  price!: string;

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'object', additionalProperties: { type: 'string' } },
    description: 'Variações (mapas chave→valor serializados como string)',
    example: [],
  })
  variations?: Record<string, string>[];

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'object', additionalProperties: { type: 'string' } },
    description: 'Extras (mapas chave→valor serializados como string)',
    example: [],
  })
  extras?: Record<string, string>[];

  @ApiPropertyOptional({ example: 'Sem cebola' })
  notes?: string;
}

/** Resposta pública ao criar pedido (payload interno antes do envelope HTTP, se ativo). */
export class CreateOrderResponseDto {
  @ApiProperty({ example: 'DLZ-AB12CD' })
  orderCode!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: '89.90', description: 'Total final (decimal como string no JSON)' })
  total!: string;
}

/** Linha de pagamento vinculada ao pedido (detalhe). */
export class OrderPaymentRowDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  orderId!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002' })
  tenantId!: string;

  @ApiProperty({ example: 'pix' })
  method!: string;

  @ApiProperty({ example: '89.90' })
  amount!: string;

  @ApiProperty({ example: '0.00' })
  tip!: string;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  createdAt!: string;
}

/** Pedido persistido (lista painel / após PATCH status — sem relação \`payments\`). */
export class OrderPanelRowDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'DLZ-AB12CD' })
  orderCode!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002' })
  tenantId!: string;

  @ApiPropertyOptional({ nullable: true, example: '550e8400-e29b-41d4-a716-446655440003' })
  tabId?: string | null;

  @ApiPropertyOptional({ nullable: true, example: '550e8400-e29b-41d4-a716-446655440004' })
  tableId?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 12 })
  tableNumber?: number | null;

  @ApiProperty({ enum: ORDER_STATUS_ENUM, example: 'pending' })
  status!: (typeof ORDER_STATUS_ENUM)[number];

  @ApiProperty({ example: 'delivery' })
  orderSource!: string;

  @ApiProperty({ example: 'Maria Silva' })
  customerName!: string;

  @ApiProperty({ example: '+5511999999999' })
  customerPhone!: string;

  @ApiProperty({ example: 'Rua das Flores, 10' })
  address!: string;

  @ApiProperty({ enum: PAYMENT_METHOD_ENUM, example: 'pix' })
  payment!: (typeof PAYMENT_METHOD_ENUM)[number];

  @ApiPropertyOptional({ nullable: true, example: '100.00' })
  changeFor?: string | null;

  @ApiProperty({ type: [OrderLineItemResponseDto] })
  items!: OrderLineItemResponseDto[];

  @ApiProperty({ example: '79.90' })
  subtotal!: string;

  @ApiProperty({ example: '10.00' })
  deliveryFee!: string;

  @ApiProperty({ example: '0.00' })
  tip!: string;

  @ApiProperty({ example: '89.90' })
  total!: string;

  @ApiPropertyOptional({ nullable: true, example: 'BEMVINDO10' })
  couponCode?: string | null;

  @ApiProperty({ example: '0.00' })
  discountAmount!: string;

  @ApiPropertyOptional({ nullable: true, example: 'Sem gelo' })
  notes?: string | null;

  @ApiPropertyOptional({ nullable: true, enum: ONLINE_PAYMENT_STATUS_ENUM })
  onlinePaymentStatus?: (typeof ONLINE_PAYMENT_STATUS_ENUM)[number] | null;

  @ApiPropertyOptional({ nullable: true, example: 'pref-123' })
  mpPreferenceId?: string | null;

  @ApiPropertyOptional({ nullable: true, example: '123456' })
  mpPaymentId?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'accredited' })
  mpPaymentStatusDetail?: string | null;

  @ApiProperty({ example: false })
  marketingWhatsappOptIn!: boolean;

  @ApiPropertyOptional({ nullable: true, example: 'ifood-order-id' })
  ifoodOrderId?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'DELIVERY' })
  ifoodOrderType?: string | null;

  @ApiPropertyOptional({
    description: 'Flags iFood (JSON objeto chave/valor string)',
    example: {},
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  ifoodApiFlags?: Record<string, string>;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-04-20T12:05:00.000Z' })
  updatedAt!: string;
}

/** Lista paginada no painel: corpo retornado pelo controller (\`data\` + \`meta\`; envelope HTTP opcional). */
export class ListOrdersResponseDto {
  @ApiProperty({ type: [OrderPanelRowDto] })
  data!: OrderPanelRowDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

/** Detalhe do pedido com pagamentos. */
export class OrderDetailResponseDto extends OrderPanelRowDto {
  @ApiProperty({ type: [OrderPaymentRowDto] })
  payments!: OrderPaymentRowDto[];
}

/** Rastreio público por código (projeção enxuta para o cliente). */
export class TrackOrderResponseDto {
  @ApiProperty({ example: 'DLZ-AB12CD' })
  orderCode!: string;

  @ApiProperty({ enum: ORDER_STATUS_ENUM, example: 'preparing' })
  status!: (typeof ORDER_STATUS_ENUM)[number];

  @ApiProperty({ example: 'Maria Silva' })
  customerName!: string;

  @ApiProperty({ type: [OrderLineItemResponseDto] })
  items!: OrderLineItemResponseDto[];

  @ApiProperty({ example: '89.90' })
  total!: string;

  @ApiProperty({ example: '79.90' })
  subtotal!: string;

  @ApiProperty({ example: '10.00' })
  deliveryFee!: string;

  @ApiProperty({ example: '0.00' })
  discountAmount!: string;

  @ApiProperty({ enum: PAYMENT_METHOD_ENUM, example: 'pix' })
  payment!: (typeof PAYMENT_METHOD_ENUM)[number];

  @ApiProperty({ example: 'Rua das Flores, 10' })
  address!: string;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-04-20T12:05:00.000Z' })
  updatedAt!: string;
}

/** Resposta do PATCH de status (pedido atualizado, sem \`payments\` no retorno Prisma padrão). */
export class UpdateOrderStatusResponseDto extends OrderPanelRowDto {}
