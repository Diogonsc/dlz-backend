import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@dlz/prisma';
import { IsString, IsOptional, IsNumber, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { slugify } from '@dlz/shared';

export class UpdateStoreDto {
  @IsOptional() @IsString() storeName?: string;
  @IsOptional() @IsString() storeDescription?: string;
  @IsOptional() @IsString() storeAddress?: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() banner?: string;
  @IsOptional() @IsString() avatar?: string;
  @IsOptional() @IsString() primaryColor?: string;
  @IsOptional() @IsString() accentColor?: string;
  @IsOptional() @IsNumber() deliveryFee?: number;
  @IsOptional() @IsNumber() minOrder?: number;
  @IsOptional() @IsString() deliveryTime?: string;
  @IsOptional() @IsString() pixKey?: string;
  @IsOptional() @IsString() pixKeyType?: string;
  @IsOptional() @IsObject() operatingHours?: Record<string, any>;
  @IsOptional() @IsString() orderCutoffTime?: string;
  @IsOptional() @IsObject() acceptedPaymentMethods?: Record<string, boolean>;
  @IsOptional() @IsString() whatsapp?: string;
  @IsOptional() @IsString() instagram?: string;
  @IsOptional() @IsString() facebook?: string;
  @IsOptional() @IsBoolean() isOpen?: boolean;
  @IsOptional() @IsString() customDomain?: string;
}

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Público: busca por slug ───────────────────────────────────────────────

  async findPublicBySlug(slug: string) {
    const store = await this.prisma.storeConfig.findUnique({
      where: { slug },
      include: {
        tenant: {
          select: { id: true, plan: true, status: true, themePrimary: true, themeAccent: true },
        },
      },
    });
    if (!store) throw new NotFoundException('Loja não encontrada');
    if (store.tenant.status === 'inactive') throw new NotFoundException('Loja inativa');
    return store;
  }

  // ── Público: busca por domínio customizado ────────────────────────────────

  async findByCustomDomain(domain: string) {
    const store = await this.prisma.storeConfig.findFirst({
      where: { customDomain: domain },
      include: {
        tenant: {
          select: { id: true, plan: true, status: true, themePrimary: true, themeAccent: true },
        },
      },
    });
    if (!store) throw new NotFoundException('Domínio não configurado');
    return store;
  }

  // ── Privado: busca config completa do próprio tenant ──────────────────────

  async findMyStore(tenantId: string) {
    const store = await this.prisma.storeConfig.findUnique({
      where: { tenantId },
    });
    if (!store) throw new NotFoundException('Configuração da loja não encontrada');
    return store;
  }

  // ── Atualiza config da loja ───────────────────────────────────────────────

  async update(tenantId: string, dto: UpdateStoreDto) {
    if (dto.slug) {
      const normalized = slugify(dto.slug);
      const existing = await this.prisma.storeConfig.findFirst({
        where: { slug: normalized, tenantId: { not: tenantId } },
      });
      if (existing) throw new ConflictException('Este slug já está em uso');
      dto.slug = normalized;
    }

    if (dto.storeName && !dto.slug) {
      const autoSlug = slugify(dto.storeName);
      const existing = await this.prisma.storeConfig.findFirst({
        where: { slug: autoSlug, tenantId: { not: tenantId } },
      });
      if (!existing) {
        (dto as any).slug = autoSlug;
      }
    }

    return this.prisma.storeConfig.update({
      where: { tenantId },
      data: dto as any,
    });
  }

  // ── Toggle abertura/fechamento ────────────────────────────────────────────

  async toggleOpen(tenantId: string, isOpen: boolean) {
    return this.prisma.storeConfig.update({
      where: { tenantId },
      data: { isOpen },
    });
  }
}
