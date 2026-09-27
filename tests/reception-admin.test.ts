import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { signIn } from './helpers/auth';
import { createTestApp, type TestContext } from './helpers/test-app';

let t: TestContext;
let rec: Record<string, string>;
let admin: Record<string, string>;
const api = () => request(t.app);
const pdf = Buffer.from('%PDF-1.4\n%fake\n', 'latin1');

beforeAll(async () => {
  t = await createTestApp();
  rec = (await signIn(t, 'reception')).headers;
  admin = (await signIn(t, 'admin')).headers;
});
afterAll(async () => {
  await t.close();
});

describe('reception user management', () => {
  it('creates, lists, updates and deletes accounts, but only admins touch privileged ones', async () => {
    const created = await api().post('/api/reception/users').set(rec).send({ name: 'New Trainer', email: 'NT@x.com', password: 'secret1', role: 'trainer', phone: '0999' });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ email: 'nt@x.com', role: 'trainer', profile: { phone: '0999' } });
    expect(created.body.data.passwordHash).toBeUndefined();
    expect((await api().post('/api/reception/users').set(rec).send({ name: 'Dup', email: 'nt@x.com', password: 'secret1', role: 'student' })).status).toBe(409);
    expect((await api().post('/api/reception/users').set(rec).send({ name: 'Xavi', email: 'x@x.com', password: 'secret1', role: 'wizard' })).body.message).toBe('Invalid role: wizard');

    // Reception can no longer create admins; admins still can.
    expect((await api().post('/api/reception/users').set(rec).send({ name: 'Boss', email: 'boss@x.com', password: 'secret1', role: 'admin' })).body.error.code).toBe('PRIVILEGED_ROLE');
    expect((await api().post('/api/reception/users').set(admin).send({ name: 'Boss', email: 'boss@x.com', password: 'secret1', role: 'cto' })).status).toBe(201);

    const list = await api().get('/api/reception/users?role=trainer&search=new').set(rec);
    expect(list.body.pagination.total).toBe(1);

    const id = created.body.data._id;
    expect((await api().put(`/api/reception/users/${id}`).set(rec).send({ role: 'clo' })).body.error.code).toBe('PRIVILEGED_ROLE');
    const updated = await api().put(`/api/reception/users/${id}`).set(rec).send({ role: 'teacher', phone: '0888' });
    expect(updated.body.data).toMatchObject({ role: 'teacher', profile: { phone: '0888' } });

    expect((await api().delete(`/api/reception/users/${id}`).set(rec)).body.message).toBe('User deleted permanently');
    expect((await api().delete(`/api/reception/users/${id}`).set(rec)).status).toBe(404);
  });
});

describe('job applications', () => {
  it('lists with stats, reviews, links the CV and deletes', async () => {
    const applied = await api().post('/api/jobs/apply').field('fullName', 'Rami').field('phone', '0999 123 456').field('position', 'Trainer').attach('cv', pdf, 'cv.pdf');
    expect(applied.status).toBe(201);
    await api().post('/api/jobs/apply').send({ fullName: 'Lina', phone: '0999 123 457', position: 'Designer' });

    const list = await api().get('/api/reception/job-applications?search=ram').set(rec);
    expect(list.body).toMatchObject({ pagination: { total: 1 }, stats: { total: 2, new: 2 } });
    expect(list.body.positions.sort()).toEqual(['Designer', 'Trainer']);

    const id = applied.body.data.id;
    const reviewed = await api().put(`/api/reception/job-applications/${id}`).set(rec).send({ status: 'interview', notes: 'Call Monday' });
    expect(reviewed.body.data).toMatchObject({ status: 'interview', notes: 'Call Monday', reviewedBy: { _id: expect.any(String) } });

    const cv = await api().get(`/api/reception/job-applications/${id}/cv`).set(rec);
    expect(cv.body.data).toMatchObject({ expiresIn: 3600, filename: expect.stringMatching(/^Trainer - Rami - \d{4}-\d{2}-\d{2}\.pdf$/) });

    const files = t.storage.files.size;
    expect((await api().delete(`/api/reception/job-applications/${id}`).set(rec)).body.message).toBe('Application deleted successfully');
    expect(t.storage.files.size).toBe(files - 1);
  });
});
