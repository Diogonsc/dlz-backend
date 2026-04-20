import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class IfoodSyncOrderDto {
  @ApiProperty({ description: 'ID interno do pedido (orders.id)' })
  @IsUUID()
  order_id!: string;

  @ApiProperty({ example: 'preparing', description: 'Novo status DLZ (ex.: preparing, delivery, delivered, cancelled)' })
  @IsString()
  @MaxLength(64)
  new_status!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  previous_status?: string;

  @ApiPropertyOptional({ description: 'Opcional; deve coincidir com o tenant do JWT' })
  @IsOptional()
  @IsUUID()
  store_id?: string;
}
