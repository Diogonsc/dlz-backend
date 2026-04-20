/** Contrato REST — comandas (prefixo `/api/v1/tabs`). */
export const TABS_ROUTES = {
  list: 'GET /tabs',
  one: 'GET /tabs/:id',
  close: 'PATCH /tabs/:id/close',
  create: 'POST /tabs',
} as const;

/** Evento Socket.io no namespace `/realtime`. */
export const TABS_SOCKET_EVENT = 'tabs:updated' as const;

export type TabsUpdatedPayload = {
  type: 'tabs.updated';
  storeId: string;
  tabId: string;
  status: 'open' | 'closed';
};
