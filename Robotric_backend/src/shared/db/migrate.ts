import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { env } from '../../config/env';
import { logger } from '../logger';
import { createDatabase } from './client';

/** Applies every pending SQL migration in ./drizzle. Run with `npm run db:migrate`. */
async function main(): Promise<void> {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  const { db, close } = createDatabase(env.DATABASE_URL);
  try {
    // The node-postgres migrator accepts the same drizzle instance we build.
    await migrate(db as Parameters<typeof migrate>[0], { migrationsFolder: 'drizzle' });
    logger.info('Migrations applied');
  } finally {
    await close();
  }
}

main().catch((err: unknown) => {
  logger.error(err, 'Migration failed');
  process.exit(1);
});
