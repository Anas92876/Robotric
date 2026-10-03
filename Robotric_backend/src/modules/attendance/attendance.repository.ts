import { and, asc, count, desc, eq, gte, inArray, lte, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { DbExecutor } from '../../shared/db/client';
import { type UserProfile, users } from '../users/users.table';
import {
  type AttendanceRecordRow,
  attendanceRecords,
  type AttendanceSheetRow,
  attendanceSheets,
  type AttendanceStatus,
} from './attendance.table';

export interface AttendanceRecord extends AttendanceRecordRow {
  student: { id: string; name: string; email: string; profile: UserProfile | null } | null;
  markedBy: { id: string; name: string; email: string } | null;
}

export interface AttendanceSheet extends AttendanceSheetRow {
  records: AttendanceRecord[];
}

export interface RecordInput {
  studentId: string;
  status: AttendanceStatus;
  notes: string | null;
  checkInTime: Date | null;
}

export interface SheetFilter {
  groupIds?: string[];
  groupId?: string;
  startDate?: Date;
  endDate?: Date;
  sessionType?: string;
}

export interface Counts {
  present: number;
  late: number;
  absent: number;
  total: number;
}

export interface AttendanceRepository {
  findBySession(sessionId: string): Promise<AttendanceSheet | null>;
  findById(id: string): Promise<AttendanceSheet | null>;
  /** Creates the sheet or replaces all of its marks. */
  save(sheet: Omit<typeof attendanceSheets.$inferInsert, 'id'>, records: RecordInput[], markedById: string): Promise<{ id: string; created: boolean }>;
  list(filter: SheetFilter, order: 'asc' | 'desc', page?: { limit: number; offset: number }): Promise<AttendanceSheet[]>;
  count(filter: SheetFilter): Promise<number>;
  /** Sheets where the student has a mark, newest first, with only that student's record. */
  forStudent(studentId: string, groupIds: string[], range?: { start: Date; end: Date }, order?: 'asc' | 'desc', limit?: number): Promise<AttendanceSheet[]>;
  /** Mark counts per sheet for the given groups (for averages). */
  sheetCounts(groupIds: string[]): Promise<(Counts & { sheetId: string; groupId: string })[]>;
  /** Mark counts per student within one group. */
  studentCounts(groupId: string, studentIds: string[]): Promise<Map<string, Counts>>;
}

const student = alias(users, 'att_student');
const marker = alias(users, 'att_marker');

const statusCount = (s: AttendanceStatus) =>
  sql<number>`count(*) filter (where ${attendanceRecords.status} = ${s})`.mapWith(Number);

export class DrizzleAttendanceRepository implements AttendanceRepository {
  constructor(private readonly db: DbExecutor) {}

  private async records(sheetIds: string[], onlyStudent?: string): Promise<Map<string, AttendanceRecord[]>> {
    const result = new Map<string, AttendanceRecord[]>(sheetIds.map((id) => [id, []]));
    if (sheetIds.length === 0) return result;
    const rows = await this.db
      .select({
        r: attendanceRecords,
        student: { id: student.id, name: student.name, email: student.email, profile: student.profile },
        marker: { id: marker.id, name: marker.name, email: marker.email },
      })
      .from(attendanceRecords)
      .leftJoin(student, eq(student.id, attendanceRecords.studentId))
      .leftJoin(marker, eq(marker.id, attendanceRecords.markedById))
      .where(and(inArray(attendanceRecords.sheetId, sheetIds), onlyStudent ? eq(attendanceRecords.studentId, onlyStudent) : undefined))
      .orderBy(asc(attendanceRecords.markedAt), asc(attendanceRecords.id));
    for (const row of rows) {
      result.get(row.r.sheetId)?.push({
        ...row.r,
        student: row.student?.id ? row.student : null,
        markedBy: row.marker?.id ? row.marker : null,
      });
    }
    return result;
  }

  private async withRecords(sheets: AttendanceSheetRow[], onlyStudent?: string): Promise<AttendanceSheet[]> {
    const recs = await this.records(sheets.map((s) => s.id), onlyStudent);
    return sheets.map((s) => ({ ...s, records: recs.get(s.id) ?? [] }));
  }

  private static where(f: SheetFilter): SQL | undefined {
    return and(
      f.groupIds ? (f.groupIds.length ? inArray(attendanceSheets.groupId, f.groupIds) : sql`false`) : undefined,
      f.groupId ? eq(attendanceSheets.groupId, f.groupId) : undefined,
      f.startDate ? gte(attendanceSheets.date, f.startDate) : undefined,
      f.endDate ? lte(attendanceSheets.date, f.endDate) : undefined,
      f.sessionType ? sql`${attendanceSheets.type}::text = ${f.sessionType}` : undefined,
    );
  }

  async findBySession(sessionId: string) {
    const [sheet] = await this.db.select().from(attendanceSheets).where(eq(attendanceSheets.sessionId, sessionId)).limit(1);
    return sheet ? (await this.withRecords([sheet]))[0]! : null;
  }

  async findById(id: string) {
    const [sheet] = await this.db.select().from(attendanceSheets).where(eq(attendanceSheets.id, id)).limit(1);
    return sheet ? (await this.withRecords([sheet]))[0]! : null;
  }

  async save(sheet: Omit<typeof attendanceSheets.$inferInsert, 'id'>, records: RecordInput[], markedById: string) {
    return this.db.transaction(async (tx) => {
      const [existing] = await tx.select({ id: attendanceSheets.id }).from(attendanceSheets).where(eq(attendanceSheets.sessionId, sheet.sessionId)).for('update');
      let id = existing?.id;
      if (!id) {
        const [row] = await tx.insert(attendanceSheets).values(sheet).returning({ id: attendanceSheets.id });
        id = row!.id;
      } else {
        await tx.update(attendanceSheets).set({ updatedAt: new Date() }).where(eq(attendanceSheets.id, id));
        await tx.delete(attendanceRecords).where(eq(attendanceRecords.sheetId, id));
      }
      const now = new Date();
      // A student listed twice keeps their last mark.
      const unique = [...new Map(records.map((r) => [r.studentId, r])).values()];
      if (unique.length > 0) {
        await tx.insert(attendanceRecords).values(
          unique.map((r) => ({
            sheetId: id!,
            studentId: r.studentId,
            status: r.status,
            markedById,
            markedAt: now,
            notes: r.notes,
            checkInTime: r.checkInTime ?? (r.status === 'present' || r.status === 'late' ? now : null),
          })),
        );
      }
      return { id: id!, created: !existing };
    });
  }

  async list(f: SheetFilter, order: 'asc' | 'desc', page?: { limit: number; offset: number }) {
    let q = this.db
      .select()
      .from(attendanceSheets)
      .where(DrizzleAttendanceRepository.where(f))
      .orderBy(order === 'asc' ? asc(attendanceSheets.date) : desc(attendanceSheets.date))
      .$dynamic();
    if (page) q = q.limit(page.limit).offset(page.offset);
    return this.withRecords(await q);
  }

  async count(f: SheetFilter) {
    const [row] = await this.db.select({ n: count() }).from(attendanceSheets).where(DrizzleAttendanceRepository.where(f));
    return row?.n ?? 0;
  }

  async forStudent(studentId: string, groupIds: string[], range?: { start: Date; end: Date }, order: 'asc' | 'desc' = 'desc', limit?: number) {
    if (groupIds.length === 0) return [];
    let q = this.db
      .select({ sheet: attendanceSheets })
      .from(attendanceSheets)
      .innerJoin(attendanceRecords, and(eq(attendanceRecords.sheetId, attendanceSheets.id), eq(attendanceRecords.studentId, studentId)))
      .where(
        and(
          inArray(attendanceSheets.groupId, groupIds),
          range ? gte(attendanceSheets.date, range.start) : undefined,
          range ? lte(attendanceSheets.date, range.end) : undefined,
        ),
      )
      .orderBy(order === 'asc' ? asc(attendanceSheets.date) : desc(attendanceSheets.date))
      .$dynamic();
    if (limit) q = q.limit(limit);
    return this.withRecords((await q).map((r) => r.sheet), studentId);
  }

  async sheetCounts(groupIds: string[]) {
    if (groupIds.length === 0) return [];
    return this.db
      .select({
        sheetId: attendanceSheets.id,
        groupId: attendanceSheets.groupId,
        present: statusCount('present'),
        late: statusCount('late'),
        absent: statusCount('absent'),
        total: count(attendanceRecords.id),
      })
      .from(attendanceSheets)
      .leftJoin(attendanceRecords, eq(attendanceRecords.sheetId, attendanceSheets.id))
      .where(inArray(attendanceSheets.groupId, groupIds))
      .groupBy(attendanceSheets.id, attendanceSheets.groupId);
  }

  async studentCounts(groupId: string, studentIds: string[]) {
    const result = new Map<string, Counts>();
    if (studentIds.length === 0) return result;
    const rows = await this.db
      .select({ studentId: attendanceRecords.studentId, present: statusCount('present'), late: statusCount('late'), absent: statusCount('absent'), total: count() })
      .from(attendanceRecords)
      .innerJoin(attendanceSheets, eq(attendanceSheets.id, attendanceRecords.sheetId))
      .where(and(eq(attendanceSheets.groupId, groupId), inArray(attendanceRecords.studentId, studentIds)))
      .groupBy(attendanceRecords.studentId);
    for (const { studentId: id, ...c } of rows) result.set(id, c);
    return result;
  }
}
