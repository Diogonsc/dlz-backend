import { Controller, Get, Patch, Param, Body, UseGuards, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { StoresService, UpdateStoreDto } from './stores.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, TenantId } from '../../common/decorators/current-user.decorator';

@ApiTags('stores')
@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  // ── Endpoints públicos ────────────────────────────────────────────────────

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Config pública da loja por slug (vitrine)' })
  findBySlug(@Param('slug') slug: string) {
    return this.storesService.findPublicBySlug(slug);
  }

  @Get('domain')
  @ApiOperation({ summary: 'Config pública por domínio customizado' })
  @ApiQuery({ name: 'host', required: true })
  findByDomain(@Query('host') host: string) {
    return this.storesService.findByCustomDomain(host);
  }

  // ── Endpoints autenticados ────────────────────────────────────────────────

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Configuração completa da loja (lojista)' })
  findMine(@TenantId() tenantId: string) {
    return this.storesService.findMyStore(tenantId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualiza configuração da loja' })
  update(@TenantId() tenantId: string, @Body() dto: UpdateStoreDto) {
    return this.storesService.update(tenantId, dto);
  }

  @Patch('me/toggle-open')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Abre ou fecha a loja' })
  toggleOpen(@TenantId() tenantId: string, @Body('isOpen') isOpen: boolean) {
    return this.storesService.toggleOpen(tenantId, isOpen);
  }
}
