/** Contrato REST — iFood (prefixo `/api/v1/ifood`). */
export const IFOOD_ROUTES = {
  authUrl: 'GET /ifood/auth',
  authRefresh: 'POST /ifood/auth/refresh',
  authTest: 'POST /ifood/auth/test',
  /** Legado — mesmo comportamento que `auth/refresh` e `auth/test` via body `{ action }`. */
  authAction: 'POST /ifood/auth-action',
  callback: 'GET /ifood/callback',
  status: 'GET /ifood/status',
  disconnect: 'POST /ifood/disconnect',
  syncOrder: 'POST /ifood/sync-order',
  webhook: 'POST /ifood/webhook',
} as const;

export type IfoodSyncOrderBody = {
  order_id: string;
  new_status: string;
  previous_status?: string;
  store_id?: string;
};
