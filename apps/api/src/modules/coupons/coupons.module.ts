import { Module } from '@nestjs/common';
import { CouponsService } from './application/services/coupons.service';
import { CouponsController } from './presentation/controllers/coupons.controller';

@Module({
  controllers: [CouponsController],
  providers: [CouponsService],
  exports: [CouponsService],
})
export class CouponsModule {}
