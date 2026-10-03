import { and, asc, count, countDistinct, desc, eq, gte, ilike, inArray, isNotNull, or, sql, type SQL } from 'drizzle-orm';
import type { DbExecutor } from '../../shared/db/client';
import { escapeLike } from '../../shared/db/like';
import { attendanceRecords, attendanceSheets } from '../attendance/attendance.table';
import { courses } from '../courses/courses.table';
import { enrollments } from '../enrollments/enrollments.table';
import { groups, groupStudents } from '../groups/groups.table';
import { leads } from '../leads/leads.table';
import { receipts } from '../receipts/receipts.table';
import { type UserProfile, users } from '../users/users.table';

export interface AttendanceTotals {
  records: number;
  attended: number;
}

export interface TrainerStats {
  id: string;
  name: string;
  email: string;
  role: string;
  profile: UserProfile | null;
  createdAt: Date;
  updatedAt: Date;
  totalGroups: number;
  activeGroups: number;
  totalStudents: number;
  coursesCount: number;
  records: number;
  attended: number;
}

export interface DailyAttendance {
  day: string;
  total: number;
  present: number;
  late: number;
  absent: number;
}

/** Figures for dashboards and analytics, computed with SQL across tables. */
export interface DashboardRepository {
  countUsers(roles: string[], where?: 'active' | 'inactive'): Promise<number>;
  countCourses(status?: string): Promise<number>;
  countGroups(status?: string): Promise<number>;
  countEnrollments(filter?: { status?: string; since?: Date }): Promise<number>;
  /** All attendance marks (optionally only in these groups / since a date); "attended" = present or late. */
  attendanceTotals(filter?: { groupIds?: string[]; since?: Date }): Promise<AttendanceTotals>;
  /** Per active group: its trainer and attendance totals. */
  activeGroupAttendance(): Promise<{ groupId: string; trainerId: string; trainerName: string; trainerEmail: string; records: number; attended: number }[]>;
  enrollmentsPerDay(since: Date): Promise<{ day: string; count: number }[]>;
  attendancePerDay(since: Date, trainerId?: string): Promise<DailyAttendance[]>;
  coursePopularity(limit: number): Promise<{ courseId: string; title: string; category: string; total: number; active: number; completed: number }[]>;
  trainerWorkload(): Promise<{ trainerId: string; name: string; email: string; groups: number; students: number }[]>;
  trainers(filter: { status?: string; search?: string; sortBy: string; order: 'asc' | 'desc' }): Promise<TrainerStats[]>;
  distinctStudents(groupIds: string[]): Promise<number>;
  recentReceipts(limit: number): Promise<{ id: string; createdAt: Date; amount: number; receiptNumber: string; studentName: string; courseTitle: string; issuedByName: string }[]>;
  recentConversions(limit: number): Promise<{ fullName: string; convertedAt: Date }[]>;
  recentEnrollments(limit: number): Promise<{ createdAt: Date; status: string; studentName: string; courseTitle: string }[]>;
}

const trainerRoles = ['trainer'];
const attended = sql<number>`count(*) filter (where ${attendanceRecords.status} in ('present','late'))::int`;
const day = (col: SQL | typeof attendanceSheets.date) => sql<string>`to_char(${col}, 'YYYY-MM-DD')`;

export class DrizzleDashboardRepository implements DashboardRepository {
  constructor(private readonly db: DbExecutor) {}

  async countUsers(roles: string[], where?: 'active' | 'inactive') {
    const inactive = sql`coalesce(${users.profile}->>'status', '') = 'inactive'`;
    const [row] = await this.db
      .select({ n: count() })
      .from(users)
      .where(and(inArray(sql`${users.role}::text`, roles), where === 'active' ? sql`not (${inactive})` : where === 'inactive' ? inactive : undefined));
    return row?.n ?? 0;
  }

  async countCourses(status?: string) {
    const [row] = await this.db
      .select({ n: count() })
      .from(courses)
      .where(status ? sql`${courses.status}::text = ${status}` : undefined);
    return row?.n ?? 0;
  }

  async countGroups(status?: string) {
    const [row] = await this.db
      .select({ n: count() })
      .from(groups)
      .where(status ? sql`${groups.status}::text = ${status}` : undefined);
    return row?.n ?? 0;
  }

