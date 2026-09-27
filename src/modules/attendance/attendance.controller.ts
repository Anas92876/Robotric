import type { Request, Response } from 'express';
import { z } from 'zod';
import { paginationMeta, parsePagination } from '../../shared/http/pagination';
import { currentUser } from '../../shared/http/request-user';
import { parse } from '../../shared/http/validate';
import type { AttendanceRecord, AttendanceSheet } from './attendance.repository';
import { sheetStats, type AttendanceService } from './attendance.service';
import { ATTENDANCE_STATUSES } from './attendance.table';

const saveBody = z.object({
  sessionId: z.string().optional(),
  records: z
    .array(
      z.object({
        student: z.union([z.string(), z.object({ _id: z.string() }).transform((s) => s._id)]),
        status: z.enum(ATTENDANCE_STATUSES, { error: 'Status must be present, absent or late' }).default('absent'),
        notes: z.string().max(500, 'Notes cannot exceed 500 characters').nullish(),
        checkInTime: z.coerce.date().nullish(),
      }),
    )
    .optional(),
});

type RecordShape = { student: 'id' | 'basic' | 'withProfile'; markedBy: 'id' | 'name' | 'nameEmail' };

function recordDoc(r: AttendanceRecord, shape: RecordShape) {
  const s = r.student;
  const m = r.markedBy;
  return {
    _id: r.id,
    student:
      shape.student === 'id' || !s
        ? r.studentId
        : shape.student === 'basic'
          ? { _id: s.id, name: s.name, email: s.email }
          : { _id: s.id, name: s.name, email: s.email, profile: s.profile },
    status: r.status,
    markedBy: shape.markedBy === 'id' || !m ? r.markedById : shape.markedBy === 'name' ? { _id: m.id, name: m.name } : { _id: m.id, name: m.name, email: m.email },
    markedAt: r.markedAt,
    notes: r.notes,
    checkInTime: r.checkInTime,
  };
}

/** The attendance document with its embedded `session` snapshot, as before. */
export function sheetDoc(s: AttendanceSheet, shape: RecordShape = { student: 'basic', markedBy: 'id' }) {
  return {
    _id: s.id,
    sessionId: s.sessionId,
    groupId: s.groupId,
    session: { title: s.title, date: s.date, startTime: s.startTime, endTime: s.endTime, type: s.type, location: s.location, notes: s.notes },
    records: s.records.map((r) => recordDoc(r, shape)),
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

/** One student's view of a sheet. */
const studentEntry = (s: AttendanceSheet) => ({
  _id: s.id,
  status: s.records[0]?.status ?? 'absent',
  checkInTime: s.records[0]?.checkInTime ?? null,
  session: { title: s.title, date: s.date, startTime: s.startTime, endTime: s.endTime, type: s.type },
});

export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  // Trainer — /api/trainer/attendance

  save = async (req: Request, res: Response) => {
    const body = parse(saveBody, req.body);
    const records = body.records?.map((r) => ({ studentId: r.student, status: r.status, notes: r.notes ?? null, checkInTime: r.checkInTime ?? null }));
    const { sheet, created } = await this.attendance.save(currentUser(req).id, body.sessionId, records);
    res.status(created ? 201 : 200).json({
      success: true,
      message: created ? 'Attendance saved successfully' : 'Attendance updated successfully',
      data: sheetDoc(sheet, { student: 'id', markedBy: 'id' }),
    });
  };

  forSession = async (req: Request<{ sessionId: string }>, res: Response) => {
    const sheet = await this.attendance.forSession(req.params.sessionId, currentUser(req).id);
    res.json({ success: true, data: sheet ? sheetDoc(sheet) : null });
  };

  forTrainer = async (req: Request, res: Response) => {
    const list = await this.attendance.forTrainer(currentUser(req).id);
    res.json({ success: true, count: list.length, data: list.map((s) => sheetDoc(s)) });
  };

  // CLO — /api/clo/attendance

  list = async (req: Request, res: Response) => {
    const q = parse(
      z.object({
        courseId: z.string().optional(),
        groupId: z.string().optional(),
        sessionType: z.string().optional(),
        startDate: z.coerce.date().optional().catch(undefined),
        endDate: z.coerce.date().optional().catch(undefined),
        sortOrder: z.enum(['asc', 'desc']).catch('desc'),
      }),
      req.query,
    );
    const page = parsePagination(req.query);
    const { items, total } = await this.attendance.list(q, q.sortOrder, page);
    const { total: t, page: p, pages, limit } = paginationMeta(total, page);
    res.json({
      success: true,
      data: items.map((s) => ({ ...sheetDoc(s, { student: 'basic', markedBy: 'name' }), stats: sheetStats(s) })),
      pagination: { page: p, limit, total: t, pages },
    });
  };

  byId = async (req: Request<{ id: string }>, res: Response) => {
    const s = await this.attendance.byId(req.params.id);
    res.json({ success: true, data: { ...sheetDoc(s, { student: 'withProfile', markedBy: 'nameEmail' }), stats: sheetStats(s) } });
  };

  forCourse = async (req: Request<{ courseId: string }>, res: Response) => {
    const { sheets, stats } = await this.attendance.forCourse(req.params.courseId);
    res.json({ success: true, data: { attendanceRecords: sheets.map((s) => sheetDoc(s)), stats } });
  };

  stats = async (req: Request, res: Response) => {
    const q = parse(
      z.object({ courseId: z.string().optional(), startDate: z.coerce.date().optional().catch(undefined), endDate: z.coerce.date().optional().catch(undefined) }),
      req.query,
    );
    res.json({ success: true, data: await this.attendance.stats(q) });
  };

  // Student — /api/student/attendance

  overview = async (req: Request, res: Response) => {
    const { courses, overallStats, recent } = await this.attendance.studentOverview(currentUser(req).id);
    res.json({
      success: true,
      data: { courses, overallStats, recentAttendance: recent.map(({ sheet, courseTitle }) => ({ ...studentEntry(sheet), courseTitle })) },
    });
  };

  course = async (req: Request<{ courseId: string }>, res: Response) => {
    const list = await this.attendance.studentCourse(currentUser(req).id, req.params.courseId);
    res.json({ success: true, count: list.length, data: list.map(studentEntry) });
  };

  summary = async (req: Request<{ courseId: string }>, res: Response) => {
    res.json({ success: true, data: await this.attendance.studentSummary(currentUser(req).id, req.params.courseId) });
  };

  month = async (req: Request<{ courseId: string; year: string; month: string }>, res: Response) => {
    const { courseId, year, month } = req.params;
    const list = await this.attendance.studentMonth(currentUser(req).id, courseId, year, month);
    res.json({
      success: true,
      month: `${year}-${String(month).padStart(2, '0')}`,
      count: list.length,
      data: list.map((s) => ({
        date: s.date,
        status: s.records[0]?.status ?? 'absent',
        session: { title: s.title, startTime: s.startTime, endTime: s.endTime, type: s.type },
      })),
    });
  };
}
