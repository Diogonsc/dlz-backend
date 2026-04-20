import { IsEmail, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class StoreSignupDto {
  @IsString()
  storeName: string;

  @IsString()
  ownerName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsUUID()
  planId: string;
}
