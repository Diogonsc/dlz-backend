import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ProductsService, CreateProductDto, UpdateProductDto } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';
import {
  ApiAuthEndpoint,
  ApiJsonCreatedResponse,
  ApiJsonOkResponse,
  ApiPublicEndpoint,
  ApiStandardErrorResponses,
} from '../../common/swagger/http-responses.decorators';
import {
  ProductDetailResponseDto,
  ProductPanelListItemResponseDto,
  ProductPersistedResponseDto,
  ProductPublicListItemResponseDto,
} from './dtos/product-response.dto';

@ApiTags('products')
@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('stores/:tenantId/products')
  @ApiPublicEndpoint()
  @ApiOperation({ operationId: 'getPublicProductsByTenant', summary: 'Produtos disponíveis públicos (vitrine)' })
  @ApiStandardErrorResponses({ omitJwtErrorResponses: true, notFound: true })
  @ApiJsonOkResponse({
    type: ProductPublicListItemResponseDto,
    isArray: true,
    description: 'Lista pública de produtos ativos',
  })
  @ApiParam({ name: 'tenantId', required: true, type: String, description: 'UUID do tenant (loja)' })
  findPublic(@Param('tenantId') tenantId: string) {
    return this.productsService.findPublicByTenant(tenantId);
  }

  @Get('products')
  @UseGuards(JwtAuthGuard)
  @ApiAuthEndpoint()
  @ApiOperation({ operationId: 'getProducts', summary: 'Lista todos os produtos (painel)' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({
    type: ProductPanelListItemResponseDto,
    isArray: true,
    description: 'Produtos da loja autenticada',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    type: String,
    description: 'Filtra por categoria',
  })
  findAll(@TenantId() tenantId: string, @Query('categoryId') categoryId?: string) {
    return this.productsService.findAll(tenantId, categoryId);
  }

  @Get('products/:id')
  @UseGuards(JwtAuthGuard)
  @ApiAuthEndpoint()
  @ApiOperation({ operationId: 'getProductById', summary: 'Detalhe do produto' })
  @ApiStandardErrorResponses({ notFound: true })
  @ApiJsonOkResponse({
    type: ProductDetailResponseDto,
    description: 'Produto com categorias e preços',
  })
  @ApiParam({ name: 'id', required: true, type: String })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.productsService.findById(id, tenantId);
  }

  @Post('products')
  @UseGuards(JwtAuthGuard)
  @ApiAuthEndpoint()
  @ApiOperation({ operationId: 'createProduct', summary: 'Cria produto' })
  @ApiStandardErrorResponses()
  @ApiJsonCreatedResponse({
    type: ProductPersistedResponseDto,
    description: 'Produto criado',
  })
  create(@TenantId() tenantId: string, @Body() dto: CreateProductDto) {
    return this.productsService.create(tenantId, dto);
  }

  @Patch('products/:id')
  @UseGuards(JwtAuthGuard)
  @ApiAuthEndpoint()
  @ApiOperation({ operationId: 'updateProduct', summary: 'Atualiza produto' })
  @ApiStandardErrorResponses({ notFound: true })
  @ApiJsonOkResponse({
    type: ProductPersistedResponseDto,
    description: 'Produto atualizado',
  })
  @ApiParam({ name: 'id', required: true, type: String })
  update(@Param('id') id: string, @TenantId() tenantId: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, tenantId, dto);
  }

  @Delete('products/:id')
  @UseGuards(JwtAuthGuard)
  @ApiAuthEndpoint()
  @ApiOperation({ operationId: 'deleteProduct', summary: 'Remove produto' })
  @ApiStandardErrorResponses({ notFound: true })
  @ApiJsonOkResponse({
    type: ProductPersistedResponseDto,
    description: 'Registro do produto removido',
  })
  @ApiParam({ name: 'id', required: true, type: String })
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.productsService.remove(id, tenantId);
  }

  @Patch('products/:id/availability')
  @UseGuards(JwtAuthGuard)
  @ApiAuthEndpoint()
  @ApiOperation({ operationId: 'updateProductAvailability', summary: 'Ativa/desativa produto' })
  @ApiStandardErrorResponses({ notFound: true })
  @ApiJsonOkResponse({
    type: ProductPersistedResponseDto,
    description: 'Produto com flag de disponibilidade atualizada',
  })
  @ApiParam({ name: 'id', required: true, type: String })
  toggleAvailability(@Param('id') id: string, @TenantId() tenantId: string, @Body('available') available: boolean) {
    return this.productsService.toggleAvailability(id, tenantId, available);
  }
}
