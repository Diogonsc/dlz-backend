import { IsEnum } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsEnum(['pending', 'preparing', 'delivery', 'delivered']) status: string;
}
