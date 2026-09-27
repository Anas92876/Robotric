import { newId } from '../../shared/db/ids';
import { AppError, BadRequestError, NotFoundError } from '../../shared/http/errors';
import type { Logger } from '../../shared/logger';
import type { Group, GroupRepository } from '../groups/groups.repository';
import { calendarRange, minutesOf, nextScheduledSlot } from './session-time';
import type { Session, SessionFilter, SessionRepository } from './sessions.repository';
import { EMPTY_LESSON_PLAN, type LessonPlan, type NewSessionRow } from './sessions.table';

/** Who is acting: a trainer is limited to their own groups; the CLO is not. */
export type Actor = { role: 'trainer'; userId: string } | { role: 'clo'; userId: string };

export interface SessionNotifier {
  sessionScheduled(studentIds: string[], session: Session): Promise<void>;
}
export const silentSessionNotifier: SessionNotifier = { sessionScheduled: async () => {} };

/** The attendance sheet of a session, if taken (attendance module). */
export interface SessionAttendanceLookup {
  sheetIdFor(sessionId: string): Promise<string | null>;
}

export interface LessonPlanInput {
  objectives?: string[];
  outline?: (Omit<LessonPlan['outline'][number], '_id'> & { _id?: string })[];
  materialsNeeded?: string[];
  attachments?: (Omit<LessonPlan['attachments'][number], '_id' | 'uploadedAt'> & { _id?: string; uploadedAt?: string })[];
  notes?: string;
}

export interface SessionInput {
  title?: string;
  description?: string | null;
  groupId?: string;
  lessonPlan?: LessonPlanInput;
  overrideSchedule?: boolean;
  scheduledDate?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  video?: { hasVideo?: boolean; youtubeId?: string };
}

const notFound = () => new NotFoundError('Session');

/** Gives lesson-plan sub-items the ids Mongoose used to generate. */
function normalizePlan(plan: LessonPlanInput, base: LessonPlan = EMPTY_LESSON_PLAN): LessonPlan {
  return {
    ...base,
    ...plan,
    objectives: plan.objectives ?? base.objectives,
    materialsNeeded: plan.materialsNeeded ?? base.materialsNeeded,
    outline: plan.outline ? plan.outline.map((o) => ({ ...o, activities: o.activities ?? [], _id: o._id ?? newId() })) : base.outline,
    attachments: plan.attachments
      ? plan.attachments.map((a) => ({ ...a, _id: a._id ?? newId(), uploadedAt: a.uploadedAt ?? new Date().toISOString() }))
      : base.attachments,
  };
}

function checkTimes(start: string | null | undefined, end: string | null | undefined): number | undefined {
  if (!start || !end) return undefined;
  const duration = minutesOf(end) - minutesOf(start);
  if (duration <= 0) throw new BadRequestError('End time must be after start time');
  return duration;
}

const videoOf = (v: SessionInput['video']) => ({ videoHas: Boolean(v?.hasVideo && v.youtubeId?.trim()), videoYoutubeId: v?.youtubeId?.trim() ?? '' });

export class SessionService {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly groups: Pick<GroupRepository, 'findById' | 'list' | 'membersOf'>,
    private readonly attendance: SessionAttendanceLookup,
    private readonly notifier: SessionNotifier,
    private readonly logger: Logger,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private async trainerGroupIds(trainerId: string): Promise<string[]> {
    return (await this.groups.list({ trainerId })).map((g) => g.id);
  }

  /** Loads a session the actor may see; another trainer's session looks "not found". */
  private async require(id: string, actor: Actor): Promise<{ session: Session; group: Group | null }> {
    const session = await this.sessions.findById(id);
    if (!session) throw notFound();
    const group = await this.groups.findById(session.groupId);
    if (actor.role === 'trainer' && group?.trainerId !== actor.userId) throw notFound();
    return { session, group };
  }

  async list(filter: SessionFilter, actor: Actor): Promise<Session[]> {
    if (actor.role === 'trainer') {
      const own = await this.trainerGroupIds(actor.userId);
      return this.sessions.list({ ...filter, groupIds: own });
    }
    return this.sessions.list(filter);
  }

  async get(id: string, actor: Actor) {
    const { session } = await this.require(id, actor);
    const [sheetId, members] = await Promise.all([this.attendance.sheetIdFor(id), this.groups.membersOf([session.groupId])]);
    return { session, attendanceId: sheetId, studentsCount: members.get(session.groupId)?.length ?? 0 };
  }

