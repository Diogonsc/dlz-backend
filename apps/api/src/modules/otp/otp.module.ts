import { Module } from '@nestjs/common';
import { OtpService } from './application/services/otp.service';
import { OtpController } from './presentation/controllers/otp.controller';

@Module({
  controllers: [OtpController],
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {}
