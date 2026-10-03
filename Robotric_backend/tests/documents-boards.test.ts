import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { signIn } from './helpers/auth';
import { createTestApp, type TestContext } from './helpers/test-app';

let t: TestContext;
let clo: Record<string, string>;
let trainer: { headers: Record<string, string>; user: { id: string } };
let s1: { headers: Record<string, string>; user: { id: string } };
let s2: { headers: Record<string, string>; user: { id: string } };
let groupId: string;
const api = () => request(t.app);
const pdf = Buffer.from('%PDF-1.4\n%fake\n', 'latin1');

beforeAll(async () => {
  t = await createTestApp();
  clo = (await signIn(t, 'clo')).headers;
  const rec = (await signIn(t, 'reception')).headers;
  trainer = await signIn(t, 'trainer');
  const courseId = (await api().post('/api/clo/courses').set(clo).send({ title: 'WRO', category: 'x', description: 'd', price: 10, wroDocumentsRequired: true })).body.data._id;
  groupId = (await api().post('/api/clo/groups').set(clo).send({ name: 'G', courseId, trainerId: trainer.user.id, startDate: '2020-01-01', endDate: '2040-01-01' })).body.data._id;
  s1 = await signIn(t, 'student');
  s2 = await signIn(t, 'student');
  for (const s of [s1, s2]) await api().post('/api/reception/enrollments').set(rec).send({ studentId: s.user.id, courseId, groupId });
});
afterAll(async () => {
  await t.close();
});

