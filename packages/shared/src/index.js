"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APP_ROLES = exports.PAYMENT_METHODS = exports.ORDER_STATUSES = exports.PLAN_SLUGS = void 0;
exports.normalizePhone = normalizePhone;
exports.generateOrderCode = generateOrderCode;
exports.slugify = slugify;
exports.paginate = paginate;
exports.PLAN_SLUGS = ['starter', 'pro', 'agency'];
exports.ORDER_STATUSES = ['pending', 'preparing', 'delivery', 'delivered'];
exports.PAYMENT_METHODS = ['pix', 'card', 'cash'];
exports.APP_ROLES = ['admin', 'moderator', 'user'];
function normalizePhone(phone) {
    return phone.replace(/\D/g, '');
}
function generateOrderCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}
function slugify(text) {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
function paginate(data, total, page, limit) {
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
//# sourceMappingURL=index.js.map