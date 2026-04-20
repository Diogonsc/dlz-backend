/** Mapeamento legado Cakto checkout → slug de plano (domínio puro). */
export const CAKTO_PATH_TO_PLAN: Record<string, string> = {
  i2idsg2_826963: 'starter',
  ja8fqo7_826966: 'pro',
  koi46f5_826967: 'agency',
};

export const CAKTO_ACTIVATE_EVENTS = new Set([
  'purchase_approved',
  'subscription_created',
  'subscription_renewed',
]);

export const CAKTO_DEACTIVATE_EVENTS = new Set([
  'subscription_canceled',
  'subscription_renewal_refused',
  'refund',
  'chargeback',
]);

export function resolveCaktoPlanSlug(payload: {
  checkoutUrl?: string;
  offer?: { id?: string };
  product?: { name?: string };
}): string | null {
  const url = payload.checkoutUrl ?? '';
  for (const [key, slug] of Object.entries(CAKTO_PATH_TO_PLAN)) {
    if (url.includes(key)) return slug;
  }
  const offerId = String(payload.offer?.id ?? '');
  if (CAKTO_PATH_TO_PLAN[offerId]) return CAKTO_PATH_TO_PLAN[offerId];
  const pName = (payload.product?.name ?? '').toLowerCase();
  if (pName.includes('starter')) return 'starter';
  if (pName.includes('pro')) return 'pro';
  if (pName.includes('agency') || pName.includes('elite')) return 'agency';
  return null;
}
