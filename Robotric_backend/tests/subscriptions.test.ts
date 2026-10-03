import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { signIn } from './helpers/auth';
import { createTestApp, type TestContext } from './helpers/test-app';

let t: TestContext;
let rec: { headers: Record<string, string>; user: { id: string } };
let clo: Record<string, string>;
let planId: string;
const api = () => request(t.app);

const inDays = (d: number) => {
  const x = new Date();
  x.setDate(x.getDate() + d);
  return x;
};
const day = (d: number) => inDays(d).toISOString().slice(0, 10);

beforeAll(async () => {
  t = await createTestApp();
  rec = await signIn(t, 'reception');
  clo = (await signIn(t, 'clo')).headers;
  planId = (await api().post('/api/clo/subscription-plans').set(clo).send({ name: 'Ten hours', monthlyHours: 10, price: 100 })).body.data._id;
});
afterAll(async () => {
  await t.close();
});

async function subscribedStudent() {
  const s = await signIn(t, 'student');
  const res = await api()
    .post('/api/reception/user-subscriptions')
    .set(rec.headers)
    .send({ userId: s.user.id, planId, startsAt: inDays(-1).toISOString(), endsAt: inDays(30).toISOString() });
  return { ...s, subscriptionId: res.body.data._id as string, res };
}

describe('hour packages', () => {
  it('assigns a plan (with the plan hours), cancelling any running one, and validates input', async () => {
    const s = await subscribedStudent();
    expect(s.res.status).toBe(201);
    expect(s.res.body.data).toMatchObject({ remainingHours: 10, status: 'active', isCurrentlyActive: true, planId: { _id: planId, name: 'Ten hours' }, userId: { _id: s.user.id, role: 'student' } });

    const second = await api()
      .post('/api/reception/user-subscriptions')
      .set(rec.headers)
      .send({ userId: s.user.id, planId, startsAt: inDays(0).toISOString(), endsAt: inDays(60).toISOString() });
    expect(second.status).toBe(201);
    const list = await api().get(`/api/reception/user-subscriptions?userId=${s.user.id}`).set(rec.headers);
    expect(list.body.data.subscriptions.map((x: { status: string }) => x.status).sort()).toEqual(['active', 'canceled']);

    const teacher = (await signIn(t, 'trainer')).user.id;
    const notStudent = await api().post('/api/reception/user-subscriptions').set(rec.headers).send({ userId: teacher, planId, startsAt: day(0), endsAt: day(5) });
    expect(notStudent.body.message).toBe('Subscriptions can only be assigned to students');
    const backwards = await api().post('/api/reception/user-subscriptions').set(rec.headers).send({ userId: s.user.id, planId, startsAt: day(5), endsAt: day(1) });
    expect(backwards.body.message).toBe('End date must be after start date');
  });

  it('updates hours / end date and cancels once', async () => {
    const s = await subscribedStudent();
    const upd = await api().put(`/api/reception/user-subscriptions/${s.subscriptionId}`).set(rec.headers).send({ remainingHours: 4 });
    expect(upd.body.data.remainingHours).toBe(4);
    expect((await api().put(`/api/reception/user-subscriptions/${s.subscriptionId}`).set(rec.headers).send({ remainingHours: -1 })).body.message).toBe(
      'Remaining hours cannot be negative',
    );
    const c = await api().post(`/api/reception/user-subscriptions/${s.subscriptionId}/cancel`).set(rec.headers);
    expect(c.body.data.status).toBe('canceled');
    expect((await api().post(`/api/reception/user-subscriptions/${s.subscriptionId}/cancel`).set(rec.headers)).body.message).toBe('Subscription is already canceled');
  });

  it('shows the student their package, and blocks deleting a plan that is in use', async () => {
    const s = await subscribedStudent();
    const me = await api().get('/api/subscriptions/me').set(s.headers);
    expect(me.body.data).toMatchObject({ hasActiveSubscription: true, subscription: { remainingHours: 10, plan: { name: 'Ten hours' } } });
    const none = await api().get('/api/subscriptions/me').set((await signIn(t, 'student')).headers);
    expect(none.body.data).toEqual({ hasActiveSubscription: false, subscription: null });

    const plans = await api().get('/api/subscriptions/plans').set(s.headers);
    expect(plans.body.data.plans.some((p: { _id: string }) => p._id === planId)).toBe(true);

    const del = await api().delete(`/api/clo/subscription-plans/${planId}`).set(clo);
    expect(del.status).toBe(400);
    expect(del.body.message).toMatch(/^Cannot delete plan\. It is being used by \d+ active subscription\(s\)$/);
  });
});

