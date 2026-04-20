import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { TenantId } from '../../../../common/decorators/current-user.decorator';
import { RequireTenantGuard } from '../../../../common/guards/require-tenant.guard';
import { CreateOrderDto } from '../dtos/create-order.dto';
import { UpdateOrderStatusDto } from '../dtos/update-order-status.dto';
import { CreateOrderUseCase } from '../../application/use-cases/create-order.use-case';
import { TrackOrderUseCase } from '../../application/use-cases/track-order.use-case';
import { ListOrdersUseCase } from '../../application/use-cases/list-orders.use-case';
import { GetOrderByIdUseCase } from '../../application/use-cases/get-order-by-id.use-case';
import { UpdateOrderStatusUseCase } from '../../application/use-cases/update-order-status.use-case';

@ApiTags('orders')
@Controller()
export class OrdersController {
  constructor(
    private readonly createOrder: CreateOrderUseCase,
    private readonly trackOrder: TrackOrderUseCase,
    private readonly listOrders: ListOrdersUseCase,
    private readonly getOrderById: GetOrderByIdUseCase,
    private readonly updateOrderStatus: UpdateOrderStatusUseCase,
  ) {}

  @Post('orders')
  @ApiOperation({ summary: 'Criar pedido (público — vitrine)' })
  create(@Body() dto: CreateOrderDto) {
    return this.createOrder.execute({
      tenantId: dto.tenantId,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      address: dto.address,
      payment: dto.payment,
      changeFor: dto.changeFor,
      items: dto.items,
      couponCode: dto.couponCode,
      tableToken: dto.tableToken,
      orderSource: dto.orderSource,
      notes: dto.notes,
    });
  }

  @Get('orders/track/:code')
  @ApiOperation({ summary: 'Rastrear pedido por código (público)' })
  track(@Param('code') code: string) {
    return this.trackOrder.execute(code);
  }

  @Get('orders')
  @UseGuards(JwtAuthGuard, RequireTenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lista pedidos da loja (painel)' })
  findAll(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 30,
  ) {
    return this.listOrders.execute(tenantId, status, +page, +limit);
  }

  @Get('orders/:id')
  @UseGuards(JwtAuthGuard, RequireTenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Detalhe do pedido' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.getOrderById.execute(id, tenantId);
  }

  @Patch('orders/:id/status')
  @UseGuards(JwtAuthGuard, RequireTenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualiza status do pedido' })
  updateStatus(@Param('id') id: string, @TenantId() tenantId: string, @Body() dto: UpdateOrderStatusDto) {
    return this.updateOrderStatus.execute(id, tenantId, { status: dto.status });
  }
}
