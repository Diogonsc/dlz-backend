import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dlz/prisma';
import { CreateCouponDto } from '../../presentation/dtos/create-coupon.dto';
import { ValidateCouponDto } from '../../presentation/dtos/validate-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.coupon.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Cupons ativos para vitrine (sem segredos). */
  async findPublicActiveByStore(tenantId: string) {
    const id = tenantId?.trim();
    if (!id) throw new BadRequestException('store_id obrigatório');
    return this.prisma.coupon.findMany({
      where: { tenantId: id, isActive: true },
      orderBy: { discountValue: 'desc' },
      select: {
        id: true,
        code: true,
        discountType: true,
        discountValue: true,
        minOrderValue: true,
        expiresAt: true,
        maxUses: true,
        usedCount: true,
      },
    });
  }

  async create(tenantId: string, dto: CreateCouponDto) {
    await this.checkPlanLimit(tenantId);
    const code = dto.code.toUpperCase().trim();
    const existing = await this.prisma.coupon.findFirst({ where: { tenantId, code } });
    if (existing) throw new BadRequestException('Cupom já existe');

    return this.prisma.coupon.create({
      data: {
        tenantId,
        code,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        minOrderValue: dto.minOrderValue,
        maxUses: dto.maxUses,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });
  }

  async update(id: string, tenantId: string, data: Partial<CreateCouponDto & { isActive: boolean }>) {
    await this.assertOwner(id, tenantId);
    return this.prisma.coupon.update({ where: { id }, data: data as any });
  }

  async remove(id: string, tenantId: string) {
    await this.assertOwner(id, tenantId);
    return this.prisma.coupon.delete({ where: { id } });
  }

  async validate(dto: ValidateCouponDto) {
    const coupon = await this.prisma.coupon.findFirst({
      where: { tenantId: dto.tenantId, code: dto.code.toUpperCase(), isActive: true },
    });
    if (!coupon) throw new NotFoundException('Cupom inválido');
    if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new BadRequestException('Cupom expirado');
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) throw new BadRequestException('Cupom esgotado');
    if (Number(coupon.minOrderValue ?? 0) > dto.orderTotal) {
      throw new BadRequestException(`Pedido mínimo para este cupom: R$ ${coupon.minOrderValue}`);
    }

    const discount =
      coupon.discountType === 'percentage'
        ? (dto.orderTotal * Number(coupon.discountValue)) / 100
        : Number(coupon.discountValue);

    return { valid: true, discount, coupon };
  }

  private async checkPlanLimit(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { plan: true } });
    if (!tenant) return;
    const plan = await this.prisma.plan.findFirst({ where: { slug: tenant.plan } });
    if (!plan || plan.maxCoupons < 0) return;
    const count = await this.prisma.coupon.count({ where: { tenantId } });
    if (count >= plan.maxCoupons) {
      throw new ForbiddenException(`Limite de ${plan.maxCoupons} cupons atingido para o seu plano`);
    }
  }

  private async assertOwner(id: string, tenantId: string) {
    const c = await this.prisma.coupon.findUnique({ where: { id } });
    if (!c || c.tenantId !== tenantId) throw new NotFoundException('Cupom não encontrado');
  }
}
