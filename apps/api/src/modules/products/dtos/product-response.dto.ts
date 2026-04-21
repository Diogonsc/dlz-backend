import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Categoria resumida na vitrine (com ícone). */
export class ProductCategoryPublicSummaryDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'Burgers' })
  name!: string;

  @ApiProperty({ example: 'hamburger' })
  icon!: string;
}

/** Categoria resumida no painel. */
export class ProductCategoryPanelSummaryDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'Burgers' })
  name!: string;
}

/** Categoria completa (detalhe do produto). */
export class ProductCategoryDetailDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  tenantId!: string;

  @ApiProperty({ example: 'Burgers' })
  name!: string;

  @ApiProperty({ example: 'hamburger' })
  icon!: string;

  @ApiProperty({ example: 0 })
  sortOrder!: number;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  updatedAt!: string;
}

/** Campos persistidos do produto (sem relação aninhada). */
export class ProductPersistedResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  categoryId!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002' })
  tenantId!: string;

  @ApiProperty({ example: 'X-Burger' })
  name!: string;

  @ApiProperty({ example: 'Pão, carne e queijo' })
  description!: string;

  @ApiProperty({ example: '24.90', description: 'Preço (decimal serializado como string no JSON)' })
  price!: string;

  @ApiPropertyOptional({ nullable: true, example: 'https://cdn.example.com/p.jpg' })
  image?: string | null;

  @ApiProperty({ type: [String], example: [] })
  images!: string[];

  @ApiProperty({ example: true })
  available!: boolean;

  @ApiPropertyOptional({ nullable: true, example: 'Novo' })
  badge?: string | null;

  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: { type: 'string' } },
    example: [],
    description: 'Variações (JSON)',
  })
  variations!: Record<string, string>[];

  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: { type: 'string' } },
    example: [],
    description: 'Extras (JSON)',
  })
  extras!: Record<string, string>[];

  @ApiProperty({ example: 0 })
  sortOrder!: number;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  updatedAt!: string;
}

/** Item da lista pública (vitrine). */
export class ProductPublicListItemResponseDto extends ProductPersistedResponseDto {
  @ApiProperty({ type: ProductCategoryPublicSummaryDto })
  category!: ProductCategoryPublicSummaryDto;
}

/** Item da lista do painel. */
export class ProductPanelListItemResponseDto extends ProductPersistedResponseDto {
  @ApiProperty({ type: ProductCategoryPanelSummaryDto })
  category!: ProductCategoryPanelSummaryDto;
}

/** Detalhe do produto (painel) com categoria completa. */
export class ProductDetailResponseDto extends ProductPersistedResponseDto {
  @ApiProperty({ type: ProductCategoryDetailDto })
  category!: ProductCategoryDetailDto;
}
