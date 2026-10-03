import { z } from 'zod';
import { isValidId } from '../../shared/db/ids';
import { AppError, BadRequestError, ForbiddenError } from '../../shared/http/errors';
import { parse } from '../../shared/http/validate';
import type { CourseRepository } from '../courses/courses.repository';
import type { GroupMember, GroupRepository } from '../groups/groups.repository';
import type { SessionRepository } from '../sessions/sessions.repository';
import { autoFlags, participationScore, performanceScore } from './evaluation-score';
import {
  criteriaParametersSchema,
  type EvaluationField,
  evaluationFields,
  flagsSchema,
  overallRatingScaleSchema,
} from './evaluations.schemas';
import {
  type Criteria,
  EVALUATION_SORT_FIELDS,
  type Evaluation,
  type EvaluationFilter,
  type EvaluationRepository,
  type EvaluationSort,
} from './evaluations.repository';
import type { CriteriaMetadata, NewStudentEvaluationRow, StudentEvaluationRow } from './evaluations.table';

/** Tells the student about a new or changed evaluation (notifications arrive in phase 9). */
export interface EvaluationNotifier {
  evaluationSaved(studentId: string, evaluationId: string, kind: 'created' | 'updated', rating: number): Promise<void>;
}
export const silentEvaluationNotifier: EvaluationNotifier = { evaluationSaved: async () => {} };

const evaluationNotFound = () => new AppError('Evaluation not found', 404, 'NOT_FOUND');
const criteriaNotFound = () => new AppError('Evaluation criteria not found', 404, 'NOT_FOUND');

const ids = z.array(z.string().refine(isValidId, 'Invalid ID'));
const createCriteriaSchema = z.object({
  name: z.string().trim().max(200, 'Name cannot exceed 200 characters').optional(),
  description: z.string().trim().max(500, 'Description cannot exceed 500 characters').optional(),
  appliesTo: z.enum(['course', 'groups'], { error: 'appliesTo must be course or groups' }).optional(),
  courseIds: ids.optional(),
  groupIds: ids.optional(),
  parameters: criteriaParametersSchema.optional(),
  includeOverallRating: z.boolean().optional(),
  overallRatingScale: overallRatingScaleSchema.optional(),
  status: z.enum(['active', 'inactive', 'archived'], { error: 'Invalid status' }).optional(),
});

function snapshot(c: Criteria): CriteriaMetadata {
  return {
    parametersConfig: c.parameters.map((p) => ({ name: p.name, type: p.type, weight: p.weight, ratingScale: p.ratingScale })),
    includeOverallRating: c.includeOverallRating,
    overallRatingScale: c.overallRatingScale,
  };
}

export interface StudentStats {
  totalEvaluations: number;
  averageRating: string | number;
  averagePerformanceScore: number;
  averageSkillRating: string | number;
  attendanceRate: number;
  averageParticipation: string | number;
}

export class EvaluationService {
  constructor(
    private readonly evaluations: EvaluationRepository,
    private readonly groups: Pick<GroupRepository, 'findById' | 'isMember' | 'membersOf' | 'list'>,
    private readonly sessions: Pick<SessionRepository, 'findById'>,
    private readonly courses: Pick<CourseRepository, 'findById' | 'subCoursesOf'>,
    private readonly notifier: EvaluationNotifier,
    private readonly now: () => Date = () => new Date(),
  ) {}

  // ================= Criteria (CLO) =================

  listCriteria(userId: string, q: { courseId?: string; status?: string }) {
    return this.evaluations.listCriteria({ createdById: userId, courseId: isValidId(q.courseId) ? q.courseId : undefined, status: q.status || undefined });
  }

  async getCriteria(id: string): Promise<Criteria> {
    const c = isValidId(id) ? await this.evaluations.findCriteria(id) : null;
    if (!c) throw criteriaNotFound();
    return c;
  }

  /** Checks the courses exist and that every group belongs to one of them (or to a sub-course of a bundle). */
  private async checkScope(appliesTo: 'course' | 'groups', courseIds: string[], groupIds: string[]) {
    const found = await Promise.all(courseIds.map((id) => this.courses.findById(id)));
    if (found.some((c) => !c)) throw new AppError('One or more courses not found', 404, 'NOT_FOUND');
    if (appliesTo !== 'groups') return;
    if (groupIds.length === 0) throw new BadRequestError('At least one group must be specified');
    const bundles = found.filter((c) => c!.type === 'bundle').map((c) => c!.id);
    const subs = await this.courses.subCoursesOf(bundles);
    const allowed = new Set([...courseIds, ...[...subs.values()].flat().map((c) => c.id)]);
    for (const groupId of new Set(groupIds)) {
      const g = await this.groups.findById(groupId);
      if (!g || !allowed.has(g.courseId)) throw new BadRequestError('Some groups not found or do not belong to the specified courses');
    }
  }

