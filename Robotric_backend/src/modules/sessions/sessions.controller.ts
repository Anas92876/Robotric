import type { Request, Response } from 'express';
import { z } from 'zod';
import { currentUser } from '../../shared/http/request-user';
import { booleanish, numeric, parse } from '../../shared/http/validate';
import type { GroupRepository } from '../groups/groups.repository';
import { autoStatus, sessionVirtuals } from './session-time';
import type { Session } from './sessions.repository';
import type { Actor, SessionService } from './sessions.service';

// ─── Request schemas ─────────────────────────────────────────────────────────

const hhmm = z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format');
const lessonPlan = z.object({
  objectives: z.array(z.string().trim().max(300, 'Objective cannot exceed 300 characters')).optional(),
  outline: z
    .array(
      z.object({
        _id: z.string().optional(),
        startTime: z.string(),
        endTime: z.string(),
        duration: numeric('Outline duration must be a number').refine((v) => v >= 1, 'Outline duration must be at least 1'),
        title: z.string().trim().min(1, 'Outline title is required').max(200, 'Outline title cannot exceed 200 characters'),
        description: z.string().trim().max(1000, 'Outline description cannot exceed 1000 characters').optional(),
        activities: z.array(z.string().trim()).default([]),
      }),
    )
    .optional(),
  materialsNeeded: z.array(z.string().trim()).optional(),
  attachments: z
    .array(
      z.object({
        _id: z.string().optional(),
        filename: z.string(),
        originalName: z.string(),
        url: z.string(),
        fileType: z.string(),
        fileSize: numeric('File size must be a number'),
        uploadedAt: z.string().optional(),
      }),
    )
    .optional(),
  notes: z.string().max(2000, 'Notes cannot exceed 2000 characters').optional(),
});

const sessionBody = z.object({
  title: z.string().trim().max(200, 'Title cannot exceed 200 characters').optional(),
  description: z.string().trim().max(2000, 'Description cannot exceed 2000 characters').nullish(),
  groupId: z.union([z.string(), z.object({ _id: z.string() }).transform((g) => g._id)]).optional(),
  lessonPlan: lessonPlan.optional(),
  overrideSchedule: booleanish.optional(),
  scheduledDate: z.string().optional(),
  startTime: hhmm.optional(),
  endTime: hhmm.optional(),
  duration: numeric('Duration must be a number').optional(),
  video: z.object({ hasVideo: booleanish.optional(), youtubeId: z.string().optional() }).optional(),
});

const listQuery = z.object({
  groupId: z.string().optional(),
  status: z.string().optional(),
  startDate: z.coerce.date().optional().catch(undefined),
  endDate: z.coerce.date().optional().catch(undefined),
  search: z.string().optional(),
});

// ─── Response shape ──────────────────────────────────────────────────────────

type Members = Map<string, string[]>;

/** The session document with the old virtuals; `live` swaps in the clock-based status. */
export function sessionDoc(s: Session, members: Members, opts: { live?: boolean; groupExtra?: boolean } = {}) {
  const status = opts.live ? autoStatus(s) : s.status;
  return {
    _id: s.id,
    groupId: s.group
      ? {
          _id: s.group.id,
          name: s.group.name,
          students: members.get(s.groupId) ?? [],
          color: s.group.color,
          ...(opts.groupExtra ? { maxStudents: s.group.maxStudents } : {}),
        }
      : s.groupId,
    courseId: s.course
      ? { _id: s.course.id, title: s.course.title, category: s.course.category, ...(opts.groupExtra ? { level: s.course.level } : {}) }
      : s.courseId,
    trainerId: s.trainerId,
    title: s.title,
    description: s.description,
    sessionNumber: s.sessionNumber,
    overrideSchedule: s.overrideSchedule,
    scheduledDate: s.scheduledDate,
    startTime: s.startTime,
    endTime: s.endTime,
    duration: s.duration,
    isOnline: s.isOnline,
    meetingLink: s.meetingLink,
    status,
    cancellationReason: s.cancellationReason,
    lessonPlan: s.lessonPlan,
    video: { hasVideo: s.videoHas, youtubeId: s.videoYoutubeId },
    evaluationId: s.evaluationId,
    actualStartTime: s.actualStartTime,
    actualEndTime: s.actualEndTime,
    isRecurring: s.isRecurring,
    recurrenceRule: s.recurrenceRule,
    parentSessionId: s.parentSessionId,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    ...sessionVirtuals(s),
    id: s.id,
  };
}

type SessionReq = Request<{ sessionId: string }>;

/** Shared by the trainer and CLO areas; the actor decides what is visible. */
export class SessionController {
  constructor(
    private readonly sessions: SessionService,
    private readonly groups: Pick<GroupRepository, 'membersOf'>,
    private readonly role: Actor['role'],
  ) {}

  private actor(req: Request): Actor {
    return { role: this.role, userId: currentUser(req).id };
  }

