/**
 * Typed application errors. Services throw these; the error middleware turns
 * them into the JSON shape every client already understands:
 *
 *   { success: false, error: { message, code, statusCode, ... } }
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details: Record<string, unknown> | undefined;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details?: Record<string, unknown>) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', code = 'BAD_REQUEST') {
    super(message, 400, code);
  }
}

export interface FieldError {
  field: string;
  message: string;
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', errors: FieldError[] = []) {
    super(message, 400, 'VALIDATION_ERROR', errors.length ? { errors } : undefined);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', code = 'UNAUTHORIZED') {
    super(message, 401, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', code = 'FORBIDDEN') {
    super(message, 403, code);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource', code = 'NOT_FOUND') {
    super(`${resource} not found`, 404, code, { resource });
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', code = 'CONFLICT') {
    super(message, 409, code);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable', code = 'SERVICE_UNAVAILABLE') {
    super(message, 503, code);
  }
}
