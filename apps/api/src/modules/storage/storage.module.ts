/// <reference types="multer" />
import { Module } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { Controller, Post, Delete, Param, UploadedFile, UseInterceptors, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@dlz/prisma';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.get<string>('STORAGE_BUCKET', 'dlz-assets');
    this.publicUrl = config.get<string>('STORAGE_PUBLIC_URL', '');

    this.s3 = new S3Client({
      region: 'auto',
      endpoint: config.get<string>('STORAGE_ENDPOINT', ''),
      credentials: {
        accessKeyId: config.get<string>('STORAGE_ACCESS_KEY', ''),
        secretAccessKey: config.get<string>('STORAGE_SECRET_KEY', ''),
      },
    });
  }

  async upload(tenantId: string, file: Express.Multer.File, folder = 'products'): Promise<{ url: string; key: string }> {
    const ext = file.originalname.split('.').pop() ?? 'jpg';
    const key = `${folder}/${tenantId}/${randomUUID()}.${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        CacheControl: 'max-age=31536000',
      }),
    );

    const url = `${this.publicUrl}/${key}`;
    this.logger.log(`Uploaded: ${key}`);
    return { url, key };
  }

  async delete(key: string) {
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    this.logger.log(`Deleted: ${key}`);
  }
}

// ── Controller ────────────────────────────────────────────────────────────────

@ApiTags('storage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('storage')
class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload/:folder')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload de imagem (produtos, banner, avatar)' })
  upload(
    @Param('folder') folder: string,
    @TenantId() tenantId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.storageService.upload(tenantId, file, folder);
  }

  @Delete('file')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove arquivo do storage' })
  delete(@Param('key') key: string) {
    return this.storageService.delete(key);
  }
}

// ── Module ────────────────────────────────────────────────────────────────────

@Module({
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
