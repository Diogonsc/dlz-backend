/** Contrato estável para Socket.io / clientes (sem depender do shape bruto do Prisma). */
export type OrderRealtimePayload = {
  id: string;
  tenantId: string;
  orderCode: string;
  status: string;
  customerName: string;
  customerPhone: string;
  address: string;
  payment: string;
  items: unknown;
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  total: number;
  couponCode: string | null;
  tableId: string | null;
  tabId: string | null;
  orderSource: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};
