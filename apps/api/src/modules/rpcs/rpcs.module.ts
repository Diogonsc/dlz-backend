import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { RpcsController } from './presentation/controllers/rpcs.controller';
import { RpcsService } from './application/services/rpcs.service';

@Module({
  imports: [OrdersModule],
  controllers: [RpcsController],
  providers: [RpcsService],
  exports: [RpcsService],
})
export class RpcsModule {}
