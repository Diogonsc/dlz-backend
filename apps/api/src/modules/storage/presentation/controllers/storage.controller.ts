import {
  BadRequestException,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { TenantId } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { StorageService } from '../../application/services/storage.service';

@ApiTags('storage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload/:folder')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload de imagem (produtos, banner, avatar) — multipart (Fastify)' })
  async upload(
    @Param('folder') folder: string,
    @TenantId() tenantId: string,
    @Req() req: FastifyRequest,
  ) {
    const part = await req.file();
    if (!part) {
      throw new BadRequestException('Arquivo obrigatório (campo de arquivo no form-data)');
    }
    const buffer = await part.toBuffer();
    const file = {
      buffer,
      mimetype: part.mimetype,
      originalname: part.filename ?? 'upload',
    };
    return this.storageService.upload(tenantId, file, folder);
  }

  @Delete('file')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiQuery({ name: 'key', required: true, description: 'Chave do objeto no bucket (ex.: products/uuid/arquivo.jpg)' })
  @ApiOperation({ summary: 'Remove arquivo do storage' })
  async deleteFile(@Query('key') key: string) {
    if (!key?.trim()) {
      throw new BadRequestException('Query obrigatória: key');
    }
    await this.storageService.delete(decodeURIComponent(key.trim()));
  }
}
