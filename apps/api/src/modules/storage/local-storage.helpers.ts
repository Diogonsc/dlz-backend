import { join } from 'node:path';

export type StorageBlock = {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl: string;
  region: string;
  backend: string;
  localDir: string;
};

export function isS3StorageConfigured(s: Pick<StorageBlock, 'endpoint' | 'accessKeyId' | 'secretAccessKey'>): boolean {
  return Boolean(s.endpoint && s.accessKeyId && s.secretAccessKey);
}

/** Disco local: `STORAGE_BACKEND=local` ou dev sem S3 completo (e não forçado `s3`). */
export function useLocalFilesystemStorage(nodeEnv: string, s: StorageBlock): boolean {
  if (s.backend === 'local') return true;
  if (isS3StorageConfigured(s)) return false;
  if (s.backend === 's3') return false;
  return nodeEnv !== 'production';
}

export function resolveLocalStorageRoot(localDirFromEnv: string): string {
  const t = (localDirFromEnv ?? '').trim();
  return t.length > 0 ? t : join(process.cwd(), 'var', 'local-storage');
}
