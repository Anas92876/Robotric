import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { signIn } from './helpers/auth';
import { createTestApp, type TestContext } from './helpers/test-app';

let t: TestContext;
let clo: Record<string, string>;
let trainer: { headers: Record<string, string>; user: { id: string } };
let student: { headers: Record<string, string>; user: { id: string } };
let courseId: string;
let groupId: string;
let sessionIds: string[];
const api = () => request(t.app);
const pdf = Buffer.from('%PDF-1.4\n%fake\n', 'latin1');

beforeAll(async () => {
  t = await createTestApp();
  clo = (await signIn(t, 'clo')).headers;
  const rec = (await signIn(t, 'reception')).headers;
  trainer = await signIn(t, 'trainer');
  student = await signIn(t, 'student');
  courseId = (await api().post('/api/clo/courses').set(clo).send({ title: 'Bots', category: 'x', description: 'd', price: 10 })).body.data._id;
  groupId = (await api().post('/api/clo/groups').set(clo).send({ name: 'G', courseId, trainerId: trainer.user.id, startDate: '2020-01-01', endDate: '2040-01-01' })).body.data._id;
  await api().post('/api/reception/enrollments').set(rec).send({ studentId: student.user.id, courseId, groupId });
  sessionIds = [];
  for (const day of ['2030-01-07', '2030-01-14']) {
    const s = await api().post('/api/clo/sessions/').set(clo).send({ title: `S ${day}`, groupId, overrideSchedule: true, scheduledDate: day, startTime: '10:00', endTime: '11:00' });
    sessionIds.push(s.body.data._id);
  }
});
afterAll(async () => {
  await t.close();
});

async function upload(title = 'Wiring guide') {
  return api().post('/api/clo/resources/upload').set(clo).field('title', title).field('courseId', courseId).attach('pdf', pdf, 'Guide.pdf');
}

describe('CLO resources', () => {
  it('uploads, assigns, lists, renames and soft/hard deletes', async () => {
    expect((await upload('ab')).body.message).toBe('Title must be at least 3 characters');
    const up = await upload();
    expect(up.status).toBe(201);
    const id = up.body.data._id;
    expect(up.body.data).toMatchObject({ title: 'Wiring guide', courseId: { _id: courseId, title: 'Bots' }, status: 'active', storageProvider: 'supabase' });
    expect(up.body.data.fileUrl).toMatch(new RegExp(`^resources/${courseId}/\\d+-guide\\.pdf$`));

    const bad = await api().post(`/api/clo/resources/${id}/assign`).set(clo).send({ assignments: [{ groupId, sessionIds: ['nope'] }] });
    expect(bad.status).toBe(400);
    const assigned = await api()
      .post(`/api/clo/resources/${id}/assign`)
      .set(clo)
      .send({ assignments: [{ groupId, sessionIds: [...sessionIds, 'nope'] }] });
    expect(assigned.status).toBe(201);
    expect(assigned.body).toMatchObject({ message: 'Resource assigned to 1 group(s), 2 session(s)', data: { assignmentsCreated: 2, validationErrors: ['Invalid session ID: nope'] } });
    // Assigning again adds nothing.
    const again = await api().post(`/api/clo/resources/${id}/assign`).set(clo).send({ assignments: [{ groupId, sessionIds }] });
    expect(again.body.data.assignmentsCreated).toBe(0);

    const list = await api().get(`/api/clo/resources?courseId=${courseId}`).set(clo);
    expect(list.body.data[0].assignments).toMatchObject({ groupCount: 1, sessionCount: 2, details: [{ groupId, groupName: 'G' }] });

    // Trainers may read the list and assignments, but not upload.
    const byTrainer = await api().get(`/api/clo/resources/${id}/assignments`).set(trainer.headers);
    expect(byTrainer.body.data).toMatchObject({ resourceTitle: 'Wiring guide', totalGroups: 1, totalSessions: 2, assignments: [{ groupId, studentsCount: 1 }] });
    expect((await api().post('/api/clo/resources/upload').set(trainer.headers)).status).toBe(403);
    expect((await api().get('/api/clo/resources').set(student.headers)).status).toBe(403);

    const replaced = await api().put(`/api/clo/resources/${id}/assignments`).set(clo).send({ groupId, sessionIds: [sessionIds[0]] });
    expect(replaced.body.message).toBe('Assignments updated: 1 sessions');
    const one = (await api().get(`/api/clo/resources/${id}/assignments`).set(clo)).body.data.assignments[0].sessions[0];
    expect((await api().delete(`/api/clo/resources/${id}/assignments/${one.assignmentId}`).set(clo)).body.message).toBe('Assignment removed successfully');

    expect((await api().put(`/api/clo/resources/${id}`).set(clo).send({ title: ' New name ' })).body.data.title).toBe('New name');
    expect((await api().get(`/api/clo/resources/${id}/viewer`).set(clo)).body.data).toMatchObject({ expiresIn: 3600, filename: 'Guide.pdf' });

    expect((await api().delete(`/api/clo/resources/${id}`).set(clo)).body.message).toBe('Resource archived (soft deleted)');
    expect((await api().get('/api/clo/resources?status=deleted').set(clo)).body.count).toBe(1);
    const files = t.storage.files.size;
    expect((await api().delete(`/api/clo/resources/${id}?permanent=true`).set(clo)).body.message).toBe('Resource permanently deleted');
    expect(t.storage.files.size).toBe(files - 1);
  });
});

