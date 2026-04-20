import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService, CreateTenantDto, UpdateTenantDto } from './tenants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'Lista todos os tenants (owner da plataforma)' })
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get('me')
  @ApiOperation({ summary: 'Retorna o tenant do usuário autenticado' })
  getMyTenant(@CurrentUser() user: any) {
    return this.tenantsService.getMyTenant(user.id);
  }

  @Get(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Busca tenant por ID (owner da plataforma)' })
  findOne(@Param('id') id: string) {
    return this.tenantsService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Cria novo tenant para o usuário autenticado' })
  create(@Body() dto: CreateTenantDto, @CurrentUser() user: any) {
    return this.tenantsService.create(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza dados do tenant' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto,
    @CurrentUser() user: any,
  ) {
    return this.tenantsService.update(id, dto, user.id);
  }
}
