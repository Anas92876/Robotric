import { AppError, BadRequestError, ForbiddenError, NotFoundError } from '../../shared/http/errors';
import type { Page } from '../../shared/http/pagination';
import type { EnrollmentRepository } from '../enrollments/enrollments.repository';
import type { GroupRepository } from '../groups/groups.repository';
import type { SessionRepository } from '../sessions/sessions.repository';
import type { AttendanceRepository, AttendanceSheet, Counts, RecordInput, SheetFilter } from './attendance.repository';

/**
 * Attendance % with "virtual" past sessions: a group that started at session
 * N is treated as if the student attended the N−1 sessions before it.
 */
export function attendancePercent(attended: number, total: number, startingSessionNumber = 1): number {
  const virtual = Math.max(0, (startingSessionNumber || 1) - 1);
  const effectiveTotal = total + virtual;
  return effectiveTotal > 0 ? Math.round(((attended + virtual) / effectiveTotal) * 100) : 0;
}

export const sheetStats = (s: AttendanceSheet) => {
  const total = s.records.length;
  const present = s.records.filter((r) => r.status === 'present').length;
  const absent = s.records.filter((r) => r.status === 'absent').length;
  const late = s.records.filter((r) => r.status === 'late').length;
  return { totalStudents: total, present, absent, late, attendanceRate: total > 0 ? Math.round(((present + late) / total) * 100) : 0 };
};

export interface StudentCourseStats {
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  attendancePercentage: number;
}

function studentStats(sheets: AttendanceSheet[], startingSessionNumber: number): StudentCourseStats {
  let present = 0;
  let absent = 0;
  let late = 0;
  for (const s of sheets) {
    const status = s.records[0]?.status ?? 'absent';
    if (status === 'present') present++;
    else if (status === 'late') late++;
    else absent++;
  }
  return {
    totalSessions: sheets.length,
    presentCount: present,
    absentCount: absent,
    lateCount: late,
    excusedCount: 0,
    attendancePercentage: attendancePercent(present + late, sheets.length, startingSessionNumber),
  };
}

export class AttendanceService {
  constructor(
    private readonly attendance: AttendanceRepository,
    private readonly sessions: Pick<SessionRepository, 'findById'>,
    private readonly groups: Pick<GroupRepository, 'findById' | 'list' | 'groupOfStudentInCourse'>,
    private readonly enrollments: Pick<EnrollmentRepository, 'forStudent' | 'findForStudentCourse'>,
  ) {}

  // ─── Trainer ─────────────────────────────────────────────────────────────

  private async trainerSession(sessionId: string, trainerId: string) {
    const session = await this.sessions.findById(sessionId);
    if (!session) throw new NotFoundError('Session');
    const group = await this.groups.findById(session.groupId);
    if (!group) throw new NotFoundError('Group');
    if (group.trainerId !== trainerId) throw new ForbiddenError('You do not have access to this group');
    return { session, group };
  }

  /** Takes or retakes a session's attendance (the whole list of marks is replaced). */
  async save(trainerId: string, sessionId: string | undefined, records: RecordInput[] | undefined): Promise<{ sheet: AttendanceSheet; created: boolean }> {
    if (!sessionId) throw new BadRequestError('sessionId is required');
    if (!records || records.length === 0) throw new BadRequestError('Attendance records are required');
    const { session, group } = await this.trainerSession(sessionId, trainerId);
    if (!session.scheduledDate) throw new BadRequestError('Session has no scheduled date');
    const { id, created } = await this.attendance.save(
      {
        sessionId,
        groupId: group.id,
        title: session.title,
        date: session.scheduledDate,
        startTime: session.startTime,
        endTime: session.endTime,
        type: 'lecture',
      },
      records,
      trainerId,
    );
    return { sheet: (await this.attendance.findById(id))!, created };
  }

  async forSession(sessionId: string, trainerId: string): Promise<AttendanceSheet | null> {
    await this.trainerSession(sessionId, trainerId);
    return this.attendance.findBySession(sessionId);
  }

  async forTrainer(trainerId: string): Promise<AttendanceSheet[]> {
    const groupIds = (await this.groups.list({ trainerId })).map((g) => g.id);
    return this.attendance.list({ groupIds }, 'desc');
  }

  // ─── CLO ─────────────────────────────────────────────────────────────────

  private async filterFor(q: { courseId?: string; groupId?: string; startDate?: Date; endDate?: Date; sessionType?: string }): Promise<SheetFilter> {
    const filter: SheetFilter = { startDate: q.startDate, endDate: q.endDate, sessionType: q.sessionType };
    if (q.groupId) filter.groupId = q.groupId;
    else if (q.courseId) filter.groupIds = (await this.groups.list({ courseId: q.courseId })).map((g) => g.id);
    return filter;
  }

  async list(q: Parameters<AttendanceService['filterFor']>[0], order: 'asc' | 'desc', page: Page) {
    const filter = await this.filterFor(q);
    const [items, total] = await Promise.all([this.attendance.list(filter, order, page), this.attendance.count(filter)]);
    return { items, total };
  }

  async byId(id: string): Promise<AttendanceSheet> {
    const sheet = await this.attendance.findById(id);
    if (!sheet) throw new AppError('Attendance record not found', 404, 'NOT_FOUND');
    return sheet;
  }

