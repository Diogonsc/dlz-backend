import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class OpenTabDto {
  @ApiProperty({ example: '01HX...' })
  @IsString()
  @MinLength(1)
  tableId!: string;

  @ApiPropertyOptional({ example: 'Cliente balcão' })
  @IsOptional()
  @IsString()
  customerName?: string;
}