  private async members(list: Session[]): Promise<Members> {
    const byGroup = await this.groups.membersOf([...new Set(list.map((s) => s.groupId))]);
    return new Map([...byGroup].map(([g, m]) => [g, m.map((x) => x.id)]));
  }

  list = async (req: Request, res: Response) => {
    const list = await this.sessions.list(parse(listQuery, req.query), this.actor(req));
    const members = await this.members(list);
    const data = list.map((s) => sessionDoc(s, members, { live: true }));
    res.json({ success: true, count: data.length, data });
  };

  get = async (req: SessionReq, res: Response) => {
    const { session, attendanceId, studentsCount } = await this.sessions.get(req.params.sessionId, this.actor(req));
    res.json({
      success: true,
      data: {
        ...sessionDoc(session, await this.members([session]), { live: true, groupExtra: true }),
        hasAttendance: Boolean(attendanceId),
        attendanceId,
        hasEvaluation: Boolean(session.evaluationId),
        studentsCount,
      },
    });
  };

  create = async (req: Request, res: Response) => {
    const s = await this.sessions.create(parse(sessionBody, req.body), this.actor(req));
    res.status(201).json({ success: true, message: 'Session created successfully', data: sessionDoc(s, await this.members([s])) });
  };

  update = async (req: SessionReq, res: Response) => {
    const s = await this.sessions.update(req.params.sessionId, parse(sessionBody, req.body), this.actor(req));
    res.json({ success: true, message: 'Session updated successfully', data: sessionDoc(s, await this.members([s])) });
  };

  delete = async (req: SessionReq, res: Response) => {
    const q = req.query as Record<string, string | undefined>;
    const s = await this.sessions.remove(req.params.sessionId, { permanent: q.permanent === 'true', reason: q.reason }, this.actor(req));
    if (!s) {
      res.json({ success: true, message: 'Session permanently deleted' });
      return;
    }
    res.json({ success: true, message: 'Session cancelled successfully', data: sessionDoc(s, await this.members([s])) });
  };

  start = async (req: SessionReq, res: Response) => {
    const s = await this.sessions.start(req.params.sessionId, this.actor(req));
    res.json({ success: true, message: 'Session started successfully', data: sessionDoc(s, await this.members([s])) });
  };

  end = async (req: SessionReq, res: Response) => {
    const s = await this.sessions.end(req.params.sessionId, this.actor(req));
    res.json({ success: true, message: 'Session ended successfully', data: sessionDoc(s, await this.members([s])) });
  };

  lessonPlan = async (req: SessionReq, res: Response) => {
    const s = await this.sessions.updateLessonPlan(req.params.sessionId, parse(lessonPlan, req.body), this.actor(req));
    res.json({ success: true, message: 'Lesson plan updated successfully', data: sessionDoc(s, await this.members([s])) });
  };

  /** GET /api/trainer/sessions/calendar */
  calendar = async (req: Request, res: Response) => {
    const q = req.query as Record<string, string | undefined>;
    const r = await this.sessions.calendar(currentUser(req).id, q.view, q.date);
    const members = await this.members(r.sessions);
    const events = r.sessions.map((s) => {
      const v = sessionVirtuals(s);
      return {
        id: s.id,
        title: s.title,
        start: v.scheduledStartDateTime,
        end: v.scheduledEndDateTime,
        groupName: s.group?.name,
        groupColor: s.group?.color || '#30c59b',
        status: autoStatus(s),
        isOnline: s.isOnline,
        studentsCount: members.get(s.groupId)?.length ?? 0,
      };
    });
    res.json({ success: true, view: r.view, startDate: r.startDate, endDate: r.endDate, count: events.length, data: events });
  };

  /** GET /api/clo/groups/:id/sessions */
  forGroup = async (req: Request<{ id: string }>, res: Response) => {
    const q = parse(listQuery.extend({ order: z.enum(['asc', 'desc']).catch('asc') }), req.query);
    const { group, sessions } = await this.sessions.forGroup(req.params.id, q, q.order);
    const docs = sessions.map((s) => {
      const d = sessionDoc(s, new Map());
      return { ...d, trainerId: group.trainer ? { _id: group.trainer.id, name: group.trainer.name, email: group.trainer.email } : d.trainerId, courseId: s.course ? { _id: s.course.id, title: s.course.title } : s.courseId };
    });
    res.json({
      success: true,
      data: {
        group: {
          id: group.id,
          name: group.name,
          course: group.course ? { id: group.course.id, title: group.course.title } : null,
          trainer: group.trainer ? { id: group.trainer.id, name: group.trainer.name, email: group.trainer.email } : null,
        },
        sessions: docs,
        statistics: {
          total: sessions.length,
          completed: sessions.filter((s) => s.status === 'completed').length,
          scheduled: sessions.filter((s) => s.status === 'scheduled').length,
          inProgress: sessions.filter((s) => s.status === 'in_progress').length,
        },
      },
    });
  };
}
