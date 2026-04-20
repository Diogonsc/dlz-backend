import { IsString, IsArray, IsOptional, IsNumber } from 'class-validator';

export class CreateMpPreferenceDto {
  @IsArray() items: { title: string; quantity: number; unit_price: number }[];
  @IsOptional() @IsString() customerName?: string;
  @IsOptional() @IsString() customerEmail?: string;
  @IsOptional() @IsString() customerPhone?: string;
  @IsString() returnUrl: string;
  @IsOptional() @IsString() orderId?: string;
}
