import { Module } from '@nestjs/common';
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '@dlz/prisma';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';
import { IsString, IsOptional, IsNumber, IsEnum, IsBoolean, IsDateString, Min } from 'class-validator';

// ── DTOs ─────────────────────────────────────────────────────────────────────

class CreateCouponDto {
  @IsString() code: string;
  @IsEnum(['percentage', 'fixed']) discountType: 'percentage' | 'fixed';
  @IsNumber() @Min(0) discountValue: number;
  @IsOptional() @IsNumber() @Min(0) minOrderValue?: number;
  @IsOptional() @IsNumber() maxUses?: number;
  @IsOptional() @IsDateString() expiresAt?: string;
}

class ValidateCouponDto {
  @IsString() code: string;
  @IsString() tenantId: string;
  @IsNumber() orderTotal: number;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.coupon.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
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
    if (Number(coupon.minOrderValue ?? 0) > dto.orderTotal)
      throw new BadRequestException(`Pedido mínimo para este cupom: R$ ${coupon.minOrderValue}`);

    const discount =
      coupon.discountType === 'percentage'
        ? (dto.orderTotal * Number(coupon.discountValue)) / 100
        : Number(coupon.discountValue);

    return { valid: true, discount, coupon };
  }

  private async checkPlanLimit(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { plan: true } });
    const plan = await this.prisma.plan.findFirst({ where: { slug: tenant!.plan } });
    if (!plan) return;
    const limit = await this.prisma.planLimit.findUnique({
      where: { planId_limitKey: { planId: plan.id, limitKey: 'max_coupons' } },
    });
    if (!limit) return;
    const count = await this.prisma.coupon.count({ where: { tenantId } });
    if (count >= limit.limitValue)
      throw new ForbiddenException(`Limite de ${limit.limitValue} cupons atingido para o seu plano`);
  }

  private async assertOwner(id: string, tenantId: string) {
    const c = await this.prisma.coupon.findUnique({ where: { id } });
    if (!c || c.tenantId !== tenantId) throw new NotFoundException('Cupom não encontrado');
  }
}

// ── Controller ────────────────────────────────────────────────────────────────

@ApiTags('coupons')
@Controller('coupons')
class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post('validate')
  @ApiOperation({ summary: 'Valida cupom no checkout (público)' })
  validate(@Body() dto: ValidateCouponDto) {
    return this.couponsService.validate(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  findAll(@TenantId() tenantId: string) {
    return this.couponsService.findAll(tenantId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  create(@TenantId() tenantId: string, @Body() dto: CreateCouponDto) {
    return this.couponsService.create(tenantId, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  update(@Param('id') id: string, @TenantId() tenantId: string, @Body() dto: any) {
    return this.couponsService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.couponsService.remove(id, tenantId);
  }
}

// ── Module ────────────────────────────────────────────────────────────────────

@Module({
  controllers: [CouponsController],
  providers: [CouponsService],
  exports: [CouponsService],
})
export class CouponsModule {}
