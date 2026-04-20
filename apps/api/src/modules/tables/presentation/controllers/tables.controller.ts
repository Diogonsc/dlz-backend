import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { TablesService } from '../../application/services/tables.service';
import { CreateTableDto } from '../dtos/create-table.dto';
import { UpdateTableDto } from '../dtos/update-table.dto';

@ApiTags('tables')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tables')
export class TablesController {
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
