import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dlz/prisma';
import { AddMovementDto } from '../../presentation/dtos/add-movement.dto';
import { CloseRegisterDto } from '../../presentation/dtos/close-register.dto';
import { OpenRegisterDto } from '../../presentation/dtos/open-register.dto';

@Injectable()
export class CashService {
  constructor(private readonly prisma: PrismaService) {}

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
