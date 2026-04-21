import { ApiProperty } from '@nestjs/swagger';
import { ProductPersistedResponseDto } from '../../products/dtos/product-response.dto';

/** Categoria persistida (sem relações). */
export class CategoryPersistedResponseDto {
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

/** Contagem de produtos (include \`_count\` no Prisma). */
export class CategoryProductCountDto {
  @ApiProperty({ example: 12, description: 'Quantidade de produtos na categoria' })
  products!: number;
}

/** Linha da lista no painel (categoria + contagem). */
export class CategoryPanelListItemResponseDto extends CategoryPersistedResponseDto {
  @ApiProperty({ type: CategoryProductCountDto })
  _count!: CategoryProductCountDto;
}

/** Categoria pública com produtos ativos (vitrine). */
export class CategoryPublicWithProductsResponseDto extends CategoryPersistedResponseDto {
  @ApiProperty({ type: ProductPersistedResponseDto, isArray: true })
  products!: ProductPersistedResponseDto[];
}

/** Resposta do PATCH de reordenação. */
export class CategoriesReorderResponseDto {
  @ApiProperty({ example: true })
  ok!: boolean;
}
