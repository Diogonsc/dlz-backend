declare module 'mercadopago' {
  export class MercadoPagoConfig {
    constructor(input: { accessToken: string });
  }

  export class Preference {
    constructor(client: MercadoPagoConfig);
    create(input: { body: Record<string, unknown> }): Promise<{
      id?: string | number;
      init_point?: string | null;
      sandbox_init_point?: string | null;
    }>;
  }

  export class Payment {
    constructor(client: MercadoPagoConfig);
    get(input: { id: string }): Promise<{
      id?: string | number;
      status?: string;
      status_detail?: string | null;
      external_reference?: string | null;
      metadata?: { tenant_id?: string; order_id?: string };
    }>;
  }
}
