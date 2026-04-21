import { Module } from '@nestjs/common';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '@dlz/prisma';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { IsString, IsOptional, IsNumber, IsArray } from 'class-validator';
import {
  ApiJsonCreatedResponse,
  ApiJsonOkResponse,
  ApiStandardErrorResponses,
} from '../../common/swagger/http-responses.decorators';

class CreatePlanDto {
  @ApiProperty({ example: 'Plano Pro' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'pro' })
  @IsString()
  slug: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 99.9 })
  @IsNumber()
  price: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stripePriceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  caktoPriceId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  features?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

@Injectable()
class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findAllAdmin() {
    return this.prisma.plan.findMany({
      orderBy: { sortOrder: 'asc' },
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
  @ApiStandardErrorResponses({ omitJwtErrorResponses: true })
  @ApiJsonOkResponse({ description: 'Planos ativos com limites' })
  findAll() {
    return this.plansService.findAll();
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'platform_owner')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lista todos os planos (owner da plataforma)' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({ description: 'Todos os planos (inclui inativos)' })
  findAllAdmin() {
    return this.plansService.findAllAdmin();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'platform_owner')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cria plano' })
  @ApiStandardErrorResponses({ conflict: true })
  @ApiJsonCreatedResponse({ description: 'Plano criado' })
  create(@Body() dto: CreatePlanDto) {
    return this.plansService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'platform_owner')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualiza plano' })
  @ApiStandardErrorResponses({ notFound: true })
  @ApiJsonOkResponse({ description: 'Plano atualizado' })
  @ApiParam({ name: 'id', required: true, type: String })
  update(@Param('id') id: string, @Body() dto: Partial<CreatePlanDto>) {
    return this.plansService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'platform_owner')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Desativa plano' })
  @ApiStandardErrorResponses({ notFound: true })
  @ApiJsonOkResponse({ description: 'Plano marcado como inativo' })
  @ApiParam({ name: 'id', required: true, type: String })
  remove(@Param('id') id: string) {
    return this.plansService.remove(id);
  }
}

@Module({ controllers: [PlansController], providers: [PlansService], exports: [PlansService] })
export class PlansModule {}
