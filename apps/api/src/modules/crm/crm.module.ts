import { Module } from '@nestjs/common';
import { CrmService } from './application/services/crm.service';
import { CrmController } from './presentation/controllers/crm.controller';

@Module({ controllers: [CrmController], providers: [CrmService], exports: [CrmService] })
export class CrmModule {}
