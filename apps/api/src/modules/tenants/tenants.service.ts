import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@dlz/prisma';
import { IsString, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() owner: string;
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() phone?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() plan?: string;
}

export class UpdateTenantDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() owner?: string;
  @IsOptional() @IsString() phone?: string;
}

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.tenant.findMany({
      include: { storeConfig: true, _count: { select: { orders_rel: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: { storeConfig: true, user: { select: { email: true } } },
    });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');
    return tenant;
  }

  async findByUserId(userId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { userId },
      include: { storeConfig: true },
    });
    if (!tenant) throw new NotFoundException('Tenant não encontrado para este usuário');
    return tenant;
  }

  async create(dto: CreateTenantDto, userId: string) {
    return this.prisma.tenant.create({
      data: {
        name: dto.name,
        owner: dto.owner,
        email: dto.email,
        phone: dto.phone ?? '',
        plan: (dto.plan as any) ?? 'starter',
        status: 'trial',
        userId,
        storeConfig: {
          create: {
            storeName: dto.name,
          },
        },
      },
      include: { storeConfig: true },
    });
  }

  async update(id: string, dto: UpdateTenantDto, requestUserId: string) {
    const tenant = await this.findById(id);
    if (tenant.userId !== requestUserId) {
      throw new ForbiddenException('Você não tem permissão para editar este tenant');
    }
    return this.prisma.tenant.update({
      where: { id },
      data: dto,
    });
  }

  async updateStatus(id: string, status: 'active' | 'trial' | 'inactive') {
    return this.prisma.tenant.update({
      where: { id },
      data: { status },
    });
  }

  async getMyTenant(userId: string) {
    return this.findByUserId(userId);
  }
}
