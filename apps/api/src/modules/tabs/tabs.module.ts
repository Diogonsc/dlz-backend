import { Module } from '@nestjs/common';
import { TabsService } from './application/services/tabs.service';
import { TabsController } from './presentation/controllers/tabs.controller';

@Module({
  controllers: [TabsController],
  providers: [TabsService],
  exports: [TabsService],
})
export class TabsModule {}
