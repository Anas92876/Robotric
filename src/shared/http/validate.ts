import { z } from 'zod';
import { ValidationError } from './errors';

/**
 * Parses untrusted input against a zod schema. On failure throws a 400 whose
 * message is the first problem's message — schemas carry the exact wording
 * the old API used — and whose `errors` lists every field problem. Pass
 * `summary` for endpoints that answered with one generic message instead.
 */
export function parse<S extends z.ZodType>(schema: S, input: unknown, summary?: string): z.infer<S> {
  const result = schema.safeParse(input ?? {});
  if (result.success) return result.data;

  const errors = result.error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
  throw new ValidationError(summary ?? errors[0]?.message ?? 'Validation failed', errors);
}

/**
 * A number from JSON or a form field ("12" → 12). Mongoose cast strings the
 * same way, so clients that send numbers as strings keep working.
 */
export const numeric = (message: string) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() !== '' ? Number(v) : v),
    z.number({ error: message }).refine(Number.isFinite, { message }),
  );

/** Boolean from JSON or a form field ("true"/"false"). */
export const booleanish = z.preprocess((v) => (v === 'true' ? true : v === 'false' ? false : v), z.boolean());
