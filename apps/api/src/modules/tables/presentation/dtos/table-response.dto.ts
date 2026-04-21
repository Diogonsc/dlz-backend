import { ApiProperty } from '@nestjs/swagger';

export class RestaurantTablePersistedResponseDto {
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

  @ApiProperty({ example: 'a1b2c3d4e5f6' })
  qrCodeToken!: string;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  updatedAt!: string;
}
