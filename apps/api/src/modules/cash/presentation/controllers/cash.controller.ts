import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, TenantId } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CashService } from '../../application/services/cash.service';
import { AddMovementDto } from '../dtos/add-movement.dto';
import { CloseRegisterDto } from '../dtos/close-register.dto';
import { OpenRegisterDto } from '../dtos/open-register.dto';

@ApiTags('cash')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cash')
export class CashController {
  constructor(private readonly cashService: CashService) {}

  @Get('registers')
  @ApiOperation({ summary: 'Histórico de caixas da loja' })
  findRegisters(@TenantId() tenantId: string) {
    return this.cashService.findRegisters(tenantId);
  }

  @Get('registers/active')
  @ApiOperation({ summary: 'Caixa aberto atual com movimentações' })
  getActive(@TenantId() tenantId: string) {
    return this.cashService.getActiveRegister(tenantId);
  }

  @Post('registers/open')
  @ApiOperation({ summary: 'Abre novo caixa' })
  openRegister(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() dto: OpenRegisterDto) {
    return this.cashService.openRegister(tenantId, user.id, dto);
  }

  @Patch('registers/:id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fecha caixa' })
  closeRegister(@Param('id') id: string, @TenantId() tenantId: string, @Body() dto: CloseRegisterDto) {
    return this.cashService.closeRegister(id, tenantId, dto);
  }

  @Get('registers/:id/movements')
  @ApiOperation({ summary: 'Movimentações de um caixa' })
  findMovements(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.cashService.findMovements(id, tenantId);
  }

  @Post('movements')
  @ApiOperation({ summary: 'Adiciona movimentação ao caixa aberto (venda, saque, depósito, gorjeta)' })
  addMovement(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() dto: AddMovementDto) {
    return this.cashService.addMovement(tenantId, user.id, dto);
  }
}
