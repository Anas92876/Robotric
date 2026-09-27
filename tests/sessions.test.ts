import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { signIn } from './helpers/auth';
import { createTestApp, type TestContext } from './helpers/test-app';

let t: TestContext;
let clo: Record<string, string>;
let rec: Record<string, string>;
let trainer: { headers: Record<string, string>; user: { id: string } };
let other: { headers: Record<string, string>; user: { id: string } };
let courseId: string;
const api = () => request(t.app);

const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};

beforeAll(async () => {
  t = await createTestApp();
  clo = (await signIn(t, 'clo')).headers;
  rec = (await signIn(t, 'reception')).headers;
  trainer = await signIn(t, 'trainer');
  other = await signIn(t, 'trainer');
  courseId = (await api().post('/api/clo/courses').set(clo).send({ title: 'Bots', category: 'x', description: 'd', price: 100 })).body.data._id;
});
afterAll(async () => {
  await t.close();
});

async function groupWithStudents(n: number, trainerId = trainer.user.id, extra: Record<string, unknown> = {}) {
  const g = (
    await api()
      .post('/api/clo/groups')
      .set(clo)
      .send({ name: 'G', courseId, trainerId, startDate: iso(daysFromNow(-30)), endDate: iso(daysFromNow(60)), schedule: [{ day: 'Saturday', startTime: '10:00', endTime: '12:00' }], ...extra })
  ).body.data;
  const students = [];
  for (let i = 0; i < n; i++) {
    const s = await signIn(t, 'student');
    await api().post('/api/reception/enrollments').set(rec).send({ studentId: s.user.id, courseId, groupId: g._id });
    students.push(s);
  }
  return { groupId: g._id as string, students };
}

