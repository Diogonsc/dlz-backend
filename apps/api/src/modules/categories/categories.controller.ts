import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService, CreateCategoryDto, UpdateCategoryDto, ReorderDto } from './categories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';

@ApiTags('categories')
@Controller()
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get('stores/:tenantId/categories')
  @ApiOperation({ summary: 'Categorias públicas com produtos (vitrine)' })
  findPublic(@Param('tenantId') tenantId: string) {
    return this.categoriesService.findPublicByTenant(tenantId);
  }

  @Get('categories')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lista categorias da loja (painel)' })
  findAll(@TenantId() tenantId: string) {
    return this.categoriesService.findAll(tenantId);
  }

  @Post('categories')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cria categoria' })
  create(@TenantId() tenantId: string, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(tenantId, dto);
  }

  @Patch('categories/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualiza categoria' })
  update(@Param('id') id: string, @TenantId() tenantId: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, tenantId, dto);
  }

  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove categoria' })
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.categoriesService.remove(id, tenantId);
  }

  @Patch('categories/reorder')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reordena categorias (drag-and-drop)' })
  reorder(@TenantId() tenantId: string, @Body() dto: ReorderDto) {
    return this.categoriesService.reorder(tenantId, dto);
  }
}
