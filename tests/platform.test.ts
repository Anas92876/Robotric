import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { signIn } from './helpers/auth';
import { createTestApp, type TestContext } from './helpers/test-app';

let t: TestContext;
beforeAll(async () => {
  t = await createTestApp();
});
afterAll(async () => {
  await t.close();
});

const api = () => request(t.app);

describe('app version', () => {
  it('is public and returns defaults before anything is saved', async () => {
    const res = await api().get('/api/app-version/');
    expect(res.body).toEqual({
      success: true,
      data: { minimumAppVersion: '1.0.0', forceUpdate: false, updateMessage: '', downloadUrl: 'http://robotrick.net/download-app' },
    });
  });

  it('can be changed by admin / superadmin / cto only, with semver validation', async () => {
    const student = (await signIn(t, 'student')).headers;
    expect((await api().put('/api/admin/settings/version').set(student).send({ forceUpdate: true })).status).toBe(403);

    const cto = (await signIn(t, 'cto')).headers;
    const bad = await api().put('/api/admin/settings/version').set(cto).send({ minimumAppVersion: '1.3' });
    expect(bad.status).toBe(400);
    expect(bad.body.message).toBe('minimumAppVersion must be a valid semver string (e.g. "1.3.0")');

    const ok = await api()
      .put('/api/admin/settings/version/')
      .set(cto)
      .send({ minimumAppVersion: '2.1.0', forceUpdate: 1, updateMessage: 'Please update' });
    expect(ok.body.data).toMatchObject({ minimumAppVersion: '2.1.0', forceUpdate: true, updateMessage: 'Please update' });

    const pub = await api().get('/api/app-version');
    expect(pub.body.data.minimumAppVersion).toBe('2.1.0');
  });
});

describe('exchange rate', () => {
  it('defaults to 120 and validates updates, keeping the app-version settings intact', async () => {
    const reception = (await signIn(t, 'reception')).headers;
    // App-version settings were saved above; the exchange rate still has its default.
    expect((await api().get('/api/reception/settings/exchange-rate').set(reception)).body).toEqual({
      success: true,
      data: { usdToSypExchangeRate: 120 },
    });

    const missing = await api().put('/api/reception/settings/exchange-rate').set(reception).send({});
    expect(missing.body.message).toBe('usdToSypExchangeRate is required');
    const range = await api().put('/api/reception/settings/exchange-rate').set(reception).send({ usdToSypExchangeRate: 0 });
    expect(range.body.message).toBe('Exchange rate must be between 1 and 10000 S.P. per USD');

    const ok = await api().put('/api/reception/settings/exchange-rate').set(reception).send({ usdToSypExchangeRate: '1350' });
    expect(ok.body).toEqual({ success: true, data: { usdToSypExchangeRate: 1350 } });
    expect((await api().get('/api/app-version')).body.data.minimumAppVersion).toBe('2.1.0');
  });
});

describe('PUT /api/users/:id/assigned-competition', () => {
  it('lets a superadmin set and clear the competition, with the old response shape', async () => {
    const admin = (await signIn(t, 'superadmin')).headers;
    const { user } = await signIn(t, 'judge');

    const set = await api().put(`/api/users/${user.id}/assigned-competition`).set(admin).send({ competitionId: 'abc123abc123abc123abc123' });
    expect(set.body).toEqual({ id: user.id, email: user.email, role: 'judge', name: 'A judge', assignedCompetitionId: 'abc123abc123abc123abc123' });

    const clear = await api().put(`/api/users/${user.id}/assigned-competition`).set(admin).send({ competitionId: '' });
    expect(clear.body.assignedCompetitionId).toBeNull();

    const missing = await api().put('/api/users/000000000000000000000000/assigned-competition').set(admin).send({});
    expect(missing.status).toBe(404);
    expect(missing.body.message).toBe('Not found');
  });

  it('is superadmin-only', async () => {
    const admin = (await signIn(t, 'admin')).headers;
    const res = await api().put('/api/users/000000000000000000000000/assigned-competition').set(admin).send({});
    expect(res.status).toBe(403);
  });
});
