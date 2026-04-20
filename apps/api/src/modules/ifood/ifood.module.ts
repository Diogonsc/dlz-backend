import { Module } from '@nestjs/common';
import { IfoodService } from './application/services/ifood.service';
import { IfoodSyncService } from './ifood-sync.service';
import { IfoodController } from './presentation/controllers/ifood.controller';

@Module({
  controllers: [IfoodController],
  providers: [IfoodService, IfoodSyncService],
})
export class IfoodModule {}
