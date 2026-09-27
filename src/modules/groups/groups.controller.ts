import type { Request, Response } from 'express';
import { z } from 'zod';
import { currentUser } from '../../shared/http/request-user';
import { booleanish, numeric, parse } from '../../shared/http/validate';
import type { GroupSessionSummary } from './groups.ports';
import { type Group, GROUP_SORT_FIELDS, type GroupMember } from './groups.repository';
import type { GroupService, GroupWithMembers } from './groups.service';
import { GROUP_STATUSES, WEEK_DAYS } from './groups.table';

// ─── Request schemas ─────────────────────────────────────────────────────────

const time = z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format');
const slot = z.object({
  _id: z.string().optional(),
  day: z.enum(WEEK_DAYS, { error: 'Invalid schedule day' }),
  startTime: time,
  endTime: time,
  location: z.string().trim().max(200, 'Location cannot exceed 200 characters').nullish(),
});
const date = z.coerce.date({ error: 'Invalid date' });

const groupBody = z.object({
  name: z.string().trim().max(100, 'Name cannot exceed 100 characters').optional(),
  description: z.string().trim().max(1000, 'Description cannot exceed 1000 characters').nullish(),
  // Clients sometimes echo back the populated object.
  courseId: z.union([z.string(), z.object({ _id: z.string() }).transform((c) => c._id)]).optional(),
  trainerId: z.union([z.string(), z.object({ _id: z.string() }).transform((t) => t._id)]).optional(),
  startDate: date.optional(),
  endDate: date.optional(),
  schedule: z.array(slot).optional(),
  maxStudents: numeric('Max students must be a number')
    .refine((v) => v >= 1 && v <= 100, 'Max students must be between 1 and 100')
    .optional(),
  thumbnail: z.string().nullish(),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format. Use hex color (e.g., #30c59b)').optional(),
  status: z.enum(GROUP_STATUSES, { error: 'Invalid status' }).optional(),
  boardEnabled: booleanish.optional(),
  startingSessionNumber: numeric('Starting session number must be a number').refine((v) => v >= 1, 'Starting session number must be at least 1').optional(),
});

const listQuery = z.object({
  status: z.string().optional(),
  courseId: z.string().optional(),
  trainerId: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(GROUP_SORT_FIELDS).catch('createdAt'),
  order: z.enum(['asc', 'desc']).catch('desc'),
});

// ─── Response shapes ─────────────────────────────────────────────────────────

type CourseShape = 'id' | 'basic' | 'withDuration' | 'withThumbnail' | 'full';
type StudentShape = 'ids' | 'basic' | 'withProfile' | 'withRoleProfile';

function courseRef(g: Group, shape: CourseShape) {
  const c = g.course;
  if (shape === 'id' || !c) return shape === 'id' ? g.courseId : null;
  const base = { _id: c.id, title: c.title, category: c.category, level: c.level };
  if (shape === 'withDuration') return { ...base, duration: c.duration };
  if (shape === 'withThumbnail') return { ...base, thumbnail: c.thumbnail };
  if (shape === 'full') return { ...base, thumbnail: c.thumbnail, duration: c.duration };
  return base;
}

function studentRef(m: GroupMember, shape: StudentShape) {
  if (shape === 'basic') return { _id: m.id, name: m.name, email: m.email };
  if (shape === 'withProfile') return { _id: m.id, name: m.name, email: m.email, profile: m.profile };
  return { _id: m.id, name: m.name, email: m.email, role: m.role, profile: m.profile };
}

/**
 * The group document as Mongoose returned it, including the schema's
 * virtuals (`isFull`, `enrolledCount`, `availableSeats`, `isCurrentlyActive`, `id`).
 */
export function groupDoc(
  g: GroupWithMembers,
  shape: { course: CourseShape; trainer: 'id' | 'basic' | 'withProfile'; students: StudentShape },
) {
  const now = new Date();
  const enrolled = g.members.length;
  const trainer =
    shape.trainer === 'id' || !g.trainer
      ? shape.trainer === 'id'
        ? g.trainerId
        : null
      : shape.trainer === 'basic'
        ? { _id: g.trainer.id, name: g.trainer.name, email: g.trainer.email }
        : { _id: g.trainer.id, name: g.trainer.name, email: g.trainer.email, profile: g.trainer.profile };
  return {
    _id: g.id,
    name: g.name,
    description: g.description,
    courseId: courseRef(g, shape.course),
    trainerId: trainer,
    students: shape.students === 'ids' ? g.members.map((m) => m.id) : g.members.map((m) => studentRef(m, shape.students)),
    maxStudents: g.maxStudents,
    schedule: g.schedule,
    startDate: g.startDate,
    endDate: g.endDate,
    status: g.status,
    boardEnabled: g.boardEnabled,
    thumbnail: g.thumbnail,
    color: g.color,
    startingSessionNumber: g.startingSessionNumber,
    progress: { completedSessions: g.completedSessions, totalSessions: g.totalSessions, percentageComplete: g.percentageComplete },
    stats: {
      averageAttendance: g.averageAttendance,
      averagePerformance: g.averagePerformance,
      totalAssignments: g.totalAssignments,
      totalQuizzes: g.totalQuizzes,
    },
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
    isFull: enrolled >= g.maxStudents,
    enrolledCount: enrolled,
    isCurrentlyActive: g.status === 'active' && now >= g.startDate && now <= g.endDate,
    availableSeats: Math.max(0, g.maxStudents - enrolled),
    id: g.id,
  };
}

/** Live progress from sessions, overriding the stored counters (what the trainer screens showed). */
function liveProgress(s: GroupSessionSummary) {
  const percentageComplete = s.totalSessions > 0 ? Math.round((s.completedSessions / s.totalSessions) * 100) : 0;
  return { completedSessions: s.completedSessions, totalSessions: s.totalSessions, percentageComplete };
}

const rate = (present: number, late: number, total: number) =>
  total > 0 ? Number.parseFloat((((present + late) / total) * 100).toFixed(1)) : 0;

type IdReq = Request<{ id: string }>;
type GroupReq = Request<{ groupId: string; studentId?: string }>;

// ─── CLO ─────────────────────────────────────────────────────────────────────

export class CloGroupController {
  constructor(private readonly groups: GroupService) {}

  list = async (req: Request, res: Response) => {
    const items = await this.groups.list(parse(listQuery, req.query));
    res.json({
      success: true,
      data: items.map(({ group, summary }) => ({
        ...groupDoc(group, { course: 'basic', trainer: 'withProfile', students: 'basic' }),
        progress: liveProgress(summary),
        stats: {
          studentsCount: group.members.length,
          // Every group member is enrolled in the group's course. (The old
          // query looked for a field enrollments never had, so it was always 0.)
          enrollments: group.members.length,
          avgAttendance: Number.parseFloat(summary.averageAttendance.toFixed(1)),
        },
      })),
    });
  };

  details = async (req: IdReq, res: Response) => {
    const { group, summary, recentAttendance, enrollments } = await this.groups.details(req.params.id);
    const a = summary.attendance;
    res.json({
      success: true,
      data: {
        ...groupDoc(group, { course: 'withDuration', trainer: 'withProfile', students: 'withProfile' }),
        progress: liveProgress(summary),
        enrollments: enrollments.map((e) => ({ _id: e.id, studentId: e.studentId, status: e.status, enrollmentDate: e.enrolledAt, progress: e.progress })),
        recentAttendance,
        stats: {
          studentsCount: group.members.length,
          enrollmentsCount: enrollments.length,
          avgAttendance: rate(a.present, a.late, a.total),
          attendanceBreakdown: a,
        },
      },
    });
  };

  create = async (req: Request, res: Response) => {
    const group = await this.groups.create(parse(groupBody, req.body));
    res.status(201).json({
      success: true,
      message: 'Group created successfully',
      data: groupDoc(group, { course: 'basic', trainer: 'withProfile', students: 'ids' }),
    });
  };

  update = async (req: IdReq, res: Response) => {
    // `students` is managed through its own endpoints and is ignored here.
    const group = await this.groups.update(req.params.id, parse(groupBody, req.body));
    res.json({
      success: true,
      message: 'Group updated successfully',
      data: groupDoc(group, { course: 'basic', trainer: 'withProfile', students: 'ids' }),
    });
  };

  delete = async (req: IdReq, res: Response) => {
    await this.groups.delete(req.params.id);
    res.json({ success: true, message: 'Group and all related data deleted successfully' });
  };

  setStatus = async (req: IdReq, res: Response) => {
    const action = (req.body as { action?: string } | undefined)?.action === 'reopen' ? 'reopen' : 'close';
    const group = await this.groups.setClosed(req.params.id, action);
    res.json({
      success: true,
      message: `Group ${action === 'close' ? 'closed' : 'reopened'} successfully`,
      data: { _id: group.id, name: group.name, status: group.status },
    });
  };

  assignTrainer = async (req: IdReq, res: Response) => {
    const { trainerId } = parse(z.object({ trainerId: z.string().optional() }), req.body);
    const group = await this.groups.assignTrainer(req.params.id, trainerId);
    res.json({
      success: true,
      message: 'Trainer assigned to group successfully',
      data: groupDoc(group, { course: 'id', trainer: 'basic', students: 'ids' }),
    });
  };

  students = async (req: IdReq, res: Response) => {
    const { students } = await this.groups.students(req.params.id);
    res.json({
      success: true,
      data: students.map(({ member, attendance: a, enrollment }) => ({
        ...studentRef(member, 'withProfile'),
        attendance: { rate: rate(a.present, a.late, a.total), present: a.present, late: a.late, absent: a.absent, total: a.total },
        enrollment: enrollment ? { status: enrollment.status, progress: enrollment.progress, enrollmentDate: enrollment.enrolledAt } : null,
      })),
    });
  };

  addStudent = async (req: IdReq, res: Response) => {
    const { studentId } = parse(z.object({ studentId: z.string().optional() }), req.body);
    const group = await this.groups.addStudent(req.params.id, studentId, { studentLabel: 'Student' });
    res.json({
      success: true,
      message: 'Student added to group successfully',
      data: groupDoc(group, { course: 'id', trainer: 'id', students: 'basic' }),
    });
  };

  removeStudent = async (req: Request<{ id: string; studentId: string }>, res: Response) => {
    await this.groups.removeStudent(req.params.id, req.params.studentId);
    res.json({ success: true, message: 'Student removed from group successfully' });
  };

  toggleBoard = async (req: IdReq, res: Response) => {
    const boardEnabled = await this.groups.toggleBoard(req.params.id);
    res.json({ success: true, data: { boardEnabled }, message: `Board ${boardEnabled ? 'enabled' : 'disabled'}` });
  };
}

// ─── Trainer (only their own groups) ─────────────────────────────────────────

export interface PublishedCoursesReader {
  published(): Promise<{ id: string; title: string; category: string; level: string; description: string; thumbnail: string | null }[]>;
}

export class TrainerGroupController {
  constructor(
    private readonly groups: GroupService,
    private readonly courses: PublishedCoursesReader,
  ) {}

  list = async (req: Request, res: Response) => {
    const q = parse(listQuery, req.query);
    const items = await this.groups.list({
      trainerId: currentUser(req).id,
      status: q.status,
      courseId: q.courseId,
      search: q.search,
      searchCourse: true,
    });
    res.json({
      success: true,
      count: items.length,
      data: items.map(({ group, summary }) => {
        const doc = groupDoc(group, { course: 'withThumbnail', trainer: 'id', students: 'basic' });
        return { ...doc, progress: liveProgress(summary), stats: { ...doc.stats, averageAttendance: summary.averageAttendance } };
      }),
    });
  };

  get = async (req: GroupReq, res: Response) => {
    const { group, summary } = await this.groups.details(req.params.groupId, currentUser(req).id);
    const doc = groupDoc(group, { course: 'full', trainer: 'id', students: 'withRoleProfile' });
    const next = summary.nextSession;
    res.json({
      success: true,
      data: {
        ...doc,
        progress: liveProgress(summary),
        stats: { ...doc.stats, averageAttendance: summary.averageAttendance },
        sessionStats: { total: summary.totalSessions, completed: summary.completedSessions, upcoming: summary.upcomingSessions },
        nextSession: next
          ? { _id: next.id, title: next.title, scheduledDate: next.scheduledDate, startTime: next.startTime, endTime: next.endTime }
          : null,
      },
    });
  };

  addStudent = async (req: GroupReq, res: Response) => {
    const { studentId } = parse(z.object({ studentId: z.string().optional() }), req.body);
    const group = await this.groups.addStudent(req.params.groupId, studentId, {
      trainerId: currentUser(req).id,
      studentLabel: 'Valid student',
    });
    res.json({
      success: true,
      message: 'Student added to group successfully',
      data: groupDoc(group, { course: 'id', trainer: 'id', students: 'basic' }),
    });
  };

  removeStudent = async (req: GroupReq, res: Response) => {
    const group = await this.groups.removeStudent(req.params.groupId, req.params.studentId ?? '', currentUser(req).id);
    res.json({
      success: true,
      message: 'Student removed from group successfully',
      data: groupDoc(group, { course: 'id', trainer: 'id', students: 'basic' }),
    });
  };

  stats = async (req: GroupReq, res: Response) => {
    const { group, enrolled, summary } = await this.groups.stats(req.params.groupId, currentUser(req).id);
    res.json({
      success: true,
      data: {
        students: { enrolled, capacity: group.maxStudents, utilizationRate: Math.round((enrolled / group.maxStudents) * 100) },
        sessions: {
          total: summary.totalSessions,
          completed: summary.completedSessions,
          upcoming: summary.upcomingSessions,
          cancelled: summary.cancelledSessions,
        },
        attendance: { average: summary.averageAttendance },
        performance: { average: group.averagePerformance },
        progress: liveProgress(summary),
      },
    });
  };

  students = async (req: GroupReq, res: Response) => {
    const { students } = await this.groups.students(req.params.groupId, currentUser(req).id);
    res.json({
      success: true,
      data: students.map(({ member, attendance: a }) => ({
        _id: member.id,
        name: member.name,
        email: member.email,
        profile: member.profile,
        attendance: {
          percentage: a.total > 0 ? Math.round(((a.present + a.late) / a.total) * 100) : 0,
          present: a.present,
          absent: a.absent,
          late: a.late,
          total: a.total,
        },
        enrolledAt: member.createdAt,
      })),
    });
  };

  /** GET /api/trainer/groups/courses/all */
  publishedCourses = async (_req: Request, res: Response) => {
    const list = await this.courses.published();
    res.json({
      success: true,
      data: list.map((c) => ({ _id: c.id, title: c.title, category: c.category, level: c.level, description: c.description, thumbnail: c.thumbnail })),
    });
  };
}
