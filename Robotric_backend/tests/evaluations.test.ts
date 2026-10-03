import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { autoFlags, performanceScore } from '../src/modules/evaluations/evaluation-score';
import type { StudentEvaluationRow } from '../src/modules/evaluations/evaluations.table';
import { signIn } from './helpers/auth';
import { createTestApp, type TestContext } from './helpers/test-app';

let t: TestContext;
let clo: Record<string, string>;
let trainer: { headers: Record<string, string>; user: { id: string } };
let students: { headers: Record<string, string>; user: { id: string } }[];
let courseId: string;
let groupId: string;
let sessionId: string;
const api = () => request(t.app);

beforeAll(async () => {
  t = await createTestApp();
  clo = (await signIn(t, 'clo')).headers;
  const rec = (await signIn(t, 'reception')).headers;
  trainer = await signIn(t, 'trainer');
  courseId = (await api().post('/api/clo/courses').set(clo).send({ title: 'Bots', category: 'x', description: 'd', price: 10 })).body.data._id;
  groupId = (await api().post('/api/clo/groups').set(clo).send({ name: 'G', courseId, trainerId: trainer.user.id, startDate: '2020-01-01', endDate: '2040-01-01' })).body.data._id;
  students = [];
  for (let i = 0; i < 3; i++) {
    const s = await signIn(t, 'student');
    await api().post('/api/reception/enrollments').set(rec).send({ studentId: s.user.id, courseId, groupId });
    students.push(s);
  }
  sessionId = (await api().post('/api/clo/sessions/').set(clo).send({ title: 'Motors', groupId, overrideSchedule: true, scheduledDate: '2030-01-07', startTime: '10:00', endTime: '11:00' })).body.data._id;
});
afterAll(async () => {
  await t.close();
});

describe('scoring rules', () => {
  const base = {
    overallRating: 4,
    skillRatings: { technicalSkills: 3, problemSolving: 3, creativity: 3, teamwork: 3, communication: 3 },
    participation: { level: 'medium', contributionQuality: 3, questionsAsked: 0, helpedPeers: false },
    behavior: { engagement: 'engaged', attitude: 'positive', focus: 3, respectful: true, followsInstructions: true },
    comprehension: { level: 'adequate', conceptsUnderstood: [], conceptsNeedingWork: [] },
    attendance: { status: 'present' },
    parameters: {},
    criteriaMetadata: null,
    needsAttention: false,
    atRisk: false,
    excelling: false,
  } as unknown as StudentEvaluationRow;

  it('uses the fixed formula, the rating, or the weighted criteria', () => {
    expect(performanceScore(base)).toBe(24 + 18 + 12 + 12);
    expect(performanceScore({ ...base, parameters: { x: 1 } })).toBe(80);
    const criteriaMetadata = {
      parametersConfig: [
        { name: 'Wiring', type: 'rating', weight: 50, ratingScale: { min: 1, max: 5 } },
        { name: 'Safe', type: 'boolean', weight: 50 },
      ],
      includeOverallRating: true,
      overallRatingScale: { min: 1, max: 5 },
    };
    expect(performanceScore({ ...base, parameters: { Wiring: 5, Safe: false }, criteriaMetadata })).toBe(50);
  });

  it('raises flags automatically but never clears them', () => {
    expect(autoFlags({ ...base, overallRating: 2 })).toMatchObject({ atRisk: true, needsAttention: false });
    expect(autoFlags({ ...base, attendance: { status: 'absent' } })).toMatchObject({ needsAttention: true });
    expect(autoFlags({ ...base, needsAttention: true })).toMatchObject({ needsAttention: true });
  });
});

describe('evaluation criteria', () => {
  it('creates criteria for a course and serves them to trainers per group', async () => {
    expect((await api().post('/api/clo/evaluation-criteria').set(clo).send({ name: 'X' })).body.message).toBe('Name, courseIds, and appliesTo are required');
    expect((await api().get(`/api/trainer/evaluations/criteria/group/${groupId}`).set(trainer.headers)).body.message).toBe('No evaluation criteria found for this group');

    const created = await api()
      .post('/api/clo/evaluation-criteria')
      .set(clo)
      .send({
        name: 'Robotics',
        appliesTo: 'course',
        courseIds: [courseId],
        parameters: [
          { name: 'Safe', type: 'boolean', weight: 50, order: 2 },
          { name: 'Wiring', type: 'rating', weight: 50, order: 1 },
        ],
      });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ appliesTo: 'course', courseIds: [{ _id: courseId, title: 'Bots' }], groupIds: [], totalWeight: 100 });
    expect(created.body.data.parameters.map((p: { name: string }) => p.name)).toEqual(['Wiring', 'Safe']);

    const forGroup = await api().get(`/api/trainer/evaluations/criteria/group/${groupId}`).set(trainer.headers);
    expect(forGroup.body.data).toMatchObject({ _id: created.body.data._id, courseIds: [courseId] });

    const bad = await api().post('/api/clo/evaluation-criteria').set(clo).send({ name: 'G', appliesTo: 'groups', courseIds: [courseId], groupIds: [] });
    expect(bad.body.message).toBe('At least one group must be specified');

    const list = await api().get(`/api/clo/evaluation-criteria?courseId=${courseId}`).set(clo);
    expect(list.body.count).toBe(1);
  });
});