  async countEnrollments(f: { status?: string; since?: Date } = {}) {
    const [row] = await this.db
      .select({ n: count() })
      .from(enrollments)
      .where(and(f.status ? sql`${enrollments.status}::text = ${f.status}` : undefined, f.since ? gte(enrollments.createdAt, f.since) : undefined));
    return row?.n ?? 0;
  }

  async attendanceTotals(f: { groupIds?: string[]; since?: Date } = {}) {
    if (f.groupIds && f.groupIds.length === 0) return { records: 0, attended: 0 };
    const [row] = await this.db
      .select({ records: sql<number>`count(*)::int`, attended })
      .from(attendanceRecords)
      .innerJoin(attendanceSheets, eq(attendanceSheets.id, attendanceRecords.sheetId))
      .where(and(f.groupIds ? inArray(attendanceSheets.groupId, f.groupIds) : undefined, f.since ? gte(attendanceSheets.date, f.since) : undefined));
    return { records: row?.records ?? 0, attended: row?.attended ?? 0 };
  }

  async activeGroupAttendance() {
    return this.db
      .select({
        groupId: groups.id,
        trainerId: groups.trainerId,
        trainerName: users.name,
        trainerEmail: users.email,
        records: sql<number>`count(${attendanceRecords.studentId})::int`,
        attended: sql<number>`count(*) filter (where ${attendanceRecords.status} in ('present','late'))::int`,
      })
      .from(groups)
      .innerJoin(users, eq(users.id, groups.trainerId))
      .leftJoin(attendanceSheets, eq(attendanceSheets.groupId, groups.id))
      .leftJoin(attendanceRecords, eq(attendanceRecords.sheetId, attendanceSheets.id))
      .where(eq(groups.status, 'active'))
      .groupBy(groups.id, groups.trainerId, users.name, users.email);
  }

  async enrollmentsPerDay(since: Date) {
    const d = day(sql`${enrollments.createdAt}`);
    return this.db.select({ day: d, count: sql<number>`count(*)::int` }).from(enrollments).where(gte(enrollments.createdAt, since)).groupBy(d).orderBy(asc(d));
  }

  async attendancePerDay(since: Date, trainerId?: string) {
    const d = day(attendanceSheets.date);
    const status = (s: string) => sql<number>`count(*) filter (where ${attendanceRecords.status} = ${s})::int`;
    const q = this.db
      .select({ day: d, total: sql<number>`count(*)::int`, present: status('present'), late: status('late'), absent: status('absent') })
      .from(attendanceRecords)
      .innerJoin(attendanceSheets, eq(attendanceSheets.id, attendanceRecords.sheetId))
      .innerJoin(groups, eq(groups.id, attendanceSheets.groupId))
      .where(and(gte(attendanceSheets.date, since), trainerId ? eq(groups.trainerId, trainerId) : undefined))
      .groupBy(d)
      .orderBy(asc(d));
    return q;
  }

  async coursePopularity(limit: number) {
    const total = sql<number>`count(*)::int`;
    return this.db
      .select({
        courseId: courses.id,
        title: courses.title,
        category: courses.category,
        total,
        active: sql<number>`count(*) filter (where ${enrollments.status}::text = 'active')::int`,
        completed: sql<number>`count(*) filter (where ${enrollments.status}::text = 'completed')::int`,
      })
      .from(enrollments)
      .innerJoin(courses, eq(courses.id, enrollments.courseId))
      .groupBy(courses.id, courses.title, courses.category)
      .orderBy(desc(total))
      .limit(limit);
  }

  async trainerWorkload() {
    const groupCount = countDistinct(groups.id);
    return this.db
      .select({ trainerId: users.id, name: users.name, email: users.email, groups: groupCount, students: sql<number>`count(${groupStudents.studentId})::int` })
      .from(groups)
      .innerJoin(users, eq(users.id, groups.trainerId))
      .leftJoin(groupStudents, eq(groupStudents.groupId, groups.id))
      .where(eq(groups.status, 'active'))
      .groupBy(users.id, users.name, users.email)
      .orderBy(desc(groupCount));
  }

