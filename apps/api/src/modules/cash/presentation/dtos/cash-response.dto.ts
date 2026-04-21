import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CashMovementRowResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  registerId!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002' })
  tenantId!: string;

  @ApiProperty({ example: 'sale' })
  type!: string;

  @ApiProperty({ example: '50.00' })
  amount!: string;

  @ApiProperty({ example: 'cash' })
  paymentMethod!: string;

  @ApiProperty({ example: 'Venda PDV' })
  description!: string;

  @ApiPropertyOptional({ nullable: true, example: '550e8400-e29b-41d4-a716-446655440003' })
  orderId?: string | null;

  @ApiPropertyOptional({ nullable: true, example: '550e8400-e29b-41d4-a716-446655440004' })
  createdBy?: string | null;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  createdAt!: string;
}

export class CashRegisterPersistedResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  tenantId!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002' })
  openedBy!: string;

  @ApiProperty({ example: 'open' })
  status!: string;

  @ApiProperty({ example: '100.00' })
  openingBalance!: string;

  @ApiPropertyOptional({ nullable: true, example: '550.00' })
  closingBalance?: string | null;

  @ApiPropertyOptional({ nullable: true, example: '540.00' })
  expectedBalance?: string | null;

  @ApiProperty({ example: '' })
  notes!: string;

  @ApiProperty({ example: '2026-04-20T08:00:00.000Z' })
  openedAt!: string;

  @ApiPropertyOptional({ nullable: true, example: '2026-04-20T18:00:00.000Z' })
  closedAt?: string | null;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  updatedAt!: string;
}

export class CashRegisterWithMovementsResponseDto extends CashRegisterPersistedResponseDto {
  @ApiProperty({ type: [CashMovementRowResponseDto] })
  movements!: CashMovementRowResponseDto[];
}
