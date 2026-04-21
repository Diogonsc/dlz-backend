import { ApiProperty } from '@nestjs/swagger';

export class HealthCheckResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: string;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: 12345.67 })
  uptime!: number;

  @ApiProperty({ example: 'development', nullable: true })
  environment!: string | undefined;
}
