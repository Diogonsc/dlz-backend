import { SkipThrottle } from '@nestjs/throttler';
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
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { TablesService } from '../../application/services/tables.service';
import { CreateTableDto } from '../dtos/create-table.dto';
import { UpdateTableDto } from '../dtos/update-table.dto';
import {
  ApiAuthEndpoint,
  ApiJsonCreatedResponse,
  ApiJsonOkResponse,
  ApiNoContentResponse,
  ApiStandardErrorResponses,
} from '../../../../common/swagger/http-responses.decorators';
import { RestaurantTablePersistedResponseDto } from '../dtos/table-response.dto';

@ApiTags('tables')
@ApiAuthEndpoint()
@UseGuards(JwtAuthGuard)
@SkipThrottle()
@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get()
  @ApiOperation({ operationId: 'listTables', summary: 'Lista todas as mesas da loja' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({
    type: RestaurantTablePersistedResponseDto,
    isArray: true,
    description: 'Mesas com QR',
  })
  findAll(@TenantId() tenantId: string) {
    return this.tablesService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ operationId: 'getTableById', summary: 'Detalhe da mesa' })
  @ApiStandardErrorResponses({ notFound: true })
  @ApiJsonOkResponse({
    type: RestaurantTablePersistedResponseDto,
    description: 'Mesa',
  })
  @ApiParam({ name: 'id', required: true, type: String })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.tablesService.findOne(id, tenantId);
  }

  @Post()
  @ApiOperation({ operationId: 'createTable', summary: 'Cria nova mesa' })
  @ApiStandardErrorResponses()
  @ApiJsonCreatedResponse({
    type: RestaurantTablePersistedResponseDto,
    description: 'Mesa criada',
  })
  create(@TenantId() tenantId: string, @Body() dto: CreateTableDto) {
    return this.tablesService.create(tenantId, dto);
  }

  @Patch(':id')
  @ApiOperation({ operationId: 'updateTable', summary: 'Atualiza mesa' })
  @ApiStandardErrorResponses({ notFound: true })
  @ApiJsonOkResponse({
    type: RestaurantTablePersistedResponseDto,
    description: 'Mesa atualizada',
  })
  @ApiParam({ name: 'id', required: true, type: String })
  update(@Param('id') id: string, @TenantId() tenantId: string, @Body() dto: UpdateTableDto) {
    return this.tablesService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'deleteTable', summary: 'Remove mesa' })
  @ApiStandardErrorResponses({ notFound: true })
  @ApiNoContentResponse('Mesa removida')
  @ApiParam({ name: 'id', required: true, type: String })
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.tablesService.remove(id, tenantId);
  }

  @Post(':id/regenerate-qr')
  @ApiOperation({ operationId: 'regenerateTableQr', summary: 'Regenera QR code da mesa' })
  @ApiStandardErrorResponses({ notFound: true })
  @ApiJsonOkResponse({
    type: RestaurantTablePersistedResponseDto,
    description: 'Mesa com novo token/QR',
  })
  @ApiParam({ name: 'id', required: true, type: String })
  regenerateQr(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.tablesService.regenerateQr(id, tenantId);
  }
}
