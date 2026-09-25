import type { RequestHandler } from 'express';
import multer from 'multer';
import { BadRequestError } from './errors';

/**
 * Upload validation, ported from the old fileValidation.js:
 *  1. mimetype AND filename extension must both be on the allowlist
 *     (both are client-chosen, so either alone proves nothing);
 *  2. once in memory, the file's leading bytes must match the claimed format,
 *     so a renamed executable cannot get through.
 */
type Signature = (number | null)[];

const SIGNATURES: Record<string, Signature[]> = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50]],
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
  'application/zip': [
    [0x50, 0x4b, 0x03, 0x04],
    [0x50, 0x4b, 0x05, 0x06],
    [0x50, 0x4b, 0x07, 0x08],
  ],
  'application/vnd.rar': [
    [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00],
    [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00],
  ],
  'video/mp4': [[null, null, null, null, 0x66, 0x74, 0x79, 0x70]],
  'video/quicktime': [[null, null, null, null, 0x66, 0x74, 0x79, 0x70]],
  'audio/mp4': [[null, null, null, null, 0x66, 0x74, 0x79, 0x70]],
  'video/webm': [[0x1a, 0x45, 0xdf, 0xa3]],
  'audio/webm': [[0x1a, 0x45, 0xdf, 0xa3]],
  'audio/ogg': [[0x4f, 0x67, 0x67, 0x53]],
  'audio/mpeg': [[0x49, 0x44, 0x33], [0xff, 0xfb], [0xff, 0xf3], [0xff, 0xf2]],
};

const MIME_ALIASES: Record<string, string> = {
  'image/jpg': 'image/jpeg',
  'application/x-zip-compressed': 'application/zip',
  'application/x-rar-compressed': 'application/vnd.rar',
  'audio/x-m4a': 'audio/mp4',
};

export const normalizeMime = (mime: string): string => {
  const m = mime.toLowerCase();
  return MIME_ALIASES[m] ?? m;
};

const extensionOf = (filename: string): string => {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? (parts.pop() ?? '') : '';
};

export function bufferMatchesMime(buffer: Buffer, mime: string): boolean {
  const candidates = SIGNATURES[normalizeMime(mime)];
  if (!candidates) return false;
  return candidates.some((sig) => buffer.length >= sig.length && sig.every((byte, i) => byte === null || buffer[i] === byte));
}

export interface UploadPolicy {
  mimes: string[];
  extensions: string[];
  /** Shown to the user, e.g. "JPEG, PNG, WebP". */
  label: string;
  maxBytes: number;
  maxFiles?: number;
}

export const IMAGE_POLICY: UploadPolicy = {
  mimes: ['image/jpeg', 'image/png', 'image/webp'],
  extensions: ['jpg', 'jpeg', 'png', 'webp'],
  label: 'JPEG, PNG, WebP',
  maxBytes: 15 * 1024 * 1024,
};

export interface Uploader {
  single(field: string): RequestHandler[];
  array(field: string, maxCount?: number): RequestHandler[];
}

export function createUploader(policy: UploadPolicy): Uploader {
  const mimes = new Set(policy.mimes.map(normalizeMime));
  const extensions = new Set(policy.extensions);
  const invalid = () => new BadRequestError(`Invalid file type. Allowed: ${policy.label}.`, 'INVALID_FILE_TYPE');

  const parser = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: policy.maxBytes, files: policy.maxFiles ?? 10 },
    fileFilter: (_req, file, cb) => {
      if (mimes.has(normalizeMime(file.mimetype)) && extensions.has(extensionOf(file.originalname))) cb(null, true);
      else cb(invalid());
    },
  });

  const verifyBytes: RequestHandler = (req, _res, next) => {
    const files: Express.Multer.File[] = [];
    if (req.file) files.push(req.file);
    if (Array.isArray(req.files)) files.push(...req.files);
    for (const f of files) if (!bufferMatchesMime(f.buffer, f.mimetype)) throw invalid();
    next();
  };

  return {
    single: (field) => [parser.single(field), verifyBytes],
    array: (field, maxCount) => [parser.array(field, maxCount), verifyBytes],
  };
}