describe('trainer evaluations', () => {
  it('creates, refuses duplicates, updates, shares and reports', async () => {
    const [s1, s2] = students;
    const missing = await api().post('/api/trainer/evaluations/').set(trainer.headers).send({ studentId: s1!.user.id, sessionId, groupId });
    expect(missing.body.message).toBe('Student, session, group, and overall rating are required');

    const created = await api()
      .post('/api/trainer/evaluations/')
      .set(trainer.headers)
      .send({ studentId: s1!.user.id, sessionId, groupId, overallRating: 4.6, trainerNotes: 'Great wiring', parameters: { Wiring: 5, Safe: true, Gone: 1 } });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      overallRating: 5,
      trainerNotes: { generalNotes: 'Great wiring' },
      studentId: { _id: s1!.user.id },
      groupId: { _id: groupId, name: 'G' },
      skillRatings: { technicalSkills: 3 },
      participation: { level: 'medium' },
      performanceScore: 100,
      flags: { atRisk: false },
    });
    expect(created.body.data.criteriaMetadata.parametersConfig).toHaveLength(2);

    const dup = await api().post('/api/trainer/evaluations/').set(trainer.headers).send({ studentId: s1!.user.id, sessionId, groupId, overallRating: 3 });
    expect(dup.body.message).toBe('Evaluation already exists for this student in this session');

    const tooHigh = await api().post('/api/trainer/evaluations/').set(trainer.headers).send({ studentId: s2!.user.id, sessionId, groupId, overallRating: 9 });
    expect(tooHigh.body.message).toBe('Rating cannot exceed 5');

    // Another trainer cannot change it; the owner can, and flags are raised automatically.
    const other = await signIn(t, 'trainer');
    expect((await api().put(`/api/trainer/evaluations/${created.body.data._id}`).set(other.headers).send({ overallRating: 1 })).body.message).toBe('You can only update your own evaluations');
    const updated = await api()
      .put(`/api/trainer/evaluations/${created.body.data._id}`)
      .set(trainer.headers)
      .send({ overallRating: 2, parameters: { Wiring: 2, Gone: 3 } });
    expect(updated.body.data).toMatchObject({ overallRating: 2, flags: { atRisk: true }, parameters: { Wiring: 2 } });
    expect(updated.body.data.parameters.Gone).toBeUndefined();

    const shared = await api().post(`/api/trainer/evaluations/${created.body.data._id}/share`).set(trainer.headers).send({ shareWithStudent: true });
    expect(shared.body.data.visibility.sharedWithStudent).toBe(true);

    // Bulk: one new, one duplicate, one outsider.
    const outsider = await signIn(t, 'student');
    const bulk = await api()
      .post('/api/trainer/evaluations/bulk')
      .set(trainer.headers)
      .send({ sessionId, evaluations: [{ studentId: s2!.user.id, overallRating: 5 }, { studentId: s1!.user.id, overallRating: 3 }, { studentId: outsider.user.id, overallRating: 3 }] });
    expect(bulk.body.message).toBe('Created 1 evaluations');
    expect(bulk.body.data.errors).toHaveLength(2);

    const session = await api().get(`/api/trainer/evaluations/session/${sessionId}`).set(trainer.headers);
    expect(session.body.data.stats).toEqual({ totalStudents: 3, evaluated: 2, pending: 1 });
    expect(session.body.data.evaluations[0].overallRating).toBe(5);

    const stats = await api().get('/api/trainer/evaluations/stats').set(trainer.headers);
    expect(stats.body.data).toMatchObject({ total: 2, averageRating: '3.5', ratingDistribution: { 2: 1, 5: 1 }, flaggedStudents: { atRisk: 1 } });

    const list = await api().get('/api/trainer/evaluations/?limit=1').set(trainer.headers);
    expect(list.body.pagination).toEqual({ page: 1, limit: 1, total: 2, pages: 2 });

    const mine = await api().get(`/api/trainer/evaluations/student/${s1!.user.id}`).set(trainer.headers);
    expect(mine.body.data.stats).toMatchObject({ totalEvaluations: 1, averageRating: '2.0' });

    // Students are no longer let in.
    expect((await api().post('/api/trainer/evaluations/').set(s1!.headers).send({})).status).toBe(403);

    // CLO overview and the student's own page.
    const cloStats = await api().get('/api/clo/evaluations/stats').set(clo);
    expect(cloStats.body.data).toMatchObject({ total: 2, engagementDistribution: { medium: 2 } });
    const cloList = await api().get(`/api/clo/evaluations?groupId=${groupId}`).set(clo);
    expect(cloList.body.data[0]).toMatchObject({ trainerId: { _id: trainer.user.id }, groupId: { courseId: { _id: courseId, title: 'Bots' } } });

    const own = await api().get('/api/student/sessions/evaluations').set(s1!.headers);
    expect(own.body).toMatchObject({ total: 1, courseGroups: [{ courseId, courseName: 'Bots', averageScore: 2, percentage: 40 }], overallAverage: null });
    expect(own.body.evaluations[0]).toMatchObject({ sessionTitle: 'Motors', trainerNotes: 'Great wiring', parameters: [{ name: 'Wiring', score: 2, maxScore: 5 }] });

    expect((await api().delete(`/api/trainer/evaluations/${created.body.data._id}`).set(trainer.headers)).body.message).toBe('Evaluation deleted successfully');
  });
});
