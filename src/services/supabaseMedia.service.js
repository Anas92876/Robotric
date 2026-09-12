/**
 * Supabase Storage helpers for client task-request media (image/video/audio).
 *
 * Generalizes the upload-with-retry / signed-URL logic that already lives inline
 * in clo.resources.controller.js (the PDF pipeline) into reusable functions, without
 * touching that controller — this keeps the existing CLO resources feature untouched.
 */

const supabase = require('../config/supabase');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');

const CLIENT_MEDIA_BUCKET = process.env.SUPABASE_CLIENT_MEDIA_BUCKET || 'client-media';

async function uploadToSupabaseWithRetry(bucket, storagePath, buffer, contentType) {
  if (!supabase) {
    throw new AppError('File storage is not configured', 503, 'STORAGE_NOT_CONFIGURED');
  }

  let uploadError = null;
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    const result = await supabase.storage
      .from(bucket)
      .upload(storagePath, buffer, { contentType, upsert: false });

    uploadError = result.error;
    if (!uploadError && result.data) {
      return result.data;
    }

    const isRetryable = uploadError.message?.includes('timeout') ||
      uploadError.message?.includes('network') ||
      uploadError.message?.includes('ECONNREFUSED') ||
      uploadError.statusCode === 408 ||
      uploadError.statusCode === 429 ||
      (uploadError.statusCode >= 500 && uploadError.statusCode < 600);

    if (!isRetryable || retryCount === maxRetries - 1) break;

    retryCount++;
    const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
    logger.logError(uploadError, { context: 'supabase_client_media_upload_retry', storagePath, retryCount, maxRetries, delay });
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  logger.logError(uploadError, { context: 'supabase_client_media_upload_failed', storagePath });

  if (uploadError.message?.includes('already exists') || uploadError.statusCode === 409) {
    throw new AppError('A file with this name already exists', 409, 'FILE_EXISTS');
  }
  if (uploadError.statusCode === 413 || uploadError.message?.includes('too large')) {
    throw new AppError('File size exceeds storage limit', 413, 'FILE_TOO_LARGE');
  }
  if (uploadError.statusCode === 401 || uploadError.statusCode === 403) {
    throw new AppError('Storage service authentication failed', 503, 'STORAGE_AUTH_FAILED');
  }
  throw new AppError(`Failed to upload file to storage: ${uploadError.message || 'Unknown error'}`, 500, 'STORAGE_UPLOAD_FAILED');
}

async function resolveSignedUrl(bucket, storagePath, expiresIn = 3600) {
  if (!supabase) {
    throw new AppError('File storage is not configured', 503, 'STORAGE_NOT_CONFIGURED');
  }

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, expiresIn);

  if (error || !data) {
    logger.logError(error || new Error('No signed URL data'), { context: 'supabase_client_media_signed_url', bucket, storagePath });
    throw new AppError('Failed to generate media URL', 500, 'SIGNED_URL_FAILED');
  }

  return data.signedUrl;
}

async function deleteFromSupabase(bucket, storagePath) {
  if (!supabase) return;

  const { error } = await supabase.storage.from(bucket).remove([storagePath]);
  if (error) {
    // Best-effort — log and continue, same convention as clo.resources.controller.js's delete flow.
    logger.logError(error, { context: 'supabase_client_media_delete', bucket, storagePath });
  }
}

function sanitizeFilename(originalname) {
  return originalname
    .replace(/[^a-zA-Z0-9.-]/g, '-')
    .toLowerCase()
    .substring(0, 100);
}

module.exports = {
  CLIENT_MEDIA_BUCKET,
  uploadToSupabaseWithRetry,
  resolveSignedUrl,
  deleteFromSupabase,
  sanitizeFilename,
};
