import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { workSessions } from '../src/modules/internal-work/internal-work.table';
import { signIn } from './helpers/auth';
import { createTestApp, type TestContext } from './helpers/test-app';

let t: TestContext;
type Session = { headers: Record<string, string>; user: { id: string } };
let cto: Session;
let eng: Session;
let other: Session;
let client: Session;
const api = () => request(t.app);
const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70]), Buffer.alloc(16)]);

beforeAll(async () => {
  t = await createTestApp();
  cto = await signIn(t, 'cto');
  eng = await signIn(t, 'engineer');
  other = await signIn(t, 'engineer');
  client = await signIn(t, 'client');
});
afterAll(async () => {
  await t.close();
});

describe('projects and sub-projects', () => {
  it('nests one level only and refuses unsafe deletes', async () => {
    const h = cto.headers;
    expect((await api().post('/api/cto/internal/projects').set(h).send({ name: 'X', clients: [eng.user.id] })).body.error.code).toBe('NOT_A_CLIENT');
    const main = (await api().post('/api/cto/internal/projects').set(h).send({ name: 'Website', priority: 1, assignedEngineers: [eng.user.id], clients: [client.user.id] })).body.data;
    expect(main).toMatchObject({ name: 'Website', priority: 1, assignedEngineers: [{ _id: eng.user.id }], clients: [{ _id: client.user.id }], parentProject: null });
    const sub = (await api().post('/api/cto/internal/projects').set(h).send({ name: 'Blog', parentProject: main._id })).body.data;
    expect((await api().post('/api/cto/internal/projects').set(h).send({ name: 'Deep', parentProject: sub._id })).body.error.code).toBe('NESTING_NOT_ALLOWED');

    const loose = (await api().post('/api/cto/internal/projects').set(h).send({ name: 'Loose' })).body.data;
    await api().post('/api/cto/internal/tasks').set(h).send({ projectId: loose._id, title: 'Moved task', assignedTo: [eng.user.id] });
    const moved = await api().post(`/api/cto/internal/projects/${loose._id}/move`).set(h).send({ parentProject: main._id });
    expect(moved.body.data.parentProject).toMatchObject({ _id: main._id });
    const subs = (await api().get(`/api/cto/internal/projects/${main._id}/sub-projects`).set(h)).body.data;
    expect(subs.find((s: { _id: string }) => s._id === loose._id).taskCounts).toMatchObject({ total: 1, todo: 1 });
    expect((await api().post(`/api/cto/internal/projects/${main._id}/move`).set(h).send({ parentProject: sub._id })).body.error.code).toBe('NESTING_NOT_ALLOWED');

    const list = (await api().get('/api/cto/internal/projects').set(h)).body.data;
    expect(list.find((p: { _id: string }) => p._id === main._id)).toMatchObject({ subProjectCount: 2 });
    expect((await api().delete(`/api/cto/internal/projects/${main._id}`).set(h)).body.error.code).toBe('PROJECT_HAS_SUBPROJECTS');
    expect((await api().delete(`/api/cto/internal/projects/${loose._id}`).set(h)).body.error.code).toBe('PROJECT_HAS_TASKS');
    expect((await api().get('/api/cto/internal/projects').set(eng.headers)).status).toBe(403);
  });
});