describe('sessions', () => {
  it('auto-schedules from the group timetable, numbers sessions, and returns the old document', async () => {
    const { groupId } = await groupWithStudents(2);
    const res = await api().post('/api/trainer/sessions').set(trainer.headers).send({ title: 'Intro', groupId, lessonPlan: { objectives: ['Motors'], outline: [{ startTime: '10:00', endTime: '10:30', duration: 30, title: 'Warmup' }] } });
    expect(res.status).toBe(201);
    const s = res.body.data;
    expect(s).toMatchObject({ title: 'Intro', sessionNumber: 1, startTime: '10:00', endTime: '12:00', duration: 120, status: 'scheduled', courseId: { _id: courseId }, video: { hasVideo: false } });
    expect(s.groupId.students).toHaveLength(2);
    expect(new Date(s.scheduledDate).getDay()).toBe(6); // Saturday
    expect(s.lessonPlan.outline[0]._id).toMatch(/^[a-f0-9]{24}$/);
    expect(s).toHaveProperty('isUpcoming');

    const second = await api().post('/api/trainer/sessions').set(trainer.headers).send({ title: 'Two', groupId });
    expect(second.body.data.sessionNumber).toBe(2);
    expect(new Date(second.body.data.scheduledDate).getTime() - new Date(s.scheduledDate).getTime()).toBe(7 * 24 * 3600 * 1000);
  });

  it('keeps trainers to their own groups and sessions', async () => {
    const { groupId } = await groupWithStudents(0, other.user.id);
    const res = await api().post('/api/trainer/sessions').set(trainer.headers).send({ title: 'X', groupId });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Group not found or does not belong to you');

    const theirs = (await api().post('/api/trainer/sessions').set(other.headers).send({ title: 'Theirs', groupId })).body.data;
    expect((await api().get(`/api/trainer/sessions/${theirs._id}`).set(trainer.headers)).status).toBe(404);
    const mine = await api().get('/api/trainer/sessions').set(trainer.headers);
    expect(mine.body.data.some((x: { _id: string }) => x._id === theirs._id)).toBe(false);
  });

  it('supports a custom schedule, update rules, start/end, cancel and delete', async () => {
    const { groupId } = await groupWithStudents(0);
    const bad = await api().post('/api/trainer/sessions').set(trainer.headers).send({ title: 'X', groupId, overrideSchedule: true, scheduledDate: iso(daysFromNow(2)) });
    expect(bad.body.message).toBe('Custom schedule requires date, startTime, and endTime');

    const s = (await api().post('/api/trainer/sessions').set(trainer.headers).send({ title: 'Custom', groupId, overrideSchedule: true, scheduledDate: iso(daysFromNow(2)), startTime: '14:00', endTime: '15:30' })).body.data;
    expect(s).toMatchObject({ duration: 90, overrideSchedule: true });

    const upd = await api().put(`/api/trainer/sessions/${s._id}`).set(trainer.headers).send({ endTime: '16:00' });
    expect(upd.body.data.duration).toBe(120);
    expect((await api().put(`/api/trainer/sessions/${s._id}`).set(trainer.headers).send({ endTime: '13:00' })).body.message).toBe('End time must be after start time');

    expect((await api().post(`/api/trainer/sessions/${s._id}/end`).set(trainer.headers)).body.message).toBe('Cannot end a session with status: scheduled');
    expect((await api().post(`/api/trainer/sessions/${s._id}/start`).set(trainer.headers)).body.data.status).toBe('in_progress');
    const ended = await api().post(`/api/trainer/sessions/${s._id}/end`).set(trainer.headers);
    expect(ended.body.data.status).toBe('completed');
    expect(ended.body.data.actualDuration).toBe(0);
    expect((await api().put(`/api/trainer/sessions/${s._id}`).set(trainer.headers).send({ title: 'x' })).body.message).toBe('Cannot update a completed session');

    const plan = await api().put(`/api/trainer/sessions/${s._id}/lesson-plan`).set(trainer.headers).send({ notes: 'Bring kits' });
    expect(plan.body.data.lessonPlan).toMatchObject({ notes: 'Bring kits', objectives: [] });

    const other2 = (await api().post('/api/trainer/sessions').set(trainer.headers).send({ title: 'To cancel', groupId })).body.data;
    const cancelled = await api().delete(`/api/trainer/sessions/${other2._id}?reason=Holiday`).set(trainer.headers);
    expect(cancelled.body).toMatchObject({ message: 'Session cancelled successfully', data: { status: 'cancelled', cancellationReason: 'Holiday' } });
    const gone = await api().delete(`/api/trainer/sessions/${other2._id}?permanent=true`).set(trainer.headers);
    expect(gone.body).toEqual({ success: true, message: 'Session permanently deleted' });
  });

  it('lets the CLO manage any group’s sessions, including the video, and lists group sessions', async () => {
    const { groupId } = await groupWithStudents(0, other.user.id);
    const s = (await api().post('/api/clo/sessions/').set(clo).send({ title: 'CLO made', groupId, video: { hasVideo: true, youtubeId: ' abc123 ' } })).body.data;
    expect(s).toMatchObject({ trainerId: other.user.id, video: { hasVideo: true, youtubeId: 'abc123' } });
    const list = await api().get(`/api/clo/groups/${groupId}/sessions`).set(clo);
    expect(list.body.data).toMatchObject({ group: { id: groupId, trainer: { id: other.user.id } }, statistics: { total: 1, scheduled: 1 } });
    expect(list.body.data.sessions[0].trainerId).toMatchObject({ _id: other.user.id });
  });

  it('shows a calendar of the trainer’s sessions', async () => {
    const { groupId } = await groupWithStudents(1);
    const when = daysFromNow(1);
    await api().post('/api/trainer/sessions').set(trainer.headers).send({ title: 'Cal', groupId, overrideSchedule: true, scheduledDate: iso(when), startTime: '09:00', endTime: '10:00' });
    const res = await api().get(`/api/trainer/sessions/calendar?view=day&date=${iso(when)}`).set(trainer.headers);
    expect(res.body).toMatchObject({ success: true, view: 'day' });
    expect(res.body.data.find((e: { title: string }) => e.title === 'Cal')).toMatchObject({ studentsCount: 1, status: 'scheduled' });
  });
});

