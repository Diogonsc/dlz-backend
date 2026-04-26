import { SkipThrottle } from '@nestjs/throttler';
import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
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
import {
  ApiJsonCreatedResponse,
  ApiJsonOkResponse,
  ApiPublicEndpoint,
  ApiStandardErrorResponses,
} from '../../../../common/swagger/http-responses.decorators';
import {
  CreateOrderResponseDto,
  ListOrdersResponseDto,
  OrderDetailResponseDto,
  TrackOrderResponseDto,
  UpdateOrderStatusResponseDto,
} from '../dtos/order-response.dto';

@ApiTags('orders')
@SkipThrottle()
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
  @ApiPublicEndpoint()
  @ApiOperation({ operationId: 'createOrder', summary: 'Criar pedido (público — vitrine)' })
  @ApiStandardErrorResponses({ omitJwtErrorResponses: true, notFound: true })
  @ApiJsonCreatedResponse({
    type: CreateOrderResponseDto,
    description: 'Pedido criado com totais e identificadores públicos',
  })
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
  @ApiPublicEndpoint()
  @ApiOperation({ operationId: 'trackOrder', summary: 'Rastrear pedido por código (público)' })
  @ApiStandardErrorResponses({ omitJwtErrorResponses: true, notFound: true })
  @ApiJsonOkResponse({
    type: TrackOrderResponseDto,
    description: 'Resumo do pedido para o cliente',
  })
  @ApiParam({ name: 'code', required: true, type: String, description: 'Código público de rastreio' })
  track(@Param('code') code: string) {
    return this.trackOrder.execute(code);
  }

  @Get('orders')
  @UseGuards(JwtAuthGuard, RequireTenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ operationId: 'getOrders', summary: 'Lista pedidos da loja (painel)' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({
    type: ListOrdersResponseDto,
    description: 'Lista paginada de pedidos',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filtra por status (ex.: pending, delivered)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Página (1-based)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Itens por página',
    example: 30,
  })
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
  @ApiOperation({ operationId: 'getOrderById', summary: 'Detalhe do pedido' })
  @ApiStandardErrorResponses({ notFound: true })
  @ApiJsonOkResponse({
    type: OrderDetailResponseDto,
    description: 'Pedido completo com itens',
  })
  @ApiParam({ name: 'id', required: true, type: String, description: 'UUID do pedido' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.getOrderById.execute(id, tenantId);
  }

  @Patch('orders/:id/status')
  @UseGuards(JwtAuthGuard, RequireTenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ operationId: 'updateOrderStatus', summary: 'Atualiza status do pedido' })
  @ApiStandardErrorResponses({ notFound: true })
  @ApiJsonOkResponse({
    type: UpdateOrderStatusResponseDto,
    description: 'Pedido após atualização de status',
  })
  @ApiParam({ name: 'id', required: true, type: String, description: 'UUID do pedido' })
  updateStatus(@Param('id') id: string, @TenantId() tenantId: string, @Body() dto: UpdateOrderStatusDto) {
    return this.updateOrderStatus.execute(id, tenantId, { status: dto.status });
  }
}
