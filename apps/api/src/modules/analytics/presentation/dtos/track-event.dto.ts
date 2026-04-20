import { IsObject, IsOptional, IsString } from 'class-validator';

export class TrackEventDto {
  @IsString()
  tenantId: string;

  @IsString()
  eventType: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;
}
