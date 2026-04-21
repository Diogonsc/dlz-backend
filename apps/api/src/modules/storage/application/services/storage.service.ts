import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomUUID } from 'crypto';
import {
  isS3StorageConfigured,
  resolveLocalStorageRoot,
  useLocalFilesystemStorage,
  type StorageBlock,
} from '../../local-storage.helpers';

function normalizeEndpoint(raw: string | undefined): string | undefined {
  const e = (raw ?? '').trim();
  return e.length > 0 ? e : undefined;
}

/** MinIO / R2 / LocalStack precisam de path-style; S3 AWS padrão não. */
function useForcePathStyle(endpoint?: string): boolean {
  if (!endpoint) return false;
  return !/amazonaws\.com(\/|$)/i.test(endpoint);
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client | null;
  private readonly bucket: string;
  private readonly publicUrl: string;
  private readonly useLocalDisk: boolean;
  private readonly localRoot: string;
  private readonly publicFileBase: string;
  private readonly storage: StorageBlock;

  constructor(private readonly config: ConfigService) {
    this.storage = this.config.getOrThrow<StorageBlock>('storage');
    const nodeEnv = (this.config.get<string>('nodeEnv') ?? 'development').toLowerCase();

    this.bucket = this.storage.bucket;
    this.publicUrl = this.storage.publicUrl.replace(/\/$/, '');
    this.useLocalDisk = useLocalFilesystemStorage(nodeEnv, this.storage);
    this.localRoot = resolveLocalStorageRoot(this.storage.localDir);

    const port = this.config.get<number>('port', 3333);
    const apiUrl = (this.config.get<string>('apiUrl') ?? '').replace(/\/$/, '');
    this.publicFileBase = (this.publicUrl || apiUrl || `http://127.0.0.1:${port}`).replace(/\/$/, '');

    const endpoint = normalizeEndpoint(this.storage.endpoint);
    const s3Ready = isS3StorageConfigured(this.storage) && !this.useLocalDisk;

    this.s3 = s3Ready
      ? new S3Client({
          region: this.storage.region,
          ...(endpoint ? { endpoint } : {}),
          credentials: {
            accessKeyId: this.storage.accessKeyId,
            secretAccessKey: this.storage.secretAccessKey,
          },
          forcePathStyle: useForcePathStyle(endpoint),
        })
      : null;

    if (this.useLocalDisk) {
      this.logger.log(`Storage em disco local (${this.localRoot}) — público em ${this.publicFileBase}/api/v1/storage/public/`);
    } else if (!this.s3) {
      this.logger.warn(
        'Storage S3 incompleto: defina STORAGE_ENDPOINT, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY ou use STORAGE_BACKEND=local.',
      );
    }
  }

  private localAbsolutePath(key: string): string {
    return join(this.localRoot, key.replace(/^\/+/, ''));
  }

  private async uploadLocal(
    key: string,
    file: { buffer: Buffer; mimetype: string; originalname: string },
  ): Promise<{ url: string; key: string }> {
    const abs = this.localAbsolutePath(key);
    await mkdir(dirname(abs), { recursive: true });
    try {
      await writeFile(abs, file.buffer);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`writeFile falhou (${abs}): ${msg}`);
      throw new BadGatewayException(`Falha ao gravar arquivo local: ${msg}`);
    }
    const url = `${this.publicFileBase}/api/v1/storage/public/${key}`;
    this.logger.log(`Uploaded (local): ${key}`);
    return { url, key };
  }

  async upload(
    tenantId: string,
    file: { buffer: Buffer; mimetype: string; originalname: string },
    folder = 'products',
  ): Promise<{ url: string; key: string }> {
    const ext = file.originalname.split('.').pop() ?? 'jpg';
    const key = `${folder}/${tenantId}/${randomUUID()}.${ext}`;

    if (this.useLocalDisk) {
      return this.uploadLocal(key, file);
    }

    if (!this.s3) {
      throw new BadGatewayException(
        'Storage não configurado. Em produção defina S3/R2 (STORAGE_*) ou STORAGE_BACKEND=local. Veja .env.example.',
      );
    }

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          CacheControl: 'max-age=31536000',
        }),
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`PutObject falhou (${key}): ${msg}`);
      throw new BadGatewayException(
        `Falha ao enviar arquivo ao storage: ${msg}. Confirme endpoint, credenciais, bucket e (MinIO) STORAGE_REGION.`,
      );
    }

    const base = this.publicUrl || '';
    const url = base ? `${base.replace(/\/$/, '')}/${key}` : `/${key}`;
    this.logger.log(`Uploaded: ${key}`);
    return { url, key };
  }

  async delete(key: string) {
    if (this.useLocalDisk) {
      const abs = this.localAbsolutePath(key);
      try {
        await unlink(abs);
      } catch (err: unknown) {
        const code = err && typeof err === 'object' && 'code' in err ? (err as NodeJS.ErrnoException).code : '';
        if (code !== 'ENOENT') {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.error(`unlink falhou (${abs}): ${msg}`);
          throw new BadGatewayException(`Falha ao remover arquivo local: ${msg}`);
        }
      }
      this.logger.log(`Deleted (local): ${key}`);
      return;
    }

    if (!this.s3) {
      throw new BadGatewayException('Storage não configurado.');
    }
    try {
      await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`DeleteObject falhou (${key}): ${msg}`);
      throw new BadGatewayException(`Falha ao remover arquivo: ${msg}`);
    }
    this.logger.log(`Deleted: ${key}`);
  }
}
