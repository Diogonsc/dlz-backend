import { ApiProperty } from '@nestjs/swagger';

export class MigrationTenantCountsDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  active!: number;

  @ApiProperty()
  trial!: number;

  @ApiProperty()
  inactive!: number;
}

export class MigrationStatusResponseDto {
  @ApiProperty({ type: MigrationTenantCountsDto })
  tenants!: MigrationTenantCountsDto;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'number' },
    example: { new_backend_full: 12 },
    description: 'Contagem por flag ativa (memória do processo)',
  })
  featureFlags!: Record<string, number>;

  @ApiProperty({ example: '45%', description: 'Cobertura heurística `new_backend_full`' })
  newBackendCoverage!: string;
}

export class MigrationHealthCheckRowDto {
  @ApiProperty({ example: 'postgres' })
  name!: string;

  @ApiProperty()
  ok!: boolean;

  @ApiProperty({ required: false })
  details?: string;
}

export class MigrationHealthResponseDto {
  @ApiProperty()
  healthy!: boolean;

  @ApiProperty({ type: [MigrationHealthCheckRowDto] })
  checks!: MigrationHealthCheckRowDto[];

  @ApiProperty()
  timestamp!: string;
}

export class MigrationSetFlagResponseDto {
  @ApiProperty()
  tenantId!: string;

  @ApiProperty({ example: 'new_backend_orders' })
  flag!: string;

  @ApiProperty()
  enabled!: boolean;
}

export class MigrationTenantFlagsResponseDto {
  @ApiProperty()
  tenantId!: string;

  @ApiProperty({ type: [String], example: ['new_backend_full'] })
  flags!: string[];
}

export class MigrationCanaryRolloutResponseDto {
  @ApiProperty()
  flag!: string;

  @ApiProperty({ example: 10 })
  percentage!: number;

  @ApiProperty({ description: 'Tenants que receberam a flag neste rollout' })
  tenantsEnabled!: number;

  @ApiProperty({ description: 'Total de tenants ativos considerados' })
  total!: number;
}
