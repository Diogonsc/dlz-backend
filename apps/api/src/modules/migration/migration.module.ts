import { Module } from '@nestjs/common';
import { MigrationService } from './application/services/migration.service';
import { MigrationController } from './presentation/controllers/migration.controller';

export type { FeatureFlag } from './domain/types/feature-flag.type';

@Module({
  controllers: [MigrationController],
  providers: [MigrationService],
  exports: [MigrationService],
})
export class MigrationModule {}
