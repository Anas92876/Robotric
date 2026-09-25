/**
 * Where uploaded files live. Services depend only on this interface, so the
 * provider (Supabase Storage today, Cloudinary/R2 later) is swapped in
 * `src/container.ts` without touching any feature code.
 */
export interface StoredFile {
  bucket: string;
  path: string;
}

export interface UploadInput {
  bucket: string;
  path: string;
  body: Buffer;
  contentType: string;
}

export interface FileStorage {
  upload(input: UploadInput): Promise<StoredFile>;
  /** Permanent URL for files in a public bucket (website images). */
  publicUrl(file: StoredFile): string;
  /** A time-limited URL the client can download from. */
  signedUrl(file: StoredFile, expiresInSeconds?: number): Promise<string>;
  /** Best effort: failures are logged, never thrown. */
  remove(file: StoredFile): Promise<void>;
}

/** Makes a user-supplied filename safe to use in a storage path. */
export function sanitizeFilename(original: string): string {
  return original
    .replace(/[^a-zA-Z0-9.-]/g, '-')
    .toLowerCase()
    .substring(0, 100);
}
