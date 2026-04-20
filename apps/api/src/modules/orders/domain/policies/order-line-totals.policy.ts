/**
 * Cálculo puro de linha de pedido (subtotal por item + extras + variações).
 * Sem I/O — testável unitariamente.
 */
export type OrderLineInput = {
  price: number;
  quantity: number;
  extras?: { price?: number }[];
  variations?: { additionalPrice?: number }[];
};

export function calculateLineTotal(item: OrderLineInput): number {
  const extrasTotal = (item.extras ?? []).reduce((s, e) => s + (e.price ?? 0), 0);
  const variationsExtra = (item.variations ?? []).reduce(
    (s, v) => s + (v.additionalPrice ?? 0),
    0,
  );
  return (item.price + extrasTotal + variationsExtra) * item.quantity;
}

export function calculateSubtotalFromLines(items: OrderLineInput[]): number {
  return items.reduce((acc, item) => acc + calculateLineTotal(item), 0);
}
