import { ApiProperty } from '@nestjs/swagger';

/** Metadados de paginação (contrato recomendado para listas). */
export class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 30 })
  limit!: number;

  @ApiProperty({ example: 142 })
  total!: number;

  @ApiProperty({ example: 5, description: 'Total de páginas (ceil(total/limit))' })
  totalPages!: number;
}