describe('WRO documents', () => {
  it('uploads privately, replaces by type, and is reviewed by the CLO', async () => {
    const outsider = await signIn(t, 'student');
    expect((await api().post('/api/student/documents/').set(outsider.headers).field('documentType', 'national_id').attach('document', pdf, 'id.pdf')).body.message).toBe(
      'WRO document submission is not required for your course',
    );
    expect((await api().post('/api/student/documents/').set(s1.headers).field('documentType', 'passport').attach('document', pdf, 'id.pdf')).body.message).toMatch(/^Invalid document type/);

    const first = await api().post('/api/student/documents/').set(s1.headers).field('documentType', 'national_id').attach('document', pdf, 'id.pdf');
    expect(first.status).toBe(201);
    expect(first.body.data).toMatchObject({ documentType: 'national_id', verificationStatus: 'pending', fileUrl: expect.stringMatching(/^https:\/\/storage\.test\/signed\//) });
    const files = t.storage.files.size;
    const second = await api().post('/api/student/documents/').set(s1.headers).field('documentType', 'national_id').attach('document', pdf, 'id2.pdf');
    expect(t.storage.files.size).toBe(files); // the old file was removed

    const mine = await api().get('/api/student/documents/').set(s1.headers);
    expect(mine.body).toMatchObject({ wroRequired: true, data: [{ _id: second.body.data._id, originalName: 'id2.pdf' }] });

    const summary = await api().get('/api/clo/documents/students-summary').set(clo);
    expect(summary.body.data).toEqual([{ _id: s1.user.id, total: 1, pending: 1, verified: 0, rejected: 0, student: { name: expect.any(String), email: expect.any(String) } }]);

    const reviewed = await api().patch(`/api/clo/documents/${second.body.data._id}/status`).set(clo).send({ verificationStatus: 'verified', verificationNote: 'OK' });
    expect(reviewed.body.data).toMatchObject({ verificationStatus: 'verified', verificationNote: 'OK', verifiedBy: { name: expect.any(String) }, studentId: { _id: s1.user.id } });
    expect((await api().delete(`/api/student/documents/${second.body.data._id}`).set(s1.headers)).body.message).toBe('Only pending documents can be deleted');
    expect((await api().get(`/api/clo/documents/${second.body.data._id}/download`).set(clo)).body.url).toMatch(/^https:\/\/storage\.test\/signed\//);

    // Admins were refused here before, and still are.
    const admin = await signIn(t, 'admin');
    expect((await api().get('/api/clo/documents/').set(admin.headers)).body.message).toBe('Access denied');
    expect((await api().get('/api/clo/documents/?status=verified').set(clo)).body.pagination.total).toBe(1);
  });
});

describe('group boards', () => {
  it('needs the board enabled, then shares notes and trainer tasks', async () => {
    expect((await api().get(`/api/student/board/${groupId}`).set(s1.headers)).body.error.code).toBe('BOARD_NOT_ENABLED');
    await api().patch(`/api/clo/groups/${groupId}/board`).set(clo);

    const note = await api().post(`/api/student/board/${groupId}/notes`).set(s1.headers).send({ content: ' Bring batteries ' });
    expect(note.status).toBe(201);
    expect(note.body.data).toMatchObject({ content: 'Bring batteries', isPinned: false, author: { _id: s1.user.id } });

    // Students cannot pin or edit others' notes; the trainer can.
    expect((await api().patch(`/api/student/board/${groupId}/notes/${note.body.data._id}`).set(s2.headers).send({ content: 'x' })).body.message).toBe('You can only edit your own notes');
    expect((await api().patch(`/api/student/board/${groupId}/notes/${note.body.data._id}`).set(s1.headers).send({ isPinned: true })).body.data.isPinned).toBe(false);
    expect((await api().patch(`/api/trainer/board/${groupId}/notes/${note.body.data._id}`).set(trainer.headers).send({ isPinned: true })).body.data.isPinned).toBe(true);

    const outsider = await signIn(t, 'student');
    expect((await api().post(`/api/trainer/board/${groupId}/tasks`).set(trainer.headers).send({ title: 'Wire it', assignedTo: [outsider.user.id] })).body.error.code).toBe('USER_NOT_IN_GROUP');
    const low = await api().post(`/api/trainer/board/${groupId}/tasks`).set(trainer.headers).send({ title: 'Tidy up' });
    const task = await api().post(`/api/trainer/board/${groupId}/tasks`).set(trainer.headers).send({ title: 'Wire it', priority: 1, assignedTo: [s1.user.id] });
    expect(task.body.data).toMatchObject({ priority: 1, status: 'todo', assignedTo: [{ _id: s1.user.id }], createdBy: { _id: trainer.user.id } });

    expect((await api().patch(`/api/student/board/${groupId}/tasks/${task.body.data._id}/status`).set(s2.headers).send({ status: 'done' })).body.error.code).toBe('NOT_ASSIGNED');
    expect((await api().patch(`/api/student/board/${groupId}/tasks/${task.body.data._id}/status`).set(s1.headers).send({ status: 'finished' })).body.error.code).toBe('INVALID_STATUS');
    expect((await api().patch(`/api/student/board/${groupId}/tasks/${task.body.data._id}/status`).set(s1.headers).send({ status: 'done' })).body.data.status).toBe('done');

    const board = await api().get(`/api/trainer/board/${groupId}`).set(trainer.headers);
    expect(board.body.data.group).toMatchObject({ _id: groupId, boardEnabled: true, students: expect.arrayContaining([s1.user.id, s2.user.id]) });
    expect(board.body.data.tasks.map((x: { _id: string }) => x._id)).toEqual([task.body.data._id, low.body.data._id]);
    expect(board.body.data.notes[0].isPinned).toBe(true);

    expect((await api().get(`/api/student/board/${groupId}`).set(outsider.headers)).body.error.code).toBe('GROUP_MEMBERSHIP_REQUIRED');
    const other = await signIn(t, 'trainer');
    expect((await api().get(`/api/trainer/board/${groupId}`).set(other.headers)).body.error.code).toBe('GROUP_OWNERSHIP_REQUIRED');
    expect((await api().delete(`/api/trainer/board/${groupId}/tasks/${low.body.data._id}`).set(trainer.headers)).body.message).toBe('Task deleted');
  });
});
