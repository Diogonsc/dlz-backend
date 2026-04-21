import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsObject, IsOptional } from 'class-validator';

export class SubscribePushDto {
  @ApiProperty({ example: 'https://fcm.googleapis.com/fcm/send/...' })
  @IsString()
  endpoint!: string;

  @ApiProperty({
    example: { p256dh: 'BNc...', auth: 'tS...' },
  })
  @IsObject()
  keys!: { p256dh: string; auth: string };

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userAgent?: string;
}

export class SendPushDto {
  @ApiProperty({ example: 'Pedido pronto' })
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  url?: string;
}

export type PushDeliverySub = { endpoint: string; p256dh: string; auth: string };
