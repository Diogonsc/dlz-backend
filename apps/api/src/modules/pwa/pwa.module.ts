import { Module } from '@nestjs/common';
import { PwaService } from './application/services/pwa.service';
import { PwaController } from './presentation/controllers/pwa.controller';

@Module({
  controllers: [PwaController],
  providers: [PwaService],
})
export class PwaModule {}
