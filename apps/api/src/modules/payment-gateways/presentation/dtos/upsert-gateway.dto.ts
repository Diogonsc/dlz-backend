import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpsertGatewayDto {
  @IsOptional()
  @IsString()
  publicKey?: string;

  @IsOptional()
  @IsString()
  accessToken?: string;

  @IsOptional()
  @IsString()
  webhookSecret?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  environment?: 'sandbox' | 'production';
}
