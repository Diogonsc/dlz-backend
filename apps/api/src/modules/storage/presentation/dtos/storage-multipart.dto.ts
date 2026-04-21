import { ApiProperty } from '@nestjs/swagger';

/** Schema OpenAPI para upload multipart (campo de arquivo depende do cliente; use um único part binário). */
export class StorageMultipartUploadDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Arquivo de imagem (JPEG/PNG/WebP). Nome do campo conforme cliente HTTP.',
  })
  /** Placeholder TS — no OpenAPI é `string` com `format: binary`. */
  file!: string;
}
