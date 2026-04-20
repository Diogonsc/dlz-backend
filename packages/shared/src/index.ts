// ── Constantes globais ────────────────────────────────────────────────────────

export const PLAN_SLUGS = ['starter', 'pro', 'agency'] as const;
export type PlanSlug = (typeof PLAN_SLUGS)[number];

export const ORDER_STATUSES = ['pending', 'preparing', 'delivery', 'delivered'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_METHODS = ['pix', 'card', 'cash'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const APP_ROLES = ['admin', 'moderator', 'user'] as const;
export type AppRole = (typeof APP_ROLES)[number];

// ── Helpers ───────────────────────────────────────────────────────────────────

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function generateOrderCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ── Paginação ─────────────────────────────────────────────────────────────────

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
