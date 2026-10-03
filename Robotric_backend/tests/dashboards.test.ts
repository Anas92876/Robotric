import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { signIn } from './helpers/auth';
import { createTestApp, type TestContext } from './helpers/test-app';

let t: TestContext;
let clo: Record<string, string>;
let rec: Record<string, string>;
let trainer: { headers: Record<string, string>; user: { id: string } };
let student: { headers: Record<string, string>; user: { id: string } };
let courseId: string;
let groupId: string;
let past: string;
const api = () => request(t.app);
const day = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

beforeAll(async () => {
  t = await createTestApp();
  clo = (await signIn(t, 'clo')).headers;
  rec = (await signIn(t, 'reception')).headers;
  trainer = await signIn(t, 'trainer');
  student = await signIn(t, 'student');
  courseId = (await api().post('/api/clo/courses').set(clo).send({ title: 'Bots', category: 'robotics', description: 'd', price: 100, duration: '4 hours', status: 'published' })).body.data._id;
  groupId = (await api().post('/api/clo/groups').set(clo).send({ name: 'G', courseId, trainerId: trainer.user.id, startDate: '2020-01-01', endDate: '2040-01-01' })).body.data._id;
  await api().post('/api/reception/enrollments').set(rec).send({ studentId: student.user.id, courseId, groupId });
  past = (await api().post('/api/clo/sessions/').set(clo).send({ title: 'Motors', groupId, overrideSchedule: true, scheduledDate: day(-1), startTime: '10:00', endTime: '12:00' })).body.data._id;
  await api().post('/api/clo/sessions/').set(clo).send({ title: 'Later', groupId, overrideSchedule: true, scheduledDate: day(3), startTime: '10:00', endTime: '12:00' });
  await api().post('/api/trainer/attendance').set(trainer.headers).send({ sessionId: past, records: [{ student: student.user.id, status: 'present' }] });
});
afterAll(async () => {
  await t.close();
});

describe('CLO dashboard, analytics and trainers', () => {
  it('reports counts, top trainers and trends', async () => {
    const res = await api().get('/api/clo/dashboard').set(clo);
    expect(res.body.data.stats).toMatchObject({
      trainers: { total: 1, active: 1 },
      courses: { total: 1, draft: 1 },
      groups: { active: 1 },
      students: { total: 1 },
      enrollments: { total: 1, active: 1, recent: 1 },
      performance: { attendanceRate: 100 },
    });
    expect(res.body.data.topTrainers[0]).toMatchObject({ _id: trainer.user.id, totalGroups: 1, avgAttendance: 100 });
    expect(res.body.data.recentActivity.groups[0]).toMatchObject({ _id: groupId, courseId: { title: 'Bots' } });

    const analytics = await api().get('/api/clo/analytics?period=7').set(clo);
    expect(analytics.body.data).toMatchObject({ period: 7, coursePopularity: [{ _id: courseId, enrollmentCount: 1, activeCount: 1 }], trainerWorkload: [{ _id: trainer.user.id, totalStudents: 1 }] });
    expect(analytics.body.data.enrollmentTrends[0].count).toBe(1);
    expect(analytics.body.data.attendanceTrends[0]).toMatchObject({ total: 1, present: 1 });
  });

  it('manages trainers', async () => {
    const created = await api().post('/api/clo/trainers').set(clo).send({ name: 'Tala', email: 'tala@x.com', password: 'secret1', profile: { specialization: 'Arduino' } });
    expect(created.body.data).toMatchObject({ role: 'trainer', profile: { specialization: 'Arduino', isActive: true } });
    const id = created.body.data._id;

    const list = await api().get('/api/clo/trainers?sortBy=name&order=asc').set(clo);
    expect(list.body.data.find((x: { _id: string }) => x._id === trainer.user.id).stats).toMatchObject({ totalGroups: 1, activeGroups: 1, totalStudents: 1, coursesCount: 1, avgAttendance: 100 });

    expect((await api().post(`/api/clo/trainers/${id}/assign-course`).set(clo).send({ courseId })).body.data).toMatchObject({ courseTitle: 'Bots' });
    const off = await api().delete(`/api/clo/trainers/${id}`).set(clo).send({});
    expect(off.body).toMatchObject({ message: 'Trainer deactivated successfully', data: { status: 'inactive' } });
    expect((await api().get('/api/clo/trainers?status=inactive').set(clo)).body.data).toHaveLength(1);
    expect((await api().delete(`/api/clo/trainers/${id}/courses/${courseId}`).set(clo)).body.message).toBe('Trainer removed from course successfully');

    const perf = await api().get(`/api/clo/trainers/${trainer.user.id}/performance?period=7`).set(clo);
    expect(perf.body.data.performance).toMatchObject({ totalGroups: 1, totalStudents: 1, coursesCount: 1, overallAttendanceRate: 100 });
    expect((await api().get(`/api/clo/trainers/${student.user.id}/performance`).set(clo)).body.message).toBe('Trainer not found');
  });
});

describe('trainer dashboard', () => {
  it('shows stats, activities, notifications and overview', async () => {
    const stats = await api().get('/api/trainer/dashboard/stats').set(trainer.headers);
    expect(stats.body.data).toMatchObject({ activeGroups: 1, totalStudents: 1, upcomingSessions: 1 });

    const activities = await api().get('/api/trainer/dashboard/activities').set(trainer.headers);
    expect(activities.body.data[0]).toMatchObject({ type: 'session_completed', description: 'Motors - G' });

    const notes = await api().get('/api/trainer/dashboard/notifications').set(trainer.headers);
    expect(notes.body.data.some((n: { type: string }) => n.type === 'evaluation_pending')).toBe(true);

    const overview = await api().get('/api/trainer/dashboard/overview').set(trainer.headers);
    expect(overview.body.data).toMatchObject({ groups: { total: 1, byCategory: { robotics: 1 } }, sessions: { total: 2, completed: 1, completionRate: 50 } });
  });
});

describe('student dashboard', () => {
  it('summarises courses, payments and progress', async () => {
    const stats = await api().get('/api/student/dashboard/stats').set(student.headers);
    expect(stats.body.data).toMatchObject({ totalEnrolledCourses: 1, activeCourses: 1, totalSessionsCompleted: 1, totalSessionHours: 2, averageProgress: 50, averageAttendance: 100, totalRemaining: 100 });

    const progress = await api().get('/api/student/dashboard/progress').set(student.headers);
    expect(progress.body.data).toEqual([{ courseId, courseTitle: 'Bots', progress: 50, completedSessions: 1, totalSessions: 2, status: 'active' }]);

    const activity = await api().get('/api/student/dashboard/recent-activity').set(student.headers);
    expect(activity.body.data[0]).toMatchObject({ type: 'module', title: 'Enrolled in Bots' });
    expect((await api().get('/api/student/dashboard/upcoming-deadlines?days=30').set(student.headers)).body.success).toBe(true);
  });
});

describe('reception dashboard', () => {
  it('counts and lists recent activity (the old endpoint always crashed)', async () => {
    expect((await api().get('/api/reception/dashboard').set(rec)).body.data).toMatchObject({ totalStudents: 1, totalEnrollments: 1, recentEnrollments: 1, activeGroups: 1 });
    const recent = await api().get('/api/reception/recent-activities').set(rec);
    expect(recent.status).toBe(200);
    expect(recent.body.data[0]).toMatchObject({ type: 'enrollment_created', details: { courseName: 'Bots' } });
  });
});
