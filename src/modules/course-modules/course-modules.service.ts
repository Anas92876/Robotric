import type { UnitOfWork } from '../../shared/db/unit-of-work';
import { AppError, BadRequestError, ForbiddenError } from '../../shared/http/errors';
import type { EnrollmentRepository } from '../enrollments/enrollments.repository';
import type { EnrollmentRow } from '../enrollments/enrollments.table';
import type { CourseModule, CourseModuleRepository, ModuleProgressRepository } from './course-modules.repository';
import type { CourseModuleRow, ModuleProgressRow } from './course-modules.table';

export interface LearningRepos {
  modules: CourseModuleRepository;
  progress: ModuleProgressRepository;
  enrollments: EnrollmentRepository;
}

const notFound = () => new AppError('Module not found', 404, 'NOT_FOUND');

/** A student working through a course's modules. */
export class CourseModuleService {
  constructor(
    private readonly modules: CourseModuleRepository,
    private readonly progress: ModuleProgressRepository,
    private readonly enrollments: Pick<EnrollmentRepository, 'findForStudentCourse'>,
    private readonly uow: UnitOfWork<LearningRepos>,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private async requireRow(id: string): Promise<CourseModuleRow> {
    const m = await this.modules.findRow(id);
    if (!m) throw notFound();
    return m;
  }

  private async activeEnrollment(studentId: string, courseId: string): Promise<EnrollmentRow> {
    const e = await this.enrollments.findForStudentCourse(studentId, courseId);
    if (!e || e.status !== 'active') throw new ForbiddenError('You are not enrolled in this course');
    return e;
  }

  async content(moduleId: string, studentId: string): Promise<{ module: CourseModule; progress: ModuleProgressRow }> {
    const module = await this.modules.findById(moduleId);
    if (!module) throw notFound();
    await this.activeEnrollment(studentId, module.courseId);
    if (module.isLocked && module.unlockAfterId && !(await this.progress.isCompleted(studentId, module.unlockAfterId))) {
      throw new ForbiddenError('This module is locked. Complete the previous module first.');
    }
    const p = await this.progress.getOrCreate(studentId, moduleId, module.courseId);
    return { module, progress: await this.progress.update(p.id, { lastAccessedAt: this.now() }) };
  }

  async start(moduleId: string, studentId: string): Promise<ModuleProgressRow> {
    const module = await this.requireRow(moduleId);
    const enrollment = await this.activeEnrollment(studentId, module.courseId);
    const p = await this.progress.getOrCreate(studentId, moduleId, module.courseId);
    if (p.status !== 'not_started') return p;
    const now = this.now();
    return this.uow.run(async ({ progress, enrollments }) => {
      const updated = await progress.update(p.id, { status: 'in_progress', startedAt: now, lastAccessedAt: now });
      await enrollments.update(enrollment.id, { currentModuleId: moduleId, lastAccessedAt: now });
      return updated;
    });
  }

  /**
   * Completes a module and recalculates course progress. Reaching 100% stamps
   * the enrollment's completion date. (The old code also set status to
   * "completed", which is not a valid enrollment status, so the save failed.)
   */
  async complete(moduleId: string, studentId: string) {
    const module = await this.requireRow(moduleId);
    const enrollment = await this.activeEnrollment(studentId, module.courseId);
    const p = await this.progress.find(studentId, moduleId);
    if (!p) throw new BadRequestError('Module progress not found. Start the module first.');

    const now = this.now();
    const result = await this.uow.run(async ({ progress, enrollments, modules }) => {
      const updated = p.status === 'completed' ? p : await progress.update(p.id, { status: 'completed', completedAt: now, lastAccessedAt: now });
      let completed = enrollment.completedModuleIds;
      let percentage = enrollment.percentageComplete;
      if (!completed.includes(moduleId)) {
        completed = [...completed, moduleId];
        const total = await modules.countActive(module.courseId);
        percentage = total > 0 ? Math.min(100, Math.round((completed.length / total) * 100)) : 0;
        await enrollments.update(enrollment.id, {
          completedModuleIds: completed,
          percentageComplete: percentage,
          ...(percentage >= 100 && !enrollment.completedAt ? { completedAt: now } : {}),
        });
      }
      return { progress: updated, percentage, completedCount: completed.length };
    });
    return { progress: result.progress, enrollment: { percentageComplete: result.percentage, completedModules: result.completedCount } };
  }

  async recordProgress(moduleId: string, studentId: string, input: { timeSpent?: number; videoProgress?: { currentTime?: number; duration?: number; completed?: boolean } }) {
    const module = await this.requireRow(moduleId);
    const p = await this.progress.getOrCreate(studentId, moduleId, module.courseId);
    const changes: Parameters<ModuleProgressRepository['update']>[1] = {};
    if (input.timeSpent !== undefined) {
      changes.timeSpent = p.timeSpent + input.timeSpent;
      changes.lastAccessedAt = this.now();
    }
    if (input.videoProgress) {
      changes.videoProgress = {
        currentTime: input.videoProgress.currentTime || 0,
        duration: input.videoProgress.duration || 0,
        completed: input.videoProgress.completed || false,
      };
    }
    return Object.keys(changes).length ? this.progress.update(p.id, changes) : p;
  }

  async progressOf(moduleId: string, studentId: string): Promise<ModuleProgressRow | null> {
    await this.requireRow(moduleId);
    return this.progress.find(studentId, moduleId);
  }

  async neighbour(moduleId: string, direction: 'after' | 'before'): Promise<CourseModuleRow | null> {
    const m = await this.requireRow(moduleId);
    return this.modules.neighbour(m.courseId, m.order, direction);
  }
}
