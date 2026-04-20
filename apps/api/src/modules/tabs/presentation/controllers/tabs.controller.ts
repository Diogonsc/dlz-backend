import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { TabsService } from '../../application/services/tabs.service';
import { CloseTabDto } from '../dtos/close-tab.dto';

@ApiTags('tabs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tabs')
export class TabsController {
  constructor(private readonly tabsService: TabsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista comandas da loja (com join mesa)' })
  findAll(@TenantId() tenantId: string, @Query('status') status?: string) {
    return this.tabsService.findAll(tenantId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe da comanda com pedidos' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.tabsService.findOne(id, tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Abre nova comanda para uma mesa' })
  create(@TenantId() tenantId: string, @Body() body: { tableId: string; customerName?: string }) {
    return this.tabsService.createTab(tenantId, body.tableId, body.customerName);
  }

  @Patch(':id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fecha comanda e marca pedidos como entregues' })
  close(@Param('id') id: string, @TenantId() tenantId: string, @Body() dto: CloseTabDto) {
    return this.tabsService.closeTab(id, tenantId, dto);
  }
}