  async createCriteria(userId: string, body: unknown): Promise<Criteria> {
    const input = parse(createCriteriaSchema, body);
    if (!input.name || !input.courseIds?.length || !input.appliesTo) throw new BadRequestError('Name, courseIds, and appliesTo are required');
    const courseIds = [...new Set(input.courseIds)];
    const groupIds = input.appliesTo === 'groups' ? [...new Set(input.groupIds ?? [])] : [];
    await this.checkScope(input.appliesTo, courseIds, groupIds);
    const id = await this.evaluations.createCriteria(
      {
        name: input.name,
        description: input.description,
        appliesTo: input.appliesTo,
        createdById: userId,
        parameters: input.parameters ?? [],
        includeOverallRating: input.includeOverallRating ?? true,
        overallRatingScale: input.overallRatingScale ?? { min: 1, max: 5 },
        status: 'active',
      },
      courseIds,
      groupIds,
    );
    return this.getCriteria(id);
  }

  async updateCriteria(userId: string, id: string, body: unknown): Promise<Criteria> {
    const current = isValidId(id) ? await this.evaluations.findCriteria(id) : null;
    if (!current || current.createdById !== userId) throw criteriaNotFound();
    const input = parse(createCriteriaSchema, body);
    if (input.name !== undefined && !input.name) throw new BadRequestError('Criteria name is required');

    const appliesTo = input.appliesTo ?? current.appliesTo;
    const courseIds = input.courseIds ? [...new Set(input.courseIds)] : current.courses.map((c) => c.id);
    const groupIds = appliesTo === 'groups' ? (input.groupIds ? [...new Set(input.groupIds)] : current.groups.map((g) => g.id)) : [];
    if (courseIds.length === 0) throw new BadRequestError('At least one course must be specified');
    if (input.appliesTo || input.courseIds || input.groupIds) await this.checkScope(appliesTo, courseIds, groupIds);

    await this.evaluations.updateCriteria(
      id,
      {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        appliesTo,
        ...(input.parameters && { parameters: input.parameters }),
        ...(input.includeOverallRating !== undefined && { includeOverallRating: input.includeOverallRating }),
        ...(input.overallRatingScale && { overallRatingScale: input.overallRatingScale }),
        ...(input.status && { status: input.status }),
      },
      { courseIds, groupIds },
    );
    const updated = await this.getCriteria(id);
    if (input.parameters) await this.refreshEvaluations(updated, current.parameters.map((p) => p.name));
    return updated;
  }

  /** After a parameter change: drop answers to removed parameters and store the new snapshot. */
  private async refreshEvaluations(criteria: Criteria, oldNames: string[]) {
    const names = new Set(criteria.parameters.map((p) => p.name));
    const removed = oldNames.filter((n) => !names.has(n));
    let groupIds = criteria.groups.map((g) => g.id);
    if (criteria.appliesTo === 'course') {
      const lists = await Promise.all(criteria.courses.map((c) => this.groups.list({ courseId: c.id })));
      groupIds = lists.flat().map((g) => g.id);
    }
    const affected = await this.evaluations.list({ groupIds });
    const metadata = snapshot(criteria);
    for (const e of affected) {
      const parameters = { ...e.parameters };
      for (const name of removed) delete parameters[name];
      await this.evaluations.update(e.id, { parameters, criteriaMetadata: metadata });
    }
  }

  async deleteCriteria(userId: string, id: string): Promise<void> {
    const current = isValidId(id) ? await this.evaluations.findCriteria(id) : null;
    if (!current || current.createdById !== userId) throw criteriaNotFound();
    await this.evaluations.deleteCriteria(id);
  }

  private async criteriaOf(groupId: string, courseId: string): Promise<Criteria | null> {
    const course = await this.courses.findById(courseId);
    return this.evaluations.criteriaForGroup(groupId, course?.parentBundleId ? [courseId, course.parentBundleId] : [courseId]);
  }

