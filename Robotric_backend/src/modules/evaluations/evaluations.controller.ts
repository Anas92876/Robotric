import type { Request, Response } from 'express';
import { parsePagination } from '../../shared/http/pagination';
import { currentUser } from '../../shared/http/request-user';
import { averageSkillRating, needsReview, participationScore, performanceScore } from './evaluation-score';
import type { Criteria, Evaluation } from './evaluations.repository';
import type { EvaluationService } from './evaluations.service';

type Populate = 'studentId' | 'trainerId' | 'sessionId' | 'groupId';

/** The old document with its virtuals; `populate` lists the references to expand. */
function evaluationDoc(e: Evaluation, populate: Populate[] = [], opts: { lessonPlan?: boolean } = {}) {
  const has = (k: Populate) => populate.includes(k);
  return {
    _id: e.id,
    studentId: has('studentId') && e.student ? { _id: e.student.id, name: e.student.name, email: e.student.email } : e.studentId,
    trainerId: has('trainerId') && e.trainer ? { _id: e.trainer.id, name: e.trainer.name, email: e.trainer.email, profile: e.trainer.profile } : e.trainerId,
    sessionId:
      has('sessionId') && e.session
        ? {
            _id: e.session.id,
            title: e.session.title,
            scheduledDate: e.session.scheduledDate,
            duration: e.session.duration,
            sessionNumber: e.session.sessionNumber,
            ...(opts.lessonPlan && { lessonPlan: e.session.lessonPlan }),
          }
        : e.sessionId,
    groupId:
      has('groupId') && e.group
        ? {
            _id: e.group.id,
            name: e.group.name,
            courseId: e.course ? { _id: e.course.id, title: e.course.title, category: e.course.category, level: e.course.level } : e.group.courseId,
          }
        : e.groupId,
    overallRating: e.overallRating,
    skillRatings: e.skillRatings,
    attendance: e.attendance,
    participation: e.participation,
    comprehension: e.comprehension,
    behavior: e.behavior,
    achievements: e.achievements,
    improvements: e.improvements,
    homework: e.homework,
    trainerNotes: e.trainerNotes,
    progress: e.progress,
    recommendations: e.recommendations,
    parameters: e.parameters,
    criteriaMetadata: e.criteriaMetadata,
    flags: { needsAttention: e.needsAttention, excelling: e.excelling, atRisk: e.atRisk, parentContactNeeded: e.parentContactNeeded },
    visibility: { sharedWithStudent: e.sharedWithStudent, sharedWithParent: e.sharedWithParent, sharedAt: e.sharedAt },
    evaluationDate: e.evaluationDate,
    lastModified: e.lastModified,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
    averageSkillRating: averageSkillRating(e),
    performanceScore: performanceScore(e),
    participationScore: participationScore(e),
    needsReview: needsReview(e),
  };
}

const TRAINER_VIEW: Populate[] = ['studentId', 'sessionId', 'groupId'];
const CLO_VIEW: Populate[] = ['studentId', 'sessionId', 'trainerId', 'groupId'];

