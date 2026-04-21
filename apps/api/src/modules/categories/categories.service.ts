import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@dlz/prisma';
import { IsString, IsOptional, IsNumber, IsArray } from 'class-validator';

export class CreateCategoryDto {
  @IsString() name: string;
  @IsOptional() @IsString() icon?: string;
  @IsOptional() @IsNumber() sortOrder?: number;
}

export class UpdateCategoryDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() icon?: string;
  @IsOptional() @IsNumber() sortOrder?: number;
}

export class ReorderDto {
  @IsArray() items: { id: string; sortOrder: number }[];
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Público ───────────────────────────────────────────────────────────────

  async findPublicByTenant(tenantId: string) {
    return this.prisma.category.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
      include: {
        products: {
          where: { available: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  // ── Privado ───────────────────────────────────────────────────────────────

  async findAll(tenantId: string) {
    return this.prisma.category.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { products: true } } },
    });
  }

  async create(tenantId: string, dto: CreateCategoryDto) {
    await this.checkPlanLimit(tenantId);
    const maxOrder = await this.prisma.category.aggregate({
      where: { tenantId },
      _max: { sortOrder: true },
    });
    return this.prisma.category.create({
      data: {
        tenantId,
        name: dto.name,
        icon: dto.icon ?? 'hamburger',
        sortOrder: dto.sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 1,
      },
    });
  }

  async update(id: string, tenantId: string, dto: UpdateCategoryDto) {
    await this.assertOwner(id, tenantId);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: string, tenantId: string) {
    await this.assertOwner(id, tenantId);
    return this.prisma.category.delete({ where: { id } });
  }

  async reorder(tenantId: string, dto: ReorderDto) {
    await Promise.all(
      dto.items.map((item) =>
        this.prisma.category.updateMany({
          where: { id: item.id, tenantId },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );
    return { ok: true };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async checkPlanLimit(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true },
    });
    if (!tenant) return;
    const plan = await this.prisma.plan.findFirst({ where: { slug: tenant.plan } });
    if (!plan || plan.maxCategories < 0) return;
    const count = await this.prisma.category.count({ where: { tenantId } });
    if (count >= plan.maxCategories) {
      throw new ForbiddenException(`Limite de ${plan.maxCategories} categorias atingido para o seu plano`);
    }
  }

  private async assertOwner(id: string, tenantId: string) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat || cat.tenantId !== tenantId) throw new NotFoundException('Categoria não encontrada');
  }
}
