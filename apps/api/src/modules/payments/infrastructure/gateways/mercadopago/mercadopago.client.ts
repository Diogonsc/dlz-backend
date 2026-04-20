import { MercadoPagoConfig } from 'mercadopago';

export class MercadoPagoClientFactory {
  static create(accessToken: string): MercadoPagoConfig {
    return new MercadoPagoConfig({ accessToken });
  }
}
