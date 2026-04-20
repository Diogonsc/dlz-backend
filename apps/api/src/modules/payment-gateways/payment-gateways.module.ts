import { Module } from '@nestjs/common';
import { PaymentGatewaysService } from './application/services/payment-gateways.service';
import { PaymentGatewaysController } from './presentation/controllers/payment-gateways.controller';

@Module({
  controllers: [PaymentGatewaysController],
  providers: [PaymentGatewaysService],
  exports: [PaymentGatewaysService],
})
export class PaymentGatewaysModule {}
