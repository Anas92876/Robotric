import request from 'supertest';
import type { UserRole } from '../../src/modules/users/users.table';
import { createUser, DEFAULT_PASSWORD } from './factories';
import type { TestContext } from './test-app';

/** Creates a user with the role and returns ready-to-use auth headers plus the user row. */
export async function signIn(t: TestContext, role: UserRole) {
  const user = await createUser(t.db, { role, name: `A ${role}` });
  const res = await request(t.app)
    .post('/api/auth/login')
    .set('x-platform', 'mobile')
    .send({ email: user.email, password: DEFAULT_PASSWORD });
  if (res.status !== 200) throw new Error(`login failed: ${JSON.stringify(res.body)}`);
  return { user, headers: { Authorization: `Bearer ${res.body.data.token as string}` } };
}
