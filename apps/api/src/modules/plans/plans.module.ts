import { Module } from '@nestjs/common';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '@dlz/prisma';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, IsObject } from 'class-validator';

class CreatePlanDto {
  @IsString() name: string;
  @IsString() slug: string;
  @IsOptional() @IsString() description?: string;
  @IsNumber() price: number;
  @IsOptional() @IsString() stripePriceId?: string;
  @IsOptional() @IsString() caktoPriceId?: string;
  @IsOptional() @IsArray() features?: string[];
  @IsOptional() @IsNumber() sortOrder?: number;
}

@Injectable()
class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: { limits: true },
    });
  }

  async findAllAdmin() {
    return this.prisma.plan.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { limits: true },
    });
  }

  async create(dto: CreatePlanDto) {
    return this.prisma.plan.create({
      data: { ...dto, features: dto.features ?? [] },
    });
  }

  async update(id: string, dto: Partial<CreatePlanDto>) {
    return this.prisma.plan.update({ where: { id }, data: dto as any });
  }

  async remove(id: string) {
    return this.prisma.plan.update({ where: { id }, data: { isActive: false } });
  }
}

@ApiTags('plans')
@Controller('plans')
class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  @ApiOperation({ summary: 'Lista planos ativos (público — landing page)' })
  findAll() {
    return this.plansService.findAll();
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lista todos os planos (owner da plataforma)' })
  findAllAdmin() {
    return this.plansService.findAllAdmin();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cria plano' })
  create(@Body() dto: CreatePlanDto) {
    return this.plansService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualiza plano' })
  update(@Param('id') id: string, @Body() dto: Partial<CreatePlanDto>) {
    return this.plansService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Desativa plano' })
  remove(@Param('id') id: string) {
    return this.plansService.remove(id);
  }
}

@Module({ controllers: [PlansController], providers: [PlansService], exports: [PlansService] })
export class PlansModule {}
