import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { signIn } from './helpers/auth';
import { createTestApp, type TestContext } from './helpers/test-app';

let t: TestContext;
let clo: Record<string, string>;
let trainer: { headers: Record<string, string>; user: { id: string } };
let otherTrainer: { headers: Record<string, string>; user: { id: string } };
let courseId: string;

const api = () => request(t.app);
const dates = { startDate: '2030-01-01', endDate: '2030-06-01' };

beforeAll(async () => {
  t = await createTestApp();
  clo = (await signIn(t, 'clo')).headers;
  trainer = await signIn(t, 'trainer');
  otherTrainer = await signIn(t, 'trainer');
  courseId = (await api().post('/api/clo/courses').set(clo).send({ title: 'Robotics', category: 'r', description: 'd', price: 100, status: 'published' })).body.data._id;
  await api().put(`/api/clo/courses/${courseId}`).set(clo).send({ status: 'published' });
});
afterAll(async () => {
  await t.close();
});

const newGroup = async (body: Record<string, unknown> = {}) =>
  (await api().post('/api/clo/groups').set(clo).send({ name: 'G1', courseId, trainerId: trainer.user.id, ...dates, ...body })).body.data;

describe('CLO groups', () => {
  it('creates a group with the old document shape (incl. virtuals)', async () => {
    const res = await api()
      .post('/api/clo/groups')
      .set(clo)
      .send({ name: 'Saturday Bots', courseId, trainerId: trainer.user.id, ...dates, schedule: [{ day: 'Saturday', startTime: '10:00', endTime: '12:00' }] });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      name: 'Saturday Bots',
      status: 'active',
      maxStudents: 30,
      color: '#30c59b',
      students: [],
      courseId: { _id: courseId, title: 'Robotics' },
      trainerId: { _id: trainer.user.id, name: 'A trainer' },
      isFull: false,
      enrolledCount: 0,
      availableSeats: 30,
    });
    expect(res.body.data.schedule[0]._id).toMatch(/^[a-f0-9]{24}$/);
    expect(res.body.data.id).toBe(res.body.data._id);
  });

  it('validates required fields, trainer role, bundle courses, dates and schedule times', async () => {
    const missing = await api().post('/api/clo/groups').set(clo).send({ name: 'X' });
    expect(missing.body.message).toBe('Name, course, and trainer are required');

    const notTrainer = await api().post('/api/clo/groups').set(clo).send({ name: 'X', courseId, trainerId: (await signIn(t, 'student')).user.id, ...dates });
    expect(notTrainer.status).toBe(404);
    expect(notTrainer.body.message).toBe('Trainer not found');

    const bundle = (await api().post('/api/clo/courses').set(clo).send({ title: 'B', category: 'b', description: 'd', type: 'bundle', bundlePrice: 1 })).body.data;
    const underBundle = await api().post('/api/clo/groups').set(clo).send({ name: 'X', courseId: bundle._id, trainerId: trainer.user.id, ...dates });
    expect(underBundle.body.message).toBe('Cannot create a group directly under a bundle course. Select one of its sub-courses instead.');

    const backwards = await api().post('/api/clo/groups').set(clo).send({ name: 'X', courseId, trainerId: trainer.user.id, startDate: '2030-06-01', endDate: '2030-01-01' });
    expect(backwards.body.message).toBe('End date must be after start date');

    const badSlot = await api()
      .post('/api/clo/groups')
      .set(clo)
      .send({ name: 'X', courseId, trainerId: trainer.user.id, ...dates, schedule: [{ day: 'Monday', startTime: '12:00', endTime: '10:00' }] });
    expect(badSlot.body.message).toBe('Invalid schedule times for Monday: End time (10:00) must be after start time (12:00)');
  });

  it('adds students up to capacity (the old code never checked), removes them, and blocks deleting a non-empty group', async () => {
    const g = await newGroup({ maxStudents: 1 });
    const s1 = (await signIn(t, 'student')).user.id;
    const s2 = (await signIn(t, 'student')).user.id;

    const add = await api().post(`/api/clo/groups/${g._id}/students`).set(clo).send({ studentId: s1 });
    expect(add.body.message).toBe('Student added to group successfully');
    expect(add.body.data.students).toEqual([{ _id: s1, name: 'A student', email: expect.any(String) }]);

    const again = await api().post(`/api/clo/groups/${g._id}/students`).set(clo).send({ studentId: s1 });
    expect(again.body.message).toBe('Student is already in this group');
    const full = await api().post(`/api/clo/groups/${g._id}/students`).set(clo).send({ studentId: s2 });
    expect(full.body.message).toBe('Group has reached maximum capacity');

    const del = await api().delete(`/api/clo/groups/${g._id}`).set(clo);
    expect(del.body.message).toBe('Cannot delete a group with enrolled students. Close the group instead to preserve student records.');

    const list = await api().get(`/api/clo/groups?courseId=${courseId}`).set(clo);
    const listed = list.body.data.find((x: { _id: string }) => x._id === g._id);
    expect(listed.stats).toEqual({ studentsCount: 1, enrollments: 1, avgAttendance: 0 });

    const students = await api().get(`/api/clo/groups/${g._id}/students`).set(clo);
    expect(students.body.data[0]).toMatchObject({ _id: s1, attendance: { rate: 0, total: 0 }, enrollment: null });

    await api().delete(`/api/clo/groups/${g._id}/students/${s1}`).set(clo).expect(200);
    const notIn = await api().delete(`/api/clo/groups/${g._id}/students/${s1}`).set(clo);
    expect(notIn.body.message).toBe('Student is not in this group');
    expect((await api().delete(`/api/clo/groups/${g._id}`).set(clo)).body.message).toBe('Group and all related data deleted successfully');
  });

  it('closes/reopens, reassigns the trainer and toggles the board', async () => {
    const g = await newGroup();
    const closed = await api().put(`/api/clo/groups/${g._id}/status`).set(clo).send({ action: 'close' });
    expect(closed.body.data).toEqual({ _id: g._id, name: 'G1', status: 'completed' });
    expect((await api().put(`/api/clo/groups/${g._id}/status`).set(clo).send({ action: 'reopen' })).body.data.status).toBe('active');

    const assigned = await api().post(`/api/clo/groups/${g._id}/assign-trainer`).set(clo).send({ trainerId: otherTrainer.user.id });
    expect(assigned.body.data).toMatchObject({ courseId, trainerId: { _id: otherTrainer.user.id } });

    const board = await api().patch(`/api/clo/groups/${g._id}/board`).set(clo);
    expect(board.body).toEqual({ success: true, data: { boardEnabled: true }, message: 'Board enabled' });

    const details = await api().get(`/api/clo/groups/${g._id}`).set(clo);
    expect(details.body.data).toMatchObject({ boardEnabled: true, enrollments: [], recentAttendance: [], stats: { studentsCount: 0, enrollmentsCount: 0 } });
  });
});

