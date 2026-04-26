import { SkipThrottle } from '@nestjs/throttler';
import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { TenantsService, CreateTenantDto, UpdateTenantDto } from './tenants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  ApiAuthEndpoint,
  ApiJsonCreatedResponse,
  ApiJsonOkResponse,
  ApiStandardErrorResponses,
} from '../../common/swagger/http-responses.decorators';
import {
  TenantPersistedResponseDto,
  TenantWithStoreConfigResponseDto,
} from './dtos/tenant-response.dto';

@ApiTags('tenants')
@ApiAuthEndpoint()
@UseGuards(JwtAuthGuard, RolesGuard)
@SkipThrottle()
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @Roles('admin', 'platform_owner')
  @ApiOperation({ operationId: 'listTenants', summary: 'Lista todos os tenants (owner da plataforma)' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({
    type: TenantWithStoreConfigResponseDto,
    isArray: true,
    description: 'Lista de tenants',
  })
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get('me')
  @ApiOperation({ operationId: 'getMyTenant', summary: 'Retorna o tenant do usuário autenticado' })
  @ApiStandardErrorResponses({ notFound: true })
  @ApiJsonOkResponse({
    type: TenantWithStoreConfigResponseDto,
    description: 'Tenant vinculado ao usuário',
  })
  getMyTenant(@CurrentUser() user: { id: string }) {
    return this.tenantsService.getMyTenant(user.id);
  }

  @Get(':id')
  @Roles('admin', 'platform_owner')
  @ApiOperation({ operationId: 'getTenantById', summary: 'Busca tenant por ID (owner da plataforma)' })
  @ApiStandardErrorResponses({ notFound: true })
  @ApiJsonOkResponse({
    type: TenantWithStoreConfigResponseDto,
    description: 'Tenant encontrado',
  })
  @ApiParam({ name: 'id', required: true, type: String })
  findOne(@Param('id') id: string) {
    return this.tenantsService.findById(id);
  }

  @Post()
  @ApiOperation({ operationId: 'createTenant', summary: 'Cria novo tenant para o usuário autenticado' })
  @ApiStandardErrorResponses({ conflict: true })
  @ApiJsonCreatedResponse({
    type: TenantWithStoreConfigResponseDto,
    description: 'Tenant criado',
  })
  create(@Body() dto: CreateTenantDto, @CurrentUser() user: { id: string }) {
    return this.tenantsService.create(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ operationId: 'updateTenant', summary: 'Atualiza dados do tenant' })
  @ApiStandardErrorResponses({ notFound: true })
  @ApiJsonOkResponse({
    type: TenantPersistedResponseDto,
    description: 'Tenant atualizado',
  })
  @ApiParam({ name: 'id', required: true, type: String })
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto, @CurrentUser() user: { id: string }) {
    return this.tenantsService.update(id, dto, user.id);
  }
}
