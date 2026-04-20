import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateTableDto {
  @IsNumber()
  @Min(1)
  number: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  capacity?: number;
}
