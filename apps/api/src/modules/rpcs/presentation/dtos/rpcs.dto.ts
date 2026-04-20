import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpsertCustomerProfileDto {
  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  cep?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

export class UpsertIfoodCredentialsDto {
  @IsString()
  clientId: string;

  @IsString()
  merchantId: string;

  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsString()
  clientSecret?: string;
}

export class UpsertMpGatewayDto {
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
  environment?: string;

  @IsOptional()
  enabledMethods?: Record<string, boolean>;
}

export class CreateStoreAdminDto {
  @IsString()
  email: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  name?: string;
}

export class GetOrCreateTabDto {
  @IsUUID()
  tableId: string;
}