describe('tasks for engineers', () => {
  it('moves tasks through their states, with sub-tasks, submissions and deadline extensions', async () => {
    const h = cto.headers;
    const project = (await api().post('/api/cto/internal/projects').set(h).send({ name: 'App', assignedEngineers: [eng.user.id] })).body.data;
    const task = (await api().post('/api/cto/internal/tasks').set(h).send({ projectId: project._id, title: 'Login screen', priority: 1, assignedTo: eng.user.id, dueDate: '2030-01-10' })).body.data;
    expect(task).toMatchObject({ status: 'todo', assignedTo: [{ _id: eng.user.id }], projectId: { _id: project._id, name: 'App' } });

    const att = await api().post(`/api/cto/internal/tasks/${task._id}/attachments`).set(h).attach('images', png, 'mock.png');
    expect(att.body.data[0]).toMatchObject({ name: 'mock.png', url: expect.stringMatching(/^https:\/\/storage\.test\/images\/tasks\//) });

    // Engineer flow.
    expect((await api().patch(`/api/engineer/tasks/${task._id}/status`).set(other.headers).send({ status: 'in_progress' })).body.error.code).toBe('NOT_ASSIGNED');
    expect((await api().patch(`/api/engineer/tasks/${task._id}/status`).set(eng.headers).send({ status: 'done' })).body.error.code).toBe('INVALID_TRANSITION');
    expect((await api().patch(`/api/engineer/tasks/${task._id}/status`).set(eng.headers).send({ status: 'in_progress' })).body.data.status).toBe('in_progress');

    const sub = (await api().post(`/api/engineer/tasks/${task._id}/subtasks`).set(eng.headers).send({ title: 'Form' })).body.data;
    expect((await api().patch(`/api/engineer/subtasks/${sub._id}/toggle`).set(eng.headers)).body.data.isDone).toBe(true);
    expect((await api().get(`/api/cto/internal/tasks/${task._id}/subtasks`).set(h)).body.count).toBe(1);

    const shot = await api().post(`/api/engineer/tasks/${task._id}/submission/images`).set(eng.headers).attach('images', png, 'done.png');
    const publicId = shot.body.data.images[0].publicId;
    expect((await api().patch(`/api/engineer/tasks/${task._id}/submission/links`).set(eng.headers).send({ links: ['http://insecure.com'] })).body.error.code).toBe('INVALID_LINKS');
    expect((await api().patch(`/api/engineer/tasks/${task._id}/submission/links`).set(eng.headers).send({ links: ['https://demo.app'], note: 'Ready' })).body.data).toMatchObject({ links: ['https://demo.app'], note: 'Ready' });
    expect((await api().delete(`/api/engineer/tasks/${task._id}/submission/images/${encodeURIComponent(publicId)}`).set(eng.headers)).body.message).toBe('Image deleted');

    const ext = (await api().post(`/api/engineer/tasks/${task._id}/extension-requests`).set(eng.headers).send({ reason: 'API late', proposedDate: '2030-02-01' })).body.data;
    expect((await api().post(`/api/engineer/tasks/${task._id}/extension-requests`).set(eng.headers).send({ reason: 'again', proposedDate: '2030-02-02' })).body.error.code).toBe('ALREADY_PENDING');
    const reviewed = await api().patch(`/api/cto/internal/extension-requests/${ext._id}/review`).set(h).send({ action: 'approved' });
    expect(reviewed.body).toMatchObject({ message: 'Request approved', data: { status: 'approved' } });
    expect((await api().patch(`/api/cto/internal/extension-requests/${ext._id}/review`).set(h).send({ action: 'rejected' })).body.error.code).toBe('ALREADY_REVIEWED');
    expect(new Date((await api().get(`/api/cto/internal/tasks/${task._id}`).set(h)).body.data.dueDate).toISOString().slice(0, 10)).toBe('2030-02-01');

    const done = await api().patch(`/api/engineer/tasks/${task._id}/status`).set(eng.headers).send({ status: 'done' });
    expect(done.body.data.completedAt).not.toBeNull();
    expect((await api().get('/api/engineer/tasks?completionFilter=today').set(eng.headers)).body.count).toBe(1);
    expect((await api().get('/api/engineer/projects').set(eng.headers)).body.data.find((p: { _id: string }) => p._id === project._id).myTaskCounts).toMatchObject({ total: 1, done: 1 });

    const analytics = (await api().get('/api/cto/internal/analytics').set(h)).body.data;
    expect(analytics.employeeScores[0]).toMatchObject({ _id: eng.user.id, thisMonthScore: 20, tasksThisMonth: 1 });
    expect(analytics.employeeOfMonth).toMatchObject({ _id: eng.user.id, isManual: false });
    await api().post('/api/cto/internal/analytics/employee-of-month').set(h).send({ userId: other.user.id });
    expect((await api().get('/api/cto/internal/analytics').set(h)).body.data.employeeOfMonth).toMatchObject({ _id: other.user.id, isManual: true });

    expect((await api().delete(`/api/cto/internal/tasks/${task._id}`).set(h)).body.error.code).toBe('TASK_NOT_DELETABLE');
  });
});

describe('client requests', () => {
  it('lets clients file requests with media that the CTO reviews', async () => {
    const project = (await api().post('/api/cto/internal/projects').set(cto.headers).send({ name: 'Shop', clients: [client.user.id] })).body.data;
    const stranger = await signIn(t, 'client');
    expect((await api().post('/api/client/tasks').set(stranger.headers).send({ projectId: project._id, title: 'x' })).body.error.code).toBe('NOT_LINKED');
    const req = (await api().post('/api/client/tasks').set(client.headers).send({ projectId: project._id, title: 'Add PayPal', clientUrgency: 'soon' })).body.data;
    expect(req).toMatchObject({ status: 'pending_review', source: 'client', clientUrgency: 'soon' });

    const media = await api().post(`/api/client/tasks/${req._id}/media`).set(client.headers).field('durationSeconds', '12').attach('file', mp4, 'demo.mp4');
    expect(media.status).toBe(201);
    expect(media.body.data).toMatchObject({ kind: 'video', durationSeconds: 12, url: expect.stringMatching(/^https:\/\/storage\.test\/signed\//) });
    expect((await api().get(`/api/cto/internal/tasks/${req._id}/client-media`).set(cto.headers)).body.data).toHaveLength(1);

    const counts = (await api().get('/api/client/projects').set(client.headers)).body.data[0].taskCounts;
    expect(counts).toMatchObject({ total: 1, pending_review: 1 });

    // Once approved, media is frozen.
    await api().put(`/api/cto/internal/tasks/${req._id}`).set(cto.headers).send({ status: 'todo' });
    expect((await api().delete(`/api/client/tasks/${req._id}/media/${media.body.data._id}`).set(client.headers)).body.error.code).toBe('NOT_PENDING');

    const second = (await api().post('/api/client/tasks').set(client.headers).send({ projectId: project._id, title: 'Dark mode' })).body.data;
    expect((await api().patch(`/api/cto/internal/tasks/${second._id}/decline`).set(cto.headers).send({})).body.error.code).toBe('REASON_REQUIRED');
    expect((await api().patch(`/api/cto/internal/tasks/${second._id}/decline`).set(cto.headers).send({ rejectedReason: 'Out of scope' })).body.data).toMatchObject({ status: 'declined', rejectedReason: 'Out of scope' });
    expect((await api().get(`/api/client/tasks/${second._id}`).set(stranger.headers)).status).toBe(404);
    expect((await api().get('/api/client/tasks').set(eng.headers)).status).toBe(403);
  });
});

describe('work hours', () => {
  it('clocks hourly staff in and out once at a time', async () => {
    expect((await api().post('/api/engineer/work/start').set(eng.headers)).body.message).toBe('Hour tracking is not enabled for your account');
    expect((await api().patch(`/api/cto/internal/work/staff/${eng.user.id}/hourly`).set(cto.headers).send({ isHourly: 'yes' })).body.message).toBe('isHourly must be a boolean');
    await api().patch(`/api/cto/internal/work/staff/${eng.user.id}/hourly`).set(cto.headers).send({ isHourly: true });

    expect((await api().post('/api/engineer/work/start').set(eng.headers)).status).toBe(201);
    expect((await api().post('/api/engineer/work/start').set(eng.headers)).body.message).toBe('You are already clocked in');
    expect((await api().get('/api/engineer/work/status').set(eng.headers)).body.data).toMatchObject({ isHourly: true, active: { clockOut: null } });
    const staff = (await api().get('/api/cto/internal/work/staff').set(cto.headers)).body.data;
    expect(staff.find((s: { _id: string }) => s._id === eng.user.id).workingSince).not.toBeNull();

    const stopped = await api().post('/api/engineer/work/stop').set(eng.headers);
    expect(stopped.body.data.durationMinutes).toBe(1);
    const sessionId = stopped.body.data._id;
    const edited = await api().put(`/api/cto/internal/work/sessions/${sessionId}`).set(cto.headers).send({ clockIn: '2030-01-01T08:00:00Z', clockOut: '2030-01-01T10:30:00Z' });
    expect(edited.body.data).toMatchObject({ durationMinutes: 150, user: { _id: eng.user.id } });
    expect((await api().put(`/api/cto/internal/work/sessions/${sessionId}`).set(cto.headers).send({ clockOut: '2029-01-01' })).body.message).toBe('Clock-out must be after clock-in');
    expect((await api().get('/api/cto/internal/work/sessions?from=2029-12-31').set(cto.headers)).body.count).toBe(1);

    expect((await api().delete(`/api/cto/internal/work/sessions/${sessionId}`).set(cto.headers)).body.data).toEqual({ _id: sessionId });

    // A shift left open for more than 12 hours closes itself at 12 hours.
    const open = (await api().post('/api/engineer/work/start').set(eng.headers)).body.data;
    await t.db.update(workSessions).set({ clockIn: new Date(Date.now() - 13 * 3600000) }).where(eq(workSessions.id, open._id));
    expect((await api().get('/api/engineer/work/status').set(eng.headers)).body.data.active).toBeNull();
    const mine = (await api().get('/api/engineer/work/sessions').set(eng.headers)).body.data;
    expect(mine.find((x: { _id: string }) => x._id === open._id)).toMatchObject({ autoClosed: true, durationMinutes: 720 });
  });
});
