import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { courseProgress, parseDurationToHours } from '../src/modules/student-courses/course-progress';
import { signIn } from './helpers/auth';
import { createTestApp, type TestContext } from './helpers/test-app';

let t: TestContext;
let clo: Record<string, string>;
let trainer: { headers: Record<string, string>; user: { id: string } };
let student: { headers: Record<string, string>; user: { id: string } };
let courseId: string;
let groupId: string;
let past: string;
let future: string;
const api = () => request(t.app);
const day = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

beforeAll(async () => {
  t = await createTestApp();
  clo = (await signIn(t, 'clo')).headers;
  const rec = (await signIn(t, 'reception')).headers;
  trainer = await signIn(t, 'trainer');
  student = await signIn(t, 'student');
  courseId = (await api().post('/api/clo/courses').set(clo).send({ title: 'Bots', category: 'x', description: 'd', price: 100, duration: '10 hours' })).body.data._id;
  groupId = (await api().post('/api/clo/groups').set(clo).send({ name: 'G', courseId, trainerId: trainer.user.id, startDate: '2020-01-01', endDate: '2040-01-01' })).body.data._id;
  await api().post('/api/reception/enrollments').set(rec).send({ studentId: student.user.id, courseId, groupId });
  past = (await api().post('/api/clo/sessions/').set(clo).send({ title: 'Motors', groupId, overrideSchedule: true, scheduledDate: day(-3), startTime: '10:00', endTime: '12:00' })).body.data._id;
  future = (await api().post('/api/clo/sessions/').set(clo).send({ title: 'Sensors', groupId, overrideSchedule: true, scheduledDate: day(5), startTime: '10:00', endTime: '12:00' })).body.data._id;
  await api().put(`/api/clo/sessions/${past}`).set(clo).send({ video: { hasVideo: true, youtubeId: 'dQw4w9WgXcQ' } });
  await api().post('/api/trainer/attendance').set(trainer.headers).send({ sessionId: past, records: [{ student: student.user.id, status: 'late' }] });
  await api().post('/api/trainer/evaluations/').set(trainer.headers).send({ studentId: student.user.id, sessionId: past, groupId, overallRating: 4, parameters: { Wiring: 3 } });
});
afterAll(async () => {
  await t.close();
});

describe('progress rules', () => {
  it('reads course lengths and credits earlier sessions', () => {
    expect(parseDurationToHours('40 hours')).toBe(40);
    expect(parseDurationToHours('2 months')).toBe(80);
    expect(parseDurationToHours('3 weeks')).toBe(30);
    const done = { scheduledDate: new Date('2020-01-01'), startTime: '10:00', endTime: '12:00', status: 'scheduled' as const, duration: 120 };
    const later = { ...done, scheduledDate: new Date('2099-01-01') };
    expect(courseProgress({ sessions: [done, later], course: { totalHours: 8, duration: '' } })).toEqual({ percentageComplete: 25, completedSessions: 1, totalSessions: 2 });
    const group = { startingSessionNumber: 3, schedule: [{ _id: 'x', day: 'Monday' as const, startTime: '10:00', endTime: '12:00' }] };
    expect(courseProgress({ sessions: [done, later], course: { totalHours: 8, duration: '' }, group }).percentageComplete).toBe(75);
  });
});

describe('student course pages', () => {
  it('lists my courses with progress, attendance and payments', async () => {
    const res = await api().get('/api/student/courses/').set(student.headers);
    expect(res.body.count).toBe(1);
    expect(res.body.data[0]).toMatchObject({
      enrollmentSource: 'direct',
      course: { _id: courseId, title: 'Bots', trainer: { _id: trainer.user.id }, type: 'single' },
      groupId,
      hasCertificate: false,
      progress: { percentageComplete: 20, completedSessions: 1, totalSessions: 2 },
      attendance: { percentage: 100 },
      payment: { totalAmount: 100, paidAmount: 0, remainingAmount: 100 },
      bundleSubCourses: null,
    });
  });

  it('shows course details with per-session attendance and ratings', async () => {
    const res = await api().get(`/api/student/courses/${courseId}`).set(student.headers);
    expect(res.body.course).toMatchObject({ id: courseId, groupId, studentStats: { evaluationAverage: 4, attendanceAverage: 100, progressPercentage: 20 } });
    expect(res.body.course.sessions).toEqual([
      expect.objectContaining({ id: past, isCompleted: true, evaluationAverage: 4, attendance: { status: 'late', checkedInAt: expect.any(String) } }),
      expect.objectContaining({ id: future, isCompleted: false, evaluationAverage: null, attendance: null }),
    ]);
    const other = await signIn(t, 'student');
    expect((await api().get(`/api/student/courses/${courseId}`).set(other.headers)).body.message).toBe('You are not enrolled in this course');
  });

  it('lists sessions without the video id or quiz answers', async () => {
    await api()
      .post('/api/trainer/quizzes/')
      .set(trainer.headers)
      .send({ courseId, sessionId: past, title: 'Quick', questions: [{ question: 'Q', options: [{ text: 'a', isCorrect: true }, { text: 'b' }] }] });
    const res = await api().get(`/api/student/courses/${courseId}/sessions`).set(student.headers);
    const [first, second] = res.body.data;
    expect(first).toMatchObject({ _id: past, isLocked: false, type: 'live_session', video: { hasVideo: true }, quiz: { title: 'Quick' }, quizAttempt: null });
    expect(first.video.youtubeId).toBeUndefined();
    expect(first.quiz.questions[0].options[0]).toEqual({ index: 0, text: 'a' });
    expect(second.isLocked).toBe(true);
  });

  it('opens past sessions, locks future ones, and serves the video by token', async () => {
    const locked = await api().get(`/api/student/sessions/${future}`).set(student.headers);
    expect(locked.status).toBe(403);
    expect(locked.body).toMatchObject({ locked: true, title: 'Sensors' });

    const open = await api().get(`/api/student/sessions/${past}`).set(student.headers);
    expect(open.body.session).toMatchObject({
      id: past,
      courseId: { _id: courseId, title: 'Bots' },
      attendance: { status: 'late' },
      evaluation: { overallScore: 3, parameters: [{ name: 'Wiring', score: 3, maxScore: 5 }] },
      hasVideo: true,
      materials: null,
      tasks: [],
    });

    const token = (await api().get(`/api/student/sessions/${past}/video-token`).set(student.headers)).body.data.token;
    const json = await api().get(`/api/student/sessions/${past}/video-embed?token=${token}&format=json`);
    expect(json.body.data.embedUrl).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ');
    const page = await api().get(`/api/student/sessions/${past}/video-embed?token=${token}`);
    expect(page.headers['content-type']).toMatch(/text\/html/);
    expect(page.headers['x-frame-options']).toBeUndefined();
    expect((await api().get(`/api/student/sessions/${future}/video-embed?token=${token}`)).body.message).toBe('Video token mismatch');
  });

  it('refuses self-enrollment (registration is at the academy)', async () => {
    const res = await api().post(`/api/student/courses/${courseId}/enroll`).set(student.headers);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ENROLLMENT_AT_RECEPTION');
  });
});
