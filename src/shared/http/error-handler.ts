import type { ErrorRequestHandler, RequestHandler } from 'express';
import { MulterError } from 'multer';
import type { Logger } from '../logger';
import { AppError } from './errors';

/**
 * Old endpoints answered errors in two shapes: `{ success, message }` and
 * `{ success, error: { message, code, statusCode } }`. Clients read one or the
 * other depending on the screen, so every error carries both.
 */
interface ErrorBody {
  success: false;
  message: string;
  error: {
    message: string;
    code: string;
    statusCode: number;
    [key: string]: unknown;
  };
}

function body(statusCode: number, code: string, message: string, extra?: Record<string, unknown>): ErrorBody {
  return { success: false, message, error: { message, code, statusCode, ...extra } };
}

/** Maps body-parser / multer / Postgres failures that are the caller's fault to 4xx. */
function fromKnownError(err: unknown): AppError | null {
  if (err instanceof AppError) return err;

  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return new AppError('File too large', 400, 'FILE_TOO_LARGE');
    if (err.code === 'LIMIT_FILE_COUNT') return new AppError('Too many files', 400, 'TOO_MANY_FILES');
    return new AppError(err.message, 400, err.code);
  }

  if (typeof err === 'object' && err !== null) {
    // Drizzle wraps driver errors; the Postgres error code lives on `cause`.
    const wrapped = err as { cause?: unknown };
    if (wrapped.cause && typeof wrapped.cause === 'object' && 'code' in wrapped.cause) {
      const inner = fromKnownError(wrapped.cause);
      if (inner) return inner;
    }
    const e = err as { type?: string; code?: string };
    if (e.type === 'entity.parse.failed') return new AppError('Invalid JSON format in request body', 400, 'INVALID_JSON');
    if (e.type === 'entity.too.large') return new AppError('Request body too large. Maximum size is 10MB', 413, 'PAYLOAD_TOO_LARGE');
    // Postgres unique_violation — the equivalent of Mongo's E11000.
    if (e.code === '23505') return new AppError('Resource already exists', 409, 'CONFLICT');
    // Postgres foreign_key_violation: referenced record does not exist.
    if (e.code === '23503') return new AppError('Referenced resource does not exist', 400, 'INVALID_REFERENCE');
    // Postgres restrict_violation: other records still use this one.
    if (e.code === '23001') return new AppError('This record is still in use and cannot be deleted', 409, 'IN_USE');
  }
  return null;
}

export function createErrorHandler(logger: Logger, exposeStack: boolean): ErrorRequestHandler {
  // Express identifies error handlers by arity, so all four params must stay.
  return (err: unknown, req, res, _next) => {
    const known = fromKnownError(err);
    const status = known?.statusCode ?? 500;

    const context = { method: req.method, path: req.path, userId: req.user?.id };
    if (status >= 500) logger.error({ err, ...context }, 'Request failed');
    else logger.warn({ code: known?.code, ...context }, known?.message);

    if (known) {
      res.status(status).json(body(status, known.code, known.message, known.details));
      return;
    }

    const extra = exposeStack && err instanceof Error ? { stack: err.stack } : undefined;
    const message = exposeStack && err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json(body(500, 'INTERNAL_ERROR', message, extra));
  };
}

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json(body(404, 'NOT_FOUND', 'Route not found', { path: req.path }));
};
