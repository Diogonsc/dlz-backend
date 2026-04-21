import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Cupom persistido (CRUD). */
export class CouponPersistedResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  tenantId!: string;

  @ApiProperty({ example: 'BEMVINDO10' })
  code!: string;

  @ApiProperty({ example: 'percentage' })
  discountType!: string;

  @ApiProperty({ example: '10.00' })
  discountValue!: string;

  @ApiPropertyOptional({ nullable: true, example: '50.00' })
  minOrderValue?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 100 })
  maxUses?: number | null;

  @ApiProperty({ example: 0 })
  usedCount!: number;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiPropertyOptional({ nullable: true, example: '2026-12-31T23:59:59.000Z' })
  expiresAt?: string | null;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  updatedAt!: string;
}

/** Cupom retornado dentro da validação (subset útil ao checkout). */
export class CouponValidatedSnapshotDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'BEMVINDO10' })
  code!: string;

  @ApiProperty({ example: 'percentage' })
  discountType!: string;

  @ApiProperty({ example: '10.00' })
  discountValue!: string;

  @ApiPropertyOptional({ nullable: true, example: '50.00' })
  minOrderValue?: string | null;
}

/** POST /coupons/validate */
export class ValidateCouponResponseDto {
  @ApiProperty({ example: true })
  valid!: boolean;

  @ApiProperty({ example: 12.5, description: 'Valor de desconto calculado para o pedido informado' })
  discount!: number;

  @ApiProperty({ type: CouponValidatedSnapshotDto })
  coupon!: CouponValidatedSnapshotDto;
}
