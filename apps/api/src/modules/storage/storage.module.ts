/// <reference types="multer" />
import { Module } from '@nestjs/common';
import { StorageService } from './application/services/storage.service';
import { StorageController } from './presentation/controllers/storage.controller';

@Module({
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
