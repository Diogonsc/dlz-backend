import { IsOptional, IsString } from 'class-validator';

export class SendMessageDto {
  @IsString()
  phone: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  campaignKey?: string;
}
