import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@dlz/prisma';
import { slugify } from '@dlz/shared';
import * as bcrypt from 'bcryptjs';
import { StoreSignupDto } from '../../presentation/dtos/store-signup.dto';

const CAKTO_CHECKOUT: Record<string, string> = {
  starter: 'https://pay.cakto.com.br/i2idsg2_826963',
  pro: 'https://pay.cakto.com.br/ja8fqo7_826966',
  agency: 'https://pay.cakto.com.br/koi46f5_826967',
  elite: 'https://pay.cakto.com.br/koi46f5_826967',
};

@Injectable()
export class SignupService {
  private readonly logger = new Logger(SignupService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createStore(dto: StoreSignupDto) {
    const email = dto.email.trim().toLowerCase();

    const plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!plan || !plan.isActive) throw new BadRequestException('Plano inválido ou inativo');

    const caktoUrl = CAKTO_CHECKOUT[plan.slug];
    if (!caktoUrl) throw new BadRequestException('Plano não disponível para assinatura online');

    let user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      const passwordHash = await bcrypt.hash(dto.password, 12);
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });
      this.logger.log(`Reusing existing user: ${user.id}`);
    } else {
      const passwordHash = await bcrypt.hash(dto.password, 12);
      user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          profile: { create: { displayName: dto.ownerName } },
          roles: { create: { role: 'admin' } },
        },
      });
      this.logger.log(`User created: ${user.id}`);
    }

    await this.prisma.userRole.upsert({
      where: { userId_role: { userId: user.id, role: 'admin' } },
      create: { userId: user.id, role: 'admin' },
      update: {},
    });

    const existingTenant = await this.prisma.tenant.findUnique({ where: { userId: user.id } });
    if (existingTenant) {
      if (existingTenant.status === 'pending_payment') {
        return { tenantId: existingTenant.id, checkoutUrl: caktoUrl, resumed: true };
      }
      throw new ConflictException('Este e-mail já possui uma loja cadastrada');
    }

    const baseSlug = slugify(dto.storeName);
    const subdomain = await this.resolveUniqueSubdomain(baseSlug);

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.storeName,
        owner: dto.ownerName,
        email,
        phone: dto.phone ?? '',
        plan: plan.slug as any,
        planId: plan.id,
        status: 'pending_payment',
        url: baseSlug,
        subdomain,
        since: new Date().toLocaleDateString('pt-BR'),
        userId: user.id,
        storeConfig: {
          create: {
            storeName: dto.storeName,
            slug: baseSlug,
          },
        },
      },
    });

    this.logger.log(`Tenant created (pending_payment): ${tenant.id} subdomain=${subdomain}`);

    return {
      success: true,
      tenantId: tenant.id,
      slug: baseSlug,
      subdomain,
      checkoutUrl: caktoUrl,
      resumed: false,
    };
  }

  async resumeCheckout(userId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { userId },
      include: { planRef: true },
    });

    if (!tenant) throw new BadRequestException('Nenhuma loja encontrada para este usuário');
    if (tenant.status !== 'pending_payment') {
      throw new BadRequestException('Sua loja já está ativa. Acesse o painel.');
    }

    const planSlug = tenant.planRef?.slug ?? tenant.plan;
    const checkoutUrl = CAKTO_CHECKOUT[planSlug];

    if (!checkoutUrl) throw new BadRequestException('URL de checkout não encontrada');

    return { checkoutUrl, tenantId: tenant.id };
  }

  private async resolveUniqueSubdomain(base: string): Promise<string> {
    const root = base || 'minha-loja';
    const existing = await this.prisma.tenant.findFirst({ where: { subdomain: root } });
    if (!existing) return root;

    for (let i = 0; i < 15; i++) {
      const suffix = Math.floor(1000 + Math.random() * 9000);
      const candidate = `${root}-${suffix}`.slice(0, 63);
      const found = await this.prisma.tenant.findFirst({ where: { subdomain: candidate } });
      if (!found) return candidate;
    }
    return `${root}-${Date.now().toString().slice(-4)}`.slice(0, 63);
  }
}
