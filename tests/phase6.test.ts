import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { signIn } from './helpers/auth';
import { createTestApp, type TestContext } from './helpers/test-app';

let t: TestContext;
let admin: Record<string, string>;
let student: { headers: Record<string, string>; user: { id: string } };
const api = () => request(t.app);
const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');

beforeAll(async () => {
  t = await createTestApp();
  admin = (await signIn(t, 'admin')).headers;
  student = await signIn(t, 'student');
});
afterAll(async () => {
  await t.close();
});

describe('competitions, teams and judging', () => {
  it('limits judges to their competition and ranks teams', async () => {
    const organizer = (await signIn(t, 'organizer')).headers;
    expect((await api().post('/api/competitions/').set(organizer).send({ startDate: '2030-01-01', endDate: '2030-01-02' })).body.message).toBe('"title" is required');
    const wro = (await api().post('/api/competitions/').set(organizer).send({ title: 'WRO', startDate: '2030-01-01', endDate: '2030-01-02', maxTeams: 2 })).body;
    const fll = (await api().post('/api/competitions/').set(organizer).send({ title: 'FLL', startDate: '2030-02-01', endDate: '2030-02-02' })).body;
    expect(wro).toMatchObject({ title: 'WRO', maxTeams: 2 });
    expect((await api().post('/api/competitions/').set(student.headers).send({ title: 'X' })).status).toBe(403);

    const coach = await signIn(t, 'trainer');
    const a = (await api().post('/api/teams/').set(coach.headers).send({ competitionId: wro._id, name: 'Alpha', members: ['Ali'] })).body;
    const b = (await api().post('/api/teams/').set(coach.headers).send({ competitionId: wro._id, name: 'Beta' })).body;
    expect(a).toMatchObject({ name: 'Alpha', coachId: coach.user.id, members: ['Ali'] });
    expect((await api().post('/api/teams/').set(coach.headers).send({ competitionId: wro._id, name: 'Gamma' })).body.error.code).toBe('MAX_TEAMS_REACHED');
    expect((await api().put(`/api/teams/${a._id}`).set(student.headers).send({ name: 'Hijack' })).status).toBe(404);

    const judge = await signIn(t, 'judge');
    expect((await api().get('/api/competitions/').set(judge.headers)).body.message).toBe('No competition assigned');
    const superadmin = (await signIn(t, 'superadmin')).headers;
    await api().put(`/api/users/${judge.user.id}/assigned-competition`).set(superadmin).send({ competitionId: wro._id });

    expect((await api().get('/api/competitions/').set(judge.headers)).body.map((c: { _id: string }) => c._id)).toEqual([wro._id]);
    expect((await api().get('/api/teams/').set(judge.headers)).body).toHaveLength(2);
    expect((await api().get(`/api/competitions/${fll._id}/rankings`).set(judge.headers)).status).toBe(403);

    await api().post(`/api/competitions/${wro._id}/evaluations`).set(judge.headers).send({ teamId: a._id, scores: { speed: 7, design: '5' } });
    const second = await api().post(`/api/competitions/${wro._id}/evaluations`).set(judge.headers).send({ teamId: b._id, scores: { speed: 9, design: 6 }, comments: 'Great' });
    expect(second.body).toMatchObject({ totalScore: 15, comments: 'Great' });
    expect((await api().post(`/api/competitions/${wro._id}/evaluations`).set(judge.headers).send({ teamId: b._id, scores: {} })).body.error.code).toBe('ALREADY_EVALUATED');

    const ranks = await api().get(`/api/competitions/${wro._id}/rankings`).set(judge.headers);
    expect(ranks.body).toEqual([
      { teamId: b._id, teamName: 'Beta', total: 15, rank: 1 },
      { teamId: a._id, teamName: 'Alpha', total: 12, rank: 2 },
    ]);

    expect((await api().delete(`/api/competitions/${wro._id}`).set(organizer)).body.message).toBe('Competition deleted successfully');
    expect((await api().get(`/api/teams/${a._id}`).set(coach.headers)).status).toBe(404);
  });
});