  async trainers(f: { status?: string; search?: string; sortBy: string; order: 'asc' | 'desc' }) {
    const s = f.search ? `%${escapeLike(f.search)}%` : null;
    const inactive = sql`coalesce(${users.profile}->>'status', '') = 'inactive'`;
    const rows = await this.db
      .select({ id: users.id, name: users.name, email: users.email, role: sql<string>`${users.role}::text`, profile: users.profile, createdAt: users.createdAt, updatedAt: users.updatedAt })
      .from(users)
      .where(
        and(
          inArray(sql`${users.role}::text`, trainerRoles),
          f.status === 'active' ? sql`not (${inactive})` : f.status === 'inactive' ? inactive : undefined,
          s ? or(ilike(users.name, s), ilike(users.email, s)) : undefined,
        ),
      );
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    const [groupStats, attendanceStats] = await Promise.all([
      this.db
        .select({
          trainerId: groups.trainerId,
          totalGroups: countDistinct(groups.id),
          activeGroups: sql<number>`count(distinct ${groups.id}) filter (where ${groups.status} = 'active')::int`,
          totalStudents: sql<number>`count(${groupStudents.studentId})::int`,
          coursesCount: countDistinct(groups.courseId),
        })
        .from(groups)
        .leftJoin(groupStudents, eq(groupStudents.groupId, groups.id))
        .where(inArray(groups.trainerId, ids))
        .groupBy(groups.trainerId),
      this.db
        .select({ trainerId: groups.trainerId, records: sql<number>`count(*)::int`, attended })
        .from(attendanceRecords)
        .innerJoin(attendanceSheets, eq(attendanceSheets.id, attendanceRecords.sheetId))
        .innerJoin(groups, eq(groups.id, attendanceSheets.groupId))
        .where(inArray(groups.trainerId, ids))
        .groupBy(groups.trainerId),
    ]);
    const g = new Map(groupStats.map((r) => [r.trainerId, r]));
    const a = new Map(attendanceStats.map((r) => [r.trainerId, r]));
    const list = rows.map((r) => ({
      ...r,
      totalGroups: g.get(r.id)?.totalGroups ?? 0,
      activeGroups: g.get(r.id)?.activeGroups ?? 0,
      totalStudents: g.get(r.id)?.totalStudents ?? 0,
      coursesCount: g.get(r.id)?.coursesCount ?? 0,
      records: a.get(r.id)?.records ?? 0,
      attended: a.get(r.id)?.attended ?? 0,
    }));
    const key = (['name', 'email', 'createdAt', 'updatedAt'] as const).find((k) => k === f.sortBy) ?? 'createdAt';
    const dir = f.order === 'asc' ? 1 : -1;
    return list.sort((x, y) => (x[key] < y[key] ? -dir : x[key] > y[key] ? dir : 0));
  }

  async distinctStudents(groupIds: string[]) {
    if (groupIds.length === 0) return 0;
    const [row] = await this.db.select({ n: countDistinct(groupStudents.studentId) }).from(groupStudents).where(inArray(groupStudents.groupId, groupIds));
    return row?.n ?? 0;
  }

  async recentReceipts(limit: number) {
    const student = users;
    return this.db
      .select({
        id: receipts.id,
        createdAt: receipts.createdAt,
        amount: receipts.amount,
        receiptNumber: receipts.receiptNumber,
        studentName: student.name,
        courseTitle: courses.title,
        issuedByName: sql<string>`(select name from users u where u.id = ${receipts.issuedById})`,
      })
      .from(receipts)
      .innerJoin(student, eq(student.id, receipts.studentId))
      .innerJoin(courses, eq(courses.id, receipts.courseId))
      .where(isNotNull(receipts.issuedById))
      .orderBy(desc(receipts.createdAt))
      .limit(limit);
  }

  async recentConversions(limit: number) {
    const rows = await this.db
      .select({ fullName: leads.fullName, convertedAt: leads.convertedAt })
      .from(leads)
      .where(and(isNotNull(leads.convertedToStudentId), isNotNull(leads.convertedAt)))
      .orderBy(desc(leads.convertedAt))
      .limit(limit);
    return rows.map((r) => ({ fullName: r.fullName, convertedAt: r.convertedAt! }));
  }

  async recentEnrollments(limit: number) {
    return this.db
      .select({ createdAt: enrollments.createdAt, status: sql<string>`${enrollments.status}::text`, studentName: users.name, courseTitle: courses.title })
      .from(enrollments)
      .innerJoin(users, eq(users.id, enrollments.studentId))
      .innerJoin(courses, eq(courses.id, enrollments.courseId))
      .orderBy(desc(enrollments.createdAt))
      .limit(limit);
  }
}
