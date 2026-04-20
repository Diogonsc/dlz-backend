export type CreateOrderItemCommand = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  variations?: unknown[];
  extras?: unknown[];
  notes?: string;
};

/**
 * Entrada do caso de uso — sem dependência de class-validator / Nest.
 */
export type CreateOrderCommand = {
  tenantId: string;
  customerName: string;
  customerPhone: string;
  address: string;
  payment: 'pix' | 'card' | 'cash';
  changeFor?: string;
  items: CreateOrderItemCommand[];
  couponCode?: string;
  tableToken?: string;
  orderSource?: string;
  notes?: string;
};
