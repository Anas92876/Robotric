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

  it('gives reception the full student lifecycle, with disable/enable for accounts that have history', async () => {
    const login = (email: string, password: string) => api().post('/api/auth/login').send({ email, password });

    // Create and find
    const created = await api().post('/api/reception/users').set(rec).send({ name: 'Lina Student', email: 'lina@x.com', password: 'secret1', role: 'student', phone: '0911' });
    expect(created.status).toBe(201);
    const id = created.body.data._id;
    const found = await api().get('/api/reception/users?role=student&search=lina').set(rec);
    expect(found.body.data.map((u: { _id: string }) => u._id)).toContain(id);

    // Edit, including a new password
    const edited = await api().put(`/api/reception/users/${id}`).set(rec).send({ name: 'Lina Haddad', phone: '0922', password: 'newpass1' });
    expect(edited.body.data).toMatchObject({ name: 'Lina Haddad', profile: { phone: '0922' } });
    const session = await login('lina@x.com', 'newpass1');
    expect(session.status).toBe(200);
    const linaHeaders = { Authorization: `Bearer ${session.body.data.token}` };

    // She has history now (an enrollment), so deleting is refused with a clear hint…
    const clo = (await signIn(t, 'clo')).headers;
    const trainer = await signIn(t, 'trainer');
    const courseId = (await api().post('/api/clo/courses').set(clo).send({ title: 'Bots', category: 'x', description: 'd', price: 10 })).body.data._id;
    const groupId = (await api().post('/api/clo/groups').set(clo).send({ name: 'G', courseId, trainerId: trainer.user.id, startDate: '2020-01-01', endDate: '2040-01-01' })).body.data._id;
    expect((await api().post('/api/reception/enrollments').set(rec).send({ studentId: id, courseId, groupId })).status).toBe(201);
    const refused = await api().delete(`/api/reception/users/${id}`).set(rec);
    expect(refused.status).toBe(409);
    expect(refused.body.error.code).toBe('USER_IN_USE');
    expect(refused.body.message).toMatch(/Disable the account instead/);

    // …so reception disables her: her current session ends and sign-in is refused, history kept
    const disabled = await api().put(`/api/reception/users/${id}`).set(rec).send({ status: 'inactive' });
    expect(disabled.body.data.profile).toMatchObject({ status: 'inactive', phone: '0922' });
    expect((await api().get('/api/auth/me').set(linaHeaders)).body.error.code).toBe('TOKEN_REVOKED');
    expect((await login('lina@x.com', 'newpass1')).body.error.code).toBe('ACCOUNT_DEACTIVATED');
    const inactive = await api().get('/api/reception/users?status=inactive&role=student').set(rec);
    expect(inactive.body.data.map((u: { _id: string }) => u._id)).toEqual([id]);
    const active = await api().get('/api/reception/users?status=active&role=student').set(rec);
    expect(active.body.data.map((u: { _id: string }) => u._id)).not.toContain(id);

    // Enabling lets her back in
    await api().put(`/api/reception/users/${id}`).set(rec).send({ status: 'active' });
    expect((await login('lina@x.com', 'newpass1')).status).toBe(200);

    // A student without history is simply deleted
    const temp = (await api().post('/api/reception/users').set(rec).send({ name: 'Temp Kid', email: 'temp@x.com', password: 'secret1', role: 'student' })).body.data._id;
    expect((await api().delete(`/api/reception/users/${temp}`).set(rec)).body.message).toBe('User deleted permanently');

    // New roles can be created from User Management
    expect((await api().post('/api/reception/users').set(rec).send({ name: 'Judy Judge', email: 'judge2@x.com', password: 'secret1', role: 'judge' })).status).toBe(201);
  });

  it('lets admins manage managers, with guards against locking themselves out', async () => {
    const me = await signIn(t, 'admin');
    const superadmin = (await signIn(t, 'superadmin')).headers;

    // Admin creates and deletes a CLO; reception can't disable one
    const cloId = (await api().post('/api/reception/users').set(admin).send({ name: 'New Clo', email: 'clo2@x.com', password: 'secret1', role: 'clo' })).body.data._id;
    expect((await api().put(`/api/reception/users/${cloId}`).set(rec).send({ status: 'inactive' })).body.error.code).toBe('PRIVILEGED_ROLE');
    expect((await api().put(`/api/reception/users/${cloId}`).set(admin).send({ status: 'inactive' })).body.data.profile.status).toBe('inactive');
    expect((await api().delete(`/api/reception/users/${cloId}`).set(admin)).body.message).toBe('User deleted permanently');

    // Admin accounts: only a superadmin deletes them
    const adminId = (await api().post('/api/reception/users').set(admin).send({ name: 'Second Admin', email: 'admin2@x.com', password: 'secret1', role: 'admin' })).body.data._id;
    expect((await api().delete(`/api/reception/users/${adminId}`).set(admin)).body.error.code).toBe('PRIVILEGED_ROLE');
    expect((await api().delete(`/api/reception/users/${adminId}`).set(superadmin)).body.message).toBe('User deleted permanently');

    // Nobody disables or deletes their own account
    expect((await api().put(`/api/reception/users/${me.user.id}`).set(me.headers).send({ status: 'inactive' })).body.error.code).toBe('SELF_DISABLE');
    expect((await api().delete(`/api/reception/users/${me.user.id}`).set(me.headers)).body.error.code).toBe('SELF_DELETE');
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
