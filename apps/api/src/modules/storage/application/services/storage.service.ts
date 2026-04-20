import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService {
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

  async upload(
    tenantId: string,
    file: { buffer: Buffer; mimetype: string; originalname: string },
    folder = 'products',
  ): Promise<{ url: string; key: string }> {
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
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    this.logger.log(`Deleted: ${key}`);
  }
}