  async forCourse(courseId: string) {
    const groupList = await this.groups.list({ courseId });
    if (groupList.length === 0) {
      return { sheets: [], stats: { totalSessions: 0, totalPresent: 0, totalAbsent: 0, totalLate: 0, overallAttendanceRate: 0 } };
    }
    const sheets = await this.attendance.list({ groupIds: groupList.map((g) => g.id) }, 'desc');
    let present = 0;
    let absent = 0;
    let late = 0;
    const rates = sheets.map((s) => {
      const st = sheetStats(s);
      present += st.present;
      absent += st.absent;
      late += st.late;
      return st.totalStudents > 0 ? ((st.present + st.late) / st.totalStudents) * 100 : 0;
    });
    // Groups that started mid-course count their earlier sessions as fully attended.
    const virtual = groupList.reduce((n, g) => n + Math.max(0, g.startingSessionNumber - 1), 0);
    const denominator = rates.length + virtual;
    const overall = denominator > 0 ? Math.round((rates.reduce((a, b) => a + b, 0) + virtual * 100) / denominator) : 0;
    return { sheets, stats: { totalSessions: sheets.length, totalPresent: present, totalAbsent: absent, totalLate: late, overallAttendanceRate: overall } };
  }

  async stats(q: { courseId?: string; startDate?: Date; endDate?: Date }) {
    const sheets = await this.attendance.list(await this.filterFor(q), 'desc');
    if (sheets.length === 0) {
      return { totalSessions: 0, totalStudentRecords: 0, overallAttendanceRate: 0, statusDistribution: { present: 0, absent: 0, late: 0 }, averageSessionAttendance: 0 };
    }
    let records = 0;
    const dist = { present: 0, absent: 0, late: 0 };
    const rates: number[] = [];
    for (const s of sheets) {
      const st = sheetStats(s);
      if (st.totalStudents > 0) rates.push(((st.present + st.late) / st.totalStudents) * 100);
      records += st.totalStudents;
      dist.present += st.present;
      dist.absent += st.absent;
      dist.late += st.late;
    }
    const avg = rates.length > 0 ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : 0;
    return { totalSessions: sheets.length, totalStudentRecords: records, overallAttendanceRate: avg, statusDistribution: dist, averageSessionAttendance: avg };
  }

  // ─── Student (their own marks only) ──────────────────────────────────────

  private async enrolledCourse(studentId: string, courseId: string): Promise<{ groupIds: string[]; startingSessionNumber: number }> {
    const enrollment = await this.enrollments.findForStudentCourse(studentId, courseId);
    if (!enrollment || enrollment.status !== 'active') throw new ForbiddenError('You are not enrolled in this course');
    return this.courseGroups(studentId, courseId);
  }

  private async courseGroups(studentId: string, courseId: string) {
    const [groupList, own] = await Promise.all([this.groups.list({ courseId }), this.groups.groupOfStudentInCourse(studentId, courseId)]);
    return { groupIds: groupList.map((g) => g.id), startingSessionNumber: own?.startingSessionNumber ?? 1 };
  }

  async studentOverview(studentId: string) {
    const enrollments = (await this.enrollments.forStudent(studentId)).filter((e) => e.status === 'active' && e.course);
    const courses: ({ courseId: string; courseTitle: string; courseThumbnail: string | null } & StudentCourseStats)[] = [];
    const titleByGroup = new Map<string, string>();
    const allGroupIds: string[] = [];
    for (const e of enrollments) {
      const { groupIds, startingSessionNumber } = await this.courseGroups(studentId, e.courseId);
      groupIds.forEach((g) => titleByGroup.set(g, e.course!.title));
      allGroupIds.push(...groupIds);
      const sheets = await this.attendance.forStudent(studentId, groupIds);
      courses.push({ courseId: e.courseId, courseTitle: e.course!.title, courseThumbnail: e.course!.thumbnail, ...studentStats(sheets, startingSessionNumber) });
    }
    const sum = (k: keyof StudentCourseStats) => courses.reduce((s, c) => s + c[k], 0);
    const recent = await this.attendance.forStudent(studentId, allGroupIds, undefined, 'desc', 10);
    return {
      courses,
      overallStats: {
        totalCourses: courses.length,
        averageAttendance: courses.length > 0 ? Math.round(sum('attendancePercentage') / courses.length) : 0,
        totalSessions: sum('totalSessions'),
        totalPresent: sum('presentCount'),
        totalAbsent: sum('absentCount'),
        totalLate: sum('lateCount'),
      },
      recent: recent.map((s) => ({ sheet: s, courseTitle: titleByGroup.get(s.groupId) ?? null })),
    };
  }

  async studentCourse(studentId: string, courseId: string): Promise<AttendanceSheet[]> {
    const { groupIds } = await this.enrolledCourse(studentId, courseId);
    return this.attendance.forStudent(studentId, groupIds);
  }

  async studentSummary(studentId: string, courseId: string): Promise<StudentCourseStats> {
    const { groupIds, startingSessionNumber } = await this.enrolledCourse(studentId, courseId);
    return studentStats(await this.attendance.forStudent(studentId, groupIds), startingSessionNumber);
  }

  async studentMonth(studentId: string, courseId: string, year: string, month: string): Promise<AttendanceSheet[]> {
    const y = Number.parseInt(year, 10);
    const m = Number.parseInt(month, 10);
    if (Number.isNaN(y) || Number.isNaN(m) || m < 1 || m > 12) throw new BadRequestError('Invalid year or month');
    const { groupIds } = await this.enrolledCourse(studentId, courseId);
    return this.attendance.forStudent(studentId, groupIds, { start: new Date(y, m - 1, 1), end: new Date(y, m, 0, 23, 59, 59) }, 'asc');
  }

  // ─── Group figures (for the groups module) ───────────────────────────────

  studentCounts(groupId: string, studentIds: string[]): Promise<Map<string, Counts>> {
    return this.attendance.studentCounts(groupId, studentIds);
  }
}
