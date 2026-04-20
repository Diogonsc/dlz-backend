export const ORDER_PANEL_STATUSES = [
  'pending',
  'preparing',
  'delivery',
  'delivered',
] as const;

export type OrderPanelStatus = (typeof ORDER_PANEL_STATUSES)[number];

export function isOrderPanelStatus(value: string): value is OrderPanelStatus {
  return (ORDER_PANEL_STATUSES as readonly string[]).includes(value);
}
