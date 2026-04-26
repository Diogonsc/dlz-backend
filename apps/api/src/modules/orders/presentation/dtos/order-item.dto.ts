import { IsString, IsOptional, IsArray, IsNumber, Min } from 'class-validator';

export class OrderItemDto {
  @IsString() productId: string;
  @IsString() name: string;
  @IsNumber() @Min(1) quantity: number;
  @IsNumber() price: number;
  @IsOptional() variations?: unknown[];
  @IsOptional() extras?: unknown[];
  @IsOptional() @IsString() image?: string;
  @IsOptional() @IsString() notes?: string;
}
