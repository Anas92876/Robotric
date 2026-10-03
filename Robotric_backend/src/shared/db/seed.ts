import { env } from '../../config/env';
import { BcryptPasswordHasher } from '../auth/password-hasher';
import { logger } from '../logger';
import { users, USER_ROLES } from '../../modules/users/users.table';
import { createDatabase } from './client';

/**
 * Test data for development: one account per role, e.g. `clo@robotrick.test`.
 * Safe to re-run — existing accounts get their name, role and password reset.
 * Each feature module adds its own sample data here as it is ported.
 *
 *   npm run db:seed                       # password: Password123
 *   SEED_PASSWORD=secret npm run db:seed
 */
const PASSWORD = process.env.SEED_PASSWORD ?? 'Password123';

async function main(): Promise<void> {
  if (env.NODE_ENV === 'production') throw new Error('Refusing to seed test accounts in production');
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

  const { db, close } = createDatabase(env.DATABASE_URL);
  try {
    const passwordHash = await new BcryptPasswordHasher().hash(PASSWORD);
    for (const role of USER_ROLES) {
      const name = `Test ${role[0]?.toUpperCase()}${role.slice(1)}`;
      await db
        .insert(users)
        .values({ email: `${role}@robotrick.test`, name, role, passwordHash, profile: { status: 'active' } })
        .onConflictDoUpdate({ target: users.email, set: { name, role, passwordHash } });
    }
    logger.info(`Seeded ${USER_ROLES.length} accounts (<role>@robotrick.test / ${PASSWORD})`);
  } finally {
    await close();
  }
}

main().catch((err: unknown) => {
  logger.error(err, 'Seed failed');
  process.exit(1);
});
