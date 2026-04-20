export type MercadoPagoLineCommand = { title: string; quantity: number; unit_price: number };

export type CreateMercadoPagoPreferenceCommand = {
  tenantId: string;
  items: MercadoPagoLineCommand[];
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  returnUrl: string;
  orderId?: string;
};
