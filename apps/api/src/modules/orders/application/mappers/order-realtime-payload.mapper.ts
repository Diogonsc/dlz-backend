import type { OrderRealtimePayload } from '../../domain/events/order-realtime-payload';

function num(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Number(v);
  if (v && typeof v === 'object' && 'toString' in v) return Number(String(v));
  return 0;
}

/** Mapeia registo persistido → payload explícito para realtime (sem JSON.stringify). */
export function toOrderRealtimePayload(order: Record<string, unknown>): OrderRealtimePayload {
  return {
    id: String(order.id),
    tenantId: String(order.tenantId),
    orderCode: String(order.orderCode),
    status: String(order.status),
    customerName: String(order.customerName),
    customerPhone: String(order.customerPhone),
    address: String(order.address),
    payment: String(order.payment),
    items: order.items ?? [],
    subtotal: num(order.subtotal),
    deliveryFee: num(order.deliveryFee),
    discountAmount: num(order.discountAmount),
    total: num(order.total),
    couponCode: order.couponCode != null ? String(order.couponCode) : null,
    tableId: order.tableId != null ? String(order.tableId) : null,
    tabId: order.tabId != null ? String(order.tabId) : null,
    orderSource: String(order.orderSource ?? 'website'),
    notes: order.notes != null ? String(order.notes) : null,
    createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : String(order.createdAt),
    updatedAt: order.updatedAt instanceof Date ? order.updatedAt.toISOString() : String(order.updatedAt),
  };
}
