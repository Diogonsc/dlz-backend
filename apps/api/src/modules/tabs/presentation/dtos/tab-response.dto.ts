import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TabListTableSummaryDto {
  @ApiProperty({ example: 12 })
  number!: number;
}

/** Item da lista GET /tabs (shape mapeado pelo serviço). */
export class TabListItemResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  store_id!: string;

  @ApiPropertyOptional({ nullable: true, example: '550e8400-e29b-41d4-a716-446655440002' })
  table_id?: string | null;

  @ApiProperty({ example: 'Cliente' })
  customer_name!: string;

  @ApiProperty({ example: 'open' })
  status!: string;

  @ApiProperty({ example: 120.5 })
  subtotal!: number;

  @ApiProperty({ example: 10 })
  tip!: number;

  @ApiProperty({ example: 130.5 })
  total!: number;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  opened_at!: string;

  @ApiPropertyOptional({ nullable: true, example: null })
  closed_at?: string | null;

  @ApiPropertyOptional({ type: TabListTableSummaryDto, nullable: true })
  restaurant_tables?: TabListTableSummaryDto | null;
}

export class TabTableSummaryDto {
  @ApiProperty({ example: 12 })
  number!: number;

  @ApiProperty({ example: 'Mesa 12' })
  name!: string;
}

export class TabOrderRowResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: '89.90' })
  total!: string;

  @ApiProperty({ example: 'pending' })
  status!: string;

  @ApiPropertyOptional({ nullable: true, example: 'DLZ-AB12CD' })
  orderCode?: string | null;
}

/** Detalhe GET /tabs/:id (tab + mesa + pedidos). */
export class TabDetailResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  tenantId!: string;

  @ApiPropertyOptional({ nullable: true, example: '550e8400-e29b-41d4-a716-446655440002' })
  tableId?: string | null;

  @ApiProperty({ example: 'Cliente' })
  customerName!: string;

  @ApiProperty({ example: 'open' })
  status!: string;

  @ApiProperty({ example: '120.50' })
  subtotal!: string;

  @ApiProperty({ example: '10.00' })
  tip!: string;

  @ApiProperty({ example: '130.50' })
  total!: string;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  openedAt!: string;

  @ApiPropertyOptional({ nullable: true, example: null })
  closedAt?: string | null;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  updatedAt!: string;

  @ApiPropertyOptional({ type: TabTableSummaryDto, nullable: true })
  table?: TabTableSummaryDto | null;

  @ApiProperty({ type: [TabOrderRowResponseDto] })
  orders!: TabOrderRowResponseDto[];
}

/** Tab persistido (create / close). */
export class TabPersistedResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  tenantId!: string;

  @ApiPropertyOptional({ nullable: true, example: '550e8400-e29b-41d4-a716-446655440002' })
  tableId?: string | null;

  @ApiProperty({ example: 'Cliente' })
  customerName!: string;

  @ApiProperty({ example: 'open' })
  status!: string;

  @ApiProperty({ example: '120.50' })
  subtotal!: string;

  @ApiProperty({ example: '10.00' })
  tip!: string;

  @ApiProperty({ example: '130.50' })
  total!: string;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  openedAt!: string;

  @ApiPropertyOptional({ nullable: true, example: null })
  closedAt?: string | null;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  updatedAt!: string;
}
