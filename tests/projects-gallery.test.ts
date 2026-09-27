import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parseGroupIds } from '../src/modules/gallery/gallery.service';
import { signIn } from './helpers/auth';
import { createTestApp, type TestContext } from './helpers/test-app';

let t: TestContext;
let clo: Record<string, string>;
let rec: Record<string, string>;
let trainer: { headers: Record<string, string>; user: { id: string } };
let s1: { headers: Record<string, string>; user: { id: string } };
let s2: { headers: Record<string, string>; user: { id: string } };
let courseId: string;
let groupId: string;
let otherGroupId: string;
const api = () => request(t.app);
const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');

beforeAll(async () => {
  t = await createTestApp();
  clo = (await signIn(t, 'clo')).headers;
  rec = (await signIn(t, 'reception')).headers;
  trainer = await signIn(t, 'trainer');
  const otherTrainer = await signIn(t, 'trainer');
  courseId = (await api().post('/api/clo/courses').set(clo).send({ title: 'Bots', category: 'x', description: 'd', price: 10 })).body.data._id;
  groupId = (await api().post('/api/clo/groups').set(clo).send({ name: 'G', courseId, trainerId: trainer.user.id, startDate: '2020-01-01', endDate: '2040-01-01' })).body.data._id;
  otherGroupId = (await api().post('/api/clo/groups').set(clo).send({ name: 'H', courseId, trainerId: otherTrainer.user.id, startDate: '2020-01-01', endDate: '2040-01-01' })).body.data._id;
  s1 = await signIn(t, 'student');
  s2 = await signIn(t, 'student');
  for (const s of [s1, s2]) await api().post('/api/reception/enrollments').set(rec).send({ studentId: s.user.id, courseId, groupId });
});
afterAll(async () => {
  await t.close();
});

