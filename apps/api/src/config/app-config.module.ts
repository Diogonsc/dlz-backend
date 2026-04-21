import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from './app.config';

export const APP_CONFIG = Symbol('APP_CONFIG');

@Global()
@Module({
  providers: [
    {
      provide: APP_CONFIG,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>): AppConfig => ({
        nodeEnv: config.getOrThrow('nodeEnv'),
        port: config.getOrThrow('port'),
        apiUrl: config.getOrThrow('apiUrl'),
        frontendUrl: config.getOrThrow('frontendUrl'),
        database: config.getOrThrow('database'),
        redis: config.getOrThrow('redis'),
        throttler: config.getOrThrow('throttler'),
        cache: config.getOrThrow('cache'),
        jwt: config.getOrThrow('jwt'),
        stripe: config.getOrThrow('stripe'),
        cakto: config.getOrThrow('cakto'),
        whatsapp: config.getOrThrow('whatsapp'),
        twilio: config.getOrThrow('twilio'),
        winback: config.getOrThrow('winback'),
        eventBus: config.getOrThrow('eventBus'),
        paymentGatewayHealth: config.getOrThrow('paymentGatewayHealth'),
        storage: config.getOrThrow('storage'),
      }),
    },
  ],
  exports: [APP_CONFIG],
})
export class AppConfigModule {}
