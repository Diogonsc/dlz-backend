import { IsString, IsObject, IsOptional } from 'class-validator';

export class SubscribePushDto {
  @IsString() endpoint!: string;
  @IsObject() keys!: { p256dh: string; auth: string };
  @IsOptional() @IsString() userAgent?: string;
}

export class SendPushDto {
  @IsString() title!: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsString() icon?: string;
  @IsOptional() @IsString() url?: string;
}

export type PushDeliverySub = { endpoint: string; p256dh: string; auth: string };