describe('student projects', () => {
  it('lets the trainer create, illustrate, grade and delete projects; students see their group', async () => {
    const outsider = await signIn(t, 'student');
    expect((await api().post('/api/trainer/projects/').set(trainer.headers).send({ groupId, studentId: outsider.user.id, title: 'X' })).body.error.code).toBe('STUDENT_NOT_IN_GROUP');
    expect((await api().post('/api/trainer/projects/').set(trainer.headers).send({ groupId: otherGroupId, studentId: s1.user.id, title: 'X' })).body.error.code).toBe('GROUP_OWNERSHIP_REQUIRED');

    const created = await api()
      .post('/api/trainer/projects/')
      .set(trainer.headers)
      .send({ groupId, studentId: s1.user.id, title: 'Line follower', components: ['IR sensor'], technologies: ['Arduino'] });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ title: 'Line follower', studentId: s1.user.id, ownerId: s1.user.id, courseId, status: 'in_progress', images: [] });
    const id = created.body.data._id;

    const up = await api().post(`/api/trainer/projects/${id}/images`).set(trainer.headers).attach('images', png, 'a.png').attach('images', png, 'b.png');
    expect(up.status).toBe(201);
    expect(up.body.data.uploadedImages).toHaveLength(2);
    expect(up.body.data.uploadedImages[1]).toMatchObject({ order: 1, cloudinaryUrl: expect.stringMatching(/^https:\/\/storage\.test\/signed\/.+\/projects\//) });

    const removed = await api().delete(`/api/trainer/projects/${id}/images/0`).set(trainer.headers);
    expect(removed.body.data.images).toHaveLength(1);
    expect(removed.body.data.images[0].order).toBe(0);
    expect((await api().delete(`/api/trainer/projects/${id}/images/5`).set(trainer.headers)).body.error.code).toBe('INVALID_IMAGE_INDEX');

    expect((await api().patch(`/api/trainer/projects/${id}/status`).set(trainer.headers).send({ status: 'done' })).body.error.code).toBe('INVALID_STATUS');
    expect((await api().patch(`/api/trainer/projects/${id}/status`).set(trainer.headers).send({ status: 'completed' })).body.data.status).toBe('completed');
    expect((await api().post(`/api/trainer/projects/${id}/grade`).set(trainer.headers).send({ grade: -1 })).body.message).toBe('Grade cannot be negative');
    const graded = await api().post(`/api/trainer/projects/${id}/grade`).set(trainer.headers).send({ grade: 92, feedback: 'Neat' });
    expect(graded.body.data).toMatchObject({ grade: 92, feedback: 'Neat', gradedBy: trainer.user.id });

    // Group-mates can see it; outsiders cannot.
    const list = await api().get('/api/student/projects/').set(s2.headers);
    expect(list.body).toMatchObject({ count: 1, pagination: { total: 1, totalPages: 1 } });
    expect(list.body.data[0]).toMatchObject({ studentId: { _id: s1.user.id }, groupId: { _id: groupId, name: 'G' }, courseId: { title: 'Bots' } });
    expect((await api().get('/api/student/projects/?myProjectsOnly=true').set(s2.headers)).body.count).toBe(0);
    expect((await api().get(`/api/student/projects/${id}`).set(outsider.headers)).body.error.code).toBe('PROJECT_ACCESS_DENIED');
    expect((await api().get(`/api/clo/projects/${id}`).set(clo)).body.data.gradedBy).toMatchObject({ _id: trainer.user.id });

    const files = t.storage.files.size;
    const del = await api().delete(`/api/trainer/projects/${id}`).set(trainer.headers);
    expect(del.body).toMatchObject({ message: 'Project deleted successfully', deletedImagesCount: 1 });
    expect(t.storage.files.size).toBe(files - 1);
  });
});

describe('gallery', () => {
  it('parses reception group lists in every old format', () => {
    expect(parseGroupIds({ groupIds: ['a', 'b', 'a'] })).toEqual(['a', 'b']);
    expect(parseGroupIds({ groupIds: '["a","b"]' })).toEqual(['a', 'b']);
    expect(parseGroupIds({ groupIds: 'a, b' })).toEqual(['a', 'b']);
    expect(parseGroupIds({ groupId: 'a' })).toEqual(['a']);
  });

  it('shares one reception photo across groups and removes the file with the last copy', async () => {
    const moment = await api().post('/api/reception/gallery/moments').set(rec).field('groupIds', JSON.stringify([groupId, otherGroupId])).field('title', 'Opening day').attach('image', png, 'x.png');
    expect(moment.status).toBe(201);
    expect(moment.body.data).toHaveLength(2);
    const [first, second] = moment.body.data;
    expect(first.cloudinaryPublicId).toBe(second.cloudinaryPublicId);
    expect(first.thumbnailUrl).toBe(first.cloudinaryUrl);

    const trainerMoment = await api().post('/api/trainer/gallery/moments').set(trainer.headers).field('groupId', groupId).attach('image', png, 'y.png');
    expect(trainerMoment.status).toBe(201);
    expect((await api().post('/api/trainer/gallery/moments').set(trainer.headers).field('groupId', otherGroupId).attach('image', png, 'y.png')).body.error.code).toBe(
      'GROUP_OWNERSHIP_REQUIRED',
    );

    const mine = await api().get('/api/student/gallery/').set(s1.headers);
    expect(mine.body.pagination.total).toBe(2);
    expect(mine.body.data[0].groupId).toMatchObject({ _id: groupId, name: 'G' });
    const outsider = await signIn(t, 'student');
    expect((await api().get(`/api/student/gallery/${first._id}`).set(outsider.headers)).body.error.code).toBe('NOT_GROUP_MEMBER');

    expect((await api().get(`/api/clo/gallery/?groupId=${otherGroupId}`).set(clo)).body.pagination.total).toBe(1);
    expect((await api().get('/api/reception/gallery/groups').set(rec)).body.count).toBe(2);

    // The trainer cannot delete reception's photo (403); reception deletes both copies.
    expect((await api().delete(`/api/trainer/gallery/${first._id}`).set(trainer.headers)).status).toBe(403);
    const files = t.storage.files.size;
    await api().delete(`/api/reception/gallery/${first._id}`).set(rec);
    expect(t.storage.files.size).toBe(files);
    await api().delete(`/api/reception/gallery/${second._id}`).set(rec);
    expect(t.storage.files.size).toBe(files - 1);
  });
});
