import { Module } from '@nestjs/common';
import { SignupService } from './application/services/signup.service';
import { SignupController } from './presentation/controllers/signup.controller';

@Module({
  controllers: [SignupController],
  providers: [SignupService],
  exports: [SignupService],
})
export class SignupModule {}
