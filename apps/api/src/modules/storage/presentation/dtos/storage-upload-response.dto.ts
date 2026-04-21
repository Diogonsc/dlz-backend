import { ApiProperty } from '@nestjs/swagger';

/** Metadados retornados por `POST /storage/upload/:folder`. */
export class StorageUploadResultResponseDto {
  @ApiProperty({ example: 'https://cdn.exemplo.com/products/uuid/foto.jpg' })
  url!: string;

  @ApiProperty({ example: 'products/550e8400-e29b-41d4-a716-446655440000/uuid.jpg' })
  key!: string;
}
