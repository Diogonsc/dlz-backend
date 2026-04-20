import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService, CreateProductDto, UpdateProductDto } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';

@ApiTags('products')
@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('stores/:tenantId/products')
  @ApiOperation({ summary: 'Produtos disponíveis públicos (vitrine)' })
  findPublic(@Param('tenantId') tenantId: string) {
    return this.productsService.findPublicByTenant(tenantId);
  }

  @Get('products')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lista todos os produtos (painel)' })
  findAll(@TenantId() tenantId: string, @Query('categoryId') categoryId?: string) {
    return this.productsService.findAll(tenantId, categoryId);
  }

  @Get('products/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Detalhe do produto' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.productsService.findById(id, tenantId);
  }

  @Post('products')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cria produto' })
  create(@TenantId() tenantId: string, @Body() dto: CreateProductDto) {
    return this.productsService.create(tenantId, dto);
  }

  @Patch('products/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualiza produto' })
  update(@Param('id') id: string, @TenantId() tenantId: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, tenantId, dto);
  }

  @Delete('products/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove produto' })
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.productsService.remove(id, tenantId);
  }

  @Patch('products/:id/availability')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ativa/desativa produto' })
  toggleAvailability(@Param('id') id: string, @TenantId() tenantId: string, @Body('available') available: boolean) {
    return this.productsService.toggleAvailability(id, tenantId, available);
  }
}
