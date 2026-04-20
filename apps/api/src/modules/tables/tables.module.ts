import { Module } from '@nestjs/common';
import { TablesService } from './application/services/tables.service';
import { TablesController } from './presentation/controllers/tables.controller';

@Module({
  controllers: [TablesController],
  providers: [TablesService],
  exports: [TablesService],
})
export class TablesModule {}