describe('store: parts, stock and orders', () => {
  it('keeps available and reserved stock consistent through the order lifecycle', async () => {
    const part = (await api().post('/api/parts/').set(admin).send({ name: 'Servo', category: 'motors', sku: 'SV-1' })).body;
    expect((await api().post('/api/parts/').set(admin).send({ name: 'Brick', group: 'Lego' })).body.message).toBe('"partNumber" is required');
    expect((await api().post('/api/stock/adjust').set(admin).send({ partId: part._id, qtyChange: -1, reason: 'adjustment' })).body.error.code).toBe('INSUFFICIENT_STOCK');
    const stocked = await api().post('/api/stock/adjust').set(admin).send({ partId: part._id, qtyChange: 10, reason: 'purchase', notes: 'Invoice 7' });
    expect(stocked.body).toMatchObject({ availableQty: 10, partId: { _id: part._id, name: 'Servo' } });

    expect((await api().post('/api/orders/').set(student.headers).send({ items: [{ partId: part._id, qty: 11 }] })).body.error.code).toBe('INSUFFICIENT_STOCK');
    const order = (await api().post('/api/orders/').set(student.headers).send({ items: [{ partId: part._id, qty: 3 }, { partId: part._id, qty: 1 }] })).body;
    expect(order).toMatchObject({ status: 'pending', items: [{ partId: { _id: part._id }, qty: 4 }] });

    const level = async () => (await api().get(`/api/parts/${part._id}`)).body;
    expect(await level()).toMatchObject({ availableQty: 6, reservedQty: 4 });

    expect((await api().post(`/api/orders/${order._id}/approve`).set(student.headers)).status).toBe(403);
    expect((await api().post(`/api/orders/${order._id}/approve`).set(admin)).body.status).toBe('approved');
    expect((await api().post(`/api/orders/${order._id}/approve`).set(admin)).body.error.code).toBe('INVALID_ORDER_STATUS');
    expect((await api().post(`/api/orders/${order._id}/fulfill`).set(admin)).body.status).toBe('fulfilled');
    expect(await level()).toMatchObject({ availableQty: 6, reservedQty: 0 });
    expect((await api().post(`/api/orders/${order._id}/cancel`).set(student.headers)).body.error.code).toBe('INVALID_ORDER_STATUS');

    // Cancelling an open order returns the stock.
    const second = (await api().post('/api/orders/').set(student.headers).send({ items: [{ partId: part._id, qty: 2 }] })).body;
    const other = await signIn(t, 'student');
    expect((await api().post(`/api/orders/${second._id}/cancel`).set(other.headers)).status).toBe(403);
    expect((await api().post(`/api/orders/${second._id}/cancel`).set(student.headers)).body.status).toBe('cancelled');
    expect(await level()).toMatchObject({ availableQty: 6, reservedQty: 0 });

    expect((await api().get('/api/orders/').set(student.headers)).body).toHaveLength(2);
    expect((await api().get('/api/orders/').set(other.headers)).body).toHaveLength(0);

    expect((await api().get('/api/stock/stats').set(admin)).body).toEqual({ totalParts: 1, lowStock: 1, outOfStock: 0, totalValue: 60 });
    const history = (await api().get(`/api/stock/history?partId=${part._id}`).set(admin)).body;
    expect(history.map((h: { reason: string }) => h.reason).sort()).toEqual(['cancel', 'fulfill', 'purchase', 'reserve', 'reserve']);
    expect((await api().get('/api/stock/levels?search=serv').set(admin)).body).toMatchObject({ total: 1, items: [{ availableQty: 6, part: { name: 'Servo' } }] });

    expect((await api().delete(`/api/parts/${part._id}`).set(admin)).body.error.code).toBe('PART_IN_USE');
  });

  it('keeps build projects per owner', async () => {
    const mine = (await api().post('/api/projects/').set(student.headers).send({ title: 'Rover' })).body;
    expect(mine).toMatchObject({ title: 'Rover', ownerId: student.user.id, parts: [] });
    const other = await signIn(t, 'student');
    expect((await api().put(`/api/projects/${mine._id}`).set(other.headers).send({ title: 'x' })).status).toBe(404);
    expect((await api().put(`/api/projects/${mine._id}/parts`).set(student.headers).send({ parts: [{ partId: 'p1', qty: 2 }] })).body.parts).toEqual([{ partId: 'p1', qty: 2 }]);
    expect((await api().get('/api/projects/').set(admin)).body.length).toBeGreaterThanOrEqual(1);
  });
});

describe('images and posts', () => {
  it('stores images publicly and redirects to them', async () => {
    const part = (await api().post('/api/parts/').set(admin).send({ name: 'LED' })).body;
    const up = await api().post('/api/images/upload').set(admin).field('imageType', 'part').field('associatedId', part._id).field('associatedModel', 'Part').attach('image', png, 'led.png');
    expect(up.status).toBe(201);
    const byId = await api().get(`/api/images/${up.body.data._id}`);
    expect(byId.status).toBe(302);
    expect(byId.headers.location).toMatch(/^https:\/\/storage\.test\/images\/uploads\/part\//);
    expect((await api().get(`/api/images/by/part/${part._id}/thumbnail`)).status).toBe(302);
    expect((await api().get(`/api/parts/${part._id}`)).body.imageUrl).toBe(byId.headers.location);
    expect((await api().post('/api/images/upload').set(student.headers)).status).toBe(403);
  });

  it('publishes posts and keeps the first publish date', async () => {
    const editor = (await signIn(t, 'editor')).headers;
    const draft = (await api().post('/api/posts/').set(editor).send({ slug: 'hello', title: 'Hello', body: 'Hi' })).body;
    expect(draft).toMatchObject({ status: 'draft', publishedAt: null });
    expect((await api().post('/api/posts/').set(editor).send({ slug: 'hello', title: 'Dup', body: 'x' })).body.error.code).toBe('SLUG_TAKEN');
    expect((await api().get('/api/posts/slug/hello')).status).toBe(404);

    const published = (await api().put(`/api/posts/${draft._id}`).set(editor).send({ status: 'published' })).body;
    expect(published.publishedAt).not.toBeNull();
    const edited = (await api().put(`/api/posts/${draft._id}`).set(editor).send({ status: 'published', title: 'Hello again' })).body;
    expect(edited.publishedAt).toBe(published.publishedAt);

    expect((await api().get('/api/posts/')).body.map((p: { slug: string }) => p.slug)).toEqual(['hello']);
    expect((await api().get('/api/posts/slug/hello')).body.title).toBe('Hello again');
    expect((await api().post('/api/posts/').set(student.headers).send({})).status).toBe(403);
  });
});
