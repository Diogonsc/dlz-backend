import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderItemDto } from './order-item.dto';

export class CreateOrderDto {
  @IsString() tenantId: string;
  @IsString() customerName: string;
  @IsString() customerPhone: string;
  @IsString() address: string;
  @IsEnum(['pix', 'card', 'cash']) payment: 'pix' | 'card' | 'cash';
  @IsOptional() @IsString() changeFor?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemDto) items: OrderItemDto[];
  @IsOptional() @IsString() couponCode?: string;
  @IsOptional() @IsString() tableToken?: string;
  @IsOptional() @IsString() orderSource?: string;
  @IsOptional() @IsString() notes?: string;
}
