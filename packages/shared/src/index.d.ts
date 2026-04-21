export declare const PLAN_SLUGS: readonly ["starter", "pro", "agency"];
export type PlanSlug = (typeof PLAN_SLUGS)[number];
export declare const ORDER_STATUSES: readonly ["pending", "preparing", "delivery", "delivered"];
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export declare const PAYMENT_METHODS: readonly ["pix", "card", "cash"];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export declare const APP_ROLES: readonly ["admin", "moderator", "user"];
export type AppRole = (typeof APP_ROLES)[number];
export declare function normalizePhone(phone: string): string;
export declare function generateOrderCode(): string;
export declare function slugify(text: string): string;
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
export declare function paginate<T>(data: T[], total: number, page: number, limit: number): PaginatedResult<T>;
