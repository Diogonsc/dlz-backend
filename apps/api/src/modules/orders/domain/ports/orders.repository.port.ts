import type { OrderPanelStatus } from '../value-objects/order-status.vo';

export type StoreConfigForOrder = {
  tenantId: string;
  isOpen: boolean;
  minOrder: number;
  deliveryFee: number;
};

export type CouponForOrder = {
  id: string;
  tenantId: string;
  code: string;
  discountType: string;
  discountValue: number;
  minOrderValue: number | null;
  maxUses: number | null;
  usedCount: number;
  expiresAt: Date | null;
  isActive: boolean;
};

export type TableForOrder = {
  id: string;
  tenantId: string;
};

export type CreateOrderInput = {
  tenantId: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  address: string;
  payment: 'pix' | 'card' | 'cash';
  changeFor?: string;
  items: unknown;
  subtotal: number;
  deliveryFee: number;
  total: number;
  couponCode?: string;
  discountAmount: number;
  tableId?: string;
  tabId?: string;
  orderSource: string;
  notes?: string;
};

export type OrderTrackProjection = {
  orderCode: string;
  status: string;
  customerName: string;
  items: unknown;
  total: unknown;
  subtotal: unknown;
  deliveryFee: unknown;
  discountAmount: unknown;
  payment: string;
  address: string;
  createdAt: Date;
  updatedAt: Date;
};

export abstract class OrdersRepositoryPort {
  abstract getStoreForOrder(tenantId: string): Promise<StoreConfigForOrder | null>;

  abstract getCouponForTenant(
    tenantId: string,
    code: string,
  ): Promise<CouponForOrder | null>;

  abstract incrementCouponUses(couponId: string): Promise<void>;

  abstract findTableByQrToken(token: string): Promise<TableForOrder | null>;

  abstract findOpenTabForTable(tableId: string): Promise<{ id: string } | null>;

  abstract createTab(tenantId: string, tableId: string): Promise<{ id: string }>;

  abstract orderCodeExists(orderCode: string): Promise<boolean>;

  /** Persiste o pedido e devolve o registo completo (para eventos / realtime). */
  abstract createOrder(input: CreateOrderInput): Promise<unknown>;

  abstract upsertCustomerProfileAfterOrder(
    tenantId: string,
    name: string,
    phone: string,
    orderTotal: number,
  ): Promise<void>;

  abstract findTrackByCode(orderCode: string): Promise<OrderTrackProjection | null>;

  abstract listForTenant(params: {
    tenantId: string;
    status?: OrderPanelStatus;
    page: number;
    limit: number;
  }): Promise<{ items: unknown[]; total: number }>;

  abstract findByIdForTenant(
    id: string,
    tenantId: string,
  ): Promise<unknown | null>;

  abstract updateStatusForTenant(
    id: string,
    tenantId: string,
    status: OrderPanelStatus,
  ): Promise<unknown>;

  /** Comanda aberta da mesa — valida que a mesa pertence ao tenant. */
  abstract getOrCreateOpenTabId(tenantId: string, tableId: string): Promise<string>;
}