describe('attendance', () => {
  it('takes and retakes attendance, links it to the session, and feeds group & student figures', async () => {
    const { groupId, students } = await groupWithStudents(3, trainer.user.id, { startingSessionNumber: 1 });
    const past = daysFromNow(-3);
    const s = (await api().post('/api/trainer/sessions').set(trainer.headers).send({ title: 'Past class', groupId, overrideSchedule: true, scheduledDate: iso(past), startTime: '10:00', endTime: '11:00' })).body.data;
    const [a, b, c] = students.map((x) => x.user.id);

    expect((await api().post('/api/trainer/attendance').set(trainer.headers).send({ sessionId: s._id, records: [] })).body.message).toBe('Attendance records are required');
    const first = await api()
      .post('/api/trainer/attendance')
      .set(trainer.headers)
      .send({ sessionId: s._id, records: [{ student: a, status: 'present' }, { student: b, status: 'late' }, { student: c, status: 'absent' }] });
    expect(first.status).toBe(201);
    expect(first.body.message).toBe('Attendance saved successfully');
    expect(first.body.data).toMatchObject({ sessionId: s._id, groupId, session: { title: 'Past class', startTime: '10:00' } });
    expect(first.body.data.records.find((r: { student: string }) => r.student === a).checkInTime).toBeTruthy();

    const retake = await api().post('/api/trainer/attendance').set(trainer.headers).send({ sessionId: s._id, records: [{ student: a, status: 'present' }, { student: b, status: 'present' }, { student: c, status: 'absent' }] });
    expect(retake.status).toBe(200);
    expect(retake.body.message).toBe('Attendance updated successfully');

    // Another trainer can't touch it.
    expect((await api().post('/api/trainer/attendance').set(other.headers).send({ sessionId: s._id, records: [{ student: a, status: 'absent' }] })).status).toBe(403);
    // Students can't use the trainer area.
    expect((await api().get('/api/trainer/attendance').set(students[0]!.headers)).status).toBe(403);

    const detail = await api().get(`/api/trainer/sessions/${s._id}`).set(trainer.headers);
    expect(detail.body.data).toMatchObject({ hasAttendance: true, attendanceId: first.body.data._id, studentsCount: 3, status: 'completed' });

    const sheet = await api().get(`/api/trainer/attendance/session/${s._id}`).set(trainer.headers);
    expect(sheet.body.data.records.map((r: { student: { _id: string } }) => r.student._id).sort()).toEqual([a, b, c].sort());

    // Group figures are live: 1 completed session, 2 of 3 attended.
    const tg = await api().get(`/api/trainer/groups/${groupId}`).set(trainer.headers);
    expect(tg.body.data.progress).toEqual({ completedSessions: 1, totalSessions: 1, percentageComplete: 100 });
    expect(tg.body.data.stats.averageAttendance).toBe(67);
    const cg = await api().get(`/api/clo/groups/${groupId}`).set(clo);
    expect(cg.body.data.stats).toMatchObject({ avgAttendance: 66.7, attendanceBreakdown: { present: 2, absent: 1, total: 3 } });
    expect(cg.body.data.recentAttendance).toHaveLength(1);
    const members = await api().get(`/api/clo/groups/${groupId}/students`).set(clo);
    expect(members.body.data.find((m: { _id: string }) => m._id === c).attendance).toMatchObject({ rate: 0, absent: 1, total: 1 });

    // Student view
    const mine = await api().get(`/api/student/attendance/summary/${courseId}`).set(students[0]!.headers);
    expect(mine.body.data).toMatchObject({ totalSessions: 1, presentCount: 1, attendancePercentage: 100 });
    const absentOne = await api().get(`/api/student/attendance/courses/${courseId}`).set(students[2]!.headers);
    expect(absentOne.body.data[0]).toMatchObject({ status: 'absent', session: { title: 'Past class' } });
    const month = await api().get(`/api/student/attendance/courses/${courseId}/month/${past.getFullYear()}/${past.getMonth() + 1}`).set(students[1]!.headers);
    expect(month.body.count).toBe(1);
    const overview = await api().get('/api/student/attendance/overview').set(students[0]!.headers);
    expect(overview.body.data.overallStats).toMatchObject({ totalCourses: 1, totalSessions: 1, totalPresent: 1 });
    const notEnrolled = await api().get(`/api/student/attendance/summary/${courseId}`).set((await signIn(t, 'student')).headers);
    expect(notEnrolled.status).toBe(403);

    // CLO views
    const course = await api().get(`/api/clo/attendance/course/${courseId}`).set(clo);
    expect(course.body.data.stats.totalSessions).toBeGreaterThanOrEqual(1);
    const byId = await api().get(`/api/clo/attendance/${first.body.data._id}`).set(clo);
    expect(byId.body.data.stats).toEqual({ totalStudents: 3, present: 2, absent: 1, late: 0, attendanceRate: 67 });
    const list = await api().get(`/api/clo/attendance?groupId=${groupId}`).set(clo);
    expect(list.body.pagination).toMatchObject({ total: 1, page: 1 });
    const stats = await api().get(`/api/clo/attendance/stats?courseId=${courseId}`).set(clo);
    expect(stats.body.data.statusDistribution).toMatchObject({ present: 2, absent: 1 });

    // Deleting the session removes its sheet.
    await api().delete(`/api/trainer/sessions/${s._id}?permanent=true`).set(trainer.headers);
    expect((await api().get(`/api/clo/attendance/${first.body.data._id}`).set(clo)).status).toBe(404);
  });
});
