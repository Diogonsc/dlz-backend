import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiProduces, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { PwaService } from '../../application/services/pwa.service';
import { ApiStandardErrorResponses } from '../../../../common/swagger/http-responses.decorators';

@ApiTags('pwa')
@Controller('pwa')
export class PwaController {
  constructor(private readonly pwaService: PwaService) {}

  @Get('manifest')
  @ApiOperation({ summary: 'Gera Web App Manifest dinâmico por tenant (público)' })
  @ApiProduces('application/manifest+json')
  @ApiStandardErrorResponses({ omitJwtErrorResponses: true, notFound: true })
  @ApiResponse({
    status: 200,
    description: 'Manifest JSON (W3C)',
    content: {
      'application/manifest+json': {
        schema: { type: 'object', additionalProperties: true },
      },
    },
  })
  @ApiQuery({ name: 'store_id', required: true, type: String, description: 'UUID do tenant' })
  @ApiQuery({
    name: 'start_path',
    required: true,
    type: String,
    description: 'Caminho inicial (ex.: /)',
    example: '/',
  })
  @ApiQuery({
    name: 'origin',
    required: true,
    type: String,
    description: 'Origem absoluta usada para URLs do manifest',
    example: 'https://pedidos.minhaloja.com',
  })
  async manifest(
    @Query('store_id') storeId: string,
    @Query('start_path') startPath: string,
    @Query('origin') origin: string,
    @Res() res: FastifyReply,
  ) {
    const manifest = await this.pwaService.generateManifest(storeId, startPath, origin);
    res.header('Content-Type', 'application/manifest+json');
    res.header('Cache-Control', 'public, max-age=3600');
    res.send(manifest);
  }
}
