import { SkipThrottle } from '@nestjs/throttler';
import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { CategoriesService, CreateCategoryDto, UpdateCategoryDto, ReorderDto } from './categories.service';
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
  CategoriesReorderResponseDto,
  CategoryPanelListItemResponseDto,
  CategoryPersistedResponseDto,
  CategoryPublicWithProductsResponseDto,
} from './dtos/category-response.dto';

@ApiTags('categories')
@SkipThrottle()
@Controller()
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get('stores/:tenantId/categories')
  @ApiPublicEndpoint()
  @ApiOperation({
    operationId: 'getPublicCategoriesByTenant',
    summary: 'Categorias públicas com produtos (vitrine)',
  })
  @ApiStandardErrorResponses({ omitJwtErrorResponses: true, notFound: true })
  @ApiJsonOkResponse({
    type: CategoryPublicWithProductsResponseDto,
    isArray: true,
    description: 'Árvore pública de categorias e produtos',
  })
  @ApiParam({ name: 'tenantId', required: true, type: String, description: 'UUID do tenant' })
  findPublic(@Param('tenantId') tenantId: string) {
    return this.categoriesService.findPublicByTenant(tenantId);
  }

  @Get('categories')
  @UseGuards(JwtAuthGuard)
  @ApiAuthEndpoint()
  @ApiOperation({ operationId: 'getCategories', summary: 'Lista categorias da loja (painel)' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({
    type: CategoryPanelListItemResponseDto,
    isArray: true,
    description: 'Categorias ordenadas',
  })
  findAll(@TenantId() tenantId: string) {
    return this.categoriesService.findAll(tenantId);
  }

  @Post('categories')
  @UseGuards(JwtAuthGuard)
  @ApiAuthEndpoint()
  @ApiOperation({ operationId: 'createCategory', summary: 'Cria categoria' })
  @ApiStandardErrorResponses()
  @ApiJsonCreatedResponse({
    type: CategoryPersistedResponseDto,
    description: 'Categoria criada',
  })
  create(@TenantId() tenantId: string, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(tenantId, dto);
  }

  @Patch('categories/:id')
  @UseGuards(JwtAuthGuard)
  @ApiAuthEndpoint()
  @ApiOperation({ operationId: 'updateCategory', summary: 'Atualiza categoria' })
  @ApiStandardErrorResponses({ notFound: true })
  @ApiJsonOkResponse({
    type: CategoryPersistedResponseDto,
    description: 'Categoria atualizada',
  })
  @ApiParam({ name: 'id', required: true, type: String })
  update(@Param('id') id: string, @TenantId() tenantId: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, tenantId, dto);
  }

  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard)
  @ApiAuthEndpoint()
  @ApiOperation({ operationId: 'deleteCategory', summary: 'Remove categoria' })
  @ApiStandardErrorResponses({ notFound: true })
  @ApiJsonOkResponse({
    type: CategoryPersistedResponseDto,
    description: 'Registro da categoria removida',
  })
  @ApiParam({ name: 'id', required: true, type: String })
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.categoriesService.remove(id, tenantId);
  }

  @Patch('categories/reorder')
  @UseGuards(JwtAuthGuard)
  @ApiAuthEndpoint()
  @ApiOperation({ operationId: 'reorderCategories', summary: 'Reordena categorias (drag-and-drop)' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({
    type: CategoriesReorderResponseDto,
    description: 'Ordem persistida',
  })
  reorder(@TenantId() tenantId: string, @Body() dto: ReorderDto) {
    return this.categoriesService.reorder(tenantId, dto);
  }
}
