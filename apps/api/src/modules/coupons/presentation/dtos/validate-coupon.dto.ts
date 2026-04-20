import { IsNumber, IsString } from 'class-validator';

export class ValidateCouponDto {
  @IsString()
  code: string;

  @IsString()
  tenantId: string;

  @IsNumber()
  orderTotal: number;
}
