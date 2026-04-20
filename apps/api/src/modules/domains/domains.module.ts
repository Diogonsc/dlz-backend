import { Module } from '@nestjs/common';
import { DomainsService } from './application/services/domains.service';
import { DomainsController } from './presentation/controllers/domains.controller';

@Module({
  controllers: [DomainsController],
  providers: [DomainsService],
  exports: [DomainsService],
})
export class DomainsModule {}