describe('trainer groups', () => {
  it('lists, reads and manages only the trainer’s own groups', async () => {
    const mine = await newGroup({ name: 'Mine' });
    const theirs = await newGroup({ name: 'Theirs', trainerId: otherTrainer.user.id });

    const list = await api().get('/api/trainer/groups/').set(trainer.headers);
    const names = list.body.data.map((g: { name: string }) => g.name);
    expect(names).toContain('Mine');
    expect(names).not.toContain('Theirs');
    expect(list.body.count).toBe(list.body.data.length);

    expect((await api().get(`/api/trainer/groups/${theirs._id}`).set(trainer.headers)).status).toBe(404);

    const got = await api().get(`/api/trainer/groups/${mine._id}`).set(trainer.headers);
    expect(got.body.data).toMatchObject({ sessionStats: { total: 0, completed: 0, upcoming: 0 }, nextSession: null, progress: { percentageComplete: 0 } });

    const student = (await signIn(t, 'student')).user.id;
    const bad = await api().post(`/api/trainer/groups/${mine._id}/students`).set(trainer.headers).send({ studentId: trainer.user.id });
    expect(bad.body.message).toBe('Valid student not found');
    const added = await api().post(`/api/trainer/groups/${mine._id}/students`).set(trainer.headers).send({ studentId: student });
    expect(added.body.data.students).toHaveLength(1);

    const stats = await api().get(`/api/trainer/groups/${mine._id}/stats`).set(trainer.headers);
    expect(stats.body.data.students).toEqual({ enrolled: 1, capacity: 30, utilizationRate: 3 });

    const students = await api().get(`/api/trainer/groups/${mine._id}/students`).set(trainer.headers);
    expect(students.body.data[0]).toMatchObject({ _id: student, attendance: { percentage: 0 } });

    const removed = await api().delete(`/api/trainer/groups/${mine._id}/students/${student}`).set(trainer.headers);
    expect(removed.body.data.students).toEqual([]);

    const courses = await api().get('/api/trainer/groups/courses/all').set(trainer.headers);
    expect(courses.body.data.some((c: { _id: string }) => c._id === courseId)).toBe(true);
  });
});
