import { Module } from '@nestjs/common';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  Controller, Get, Post, Patch, Param, Body,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '@dlz/prisma';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId, CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  IsNumber, IsOptional, IsString, IsEnum, IsUUID, Min,
} from 'class-validator';

class OpenRegisterDto {
  @IsNumber() @Min(0) openingBalance: number;
}

class CloseRegisterDto {
  @IsNumber() @Min(0) closingBalance: number;
  @IsOptional() @IsString() notes?: string;
}

class AddMovementDto {
  @IsEnum(['sale', 'withdrawal', 'deposit', 'tip']) type: string;
  @IsNumber() @Min(0) amount: number;
  @IsOptional() @IsString() paymentMethod?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUUID() orderId?: string;
}

@Injectable()
class CashService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Registers ─────────────────────────────────────────────────────────────

  async findRegisters(tenantId: string) {
    return this.prisma.cashRegister.findMany({
      where: { tenantId },
      orderBy: { openedAt: 'desc' },
    });
  }

  async getActiveRegister(tenantId: string) {
    return this.prisma.cashRegister.findFirst({
      where: { tenantId, status: 'open' },
      include: { movements: { orderBy: { createdAt: 'desc' } } },
    });
  }

  async openRegister(tenantId: string, userId: string, dto: OpenRegisterDto) {
    const existing = await this.prisma.cashRegister.findFirst({
      where: { tenantId, status: 'open' },
    });
    if (existing) throw new BadRequestException('Já existe um caixa aberto');

    return this.prisma.cashRegister.create({
      data: {
        tenantId,
        openedBy: userId,
        openingBalance: dto.openingBalance,
        status: 'open',
      },
    });
  }

  async closeRegister(id: string, tenantId: string, dto: CloseRegisterDto) {
    const register = await this.prisma.cashRegister.findFirst({
      where: { id, tenantId },
    });
    if (!register) throw new NotFoundException('Caixa não encontrado');
    if (register.status === 'closed') throw new BadRequestException('Caixa já está fechado');

    // Calcula saldo esperado
    const movements = await this.prisma.cashMovement.findMany({
      where: { registerId: id },
    });
    const expectedBalance = movements.reduce((acc: number, m: (typeof movements)[number]) => {
      if (['sale', 'deposit', 'tip'].includes(m.type)) return acc + Number(m.amount);
      if (m.type === 'withdrawal') return acc - Number(m.amount);
      return acc;
    }, Number(register.openingBalance));

    return this.prisma.cashRegister.update({
      where: { id },
      data: {
        status: 'closed',
        closingBalance: dto.closingBalance,
        expectedBalance,
        notes: dto.notes ?? '',
        closedAt: new Date(),
      },
    });
  }

  // ── Movements ──────────────────────────────────────────────────────────────

  async findMovements(registerId: string, tenantId: string) {
    const register = await this.prisma.cashRegister.findFirst({
      where: { id: registerId, tenantId },
    });
    if (!register) throw new NotFoundException('Caixa não encontrado');

    return this.prisma.cashMovement.findMany({
      where: { registerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addMovement(tenantId: string, userId: string, dto: AddMovementDto) {
    const register = await this.prisma.cashRegister.findFirst({
      where: { tenantId, status: 'open' },
    });
    if (!register) throw new BadRequestException('Nenhum caixa aberto');

    return this.prisma.cashMovement.create({
      data: {
        registerId: register.id,
        tenantId,
        type: dto.type,
        amount: dto.amount,
        paymentMethod: dto.paymentMethod ?? 'cash',
        description: dto.description ?? '',
        orderId: dto.orderId,
        createdBy: userId,
      },
    });
  }
}

@ApiTags('cash')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cash')
class CashController {
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
  openRegister(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: OpenRegisterDto,
  ) {
    return this.cashService.openRegister(tenantId, user.id, dto);
  }

  @Patch('registers/:id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fecha caixa' })
  closeRegister(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Body() dto: CloseRegisterDto,
  ) {
    return this.cashService.closeRegister(id, tenantId, dto);
  }

  @Get('registers/:id/movements')
  @ApiOperation({ summary: 'Movimentações de um caixa' })
  findMovements(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.cashService.findMovements(id, tenantId);
  }

  @Post('movements')
  @ApiOperation({ summary: 'Adiciona movimentação ao caixa aberto (venda, saque, depósito, gorjeta)' })
  addMovement(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: AddMovementDto,
  ) {
    return this.cashService.addMovement(tenantId, user.id, dto);
  }
}

@Module({
  controllers: [CashController],
  providers: [CashService],
  exports: [CashService],
})
export class CashModule {}
