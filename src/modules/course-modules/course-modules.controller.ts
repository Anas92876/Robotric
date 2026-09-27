import type { Request, Response } from 'express';
import { z } from 'zod';
import { currentUser } from '../../shared/http/request-user';
import { booleanish, numeric, parse } from '../../shared/http/validate';
import type { CourseModule } from './course-modules.repository';
import type { CourseModuleService } from './course-modules.service';
import type { CourseModuleRow, ModuleProgressRow } from './course-modules.table';

export function moduleDoc(m: CourseModuleRow | CourseModule) {
  const withRefs = 'quiz' in m ? m : null;
  return {
    _id: m.id,
    course: m.courseId,
    title: m.title,
    description: m.description,
    order: m.order,
    type: m.type,
    content: m.content,
    resources: m.resources,
    isLocked: m.isLocked,
    unlockAfter: m.unlockAfterId,
    quiz: withRefs?.quiz
      ? {
          _id: withRefs.quiz.id,
          title: withRefs.quiz.title,
          description: withRefs.quiz.description,
          passingScore: withRefs.quiz.passingScore,
          timeLimit: withRefs.quiz.timeLimit,
          maxAttempts: withRefs.quiz.maxAttempts,
        }
      : m.quizId,
    assignment: withRefs?.assignment
      ? {
          _id: withRefs.assignment.id,
          title: withRefs.assignment.title,
          description: withRefs.assignment.description,
          dueDate: withRefs.assignment.dueDate,
          maxScore: withRefs.assignment.maxScore,
          allowedFileTypes: withRefs.assignment.allowedFileTypes,
        }
      : m.assignmentId,
    isActive: m.isActive,
    session: m.liveSession,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}

export const progressDoc = (p: ModuleProgressRow) => ({
  _id: p.id,
  student: p.studentId,
  module: p.moduleId,
  course: p.courseId,
  status: p.status,
  startedAt: p.startedAt,
  completedAt: p.completedAt,
  timeSpent: p.timeSpent,
  lastAccessedAt: p.lastAccessedAt,
  videoProgress: p.videoProgress,
  notes: p.notes,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
});

const progressBody = z.object({
  timeSpent: numeric('timeSpent must be a number').refine((v) => v >= 0, 'timeSpent cannot be negative').optional(),
  videoProgress: z
    .object({ currentTime: numeric('currentTime must be a number').optional(), duration: numeric('duration must be a number').optional(), completed: booleanish.optional() })
    .optional(),
});

type ModuleReq = Request<{ moduleId: string }>;

/** /api/student/modules */
export class StudentModuleController {
  constructor(private readonly modules: CourseModuleService) {}

  content = async (req: ModuleReq, res: Response) => {
    const { module, progress } = await this.modules.content(req.params.moduleId, currentUser(req).id);
    res.json({ success: true, data: { module: moduleDoc(module), progress: progressDoc(progress) } });
  };

  start = async (req: ModuleReq, res: Response) => {
    const p = await this.modules.start(req.params.moduleId, currentUser(req).id);
    res.json({ success: true, message: 'Module started successfully', data: progressDoc(p) });
  };

  complete = async (req: ModuleReq, res: Response) => {
    const r = await this.modules.complete(req.params.moduleId, currentUser(req).id);
    res.json({ success: true, message: 'Module marked as completed', data: { progress: progressDoc(r.progress), enrollment: r.enrollment } });
  };

  updateProgress = async (req: ModuleReq, res: Response) => {
    const p = await this.modules.recordProgress(req.params.moduleId, currentUser(req).id, parse(progressBody, req.body));
    res.json({ success: true, message: 'Progress updated', data: progressDoc(p) });
  };

  progress = async (req: ModuleReq, res: Response) => {
    const p = await this.modules.progressOf(req.params.moduleId, currentUser(req).id);
    res.json({
      success: true,
      data: p ? progressDoc(p) : { status: 'not_started', timeSpent: 0, videoProgress: { currentTime: 0, duration: 0, completed: false } },
    });
  };

  next = async (req: ModuleReq, res: Response) => {
    const m = await this.modules.neighbour(req.params.moduleId, 'after');
    if (!m) {
      res.json({ success: true, message: 'No next module. You have reached the end of the course.', data: null });
      return;
    }
    res.json({ success: true, data: moduleDoc(m) });
  };

  previous = async (req: ModuleReq, res: Response) => {
    const m = await this.modules.neighbour(req.params.moduleId, 'before');
    if (!m) {
      res.json({ success: true, message: 'No previous module. This is the first module.', data: null });
      return;
    }
    res.json({ success: true, data: moduleDoc(m) });
  };
}
