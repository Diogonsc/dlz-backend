import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { StructuredLoggerService } from './structured-logger.service';
import { ObservabilityHttpInterceptor } from './observability-http.interceptor';
import { ReliabilityLoggerService } from './reliability-logger.service';

@Global()
@Module({
  providers: [
    StructuredLoggerService,
    ReliabilityLoggerService,
    { provide: APP_INTERCEPTOR, useClass: ObservabilityHttpInterceptor },
  ],
  exports: [StructuredLoggerService, ReliabilityLoggerService],
})
export class ObservabilityModule {}
