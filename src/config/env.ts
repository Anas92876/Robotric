import 'dotenv/config';
import { z } from 'zod';

/**
 * Every environment variable the app reads, validated once at startup.
 * The rest of the code imports `env` and never touches `process.env` directly,
 * so a missing or malformed value fails here with a clear message instead of
 * surfacing later as an undefined deep inside a request.
 */
const booleanString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((v) => v === 'true');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4889),
  TZ: z.string().default('Asia/Damascus'),

  DATABASE_URL: z.string().url().optional(),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: booleanString,
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),

  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_KEY: z.string().optional(),
  SUPABASE_BUCKET: z.string().default('pdfs'),
  SUPABASE_CLIENT_MEDIA_BUCKET: z.string().default('client-media'),
  /** Public bucket for website images (training page, gallery covers). */
  SUPABASE_IMAGES_BUCKET: z.string().default('images'),

  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),

  /** Chrome/Edge used to render receipt PDFs outside Vercel (auto-detected if unset). */
  CHROME_BIN: z.string().optional(),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type Env = z.infer<typeof schema>;

function load(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

export const env = load();

// All date logic assumes Damascus local time, as the old backend did.
process.env.TZ = env.TZ;

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
