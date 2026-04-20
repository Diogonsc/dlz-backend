import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CloseTabDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  tip?: number;

  @IsNumber()
  @Min(0)
  ordersSubtotal: number;

  @IsOptional()
  @IsString()
  tableId?: string;
}
