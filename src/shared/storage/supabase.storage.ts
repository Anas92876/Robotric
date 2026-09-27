import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Logger } from '../logger';
import { AppError } from '../http/errors';
import type { FileStorage, StoredFile, UploadInput } from './file-storage';

const MAX_ATTEMPTS = 3;
// Uploads from Syria can be very slow; the old backend allowed 10 minutes.
const REQUEST_TIMEOUT_MS = 10 * 60 * 1000;

interface StorageErrorLike {
  message?: string;
  statusCode?: string | number;
}

function statusOf(err: StorageErrorLike): number {
  return Number(err.statusCode ?? 0);
}

function isRetryable(err: StorageErrorLike): boolean {
  const status = statusOf(err);
  const msg = err.message ?? '';
  return /timeout|network|ECONNREFUSED/i.test(msg) || status === 408 || status === 429 || (status >= 500 && status < 600);
}

function toAppError(err: StorageErrorLike): AppError {
  const status = statusOf(err);
  const msg = err.message ?? 'Unknown error';
  if (status === 409 || msg.includes('already exists')) return new AppError('A file with this name already exists', 409, 'FILE_EXISTS');
  if (status === 413 || msg.includes('too large')) return new AppError('File size exceeds storage limit', 413, 'FILE_TOO_LARGE');
  if (status === 401 || status === 403) return new AppError('Storage service authentication failed', 503, 'STORAGE_AUTH_FAILED');
  return new AppError(`Failed to upload file to storage: ${msg}`, 500, 'STORAGE_UPLOAD_FAILED');
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class SupabaseFileStorage implements FileStorage {
  private readonly client: SupabaseClient;

  constructor(
    url: string,
    key: string,
    private readonly logger: Logger,
  ) {
    const fetchWithTimeout: typeof fetch = (input, init) =>
      fetch(input, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    this.client = createClient(url, key, { global: { fetch: fetchWithTimeout } });
  }

  async upload({ bucket, path, body, contentType }: UploadInput): Promise<StoredFile> {
    let lastError: StorageErrorLike = {};
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const { error } = await this.client.storage.from(bucket).upload(path, body, { contentType, upsert: false });
      if (!error) return { bucket, path };

      lastError = error as StorageErrorLike;
      if (!isRetryable(lastError) || attempt === MAX_ATTEMPTS) break;
      const delay = Math.min(1000 * 2 ** (attempt - 1), 5000);
      this.logger.warn({ bucket, path, attempt, delay, err: lastError.message }, 'Storage upload failed, retrying');
      await sleep(delay);
    }
    this.logger.error({ bucket, path, err: lastError.message }, 'Storage upload failed');
    throw toAppError(lastError);
  }

  publicUrl({ bucket, path }: StoredFile): string {
    return this.client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  async signedUrl({ bucket, path }: StoredFile, expiresInSeconds = 3600): Promise<string> {
    const { data, error } = await this.client.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
    if (error || !data) {
      this.logger.error({ bucket, path, err: error?.message }, 'Signed URL failed');
      throw new AppError('Failed to generate file URL', 500, 'SIGNED_URL_FAILED');
    }
    return data.signedUrl;
  }

  async download({ bucket, path }: StoredFile): Promise<Buffer> {
    const { data, error } = await this.client.storage.from(bucket).download(path);
    if (error || !data) {
      this.logger.error({ bucket, path, err: error?.message }, 'Storage download failed');
      throw new AppError('Failed to download resource', 500, 'DOWNLOAD_FAILED');
    }
    return Buffer.from(await data.arrayBuffer());
  }

  async remove({ bucket, path }: StoredFile): Promise<void> {
    const { error } = await this.client.storage.from(bucket).remove([path]);
    if (error) this.logger.warn({ bucket, path, err: error.message }, 'Storage delete failed');
  }
}

/** Used when Supabase credentials are missing: every call fails with a clear 503. */
export class UnconfiguredFileStorage implements FileStorage {
  private fail(): never {
    throw new AppError('File storage is not configured', 503, 'STORAGE_NOT_CONFIGURED');
  }
  async upload(): Promise<StoredFile> {
    this.fail();
  }
  publicUrl(): string {
    this.fail();
  }
  async signedUrl(): Promise<string> {
    this.fail();
  }
  async download(): Promise<Buffer> {
    this.fail();
  }
  async remove(): Promise<void> {
    // Nothing stored, nothing to remove.
  }
}
