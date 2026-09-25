import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { users } from '../src/modules/users/users.table';
import { pushTokens } from '../src/modules/push-tokens/push-tokens.table';
import { createTestApp, type TestContext } from './helpers/test-app';
import { createUser, DEFAULT_PASSWORD } from './helpers/factories';

let t: TestContext;

beforeAll(async () => {
  t = await createTestApp();
});
afterAll(async () => {
  await t.close();
});

async function login(email: string, password = DEFAULT_PASSWORD) {
  return request(t.app).post('/api/auth/login').set('x-platform', 'mobile').send({ email, password });
}

async function tokenFor(email: string, password = DEFAULT_PASSWORD): Promise<string> {
  const res = await login(email, password);
  expect(res.status).toBe(200);
  return res.body.data.token as string;
}

describe('POST /api/auth/login', () => {
  it('returns the same payload shape as the old API, with an ObjectId-style _id', async () => {
    const user = await createUser(t.db, { email: 'shape@test.local', name: 'Shape', role: 'trainer' });
    const res = await login('shape@test.local');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, message: 'Login successful' });
    expect(res.body.data).toEqual({
      _id: user.id,
      id: user.id,
      email: 'shape@test.local',
      role: 'trainer',
      name: 'Shape',
      nameAr: null,
      assignedCompetitionId: null,
      token: expect.any(String),
    });
    expect(res.body.data._id).toMatch(/^[a-f0-9]{24}$/);
  });

  it('matches email case-insensitively', async () => {
    await createUser(t.db, { email: 'mixed@test.local' });
    expect((await login('MiXeD@Test.Local')).status).toBe(200);
  });

  it('sets an httpOnly cookie for web clients but not mobile', async () => {
    await createUser(t.db, { email: 'cookie@test.local' });
    const web = await request(t.app).post('/api/auth/login').send({ email: 'cookie@test.local', password: DEFAULT_PASSWORD });
    expect(web.headers['set-cookie']?.[0]).toMatch(/^token=.*HttpOnly/);
    const mobile = await login('cookie@test.local');
    expect(mobile.headers['set-cookie']).toBeUndefined();
  });

  it('rejects wrong password and unknown email with the same error', async () => {
    await createUser(t.db, { email: 'wrong@test.local' });
    const a = await login('wrong@test.local', 'nope-nope');
    const b = await login('ghost@test.local');
    for (const res of [a, b]) {
      expect(res.status).toBe(401);
      expect(res.body.error).toMatchObject({ code: 'INVALID_CREDENTIALS', message: 'Invalid credentials', statusCode: 401 });
    }
  });

  it('blocks deactivated accounts', async () => {
    await createUser(t.db, { email: 'inactive@test.local', profile: { status: 'inactive' } });
    const res = await login('inactive@test.local');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('ACCOUNT_DEACTIVATED');
  });

  it('validates the body', async () => {
    const res = await request(t.app).post('/api/auth/login').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/auth/me and session checks', () => {
  it('works with a Bearer token and with the cookie', async () => {
    const user = await createUser(t.db, { email: 'me@test.local' });
    const token = await tokenFor('me@test.local');

    const bearer = await request(t.app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(bearer.status).toBe(200);
    expect(bearer.body.data._id).toBe(user.id);

    const cookie = await request(t.app).get('/api/auth/me').set('Cookie', `token=${token}`);
    expect(cookie.status).toBe(200);
  });

  it('401s without a token, with a bad token, and for a deleted user', async () => {
    expect((await request(t.app).get('/api/auth/me')).body.error.code).toBe('UNAUTHORIZED');
    expect((await request(t.app).get('/api/auth/me').set('Authorization', 'Bearer junk')).body.error.code).toBe('INVALID_TOKEN');

    const user = await createUser(t.db, { email: 'deleted@test.local' });
    const token = await tokenFor('deleted@test.local');
    await t.db.delete(users).where(eq(users.id, user.id));
    const res = await request(t.app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('ACCOUNT_NOT_FOUND');
  });
});

describe('POST /api/auth/logout', () => {
  it('deactivates the user’s push tokens', async () => {
    const user = await createUser(t.db, { email: 'logout@test.local' });
    await t.db.insert(pushTokens).values({ userId: user.id, token: 'ExponentPushToken[x]', platform: 'android' });
    const token = await tokenFor('logout@test.local');

    const res = await request(t.app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: 'Logged out successfully' });

    const [row] = await t.db.select().from(pushTokens).where(eq(pushTokens.userId, user.id));
    expect(row?.isActive).toBe(false);
    expect(row?.deactivatedAt).toBeInstanceOf(Date);
  });
});

describe('change password flow', () => {
  it('requires the current password, then an OTP; revokes old tokens and issues a new one', async () => {
    await createUser(t.db, { email: 'cp@test.local' });
    const oldToken = await tokenFor('cp@test.local');
    const auth = { Authorization: `Bearer ${oldToken}` };

    const wrong = await request(t.app)
      .post('/api/auth/change-password/request')
      .set(auth)
      .send({ currentPassword: 'bad', newPassword: 'newpassword1' });
    expect(wrong.body.error.code).toBe('WRONG_PASSWORD');

    const req1 = await request(t.app)
      .post('/api/auth/change-password/request')
      .set(auth)
      .send({ currentPassword: DEFAULT_PASSWORD, newPassword: 'newpassword1' });
    expect(req1.body).toEqual({ success: true, message: 'OTP sent to your email' });

    const bad = await request(t.app).post('/api/auth/change-password/confirm').set(auth).send({ otp: '000000' });
    expect(bad.status).toBe(400);
    expect(bad.body.error.message).toBe('Invalid OTP');

    const otp = t.email.lastOtpTo('cp@test.local');
    const ok = await request(t.app).post('/api/auth/change-password/confirm').set(auth).send({ otp });
    expect(ok.status).toBe(200);
    const newToken = ok.body.data.token as string;

    // Old token is revoked, new token works, new password works.
    expect((await request(t.app).get('/api/auth/me').set(auth)).body.error.code).toBe('TOKEN_REVOKED');
    expect((await request(t.app).get('/api/auth/me').set('Authorization', `Bearer ${newToken}`)).status).toBe(200);
    expect((await login('cp@test.local', 'newpassword1')).status).toBe(200);
    expect((await login('cp@test.local')).status).toBe(401);

    // The code is single-use.
    const again = await request(t.app)
      .post('/api/auth/change-password/confirm')
      .set('Authorization', `Bearer ${newToken}`)
      .send({ otp });
    expect(again.body.error.message).toBe('No pending password change. Please request a new code.');
  });

  it('burns the code after five wrong attempts', async () => {
    await createUser(t.db, { email: 'burn@test.local' });
    const auth = { Authorization: `Bearer ${await tokenFor('burn@test.local')}` };
    await request(t.app)
      .post('/api/auth/change-password/request')
      .set(auth)
      .send({ currentPassword: DEFAULT_PASSWORD, newPassword: 'newpassword1' });
    const otp = t.email.lastOtpTo('burn@test.local');

    const messages: string[] = [];
    for (let i = 0; i < 5; i++) {
      const res = await request(t.app).post('/api/auth/change-password/confirm').set(auth).send({ otp: '999999' });
      messages.push(res.body.error.message);
    }
    expect(messages.slice(0, 4).every((m) => m === 'Invalid OTP')).toBe(true);
    expect(messages[4]).toBe('Too many incorrect attempts. Please request a new code.');

    const res = await request(t.app).post('/api/auth/change-password/confirm').set(auth).send({ otp });
    expect(res.body.error.message).toBe('No pending password change. Please request a new code.');
  });
});

describe('change email flow', () => {
  it('sends the code to the NEW address and applies it on confirm', async () => {
    await createUser(t.db, { email: 'ce@test.local' });
    const auth = { Authorization: `Bearer ${await tokenFor('ce@test.local')}` };

    const r = await request(t.app).post('/api/auth/change-email/request').set(auth).send({ newEmail: 'New@Test.local' });
    expect(r.body.message).toBe('If that address is available, a verification code has been sent to it');

    const otp = t.email.lastOtpTo('New@Test.local');
    const c = await request(t.app).post('/api/auth/change-email/confirm').set(auth).send({ otp });
    expect(c.body).toEqual({ success: true, message: 'Email changed successfully', data: { email: 'new@test.local' } });
    expect((await login('new@test.local')).status).toBe(200);
  });

  it('does not reveal that an address is taken', async () => {
    await createUser(t.db, { email: 'taken@test.local' });
    await createUser(t.db, { email: 'asker@test.local' });
    const auth = { Authorization: `Bearer ${await tokenFor('asker@test.local')}` };
    const before = t.email.sent.length;

    const r = await request(t.app).post('/api/auth/change-email/request').set(auth).send({ newEmail: 'taken@test.local' });
    expect(r.status).toBe(200);
    expect(r.body.message).toBe('If that address is available, a verification code has been sent to it');
    expect(t.email.sent.length).toBe(before);
  });
});

describe('forgot password flow', () => {
  it('gives the same answer for unknown emails and resets with a valid code', async () => {
    await createUser(t.db, { email: 'fp@test.local' });
    const oldToken = await tokenFor('fp@test.local');

    const unknown = await request(t.app).post('/api/auth/forgot-password/request').send({ email: 'nobody@test.local' });
    const known = await request(t.app).post('/api/auth/forgot-password/request').send({ email: 'fp@test.local' });
    expect(unknown.body).toEqual(known.body);

    const otp = t.email.lastOtpTo('fp@test.local');
    const res = await request(t.app)
      .post('/api/auth/forgot-password/confirm')
      .send({ email: 'fp@test.local', otp, newPassword: 'resetpass1' });
    expect(res.body).toEqual({ success: true, message: 'Password reset successfully. You can now sign in.' });

    expect((await login('fp@test.local', 'resetpass1')).status).toBe(200);
    // A reset ends every existing session.
    const me = await request(t.app).get('/api/auth/me').set('Authorization', `Bearer ${oldToken}`);
    expect(me.body.error.code).toBe('TOKEN_REVOKED');
  });
});

describe('fallback handlers', () => {
  it('returns the standard 404 body for unknown routes', async () => {
    const res = await request(t.app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: 'Route not found',
      error: { message: 'Route not found', code: 'NOT_FOUND', statusCode: 404, path: '/api/does-not-exist' },
    });
  });

  it('returns 400 INVALID_JSON for malformed bodies', async () => {
    const res = await request(t.app).post('/api/auth/login').set('Content-Type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });
});
