import { IsBoolean, IsNumber, IsString, Max, Min } from 'class-validator';
import { FeatureFlag } from '../../domain/types/feature-flag.type';

export class SetFeatureFlagDto {
  @IsString()
  tenantId: string;

  @IsString()
  flag: FeatureFlag;

  @IsBoolean()
  enabled: boolean;
}

export class CanaryRolloutDto {
  @IsString()
  flag: FeatureFlag;

  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;
}
