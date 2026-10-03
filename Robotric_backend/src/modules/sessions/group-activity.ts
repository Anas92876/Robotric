import type { AttendanceRepository } from '../attendance/attendance.repository';
import { sheetDoc } from '../attendance/attendance.controller';
import type { AttendanceBreakdown, GroupActivityReader, GroupSessionSummary } from '../groups/groups.ports';
import { EMPTY_ATTENDANCE } from '../groups/groups.ports';
import { atTime, autoStatus } from './session-time';
import type { SessionRepository } from './sessions.repository';

/**
 * Group progress and attendance figures, computed live from sessions and
 * attendance sheets (the old stored counters drifted: completing a session
 * could be counted more than once).
 */
export class SessionGroupActivity implements GroupActivityReader {
  constructor(
    private readonly sessions: Pick<SessionRepository, 'list'>,
    private readonly attendance: Pick<AttendanceRepository, 'sheetCounts' | 'list' | 'studentCounts'>,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async summarize(groupIds: string[]): Promise<Map<string, GroupSessionSummary>> {
    const now = this.now();
    const [sessionList, sheets] = await Promise.all([
      groupIds.length ? this.sessions.list({ groupIds }) : Promise.resolve([]),
      this.attendance.sheetCounts(groupIds),
    ]);
    const result = new Map<string, GroupSessionSummary>();
    for (const groupId of groupIds) {
      const own = sessionList.filter((s) => s.groupId === groupId);
      const statuses = own.map((s) => autoStatus(s, now));
      const groupSheets = sheets.filter((s) => s.groupId === groupId);
      const attendance: AttendanceBreakdown = groupSheets.reduce(
        (a, s) => ({ present: a.present + s.present, late: a.late + s.late, absent: a.absent + s.absent, total: a.total + s.total }),
        { ...EMPTY_ATTENDANCE },
      );
      // Mean of each sheet's attendance rate; an empty sheet counts as 0%.
      const averageAttendance =
        groupSheets.length > 0
          ? Math.round(groupSheets.reduce((sum, s) => sum + (s.total > 0 ? ((s.present + s.late) / s.total) * 100 : 0), 0) / groupSheets.length)
          : 0;
      const next = own
        .filter((s) => s.scheduledDate && s.scheduledDate >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
        .sort((a, b) => (atTime(a.scheduledDate, a.startTime)?.getTime() ?? 0) - (atTime(b.scheduledDate, b.startTime)?.getTime() ?? 0))[0];
      result.set(groupId, {
        totalSessions: own.length,
        completedSessions: statuses.filter((s) => s === 'completed').length,
        upcomingSessions: statuses.filter((s) => s === 'scheduled' || s === 'in_progress').length,
        cancelledSessions: statuses.filter((s) => s === 'cancelled').length,
        averageAttendance,
        attendance,
        nextSession: next
          ? { id: next.id, title: next.title, scheduledDate: next.scheduledDate!, startTime: next.startTime ?? '', endTime: next.endTime ?? '' }
          : null,
      });
    }
    return result;
  }

  async recentAttendance(groupId: string, limit: number): Promise<unknown[]> {
    const sheets = await this.attendance.list({ groupId }, 'desc', { limit, offset: 0 });
    return sheets.map((s) => sheetDoc(s, { student: 'id', markedBy: 'id' }));
  }

  studentAttendance(groupId: string, studentIds: string[]): Promise<Map<string, AttendanceBreakdown>> {
    return this.attendance.studentCounts(groupId, studentIds);
  }
}
