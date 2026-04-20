import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dlz/prisma';
import { randomBytes } from 'crypto';
import { CreateTableDto } from '../../presentation/dtos/create-table.dto';
import { UpdateTableDto } from '../../presentation/dtos/update-table.dto';

@Injectable()
export class TablesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.restaurantTable.findMany({
      where: { tenantId },
      orderBy: { number: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const table = await this.prisma.restaurantTable.findFirst({
      where: { id, tenantId },
    });
    if (!table) throw new NotFoundException('Mesa não encontrada');
    return table;
  }

  async create(tenantId: string, dto: CreateTableDto) {
    const token = randomBytes(12).toString('hex');
    return this.prisma.restaurantTable.create({
      data: {
        tenantId,
        number: dto.number,
        name: dto.name ?? `Mesa ${dto.number}`,
        capacity: dto.capacity ?? 4,
        qrCodeToken: token,
        status: 'available',
      },
    });
  }

  async update(id: string, tenantId: string, dto: UpdateTableDto) {
    await this.assertOwner(id, tenantId);
    return this.prisma.restaurantTable.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, tenantId: string) {
    await this.assertOwner(id, tenantId);
    return this.prisma.restaurantTable.delete({ where: { id } });
  }

  async regenerateQr(id: string, tenantId: string) {
    await this.assertOwner(id, tenantId);
    const token = randomBytes(12).toString('hex');
    return this.prisma.restaurantTable.update({
      where: { id },
      data: { qrCodeToken: token },
    });
  }

  private async assertOwner(id: string, tenantId: string) {
    const t = await this.prisma.restaurantTable.findFirst({ where: { id, tenantId } });
    if (!t) throw new NotFoundException('Mesa não encontrada');
  }
}
