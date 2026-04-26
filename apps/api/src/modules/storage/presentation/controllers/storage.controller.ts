import { SkipThrottle } from '@nestjs/throttler';
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
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { TenantId } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { StorageService } from '../../application/services/storage.service';
import { StorageMultipartUploadDto } from '../dtos/storage-multipart.dto';
import {
  ApiJsonOkResponse,
  ApiNoContentResponse,
  ApiStandardErrorResponses,
} from '../../../../common/swagger/http-responses.decorators';
import { StorageUploadResultResponseDto } from '../dtos/storage-upload-response.dto';

@ApiTags('storage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@SkipThrottle()
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload/:folder')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    operationId: 'storageUpload',
    summary: 'Upload de imagem (produtos, banner, avatar) — multipart (Fastify)',
    description:
      'Envie um único arquivo no form-data. O nome do campo é convencional (`file`); o servidor usa `req.file()` e aceita o primeiro part.',
  })
  @ApiParam({
    name: 'folder',
    required: true,
    type: String,
    description: 'Pasta lógica no storage (ex.: products, banner, avatar)',
    example: 'products',
  })
  @ApiBody({ type: StorageMultipartUploadDto, description: 'Arquivo binário em multipart/form-data' })
  @ApiStandardErrorResponses()
  @ApiJsonOkResponse({ type: StorageUploadResultResponseDto, description: 'Metadados do upload (URL, key, etc.)' })
  async upload(
    @Param('folder') folder: string,
    @TenantId() tenantId: string | undefined,
    @Req() req: FastifyRequest,
  ) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('JWT sem tenant: faça login com usuário vinculado à loja.');
    }
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
  @ApiQuery({
    name: 'key',
    required: true,
    type: String,
    description: 'Chave do objeto no bucket (URL-encoded se necessário)',
    example: 'products/01HX.../foto.jpg',
  })
  @ApiOperation({ operationId: 'storageDeleteFile', summary: 'Remove arquivo do storage' })
  @ApiStandardErrorResponses()
  @ApiNoContentResponse('Objeto removido do bucket')
  async deleteFile(@Query('key') key: string) {
    if (!key?.trim()) {
      throw new BadRequestException('Query obrigatória: key');
    }
    await this.storageService.delete(decodeURIComponent(key.trim()));
  }
}
