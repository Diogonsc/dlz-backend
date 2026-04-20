import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { PwaService } from '../../application/services/pwa.service';

@ApiTags('pwa')
@Controller('pwa')
export class PwaController {
  constructor(private readonly pwaService: PwaService) {}

  @Get('manifest')
  @ApiOperation({ summary: 'Gera Web App Manifest dinâmico por tenant' })
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
