import { Module } from '@nestjs/common';
import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '@dlz/prisma';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';
import { IsNumber, IsString, IsOptional, IsEnum, Min } from 'class-validator';
import { randomBytes } from 'crypto';

class CreateTableDto {
  @IsNumber() @Min(1) number: number;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsNumber() capacity?: number;
}

class UpdateTableDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsNumber() capacity?: number;
  @IsOptional() @IsString() status?: string;
}

@Injectable()
class TablesService {
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

@ApiTags('tables')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tables')
class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get()
  @ApiOperation({ summary: 'Lista todas as mesas da loja' })
  findAll(@TenantId() tenantId: string) {
    return this.tablesService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe da mesa' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.tablesService.findOne(id, tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Cria nova mesa' })
  create(@TenantId() tenantId: string, @Body() dto: CreateTableDto) {
    return this.tablesService.create(tenantId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza mesa' })
  update(@Param('id') id: string, @TenantId() tenantId: string, @Body() dto: UpdateTableDto) {
    return this.tablesService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove mesa' })
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.tablesService.remove(id, tenantId);
  }

  @Post(':id/regenerate-qr')
  @ApiOperation({ summary: 'Regenera QR code da mesa' })
  regenerateQr(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.tablesService.regenerateQr(id, tenantId);
  }
}

@Module({
  controllers: [TablesController],
  providers: [TablesService],
  exports: [TablesService],
})
export class TablesModule {}