  async create(input: SessionInput, actor: Actor): Promise<Session> {
    if (!input.title || !input.groupId) throw new AppError('Title and groupId are required', 400, 'BAD_REQUEST');
    const group = await this.groups.findById(input.groupId);
    if (!group || (actor.role === 'trainer' && group.trainerId !== actor.userId)) {
      throw new AppError(actor.role === 'trainer' ? 'Group not found or does not belong to you' : 'Group not found', 404, 'NOT_FOUND');
    }

    const existing = await this.sessions.countForGroup(group.id);
    let schedule: { scheduledDate: Date; startTime: string; endTime: string; duration: number };
    if (input.overrideSchedule) {
      if (!input.scheduledDate || !input.startTime || !input.endTime) {
        throw new BadRequestError('Custom schedule requires date, startTime, and endTime');
      }
      const scheduledDate = new Date(input.scheduledDate);
      if (Number.isNaN(scheduledDate.getTime())) throw new BadRequestError('Invalid scheduledDate');
      scheduledDate.setHours(0, 0, 0, 0);
      const duration = input.duration && input.duration > 0 ? input.duration : minutesOf(input.endTime) - minutesOf(input.startTime);
      if (duration <= 0) throw new BadRequestError('endTime must be after startTime');
      schedule = { scheduledDate, startTime: input.startTime, endTime: input.endTime, duration };
    } else {
      schedule = nextScheduledSlot(group.schedule, existing, this.now());
    }

    const id = await this.sessions.create({
      title: input.title,
      description: input.description ?? null,
      groupId: group.id,
      courseId: group.courseId,
      trainerId: group.trainerId,
      overrideSchedule: Boolean(input.overrideSchedule),
      sessionNumber: existing + 1,
      status: 'scheduled',
      lessonPlan: normalizePlan(input.lessonPlan ?? {}),
      ...(actor.role === 'clo' ? videoOf(input.video) : {}),
      ...schedule,
    });
    const session = (await this.sessions.findById(id))!;

    const students = (await this.groups.membersOf([group.id])).get(group.id)?.map((m) => m.id) ?? [];
    if (students.length > 0) {
      this.notifier.sessionScheduled(students, session).catch((err: unknown) => this.logger.warn({ err }, 'Session notification failed'));
    }
    return session;
  }

  async update(id: string, input: SessionInput, actor: Actor): Promise<Session> {
    const { session } = await this.require(id, actor);
    if (actor.role === 'trainer' && session.status === 'completed') throw new BadRequestError('Cannot update a completed session');

    const changes: Partial<NewSessionRow> = {};
    if (input.title !== undefined) changes.title = input.title;
    if (input.description !== undefined) changes.description = input.description;
    if (input.lessonPlan !== undefined) changes.lessonPlan = normalizePlan(input.lessonPlan);
    if (input.scheduledDate !== undefined) changes.scheduledDate = new Date(input.scheduledDate);
    if (input.startTime !== undefined) changes.startTime = input.startTime;
    if (input.endTime !== undefined) changes.endTime = input.endTime;
    if (input.overrideSchedule !== undefined) changes.overrideSchedule = input.overrideSchedule;
    if (actor.role === 'clo' && input.video !== undefined) Object.assign(changes, videoOf(input.video));
    // Duration always follows the times (old pre-save hook).
    const duration = checkTimes(changes.startTime ?? session.startTime, changes.endTime ?? session.endTime);
    if (duration !== undefined) changes.duration = duration;

    if (Object.keys(changes).length > 0) await this.sessions.update(id, changes);
    return (await this.sessions.findById(id))!;
  }

  /** Cancels, or with `permanent` deletes (its attendance sheet goes with it). */
  async remove(id: string, opts: { permanent: boolean; reason?: string }, actor: Actor): Promise<Session | null> {
    await this.require(id, actor);
    if (opts.permanent) {
      await this.sessions.delete(id);
      return null;
    }
    await this.sessions.update(id, {
      status: 'cancelled',
      cancellationReason: opts.reason || (actor.role === 'trainer' ? 'Cancelled by trainer' : 'Cancelled by CLO'),
    });
    return (await this.sessions.findById(id))!;
  }

  async start(id: string, actor: Actor): Promise<Session> {
    const { session } = await this.require(id, actor);
    if (session.status !== 'scheduled') throw new BadRequestError(`Cannot start a session with status: ${session.status}`);
    await this.sessions.update(id, { status: 'in_progress', actualStartTime: this.now() });
    return (await this.sessions.findById(id))!;
  }

  async end(id: string, actor: Actor): Promise<Session> {
    const { session } = await this.require(id, actor);
    if (session.status !== 'in_progress') throw new BadRequestError(`Cannot end a session with status: ${session.status}`);
    await this.sessions.update(id, { status: 'completed', actualEndTime: this.now() });
    return (await this.sessions.findById(id))!;
  }

  async updateLessonPlan(id: string, plan: LessonPlanInput, actor: Actor): Promise<Session> {
    const { session } = await this.require(id, actor);
    await this.sessions.update(id, { lessonPlan: normalizePlan(plan, session.lessonPlan) });
    return (await this.sessions.findById(id))!;
  }

  async calendar(trainerId: string, view = 'month', date?: string) {
    const ref = date ? new Date(date) : this.now();
    const { startDate, endDate } = calendarRange(view, ref);
    const list = await this.sessions.list({ groupIds: await this.trainerGroupIds(trainerId), startDate, endDate });
    return { view, startDate, endDate, sessions: list };
  }

  /** GET /api/clo/groups/:id/sessions */
  async forGroup(groupId: string, filter: SessionFilter, order: 'asc' | 'desc') {
    const group = await this.groups.findById(groupId);
    if (!group) throw new AppError('Group not found', 404, 'NOT_FOUND');
    const list = await this.sessions.list({ ...filter, groupId });
    return { group, sessions: order === 'desc' ? list.reverse() : list };
  }
}
