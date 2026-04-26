import { SkipThrottle } from '@nestjs/throttler';
import { Controller, Get, Patch, Param, Body, UseGuards, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { StoresService, UpdateStoreDto } from './stores.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';
import {
  ApiAuthEndpoint,
  ApiJsonOkResponse,
  ApiPublicEndpoint,
  ApiStandardErrorResponses,
} from '../../common/swagger/http-responses.decorators';
import { StoreConfigResponseDto } from './dtos/store-response.dto';

@ApiTags('stores')
@SkipThrottle()
@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get('slug/:slug')
  @ApiPublicEndpoint()
  @ApiOperation({ operationId: 'getStoreBySlug', summary: 'Config pública da loja por slug (vitrine)' })
  @ApiStandardErrorResponses({ omitJwtErrorResponses: true, notFound: true })
  @ApiJsonOkResponse({
    type: StoreConfigResponseDto,
    description: 'Configuração pública (tema, horários, etc.)',
  })
  @ApiParam({ name: 'slug', required: true, type: String, description: 'Slug público da loja' })
  findBySlug(@Param('slug') slug: string) {
    return this.storesService.findPublicBySlug(slug);
  }

  @Get('domain')
  @ApiPublicEndpoint()
  @ApiOperation({ operationId: 'getStoreByDomain', summary: 'Config pública por domínio customizado' })
  @ApiQuery({
    name: 'host',
    required: true,
    type: String,
    description: 'Host completo da requisição (ex.: pedidos.minhaloja.com)',
  })
  @ApiStandardErrorResponses({ omitJwtErrorResponses: true, notFound: true })
  @ApiJsonOkResponse({
    type: StoreConfigResponseDto,
    description: 'Configuração pública resolvida pelo host',
  })
  findByDomain(@Query('host') host: string) {
    return this.storesService.findByCustomDomain(host);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiAuthEndpoint()
  @ApiOperation({ operationId: 'getMyStore', summary: 'Configuração completa da loja (lojista)' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({
    type: StoreConfigResponseDto,
    description: 'Configuração interna da loja',
  })
  findMine(@TenantId() tenantId: string) {
    return this.storesService.findMyStore(tenantId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiAuthEndpoint()
  @ApiOperation({ operationId: 'updateMyStore', summary: 'Atualiza configuração da loja' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({
    type: StoreConfigResponseDto,
    description: 'Loja atualizada',
  })
  update(@TenantId() tenantId: string, @Body() dto: UpdateStoreDto) {
    return this.storesService.update(tenantId, dto);
  }

  @Patch('me/toggle-open')
  @UseGuards(JwtAuthGuard)
  @ApiAuthEndpoint()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'toggleStoreOpen', summary: 'Abre ou fecha a loja' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({
    type: StoreConfigResponseDto,
    description: 'Estado `isOpen` atualizado',
  })
  toggleOpen(@TenantId() tenantId: string, @Body('isOpen') isOpen: boolean) {
    return this.storesService.toggleOpen(tenantId, isOpen);
  }
}