  async criteriaForGroup(groupId: string): Promise<Criteria> {
    const group = isValidId(groupId) ? await this.groups.findById(groupId) : null;
    if (!group) throw new AppError('Group not found', 404, 'NOT_FOUND');
    const criteria = await this.criteriaOf(group.id, group.courseId);
    if (!criteria) throw new AppError('No evaluation criteria found for this group', 404, 'NOT_FOUND');
    return criteria;
  }

  // ================= Evaluations (trainer) =================

  /** Parses the given sections; with `withDefaults` the missing ones get their defaults (create). */
  private sections(body: Record<string, unknown>, withDefaults: boolean): Partial<NewStudentEvaluationRow> & { flags?: z.infer<typeof flagsSchema> } {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(evaluationFields) as EvaluationField[]) {
      if (key === 'overallRating' || key === 'flags') continue;
      const value = body[key];
      if (value === undefined || value === null) {
        if (withDefaults) out[key] = (evaluationFields[key] as z.ZodType).parse(undefined);
        continue;
      }
      out[key] = parse(evaluationFields[key], value);
    }
    if (body.flags !== undefined && body.flags !== null) out.flags = parse(flagsSchema, body.flags);
    return out;
  }

  private async newRow(trainerId: string, sessionId: string, groupId: string, courseId: string, body: Record<string, unknown>): Promise<NewStudentEvaluationRow> {
    const overallRating = parse(evaluationFields.overallRating, body.overallRating);
    const { flags, ...sections } = this.sections(body, true);
    const parameters = (sections.parameters ?? {}) as Record<string, unknown>;
    const criteria = Object.keys(parameters).length > 0 ? await this.criteriaOf(groupId, courseId) : null;
    const row = {
      ...(sections as Omit<NewStudentEvaluationRow, 'studentId' | 'sessionId' | 'groupId' | 'overallRating'>),
      studentId: String(body.studentId),
      trainerId,
      sessionId,
      groupId,
      overallRating,
      parameters,
      criteriaMetadata: criteria ? snapshot(criteria) : null,
      needsAttention: flags?.needsAttention ?? false,
      atRisk: flags?.atRisk ?? false,
      excelling: flags?.excelling ?? false,
      parentContactNeeded: flags?.parentContactNeeded ?? false,
    } as NewStudentEvaluationRow;
    return { ...row, ...autoFlags(row as StudentEvaluationRow) };
  }

  async create(trainerId: string, body: Record<string, unknown>): Promise<Evaluation> {
    const { studentId, sessionId, groupId } = body;
    if (!studentId || !sessionId || !groupId || !body.overallRating) throw new BadRequestError('Student, session, group, and overall rating are required');
    const session = isValidId(sessionId) ? await this.sessions.findById(sessionId) : null;
    if (!session) throw new AppError('Session not found', 404, 'NOT_FOUND');
    const group = isValidId(groupId) ? await this.groups.findById(groupId) : null;
    if (!group) throw new AppError('Group not found', 404, 'NOT_FOUND');
    // New: the session has to be one of the group's sessions.
    if (session.groupId !== group.id) throw new BadRequestError('Session does not belong to this group');
    if (!isValidId(studentId) || !(await this.groups.isMember(group.id, studentId))) throw new BadRequestError('Student is not enrolled in this group');
    const existing = await this.evaluations.findForSessionStudent(session.id, studentId);
    if (existing) throw new AppError('Evaluation already exists for this student in this session', 400, 'EVALUATION_EXISTS', { evaluationId: existing.id });

    const id = await this.evaluations.create(await this.newRow(trainerId, session.id, group.id, group.courseId, body));
    const created = (await this.evaluations.findById(id))!;
    await this.notifier.evaluationSaved(studentId, id, 'created', created.overallRating).catch(() => undefined);
    return created;
  }

  private async owned(id: string, trainerId: string, action: string) {
    const e = isValidId(id) ? await this.evaluations.findById(id) : null;
    if (!e) throw evaluationNotFound();
    if (e.trainerId !== trainerId) throw new ForbiddenError(`You can only ${action} your own evaluations`);
    return e;
  }

  async update(trainerId: string, id: string, body: Record<string, unknown>): Promise<Evaluation> {
    const current = await this.owned(id, trainerId, 'update');
    const patch: Partial<NewStudentEvaluationRow> = {};
    if (body.overallRating !== undefined) patch.overallRating = parse(evaluationFields.overallRating, body.overallRating);
    const { flags, ...sections } = this.sections(body, false);
    Object.assign(patch, sections);
    if (flags) {
      patch.needsAttention = flags.needsAttention ?? false;
      patch.atRisk = flags.atRisk ?? false;
      patch.excelling = flags.excelling ?? false;
      patch.parentContactNeeded = flags.parentContactNeeded ?? false;
    }
    if (body.parameters !== undefined && current.group) {
      const criteria = await this.criteriaOf(current.groupId, current.group.courseId);
      if (criteria) {
        const names = new Set(criteria.parameters.map((p) => p.name));
        const parameters = { ...((patch.parameters ?? {}) as Record<string, unknown>) };
        for (const key of Object.keys(parameters)) if (!names.has(key)) delete parameters[key];
        patch.parameters = parameters;
        patch.criteriaMetadata = snapshot(criteria);
      }
    }
    const merged = { ...current, ...patch } as StudentEvaluationRow;
    await this.evaluations.update(id, { ...patch, ...autoFlags(merged), lastModified: this.now() });
    const updated = (await this.evaluations.findById(id))!;
    if (body.overallRating !== undefined) await this.notifier.evaluationSaved(updated.studentId, id, 'updated', updated.overallRating).catch(() => undefined);
    return updated;
  }

  async get(id: string): Promise<Evaluation> {
    const e = isValidId(id) ? await this.evaluations.findById(id) : null;
    if (!e) throw evaluationNotFound();
    return e;
  }

  /** Common list filters from a query string. */
  filterFrom(q: Record<string, string | undefined>): EvaluationFilter {
    const int = (v?: string) => {
      const n = Number.parseInt(v ?? '', 10);
      return Number.isFinite(n) ? n : undefined;
    };
    const day = (v?: string) => {
      const d = v ? new Date(v) : undefined;
      return d && !Number.isNaN(d.getTime()) ? d : undefined;
    };
    return {
      studentId: isValidId(q.studentId) ? q.studentId : undefined,
      sessionId: isValidId(q.sessionId) ? q.sessionId : undefined,
      groupId: isValidId(q.groupId) ? q.groupId : undefined,
      trainerId: isValidId(q.trainerId) ? q.trainerId : undefined,
      minRating: int(q.minRating),
      maxRating: int(q.maxRating),
      needsAttention: q.needsAttention === 'true' || undefined,
      atRisk: q.atRisk === 'true' || undefined,
      excelling: q.excelling === 'true' || undefined,
      // The old CLO filter named a field that does not exist; it now filters by participation level.
      participationLevel: q.engagementLevel || undefined,
      startDate: day(q.startDate),
      endDate: day(q.endDate),
    };
  }

  sortFrom(q: Record<string, string | undefined>): EvaluationSort {
    const by = (EVALUATION_SORT_FIELDS as readonly string[]).includes(q.sortBy ?? '') ? (q.sortBy as EvaluationSort['by']) : 'evaluationDate';
    return { by, order: q.sortOrder === 'asc' ? 'asc' : 'desc' };
  }

  async page(filter: EvaluationFilter, sort: EvaluationSort, page: { limit: number; offset: number }) {
    const [rows, total] = await Promise.all([this.evaluations.list(filter, sort, page), this.evaluations.count(filter)]);
    return { rows, total };
  }

  async forSession(sessionId: string) {
    const session = isValidId(sessionId) ? await this.sessions.findById(sessionId) : null;
    if (!session) throw new AppError('Session not found', 404, 'NOT_FOUND');
    const evaluations = (await this.evaluations.list({ sessionId: session.id }, { by: 'overallRating', order: 'desc' })).filter((e) => e.student);
    const members: GroupMember[] = (await this.groups.membersOf([session.groupId])).get(session.groupId) ?? [];
    const done = new Set(evaluations.map((e) => e.studentId));
    const unevaluated = members.filter((m) => !done.has(m.id));
    return {
      session,
      evaluations,
      unevaluated,
      stats: { totalStudents: members.length, evaluated: evaluations.length, pending: unevaluated.length },
    };
  }

  studentStats(list: StudentEvaluationRow[]): StudentStats {
    if (list.length === 0) {
      return { totalEvaluations: 0, averageRating: 0, averagePerformanceScore: 0, averageSkillRating: 0, attendanceRate: 0, averageParticipation: 0 };
    }
    const n = list.length;
    const sum = (f: (e: StudentEvaluationRow) => number) => list.reduce((s, e) => s + f(e), 0);
    const skill = (e: StudentEvaluationRow) => {
      const s = e.skillRatings;
      return Number.parseFloat(((s.technicalSkills + s.problemSolving + s.creativity + s.teamwork + s.communication) / 5).toFixed(1));
    };
    return {
      totalEvaluations: n,
      averageRating: (sum((e) => e.overallRating) / n).toFixed(1),
      averagePerformanceScore: Math.round(sum(performanceScore) / n),
      averageSkillRating: (sum(skill) / n).toFixed(1),
      attendanceRate: Math.round((list.filter((e) => e.attendance.status === 'present').length / n) * 100),
      averageParticipation: (sum(participationScore) / n).toFixed(1),
    };
  }

  async forStudent(trainerId: string, studentId: string, groupId?: string) {
    const group = isValidId(groupId) ? groupId : undefined;
    const [evaluations, all] = await Promise.all([
      this.evaluations.list({ trainerId, studentId, groupId: group }),
      // Stats and progress cover every trainer's evaluations of the student, as before.
      this.evaluations.list({ studentId, groupId: group }, { by: 'evaluationDate', order: 'asc' }),
    ]);
    return { evaluations, stats: this.studentStats(all), progress: all };
  }

  async trainerStats(filter: EvaluationFilter) {
    const list = await this.evaluations.list(filter);
    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const flaggedStudents = { needsAttention: 0, atRisk: 0, excelling: 0 };
    if (list.length === 0) return { total: 0, averageRating: 0, averagePerformanceScore: 0, ratingDistribution, attendanceRate: 0, flaggedStudents };
    let rating = 0;
    let performance = 0;
    let present = 0;
    for (const e of list) {
      rating += e.overallRating;
      performance += performanceScore(e);
      ratingDistribution[e.overallRating] = (ratingDistribution[e.overallRating] ?? 0) + 1;
      if (e.attendance.status === 'present') present++;
      if (e.needsAttention) flaggedStudents.needsAttention++;
      if (e.atRisk) flaggedStudents.atRisk++;
      if (e.excelling) flaggedStudents.excelling++;
    }
    const n = list.length;
    return {
      total: n,
      averageRating: (rating / n).toFixed(1),
      averagePerformanceScore: Math.round(performance / n),
      ratingDistribution,
      attendanceRate: Math.round((present / n) * 100),
      flaggedStudents,
    };
  }

  async bulk(trainerId: string, body: { sessionId?: unknown; evaluations?: unknown }) {
    if (!body.sessionId || !Array.isArray(body.evaluations)) throw new BadRequestError('Session ID and evaluations array are required');
    const session = isValidId(body.sessionId) ? await this.sessions.findById(body.sessionId) : null;
    if (!session) throw new AppError('Session not found', 404, 'NOT_FOUND');
    if (session.trainerId !== trainerId) throw new ForbiddenError('You can only evaluate students in your own sessions');
    const group = await this.groups.findById(session.groupId);
    if (!group) throw new AppError('Group not found', 404, 'NOT_FOUND');

    const created: Evaluation[] = [];
    const errors: { studentId: unknown }[] = [];
    for (const item of body.evaluations as Record<string, unknown>[]) {
      try {
        const studentId = item?.studentId;
        // New: only members of the session's group can be evaluated.
        if (!isValidId(studentId) || !(await this.groups.isMember(group.id, studentId))) throw new Error('not a member');
        if (await this.evaluations.findForSessionStudent(session.id, studentId)) throw new Error('exists');
        const id = await this.evaluations.create(await this.newRow(trainerId, session.id, group.id, group.courseId, item));
        created.push((await this.evaluations.findById(id))!);
      } catch {
        errors.push({ studentId: item?.studentId });
      }
    }
    return { created, errors };
  }

  async delete(trainerId: string, id: string): Promise<void> {
    await this.owned(id, trainerId, 'delete');
    await this.evaluations.delete(id);
  }

  async share(trainerId: string, id: string, body: { shareWithStudent?: unknown; shareWithParent?: unknown }): Promise<Evaluation> {
    const e = await this.owned(id, trainerId, 'share');
    const patch: Partial<NewStudentEvaluationRow> = {};
    const now = this.now();
    if (body.shareWithStudent) Object.assign(patch, { sharedWithStudent: true, sharedAt: now });
    if (body.shareWithParent) Object.assign(patch, { sharedWithParent: true, sharedAt: patch.sharedAt ?? e.sharedAt ?? now });
    if (Object.keys(patch).length) await this.evaluations.update(id, { ...patch, lastModified: now });
    return (await this.evaluations.findById(id))!;
  }

  /** Evaluations flagged for attention, grouped per student (newest first). */
  async flagged(trainerId: string, groupId?: string) {
    const list = await this.evaluations.list({ trainerId, needsAttention: true, groupId: isValidId(groupId) ? groupId : undefined });
    const byStudent = new Map<string, { evaluation: Evaluation; evaluations: Evaluation[]; flags: { needsAttention: boolean; atRisk: boolean; parentContactNeeded: boolean } }>();
    for (const e of list) {
      if (!e.student) continue;
      let entry = byStudent.get(e.studentId);
      if (!entry) byStudent.set(e.studentId, (entry = { evaluation: e, evaluations: [], flags: { needsAttention: false, atRisk: false, parentContactNeeded: false } }));
      entry.evaluations.push(e);
      if (e.needsAttention) entry.flags.needsAttention = true;
      if (e.atRisk) entry.flags.atRisk = true;
      if (e.parentContactNeeded) entry.flags.parentContactNeeded = true;
    }
    return [...byStudent.values()];
  }

  // ================= CLO overview =================

  async forGroup(groupId: string) {
    const evaluations = isValidId(groupId) ? await this.evaluations.list({ groupId }) : [];
    const n = evaluations.length;
    if (n === 0) return { evaluations, stats: { totalEvaluations: 0, averageRating: 0, averageEngagement: 0, averageObjectivesAchievement: 0 } };
    const sum = (f: (e: Evaluation) => number) => evaluations.reduce((s, e) => s + f(e), 0);
    return {
      evaluations,
      stats: {
        totalEvaluations: n,
        averageRating: (sum((e) => e.overallRating) / n).toFixed(1),
        averageEngagement: (sum(participationScore) / n).toFixed(1),
        // The old value read a field evaluations never had; it is now the average performance score.
        averageObjectivesAchievement: Math.round(sum(performanceScore) / n),
      },
    };
  }

  async cloStats(filter: EvaluationFilter) {
    const list = await this.evaluations.list(filter);
    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const engagementDistribution: Record<string, number> = { very_low: 0, low: 0, medium: 0, high: 0, very_high: 0 };
    if (list.length === 0) return { total: 0, averageRating: 0, averageObjectivesAchievement: 0, engagementDistribution, ratingDistribution };
    for (const e of list) {
      ratingDistribution[e.overallRating] = (ratingDistribution[e.overallRating] ?? 0) + 1;
      engagementDistribution[e.participation.level] = (engagementDistribution[e.participation.level] ?? 0) + 1;
    }
    const n = list.length;
    return {
      total: n,
      averageRating: (list.reduce((s, e) => s + e.overallRating, 0) / n).toFixed(1),
      averageObjectivesAchievement: Math.round(list.reduce((s, e) => s + performanceScore(e), 0) / n),
      engagementDistribution,
      ratingDistribution,
    };
  }

  // ================= Student =================

  async mine(studentId: string) {
    const list = (await this.evaluations.list({ studentId })).filter((e) => e.session);
    const courses = new Map<string, { courseId: string | null; courseName: string; groupName: string | null; evaluations: Evaluation[] }>();
    for (const e of list) {
      const key = e.course ? e.course.id : `group:${e.group?.name ?? ''}`;
      if (!courses.has(key)) courses.set(key, { courseId: e.course?.id ?? null, courseName: e.course?.title ?? e.group?.name ?? 'Unknown Course', groupName: e.group?.name ?? null, evaluations: [] });
      courses.get(key)!.evaluations.push(e);
    }
    const courseGroups = [...courses.values()].map((c) => {
      const avg = c.evaluations.length ? c.evaluations.reduce((s, e) => s + e.overallRating, 0) / c.evaluations.length : null;
      return {
        ...c,
        totalSessions: c.evaluations.length,
        scoredSessions: c.evaluations.length,
        averageScore: avg !== null ? Math.round(avg * 10) / 10 : null,
        percentage: avg !== null ? Math.round((avg / 5) * 100) : null,
      };
    });
    const scored = courseGroups.filter((c) => c.averageScore !== null);
    const overallAverage = scored.length >= 2 ? Math.round((scored.reduce((s, c) => s + c.averageScore!, 0) / scored.length) * 10) / 10 : null;
    return { list, courseGroups, overallAverage, overallPercentage: overallAverage !== null ? Math.round((overallAverage / 5) * 100) : null };
  }
}

