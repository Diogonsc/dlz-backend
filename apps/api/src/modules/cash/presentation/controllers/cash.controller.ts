import { SkipThrottle } from '@nestjs/throttler';
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser, TenantId } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CashService } from '../../application/services/cash.service';
import { AddMovementDto } from '../dtos/add-movement.dto';
import { CloseRegisterDto } from '../dtos/close-register.dto';
import { OpenRegisterDto } from '../dtos/open-register.dto';
import {
  ApiAuthEndpoint,
  ApiJsonCreatedResponse,
  ApiJsonOkResponse,
  ApiStandardErrorResponses,
} from '../../../../common/swagger/http-responses.decorators';
import {
  CashMovementRowResponseDto,
  CashRegisterPersistedResponseDto,
  CashRegisterWithMovementsResponseDto,
} from '../dtos/cash-response.dto';

@ApiTags('cash')
@ApiAuthEndpoint()
@UseGuards(JwtAuthGuard)
@SkipThrottle()
@Controller('cash')
export class CashController {
  constructor(private readonly cashService: CashService) {}

  @Get('registers')
  @ApiOperation({ operationId: 'listCashRegisters', summary: 'Histórico de caixas da loja' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({
    type: CashRegisterPersistedResponseDto,
    isArray: true,
    description: 'Lista de caixas',
  })
  findRegisters(@TenantId() tenantId: string) {
    return this.cashService.findRegisters(tenantId);
  }

  @Get('registers/active')
  @ApiOperation({ operationId: 'getActiveCashRegister', summary: 'Caixa aberto atual com movimentações' })
  @ApiStandardErrorResponses({ notFound: true })
  @ApiJsonOkResponse({
    type: CashRegisterWithMovementsResponseDto,
    description: 'Caixa ativo ou corpo null quando não há caixa aberto',
  })
  getActive(@TenantId() tenantId: string) {
    return this.cashService.getActiveRegister(tenantId);
  }

  @Post('registers/open')
  @ApiOperation({ operationId: 'openCashRegister', summary: 'Abre novo caixa' })
  @ApiStandardErrorResponses({ conflict: true })
  @ApiJsonCreatedResponse({
    type: CashRegisterPersistedResponseDto,
    description: 'Caixa aberto',
  })
  openRegister(@TenantId() tenantId: string, @CurrentUser() user: { id: string }, @Body() dto: OpenRegisterDto) {
    return this.cashService.openRegister(tenantId, user.id, dto);
  }

  @Patch('registers/:id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'closeCashRegister', summary: 'Fecha caixa' })
  @ApiStandardErrorResponses({ notFound: true })
  @ApiJsonOkResponse({
    type: CashRegisterPersistedResponseDto,
    description: 'Caixa fechado',
  })
  @ApiParam({ name: 'id', required: true, type: String })
  closeRegister(@Param('id') id: string, @TenantId() tenantId: string, @Body() dto: CloseRegisterDto) {
    return this.cashService.closeRegister(id, tenantId, dto);
  }

  @Get('registers/:id/movements')
  @ApiOperation({ operationId: 'listCashMovements', summary: 'Movimentações de um caixa' })
  @ApiStandardErrorResponses({ notFound: true })
  @ApiJsonOkResponse({
    type: CashMovementRowResponseDto,
    isArray: true,
    description: 'Movimentações ordenadas',
  })
  @ApiParam({ name: 'id', required: true, type: String })
  findMovements(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.cashService.findMovements(id, tenantId);
  }

  @Post('movements')
  @ApiOperation({
    operationId: 'addCashMovement',
    summary: 'Adiciona movimentação ao caixa aberto (venda, saque, depósito, gorjeta)',
  })
  @ApiStandardErrorResponses({ notFound: true })
  @ApiJsonCreatedResponse({
    type: CashMovementRowResponseDto,
    description: 'Movimentação registrada',
  })
  addMovement(@TenantId() tenantId: string, @CurrentUser() user: { id: string }, @Body() dto: AddMovementDto) {
    return this.cashService.addMovement(tenantId, user.id, dto);
  }
}
