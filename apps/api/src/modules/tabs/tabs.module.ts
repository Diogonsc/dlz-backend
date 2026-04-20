import { Module } from '@nestjs/common';
import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '@dlz/prisma';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';
import { getObservabilityContext } from '../../common/observability/request-context.storage';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

class CloseTabDto {
  @IsOptional() @IsNumber() @Min(0) tip?: number;
  @IsNumber() @Min(0) ordersSubtotal: number;
  @IsOptional() @IsString() tableId?: string;
}

@Injectable()
class TabsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  // Lista tabs com join restaurant_tables(number) — igual ao frontend
  async findAll(tenantId: string, status?: string) {
    const tabs = await this.prisma.tab.findMany({
      where: {
        tenantId,
        ...(status ? { status } : {}),
      },
      include: {
        table: { select: { number: true, name: true } },
        orders: {
          where: { status: { notIn: ['delivered', 'cancelled'] } },
          select: { id: true, total: true, status: true },
        },
      },
      orderBy: { openedAt: 'desc' },
    });

    // Mapeia para o formato que o frontend espera
    return tabs.map((t: (typeof tabs)[number]) => ({
      id: t.id,
      store_id: t.tenantId,
      table_id: t.tableId,
      customer_name: t.customerName,
      status: t.status,
      subtotal: Number(t.subtotal),
      tip: Number(t.tip),
      total: Number(t.total),
      opened_at: t.openedAt,
      closed_at: t.closedAt,
      restaurant_tables: t.table ? { number: t.table.number } : null,
    }));
  }

  async findOne(id: string, tenantId: string) {
    const tab = await this.prisma.tab.findFirst({
      where: { id, tenantId },
      include: {
        table: { select: { number: true, name: true } },
        orders: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!tab) throw new NotFoundException('Comanda não encontrada');
    return tab;
  }

  // Fecha comanda e marca pedidos de mesa como delivered
  async closeTab(id: string, tenantId: string, dto: CloseTabDto) {
    const tab = await this.prisma.tab.findFirst({ where: { id, tenantId } });
    if (!tab) throw new NotFoundException('Comanda não encontrada');
    if (tab.status === 'closed') throw new Error('Comanda já está fechada');

    const tip = dto.tip ?? 0;
    const subtotal = dto.ordersSubtotal;
    const total = subtotal + tip;

    // Atualiza a tab
    const updated = await this.prisma.tab.update({
      where: { id },
      data: {
        status: 'closed',
        tip,
        subtotal,
        total,
        closedAt: new Date(),
      },
    });

    // Marca pedidos da mesa como delivered
    if (dto.tableId) {
      await this.prisma.order.updateMany({
        where: {
          tableId: dto.tableId,
          orderSource: 'table',
          status: { notIn: ['delivered', 'cancelled'] },
        },
        data: { status: 'delivered' },
      });
    }

    // Emite para realtime — frontend usa tabs-realtime para invalidar queries
    this.events.emit('tab.updated', {
      tab: updated,
      tenantId,
      correlationId: getObservabilityContext()?.correlationId ?? null,
    });

    return updated;
  }

  // Cria tab manualmente (opcional, o get_or_create_open_tab no RpcsModule é o fluxo principal)
  async createTab(tenantId: string, tableId: string, customerName?: string) {
    const existing = await this.prisma.tab.findFirst({
      where: { tenantId, tableId, status: 'open' },
    });
    if (existing) return existing;

    const tab = await this.prisma.tab.create({
      data: { tenantId, tableId, customerName: customerName ?? '', status: 'open' },
    });
    this.events.emit('tab.created', {
      tab,
      tenantId,
      correlationId: getObservabilityContext()?.correlationId ?? null,
    });
    return tab;
  }
}

@ApiTags('tabs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tabs')
class TabsController {
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

@Module({
  controllers: [TabsController],
  providers: [TabsService],
  exports: [TabsService],
})
export class TabsModule {}
