import { Module } from '@nestjs/common';
import { CashService } from './application/services/cash.service';
import { CashController } from './presentation/controllers/cash.controller';

@Module({
  controllers: [CashController],
  providers: [CashService],
  exports: [CashService],
})
export class CashModule {}
