import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@dlz/prisma';
import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, IsUUID, Min } from 'class-validator';

export class CreateProductDto {
  @IsUUID() categoryId: string;
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsNumber() @Min(0) price: number;
  @IsOptional() @IsString() image?: string;
  @IsOptional() @IsBoolean() available?: boolean;
  @IsOptional() @IsString() badge?: string;
  @IsOptional() @IsArray() variations?: any[];
  @IsOptional() @IsArray() extras?: any[];
  @IsOptional() @IsNumber() sortOrder?: number;
}

export class UpdateProductDto {
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsString() image?: string;
  @IsOptional() @IsBoolean() available?: boolean;
  @IsOptional() @IsString() badge?: string;
  @IsOptional() @IsArray() variations?: any[];
  @IsOptional() @IsArray() extras?: any[];
  @IsOptional() @IsNumber() sortOrder?: number;
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Público ───────────────────────────────────────────────────────────────

  async findPublicByTenant(tenantId: string) {
    return this.prisma.product.findMany({
      where: { tenantId, available: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: { category: { select: { id: true, name: true, icon: true } } },
    });
  }

  // ── Privado ───────────────────────────────────────────────────────────────

  async findAll(tenantId: string, categoryId?: string) {
    return this.prisma.product.findMany({
      where: { tenantId, ...(categoryId ? { categoryId } : {}) },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { category: { select: { id: true, name: true } } },
    });
  }

  async findById(id: string, tenantId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!product || product.tenantId !== tenantId) throw new NotFoundException('Produto não encontrado');
    return product;
  }

  async create(tenantId: string, dto: CreateProductDto) {
    await this.checkPlanLimit(tenantId);
    await this.assertCategoryOwner(dto.categoryId, tenantId);

    return this.prisma.product.create({
      data: {
        tenantId,
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description ?? '',
        price: dto.price,
        image: dto.image,
        available: dto.available ?? true,
        badge: dto.badge,
        variations: dto.variations ?? [],
        extras: dto.extras ?? [],
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async update(id: string, tenantId: string, dto: UpdateProductDto) {
    await this.assertOwner(id, tenantId);
    if (dto.categoryId) await this.assertCategoryOwner(dto.categoryId, tenantId);
    return this.prisma.product.update({ where: { id }, data: dto as any });
  }

  async remove(id: string, tenantId: string) {
    await this.assertOwner(id, tenantId);
    return this.prisma.product.delete({ where: { id } });
  }

  async toggleAvailability(id: string, tenantId: string, available: boolean) {
    await this.assertOwner(id, tenantId);
    return this.prisma.product.update({ where: { id }, data: { available } });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async checkPlanLimit(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { plan: true } });
    if (!tenant) return;
    const plan = await this.prisma.plan.findFirst({ where: { slug: tenant.plan } });
    if (!plan || plan.maxProducts < 0) return;
    const count = await this.prisma.product.count({ where: { tenantId } });
    if (count >= plan.maxProducts) {
      throw new ForbiddenException(`Limite de ${plan.maxProducts} produtos atingido para o seu plano`);
    }
  }

  private async assertOwner(id: string, tenantId: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product || product.tenantId !== tenantId) throw new NotFoundException('Produto não encontrado');
  }

  private async assertCategoryOwner(categoryId: string, tenantId: string) {
    const cat = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat || cat.tenantId !== tenantId) throw new BadRequestException('Categoria inválida');
  }
}
