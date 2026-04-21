import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CouponsService } from '../../application/services/coupons.service';
import { CreateCouponDto } from '../dtos/create-coupon.dto';
import { ValidateCouponDto } from '../dtos/validate-coupon.dto';
import { UpdateCouponDto } from '../dtos/update-coupon.dto';
import {
  ApiAuthEndpoint,
  ApiJsonCreatedResponse,
  ApiJsonOkResponse,
  ApiPublicEndpoint,
  ApiStandardErrorResponses,
} from '../../../../common/swagger/http-responses.decorators';
import {
  CouponPersistedResponseDto,
  ValidateCouponResponseDto,
} from '../dtos/coupon-response.dto';

@ApiTags('coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post('validate')
  @ApiPublicEndpoint()
  @ApiOperation({ operationId: 'validateCoupon', summary: 'Valida cupom no checkout (público)' })
  @ApiStandardErrorResponses({ omitJwtErrorResponses: true, notFound: true })
  @ApiJsonOkResponse({
    type: ValidateCouponResponseDto,
    description: 'Resultado da validação com desconto calculado',
  })
  validate(@Body() dto: ValidateCouponDto) {
    return this.couponsService.validate(dto);
  }

  @Get('public')
  @ApiPublicEndpoint()
  @ApiOperation({ operationId: 'listPublicCoupons', summary: 'Lista cupons ativos da loja (vitrine)' })
  @ApiStandardErrorResponses({ omitJwtErrorResponses: true })
  @ApiQuery({ name: 'store_id', required: true, type: String, description: 'UUID do tenant/loja' })
  @ApiJsonOkResponse({
    type: CouponPersistedResponseDto,
    isArray: true,
    description: 'Cupons públicos (sem dados sensíveis)',
  })
  findPublic(@Query('store_id') storeId: string) {
    if (!storeId?.trim()) throw new BadRequestException('Query obrigatória: store_id');
    return this.couponsService.findPublicActiveByStore(storeId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiAuthEndpoint()
  @ApiOperation({ operationId: 'listCoupons', summary: 'Lista cupons da loja' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({
    type: CouponPersistedResponseDto,
    isArray: true,
    description: 'Cupons ordenados por criação',
  })
  findAll(@TenantId() tenantId: string) {
    return this.couponsService.findAll(tenantId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiAuthEndpoint()
  @ApiOperation({ operationId: 'createCoupon', summary: 'Cria cupom' })
  @ApiStandardErrorResponses({ conflict: true })
  @ApiJsonCreatedResponse({
    type: CouponPersistedResponseDto,
    description: 'Cupom criado',
  })
  create(@TenantId() tenantId: string, @Body() dto: CreateCouponDto) {
    return this.couponsService.create(tenantId, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiAuthEndpoint()
  @ApiOperation({ operationId: 'updateCoupon', summary: 'Atualiza cupom' })
  @ApiStandardErrorResponses({ notFound: true })
  @ApiJsonOkResponse({
    type: CouponPersistedResponseDto,
    description: 'Cupom atualizado',
  })
  @ApiParam({ name: 'id', required: true, type: String })
  update(@Param('id') id: string, @TenantId() tenantId: string, @Body() dto: UpdateCouponDto) {
    return this.couponsService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiAuthEndpoint()
  @ApiOperation({ operationId: 'deleteCoupon', summary: 'Remove cupom' })
  @ApiStandardErrorResponses({ notFound: true })
  @ApiJsonOkResponse({
    type: CouponPersistedResponseDto,
    description: 'Cupom removido',
  })
  @ApiParam({ name: 'id', required: true, type: String })
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.couponsService.remove(id, tenantId);
  }
}
