#!/usr/bin/env ts-node
// DLZ Migration v2 — Supabase → PostgreSQL Hetzner
// Uso: DATABASE_URL=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... ts-node scripts/migrate-from-supabase.ts

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();
const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const log = (s: string, d?: any) => console.log(`[MIGRATE] ${s}${d ? ` — ${JSON.stringify(d)}` : ''}`);

async function pg<T>(table: string, fn: (rows: T[]) => Promise<void>, size = 500) {
  let p = 0, n = 0;
  while (true) {
    const { data } = await sb.from(table).select('*').order('created_at', { ascending: true }).range(p * size, (p + 1) * size - 1);
    if (!data?.length) break;
    await fn(data as T[]);
    n += data.length; p++;
    if (data.length < size) break;
  }
  return n;
}

async function main() {
  log('Iniciando migração DLZ v2');

  // Plans
  const { data: plans } = await sb.from('plans').select('*');
  for (const p of plans ?? []) {
    await prisma.plan.upsert({ where: { slug: p.slug }, create: { id: p.id, name: p.name, slug: p.slug, description: p.description ?? '', price: p.price, stripePriceId: p.stripe_price_id, features: p.features ?? [], isActive: p.is_active ?? true, sortOrder: p.sort_order ?? 0, maxProducts: p.max_products ?? -1, maxCategories: p.max_categories ?? -1, maxCoupons: p.max_coupons ?? -1 }, update: { price: p.price } });
  }
  log(`✅ Plans: ${plans?.length ?? 0}`);

  // Tenants
  const { data: tenants } = await sb.from('tenants').select('*');
  for (const t of tenants ?? []) {
    try {
      await prisma.tenant.upsert({ where: { id: t.id }, create: { id: t.id, name: t.name, owner: t.owner, email: t.email, phone: t.phone ?? '', plan: t.plan ?? 'starter', planId: t.plan_id, status: t.status ?? 'trial', url: t.url ?? '', subdomain: t.subdomain, domainStatus: t.domain_status ?? 'none', trialEndsAt: t.trial_ends_at ? new Date(t.trial_ends_at) : null, since: t.since ?? '', revenue: t.revenue ?? 0, orders: t.orders ?? 0, mrr: t.mrr ?? 0, themePrimary: t.theme_primary ?? '#1a1a2e', themeAccent: t.theme_accent ?? '#e8a838' }, update: { status: t.status } });
    } catch (e: any) { log(`⚠️ Tenant ${t.id}: ${e.message}`); }
  }
  log(`✅ Tenants: ${tenants?.length ?? 0}`);

  // Store configs
  const { data: stores } = await sb.from('store_config').select('*');
  for (const s of stores ?? []) {
    try {
      await prisma.storeConfig.upsert({ where: { tenantId: s.store_id }, create: { id: s.id, tenantId: s.store_id, storeName: s.store_name ?? '', storeDescription: s.store_description ?? '', storeAddress: s.store_address ?? '', banner: s.banner, avatar: s.avatar, primaryColor: s.primary_color ?? '#ea580c', accentColor: s.accent_color ?? '#f97316', deliveryFee: s.delivery_fee ?? 5.9, minOrder: s.min_order ?? 25, deliveryTime: s.delivery_time ?? '30–45 min', deliveryDynamicEnabled: s.delivery_dynamic_enabled ?? false, deliveryRegions: s.delivery_regions ?? [], deliveryOriginLat: s.delivery_origin_lat, deliveryOriginLng: s.delivery_origin_lng, pixKey: s.pix_key ?? '', pixKeyType: s.pix_key_type ?? 'email', operatingHours: s.operating_hours ?? {}, orderCutoffTime: s.order_cutoff_time ?? '21:00', acceptedPaymentMethods: s.accepted_payment_methods ?? {}, whatsapp: s.whatsapp ?? '', whatsappMessageTemplate: s.whatsapp_message_template ?? '', whatsappAutoSend: s.whatsapp_auto_send ?? true, instagram: s.instagram ?? '', facebook: s.facebook ?? '', customDomain: s.custom_domain, isOpen: s.is_open ?? true }, update: { storeName: s.store_name } });
    } catch (e: any) { log(`⚠️ Store ${s.id}: ${e.message}`); }
  }
  log(`✅ Store configs: ${stores?.length ?? 0}`);

  // Categories
  const { data: cats } = await sb.from('categories').select('*').order('sort_order');
  for (const c of cats ?? []) {
    try { await prisma.category.upsert({ where: { id: c.id }, create: { id: c.id, tenantId: c.store_id, name: c.name, icon: c.icon ?? 'hamburger', sortOrder: c.sort_order ?? 0 }, update: { name: c.name } }); } catch {}
  }
  log(`✅ Categories: ${cats?.length ?? 0}`);

  // Products
  const { data: prods } = await sb.from('products').select('*');
  for (const p of prods ?? []) {
    try { await prisma.product.upsert({ where: { id: p.id }, create: { id: p.id, tenantId: p.store_id, categoryId: p.category_id, name: p.name, description: p.description ?? '', price: p.price ?? 0, image: p.image, images: p.images ?? [], available: p.available ?? true, badge: p.badge, variations: p.variations ?? [], extras: p.extras ?? [], sortOrder: p.sort_order ?? 0 }, update: { price: p.price } }); } catch {}
  }
  log(`✅ Products: ${prods?.length ?? 0}`);

  // Orders (paginado)
  const ordersTotal = await pg('orders', async (orders) => {
    for (const o of orders) {
      try { await prisma.order.upsert({ where: { orderCode: o.order_code }, create: { id: o.id, orderCode: o.order_code, tenantId: o.store_id, status: o.status ?? 'pending', orderSource: o.order_source ?? 'delivery', customerName: o.customer_name, customerPhone: o.customer_phone, address: o.address, payment: o.payment ?? 'pix', changeFor: o.change_for, items: o.items ?? [], subtotal: o.subtotal ?? 0, deliveryFee: o.delivery_fee ?? 0, tip: o.tip ?? 0, total: o.total ?? 0, couponCode: o.coupon_code, discountAmount: o.discount_amount ?? 0, mpPreferenceId: o.mp_preference_id, mpPaymentId: o.mp_payment_id, marketingWhatsappOptIn: o.marketing_whatsapp_opt_in ?? false, ifoodOrderId: o.ifood_order_id, ifoodApiFlags: o.ifood_api_flags ?? {} }, update: { status: o.status } }); } catch {}
    }
  });
  log(`✅ Orders: ${ordersTotal}`);

  // Coupons
  const { data: coupons } = await sb.from('coupons').select('*');
  for (const c of coupons ?? []) {
    try { await prisma.coupon.upsert({ where: { id: c.id }, create: { id: c.id, tenantId: c.store_id, code: c.code, discountType: c.discount_type ?? 'percentage', discountValue: c.discount_value ?? 0, minOrderValue: c.min_order ?? null, maxUses: c.max_uses, usedCount: c.used_count ?? 0, isActive: c.active ?? true, expiresAt: c.expires_at ? new Date(c.expires_at) : null }, update: { isActive: c.active } }); } catch {}
  }
  log(`✅ Coupons: ${coupons?.length ?? 0}`);

  // Payment gateways
  const { data: gateways } = await sb.from('payment_gateways').select('*');
  for (const g of gateways ?? []) {
    try { await prisma.paymentGateway.upsert({ where: { tenantId_provider: { tenantId: g.tenant_id, provider: g.provider } }, create: { id: g.id, tenantId: g.tenant_id, provider: g.provider, publicKey: g.public_key ?? '', accessToken: g.access_token ?? '', webhookSecret: g.webhook_secret ?? '', isActive: g.is_active ?? false, environment: g.environment ?? 'sandbox', enabledMethods: g.enabled_methods ?? {} }, update: { isActive: g.is_active } }); } catch {}
  }
  log(`✅ Payment gateways: ${gateways?.length ?? 0}`);

  // Customer profiles
  const { data: customers } = await sb.from('customer_profiles').select('*');
  for (const c of customers ?? []) {
    try { await prisma.customerProfile.upsert({ where: { id: c.id }, create: { id: c.id, tenantId: c.store_id ?? '', name: c.name ?? '', phone: c.phone ?? '', phoneNormalized: c.phone_normalized ?? '', totalOrders: c.total_orders ?? 0, totalSpent: c.total_spent ?? 0, lastOrderAt: c.last_order_at ? new Date(c.last_order_at) : null, segment: c.segment ?? 'new' }, update: { totalOrders: c.total_orders } }); } catch {}
  }
  log(`✅ Customers: ${customers?.length ?? 0}`);

  // WhatsApp contacts
  const { data: wc } = await sb.from('whatsapp_contacts').select('*');
  for (const c of wc ?? []) {
    try { await prisma.whatsappContact.upsert({ where: { tenantId_phoneE164: { tenantId: c.store_id, phoneE164: c.phone_e164 } }, create: { tenantId: c.store_id, phoneE164: c.phone_e164, optIn: c.opt_in ?? false, optOut: c.opt_out ?? false, lastInteraction: c.last_interaction ? new Date(c.last_interaction) : null, blockedUntil: c.blocked_until ? new Date(c.blocked_until) : null, consecutiveSendFailures: c.consecutive_send_failures ?? 0 }, update: { optIn: c.opt_in, optOut: c.opt_out } }); } catch {}
  }
  log(`✅ WhatsApp contacts: ${wc?.length ?? 0}`);

  // Winback
  const { data: wb } = await sb.from('winback_coupons').select('*');
  for (const w of wb ?? []) {
    try { await prisma.winbackCoupon.upsert({ where: { id: w.id }, create: { id: w.id, tenantId: w.store_id, code: w.code, discountType: w.discount_type ?? 'percentage', discountValue: w.discount_value ?? 0, isActive: w.is_active ?? true }, update: { isActive: w.is_active } }); } catch {}
  }
  log(`✅ Winback: ${wb?.length ?? 0}`);

  log('🎉 Migração v2 concluída!');
}

main().catch((e) => { console.error('❌', e); process.exit(1); }).finally(() => prisma.$disconnect());
