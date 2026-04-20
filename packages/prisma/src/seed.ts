import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed DLZ...');

  const plans = [
    {
      name: 'Starter', slug: 'starter', description: 'Para começar a vender online',
      price: 47, caktoPriceId: 'i2idsg2_826963',
      maxProducts: 30, maxCategories: 10, maxCoupons: 3, sortOrder: 1,
      features: ['Cardápio digital', 'Pedidos via WhatsApp', 'Até 30 produtos', 'Suporte básico'],
    },
    {
      name: 'Pro', slug: 'pro', description: 'Para quem quer crescer',
      price: 97, caktoPriceId: 'ja8fqo7_826966',
      maxProducts: 999999, maxCategories: 999999, maxCoupons: 999999, sortOrder: 2,
      features: ['Tudo do Starter', 'PDV completo', 'KDS cozinha', 'Analytics', 'Domínio próprio', 'iFood', 'Ilimitado'],
    },
    {
      name: 'Agency', slug: 'agency', description: 'Para agências e redes',
      price: 147, caktoPriceId: 'koi46f5_826967',
      maxProducts: 999999, maxCategories: 999999, maxCoupons: 999999, sortOrder: 3,
      features: ['Tudo do Pro', 'Multi-lojas', 'API acesso', 'Suporte prioritário', 'Push notifications'],
    },
  ];

  for (const plan of plans) {
    const { maxProducts, maxCategories, maxCoupons, ...planData } = plan;
    const created = await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: { ...planData, maxProducts, maxCategories, maxCoupons },
      create: { ...planData, maxProducts, maxCategories, maxCoupons },
    });
    for (const [key, val] of [['max_products', maxProducts], ['max_categories', maxCategories], ['max_coupons', maxCoupons]] as const) {
      await prisma.planLimit.upsert({
        where: { planId_limitKey: { planId: created.id, limitKey: key } },
        update: { limitValue: val },
        create: { planId: created.id, limitKey: key, limitValue: val },
      });
    }
    console.log(`✅ Plano ${plan.name}`);
  }

  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@dlz.app.br';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin@DLZ2025!';
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        email: adminEmail, passwordHash,
        profile: { create: { displayName: 'DLZ Admin' } },
        roles: { create: [{ role: 'admin' }, { role: 'platform_owner' }] },
      },
    });
    console.log(`✅ Admin: ${adminEmail} / ${adminPassword}`);
    console.log(`⚠️  TROQUE A SENHA EM PRODUÇÃO!`);
  } else {
    console.log(`ℹ️  Admin já existe: ${adminEmail}`);
  }

  console.log('🎉 Seed concluído!');
}

main()
  .catch((e) => { console.error('❌', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
