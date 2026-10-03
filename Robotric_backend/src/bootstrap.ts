import type { Express } from 'express';
import { env } from './config/env';
import { createApp } from './app';
import { createAdapters, createContainer } from './container';
import { createDatabase } from './shared/db/client';
import { logger } from './shared/logger';

/** Builds the production app from environment variables. */
export function bootstrap(): { app: Express; close: () => Promise<void> } {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  const { db, close } = createDatabase(env.DATABASE_URL);
  const container = createContainer(env, createAdapters(env, db, logger));
  return { app: createApp(container), close };
}
