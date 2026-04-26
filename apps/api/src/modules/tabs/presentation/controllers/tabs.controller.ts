import { SkipThrottle } from '@nestjs/throttler';
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { TabsService } from '../../application/services/tabs.service';
import { CloseTabDto } from '../dtos/close-tab.dto';
import { OpenTabDto } from '../dtos/open-tab.dto';
import {
  ApiAuthEndpoint,
  ApiJsonCreatedResponse,
  ApiJsonOkResponse,
  ApiStandardErrorResponses,
} from '../../../../common/swagger/http-responses.decorators';
import {
  TabDetailResponseDto,
  TabListItemResponseDto,
  TabPersistedResponseDto,
} from '../dtos/tab-response.dto';

@ApiTags('tabs')
@ApiAuthEndpoint()
@UseGuards(JwtAuthGuard)
@SkipThrottle()
@Controller('tabs')
export class TabsController {
  constructor(private readonly tabsService: TabsService) {}

  @Get()
  @ApiOperation({ operationId: 'listTabs', summary: 'Lista comandas da loja (com join mesa)' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({
    type: TabListItemResponseDto,
    isArray: true,
    description: 'Comandas',
  })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filtra por status da comanda' })
  findAll(@TenantId() tenantId: string, @Query('status') status?: string) {
    return this.tabsService.findAll(tenantId, status);
  }

  @Get(':id')
  @ApiOperation({ operationId: 'getTabById', summary: 'Detalhe da comanda com pedidos' })
  @ApiStandardErrorResponses({ notFound: true })
  @ApiJsonOkResponse({
    type: TabDetailResponseDto,
    description: 'Comanda com itens',
  })
  @ApiParam({ name: 'id', required: true, type: String })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.tabsService.findOne(id, tenantId);
  }

  @Post()
  @ApiOperation({ operationId: 'createTab', summary: 'Abre nova comanda para uma mesa' })
  @ApiStandardErrorResponses({ conflict: true })
  @ApiJsonCreatedResponse({
    type: TabPersistedResponseDto,
    description: 'Comanda criada',
  })
  create(@TenantId() tenantId: string, @Body() body: OpenTabDto) {
    return this.tabsService.createTab(tenantId, body.tableId, body.customerName);
  }

  @Patch(':id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'closeTab', summary: 'Fecha comanda e marca pedidos como entregues' })
  @ApiStandardErrorResponses({ notFound: true })
  @ApiJsonOkResponse({
    type: TabPersistedResponseDto,
    description: 'Comanda encerrada',
  })
  @ApiParam({ name: 'id', required: true, type: String })
  close(@Param('id') id: string, @TenantId() tenantId: string, @Body() dto: CloseTabDto) {
    return this.tabsService.closeTab(id, tenantId, dto);
  }
}