/** `populated` expands courses and groups; otherwise they are plain ids (as the trainer lookup returned them). */
function criteriaDoc(c: Criteria, populated = true) {
  return {
    _id: c.id,
    name: c.name,
    description: c.description,
    appliesTo: c.appliesTo,
    courseIds: populated ? c.courses.map((x) => ({ _id: x.id, title: x.title, category: x.category, level: x.level })) : c.courses.map((x) => x.id),
    groupIds: populated ? c.groups.map((g) => ({ _id: g.id, name: g.name })) : c.groups.map((g) => g.id),
    createdBy: c.createdById,
    parameters: c.parameters,
    includeOverallRating: c.includeOverallRating,
    overallRatingScale: c.overallRatingScale,
    status: c.status,
    totalWeight: c.parameters.reduce((s, p) => s + (p.weight || 0), 0),
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

type IdReq = Request<{ id: string }>;
const query = (req: Request) => req.query as Record<string, string | undefined>;
const body = (req: Request) => (req.body ?? {}) as Record<string, unknown>;

/** /api/clo/evaluation-criteria (plus the trainer's lookup for a group). */
export class EvaluationCriteriaController {
  constructor(private readonly evaluations: EvaluationService) {}

  list = async (req: Request, res: Response) => {
    const list = await this.evaluations.listCriteria(currentUser(req).id, query(req));
    res.json({ success: true, count: list.length, data: list.map((c) => criteriaDoc(c)) });
  };

  get = async (req: IdReq, res: Response) => {
    res.json({ success: true, data: criteriaDoc(await this.evaluations.getCriteria(req.params.id)) });
  };

  create = async (req: Request, res: Response) => {
    const c = await this.evaluations.createCriteria(currentUser(req).id, body(req));
    res.status(201).json({ success: true, message: 'Evaluation criteria created successfully', data: criteriaDoc(c) });
  };

  update = async (req: IdReq, res: Response) => {
    const c = await this.evaluations.updateCriteria(currentUser(req).id, req.params.id, body(req));
    res.json({ success: true, message: 'Evaluation criteria updated successfully', data: criteriaDoc(c) });
  };

  delete = async (req: IdReq, res: Response) => {
    await this.evaluations.deleteCriteria(currentUser(req).id, req.params.id);
    res.json({ success: true, message: 'Evaluation criteria deleted successfully' });
  };

  forGroup = async (req: Request<{ groupId: string }>, res: Response) => {
    res.json({ success: true, data: criteriaDoc(await this.evaluations.criteriaForGroup(req.params.groupId), false) });
  };
}

/** /api/trainer/evaluations */
export class TrainerEvaluationController {
  constructor(private readonly evaluations: EvaluationService) {}

  create = async (req: Request, res: Response) => {
    const e = await this.evaluations.create(currentUser(req).id, body(req));
    res.status(201).json({ success: true, message: 'Student evaluation created successfully', data: evaluationDoc(e, TRAINER_VIEW) });
  };

  update = async (req: IdReq, res: Response) => {
    const e = await this.evaluations.update(currentUser(req).id, req.params.id, body(req));
    res.json({ success: true, message: 'Evaluation updated successfully', data: evaluationDoc(e, TRAINER_VIEW) });
  };

  get = async (req: IdReq, res: Response) => {
    res.json({ success: true, data: evaluationDoc(await this.evaluations.get(req.params.id), TRAINER_VIEW) });
  };

  list = async (req: Request, res: Response) => {
    const q = query(req);
    const page = parsePagination(q);
    const filter = { ...this.evaluations.filterFrom(q), participationLevel: undefined, trainerId: currentUser(req).id };
    const { rows, total } = await this.evaluations.page(filter, this.evaluations.sortFrom(q), page);
    res.json({ success: true, data: rows.map((e) => evaluationDoc(e, TRAINER_VIEW)), pagination: { page: page.page, limit: page.limit, total, pages: Math.ceil(total / page.limit) } });
  };

  forSession = async (req: Request<{ sessionId: string }>, res: Response) => {
    const r = await this.evaluations.forSession(req.params.sessionId);
    res.json({
      success: true,
      data: {
        session: { _id: r.session.id, title: r.session.title, groupId: r.session.groupId },
        evaluations: r.evaluations.map((e) => evaluationDoc(e, ['studentId'])),
        unevaluatedStudents: r.unevaluated.map((m) => ({ _id: m.id, name: m.name, email: m.email })),
        stats: r.stats,
      },
    });
  };

  forStudent = async (req: Request<{ studentId: string }>, res: Response) => {
    const r = await this.evaluations.forStudent(currentUser(req).id, req.params.studentId, query(req).groupId);
    res.json({
      success: true,
      data: {
        evaluations: r.evaluations.map((e) => evaluationDoc(e, ['sessionId', 'groupId'])),
        stats: r.stats,
        progress: r.progress.map((e) => ({
          date: e.evaluationDate,
          sessionDate: e.session?.scheduledDate,
          overallRating: e.overallRating,
          performanceScore: performanceScore(e),
          skillRatings: e.skillRatings,
          participation: participationScore(e),
          comprehension: e.comprehension.level,
        })),
      },
    });
  };

  stats = async (req: Request, res: Response) => {
    const f = this.evaluations.filterFrom(query(req));
    const data = await this.evaluations.trainerStats({ trainerId: currentUser(req).id, groupId: f.groupId, startDate: f.startDate, endDate: f.endDate });
    res.json({ success: true, data });
  };

  bulk = async (req: Request, res: Response) => {
    const r = await this.evaluations.bulk(currentUser(req).id, body(req));
    res.status(201).json({
      success: true,
      message: `Created ${r.created.length} evaluations`,
      data: { created: r.created.map((e) => evaluationDoc(e, TRAINER_VIEW)), errors: r.errors.length > 0 ? r.errors : undefined },
    });
  };

  delete = async (req: IdReq, res: Response) => {
    await this.evaluations.delete(currentUser(req).id, req.params.id);
    res.json({ success: true, message: 'Evaluation deleted successfully' });
  };

  share = async (req: IdReq, res: Response) => {
    const e = await this.evaluations.share(currentUser(req).id, req.params.id, body(req));
    res.json({ success: true, message: 'Evaluation shared successfully', data: evaluationDoc(e) });
  };

  flagged = async (req: Request, res: Response) => {
    const list = await this.evaluations.flagged(currentUser(req).id, query(req).groupId);
    res.json({
      success: true,
      data: list.map(({ evaluation: first, evaluations, flags }) => ({
        student: { _id: first.student!.id, name: first.student!.name, email: first.student!.email },
        group: first.group ? { _id: first.group.id, name: first.group.name } : first.groupId,
        evaluations: evaluations.map((e) => evaluationDoc(e, TRAINER_VIEW)),
        flags,
      })),
    });
  };
}

/** /api/clo/evaluations — read-only oversight of every trainer's evaluations. */
export class CloEvaluationController {
  constructor(private readonly evaluations: EvaluationService) {}

  list = async (req: Request, res: Response) => {
    const q = query(req);
    const page = parsePagination(q);
    const f = this.evaluations.filterFrom(q);
    const filter = { groupId: f.groupId, trainerId: f.trainerId, minRating: f.minRating, maxRating: f.maxRating, participationLevel: f.participationLevel, startDate: f.startDate, endDate: f.endDate };
    const { rows, total } = await this.evaluations.page(filter, this.evaluations.sortFrom(q), page);
    res.json({ success: true, data: rows.map((e) => evaluationDoc(e, CLO_VIEW)), pagination: { page: page.page, limit: page.limit, total, pages: Math.ceil(total / page.limit) } });
  };

  get = async (req: IdReq, res: Response) => {
    const e = await this.evaluations.get(req.params.id);
    res.json({ success: true, data: evaluationDoc(e, ['sessionId', 'trainerId', 'groupId'], { lessonPlan: true }) });
  };

  forGroup = async (req: Request<{ groupId: string }>, res: Response) => {
    const r = await this.evaluations.forGroup(req.params.groupId);
    res.json({ success: true, data: { evaluations: r.evaluations.map((e) => evaluationDoc(e, ['sessionId', 'trainerId'])), stats: r.stats } });
  };

  stats = async (req: Request, res: Response) => {
    const f = this.evaluations.filterFrom(query(req));
    res.json({ success: true, data: await this.evaluations.cloStats({ groupId: f.groupId, trainerId: f.trainerId, startDate: f.startDate, endDate: f.endDate }) });
  };
}

/** Numeric criteria answers as `{ name, score, maxScore }` (the old code expected an array and always returned []). */
function parameterScores(e: Evaluation) {
  const config = new Map((e.criteriaMetadata?.parametersConfig ?? []).map((p) => [p.name, p]));
  return Object.entries(e.parameters).flatMap(([name, value]) => {
    if (typeof value !== 'number') return [];
    const p = config.get(name);
    const maxScore = p?.type === 'percentage' ? 100 : (p?.ratingScale?.max ?? 5);
    return [{ name, score: value, maxScore }];
  });
}

/** GET /api/student/sessions/evaluations */
export class StudentEvaluationController {
  constructor(private readonly evaluations: EvaluationService) {}

  mine = async (req: Request, res: Response) => {
    const r = await this.evaluations.mine(currentUser(req).id);
    const item = (e: Evaluation) => ({
      _id: e.id,
      sessionId: e.sessionId,
      sessionTitle: e.session?.title || 'Session',
      sessionDate: e.session?.scheduledDate ?? null,
      sessionType: null,
      courseId: e.course?.id ?? null,
      courseName: e.course?.title ?? null,
      groupName: e.group?.name ?? null,
      overallScore: e.overallRating,
      maxScore: 5,
      parameters: parameterScores(e),
      trainerNotes: e.trainerNotes.generalNotes || null,
      evaluationDate: e.evaluationDate,
    });
    res.json({
      success: true,
      evaluations: r.list.map(item),
      total: r.list.length,
      courseGroups: r.courseGroups.map((c) => ({
        courseId: c.courseId,
        courseName: c.courseName,
        groupName: c.groupName,
        totalSessions: c.totalSessions,
        scoredSessions: c.scoredSessions,
        averageScore: c.averageScore,
        percentage: c.percentage,
        evaluations: c.evaluations.map(item),
      })),
      overallAverage: r.overallAverage,
      overallPercentage: r.overallPercentage,
    });
  };
}