describe('private session requests', () => {
  it('books within 11:00–19:00, rejects overlaps and missing hours, and requires a subscription', async () => {
    const s = await subscribedStudent();
    const book = (body: Record<string, unknown>) => api().post('/api/subscriptions/session-requests').set(s.headers).send(body);

    expect((await book({ date: day(3), startTime: '10:00', durationHours: 1 })).body.message).toBe('Start time must be between 11:00 and 19:00');
    expect((await book({ date: day(3), startTime: '18:30', durationHours: 1 })).body.message).toBe(
      'Session end time cannot exceed 19:00. Please reduce duration or choose an earlier start time.',
    );
    expect((await book({ date: day(3), startTime: '12:00', durationHours: 11 })).body.message).toBe('Insufficient hours. Available: 10, Requested: 11');

    const ok = await book({ date: day(3), startTime: '12:00', durationHours: 2, description: ' Arduino help ' });
    expect(ok.status).toBe(201);
    expect(ok.body.data).toMatchObject({ startTime: '12:00', durationHours: 2, description: 'Arduino help', status: 'pending' });

    expect((await book({ date: day(3), startTime: '13:00', durationHours: 1 })).body.error.code).toBe('SESSION_OVERLAP');
    expect((await book({ date: day(3), startTime: '14:00', durationHours: 1 })).status).toBe(201);

    const noSub = await api().post('/api/subscriptions/session-requests').set((await signIn(t, 'student')).headers).send({ date: day(3), startTime: '12:00', durationHours: 1 });
    expect(noSub.status).toBe(403);
    expect(noSub.body.message).toBe('Active subscription required to access this resource');

    const mine = await api().get('/api/subscriptions/my-requests').set(s.headers);
    expect(mine.body.data.requests).toHaveLength(2);
  });

  it('lets reception approve / decline, and a student cancel only before the session day', async () => {
    const s = await subscribedStudent();
    const r1 = (await api().post('/api/subscriptions/session-requests').set(s.headers).send({ date: day(5), startTime: '11:00', durationHours: 1 })).body.data._id;
    const r2 = (await api().post('/api/subscriptions/session-requests').set(s.headers).send({ date: day(6), startTime: '11:00', durationHours: 1 })).body.data._id;

    const pending = await api().get('/api/reception/session-requests?status=pending').set(rec.headers);
    expect(pending.body.data.requests.find((r: { _id: string }) => r._id === r1)).toMatchObject({ userId: { _id: s.user.id }, status: 'pending' });

    const ap = await api().post(`/api/reception/session-requests/${r1}/approve`).set(rec.headers);
    expect(ap.body.data.status).toBe('approved');
    expect((await api().post(`/api/reception/session-requests/${r1}/approve`).set(rec.headers)).body.message).toBe('Cannot approve request with status: approved');

    const de = await api().post(`/api/reception/session-requests/${r2}/decline`).set(rec.headers).send({ reason: ' Full day ' });
    expect(de.body.data).toMatchObject({ status: 'declined', declineReason: 'Full day' });

    const cancelled = await api().post(`/api/subscriptions/session-requests/${r1}/cancel`).set(s.headers);
    expect(cancelled.body.data.status).toBe('canceled');
    const other = await subscribedStudent();
    expect((await api().post(`/api/subscriptions/session-requests/${r2}/cancel`).set(other.headers)).status).toBe(403);
  });

  it('closes a session with a report: hours deducted, PDF stored, status completed — all together', async () => {
    const s = await subscribedStudent();
    const id = (await api().post('/api/subscriptions/session-requests').set(s.headers).send({ date: day(2), startTime: '15:00', durationHours: 3 })).body.data._id;

    const early = await api().post(`/api/reception/session-requests/${id}/report`).set(rec.headers).field('notes', 'x').field('attendance', 'true');
    expect(early.body.message).toBe('Cannot create report for session with status: pending. Session must be approved.');

    await api().post(`/api/reception/session-requests/${id}/approve`).set(rec.headers);
    const res = await api()
      .post(`/api/reception/session-requests/${id}/report`)
      .set(rec.headers)
      .field('notes', ' Great progress ')
      .field('attendance', 'true')
      .attach('pdf', Buffer.from('%PDF-1.4 r'), 'report.pdf');
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ notes: 'Great progress', attendance: true });
    expect(res.body.data.pdfUrl).toMatch(/^https:\/\/storage\.test\/signed\/.+\/session-reports\//);

    expect((await api().get('/api/subscriptions/me').set(s.headers)).body.data.subscription.remainingHours).toBe(7);
    const again = await api().post(`/api/reception/session-requests/${id}/report`).set(rec.headers).field('notes', 'x').field('attendance', 'false');
    expect(again.body.message).toBe('Cannot create report for session with status: completed. Session must be approved.');

    const mine = await api().get(`/api/subscriptions/session-requests/${id}/report`).set(s.headers);
    expect(mine.body.data).toMatchObject({ notes: 'Great progress', sessionRequest: { _id: id, status: 'completed' }, createdBy: { _id: rec.user.id } });
    expect((await api().get('/api/subscriptions/my-reports').set(s.headers)).body.data.reports).toHaveLength(1);
    const recReports = await api().get('/api/reception/session-reports').set(rec.headers);
    expect(recReports.body.data.reports.some((r: { sessionRequest: { userId: { _id: string } } }) => r.sessionRequest.userId._id === s.user.id)).toBe(true);
  });

  it('keeps everything unchanged when the hours have run out in the meantime', async () => {
    const s = await subscribedStudent();
    const id = (await api().post('/api/subscriptions/session-requests').set(s.headers).send({ date: day(2), startTime: '11:00', durationHours: 2 })).body.data._id;
    await api().post(`/api/reception/session-requests/${id}/approve`).set(rec.headers);
    await api().put(`/api/reception/user-subscriptions/${s.subscriptionId}`).set(rec.headers).send({ remainingHours: 1 });
    const filesBefore = t.storage.files.size;

    const res = await api()
      .post(`/api/reception/session-requests/${id}/report`)
      .set(rec.headers)
      .field('notes', 'n')
      .field('attendance', 'true')
      .attach('pdf', Buffer.from('%PDF-1.4 r'), 'r.pdf');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INSUFFICIENT_HOURS');
    expect(t.storage.files.size).toBe(filesBefore);
    const req = (await api().get('/api/subscriptions/my-requests').set(s.headers)).body.data.requests[0];
    expect(req.status).toBe('approved');
  });
});