describe('student and trainer access', () => {
  it('lists session materials and serves the PDF once through a one-time token', async () => {
    const id = (await upload('Motor sheet')).body.data._id;
    const outsider = await signIn(t, 'student');

    // Not assigned yet.
    expect((await api().get(`/api/student/resources/${id}/viewer`).set(student.headers)).body.message).toBe('Access denied: Resource not assigned to your group');
    await api().post(`/api/clo/resources/${id}/assign`).set(clo).send({ assignments: [{ groupId, sessionIds: [sessionIds[1]] }] });

    const materials = await api().get(`/api/student/resources/sessions/${sessionIds[1]}/materials`).set(student.headers);
    expect(materials.body).toMatchObject({ count: 1, data: [{ id, title: 'Motor sheet', viewerUrl: `/api/student/resources/${id}/viewer` }] });
    expect((await api().get(`/api/student/resources/sessions/${sessionIds[1]}/materials`).set(outsider.headers)).status).toBe(403);

    const view = await api().get(`/api/student/resources/${id}/viewer`).set(student.headers);
    expect(view.body.data.expiresIn).toBe(60);
    const url: string = view.body.data.viewerUrl;
    expect(url).toMatch(new RegExp(`^/api/student/resources/${id}/download\\?token=[a-f0-9]{64}$`));

    // Another user cannot use the token (and it is burnt by the attempt).
    const stolen = await api().get(url).set(outsider.headers);
    expect(stolen.body.message).toBe('Access denied: Token user mismatch');

    const fresh = (await api().get(`/api/student/resources/${id}/viewer`).set(student.headers)).body.data.viewerUrl;
    const file = await api().get(fresh).set(student.headers).buffer(true);
    expect(file.status).toBe(200);
    expect(file.headers['content-type']).toBe('application/pdf');
    expect(Buffer.from(file.body).toString('latin1')).toContain('%PDF');
    expect((await api().get(fresh).set(student.headers)).body.message).toBe('Access denied: Invalid or expired token');

    const mobile = await api().get(`/api/student/resources/${id}/viewer`).set(student.headers).set('x-platform', 'mobile');
    expect(mobile.body.data).toMatchObject({ expiresIn: 3600 });
    expect(mobile.body.data.viewerUrl).toMatch(/^https:\/\/storage\.test\/signed\//);

    const mine = await api().get('/api/trainer/resources/').set(trainer.headers);
    expect(mine.body.data.find((r: { _id: string }) => r._id === id)).toMatchObject({ assignedTo: [{ groupId, groupName: 'G', courseName: 'Bots', sessions: [{ sessionId: sessionIds[1] }] }] });
    expect((await api().get('/api/trainer/resources/groups').set(trainer.headers)).body.data).toEqual([{ _id: groupId, name: 'G', courseId: { _id: courseId, title: 'Bots', category: 'x' } }]);
  });
});
