import type { Database } from '../../src/shared/db/client';
import { newId } from '../../src/shared/db/ids';
import { type NewUserRow, users } from '../../src/modules/users/users.table';
import { fastHasher } from './test-app';

export const DEFAULT_PASSWORD = 'password123';

export async function createUser(db: Database, overrides: Partial<NewUserRow> & { password?: string } = {}) {
  const { password = DEFAULT_PASSWORD, ...rest } = overrides;
  const id = newId();
  const [row] = await db
    .insert(users)
    .values({
      id,
      email: `user-${id}@test.local`,
      name: 'Test User',
      role: 'student',
      passwordHash: await fastHasher.hash(password),
      ...rest,
    })
    .returning();
  if (!row) throw new Error('user insert failed');
  return row;
}
