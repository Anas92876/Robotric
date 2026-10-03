import { BadRequestError, NotFoundError } from '../../shared/http/errors';
import type { User } from '../users/users.repository';
import type { CourseActivityReader, CourseActivitySummary, CourseDetailsActivity, CourseStatistics } from './courses.ports';
import type { CourseFilter, CourseRepository, CourseWithInstructor } from './courses.repository';
import type { CreateCourseInput, UpdateCourseInput } from './courses.schemas';
import type { NewCourseRow } from './courses.table';

/** Narrow view of the users module: all courses need is to check an instructor. */
export interface UserLookup {
  findById(id: string): Promise<User | null>;
}

export interface BundlePricing {
  individualTotal: number;
  savings: number;
  discountPct: number;
}

export interface CourseListItem {
  course: CourseWithInstructor;
  subCourses: CourseWithInstructor[];
  stats: CourseActivitySummary & { completionRate: number } & Partial<BundlePricing & { subCourseCount: number }>;
}

export interface BundleView {
  bundle: CourseWithInstructor;
  subCourses: { course: CourseWithInstructor; stats: { totalGroups: number; activeEnrollments: number } }[];
  pricing: BundlePricing & { bundlePrice: number | null };
}

const INSTRUCTOR_ROLES = new Set(['trainer', 'admin']);

export function bundlePricing(subCoursePrices: number[], bundlePrice: number | null): BundlePricing {
  const individualTotal = subCoursePrices.reduce((sum, p) => sum + (p || 0), 0);
  const savings = bundlePrice != null ? individualTotal - bundlePrice : 0;
  const discountPct = individualTotal > 0 && savings > 0 ? Math.round((savings / individualTotal) * 100) : 0;
  return { individualTotal, savings, discountPct };
}

const completionRate = (completed: number, total: number): number =>
  total > 0 ? Number.parseFloat(((completed / total) * 100).toFixed(1)) : 0;

/** Duration is typed free-form but the app treats it as hours; mirrors the old `parseFloat(x) || 0`. */
const toHours = (duration: string | number | undefined): number => Number.parseFloat(String(duration ?? '')) || 0;

export class CourseService {
  constructor(
    private readonly courses: CourseRepository,
    private readonly users: UserLookup,
    private readonly activity: CourseActivityReader,
  ) {}

  private async require(id: string, label = 'Course'): Promise<CourseWithInstructor> {
    const course = await this.courses.findById(id);
    if (!course) throw new NotFoundError(label);
    return course;
  }

  private async assertInstructor(id: string): Promise<void> {
    const user = await this.users.findById(id);
    if (!user || !INSTRUCTOR_ROLES.has(user.role)) throw new BadRequestError('Invalid instructor');
  }

  async list(filter: CourseFilter): Promise<CourseListItem[]> {
    const list = await this.courses.list(filter);
    const bundleIds = list.filter((c) => c.type === 'bundle').map((c) => c.id);
    const [subs, summaries] = await Promise.all([
      this.courses.subCoursesOf(bundleIds),
      this.activity.summarize(list.map((c) => c.id)),
    ]);

    return list.map((course) => {
      const subCourses = subs.get(course.id) ?? [];
      const summary = summaries.get(course.id)!;
      const bundleStats =
        course.type === 'bundle' && subCourses.length
          ? { ...bundlePricing(subCourses.map((s) => s.price), course.bundlePrice), subCourseCount: subCourses.length }
          : {};
      return {
        course,
        subCourses,
        stats: { ...summary, completionRate: completionRate(summary.completedEnrollments, summary.totalEnrollments), ...bundleStats },
      };
    });
  }

  async details(id: string): Promise<{ course: CourseWithInstructor; subCourseIds: string[]; activity: CourseDetailsActivity }> {
    const course = await this.require(id);
    const [subs, activity] = await Promise.all([this.courses.subCoursesOf([id]), this.activity.details(id)]);
    return { course, subCourseIds: (subs.get(id) ?? []).map((c) => c.id), activity };
  }

  async create(input: CreateCourseInput): Promise<CourseWithInstructor> {
    const isBundle = input.type === 'bundle';
    if (isBundle && (input.bundlePrice == null || input.bundlePrice < 0)) {
      throw new BadRequestError('Bundle price is required for bundle courses');
    }
    if (input.instructor) await this.assertInstructor(input.instructor);
    if (input.parentBundle) {
      const parent = await this.courses.findById(input.parentBundle);
      if (!parent) throw new NotFoundError('Parent bundle');
      if (parent.type !== 'bundle') throw new BadRequestError('Parent course is not a bundle');
    }

    const hours = toHours(input.duration);
    const created = await this.courses.create({
      title: input.title,
      description: input.description,
      category: input.category,
      level: input.level ?? 'beginner',
      duration: String(hours),
      totalHours: hours,
      price: isBundle ? 0 : (input.price ?? 0),
      instructorId: isBundle ? null : (input.instructor ?? null),
      thumbnail: input.thumbnail ?? null,
      syllabus: input.syllabus ?? [],
      objectives: input.objectives ?? [],
      prerequisites: input.prerequisites ?? [],
      status: 'draft',
      type: input.type ?? 'single',
      bundlePrice: isBundle ? (input.bundlePrice ?? null) : null,
      parentBundleId: input.parentBundle ?? null,
      bundleLinkedAt: input.parentBundle ? new Date() : null,
      wroDocumentsRequired: input.wroDocumentsRequired ?? false,
    });
    return this.require(created.id);
  }

  async update(id: string, input: UpdateCourseInput): Promise<{ course: CourseWithInstructor; subCourses: CourseWithInstructor[] }> {
    const course = await this.require(id);
    if (input.instructor) await this.assertInstructor(input.instructor);

    if (input.type === 'single' && course.type === 'bundle') {
      const subs = (await this.courses.subCoursesOf([id])).get(id) ?? [];
      if (subs.length > 0) {
        throw new BadRequestError(
          'Cannot change a bundle to a single course while it has sub-courses. Remove all sub-courses first.',
        );
      }
    }

    const { instructor, duration, ...rest } = input;
    const changes: Partial<NewCourseRow> = { ...rest };
    if (instructor !== undefined) changes.instructorId = instructor || null;
    if (duration !== undefined) {
      changes.duration = String(duration);
      changes.totalHours = toHours(duration);
    }
    if (Object.keys(changes).length > 0) await this.courses.update(id, changes);

    const [updated, subs] = await Promise.all([this.require(id), this.courses.subCoursesOf([id])]);
    return { course: updated, subCourses: subs.get(id) ?? [] };
  }

  async delete(id: string): Promise<void> {
    const course = await this.require(id);
    if (course.status !== 'draft') {
      throw new BadRequestError('Only draft courses can be deleted. Please archive published courses instead.');
    }
    const [summary] = (await this.activity.summarize([id])).values();
    if (summary && summary.totalGroups > 0) {
      throw new BadRequestError('Cannot delete course with existing groups. Please remove all groups first.');
    }
    if (summary && summary.totalEnrollments > 0) {
      throw new BadRequestError('Cannot delete course with existing enrollments.');
    }
    // Sub-courses survive their bundle; they just become standalone courses.
    if (course.type === 'bundle') await this.courses.detachAllFrom(id);
    await this.courses.delete(id);
  }

  async setArchived(id: string, action: 'archive' | 'unarchive'): Promise<CourseWithInstructor> {
    await this.require(id);
    if (action === 'archive') {
      const [summary] = (await this.activity.summarize([id])).values();
      if (summary && summary.activeGroups > 0) {
        throw new BadRequestError(
          'Cannot archive course with active groups. Please complete or close all active groups first.',
        );
      }
    }
    await this.courses.update(id, { status: action === 'archive' ? 'archived' : 'published' });
    return this.require(id);
  }

  async statistics(id: string, periodDays: number): Promise<{ course: CourseWithInstructor; stats: CourseStatistics }> {
    const course = await this.require(id);
    const since = new Date();
    since.setDate(since.getDate() - periodDays);
    return { course, stats: await this.activity.statistics(id, since) };
  }

  // ─── Bundles ─────────────────────────────────────────────────────────────

  async bundle(bundleId: string): Promise<BundleView> {
    const bundle = await this.require(bundleId, 'Bundle');
    if (bundle.type !== 'bundle') throw new BadRequestError('Course is not a bundle');
    const subCourses = (await this.courses.subCoursesOf([bundleId])).get(bundleId) ?? [];
    const summaries = await this.activity.summarize(subCourses.map((c) => c.id));
    return {
      bundle,
      subCourses: subCourses.map((course) => {
        const s = summaries.get(course.id)!;
        return { course, stats: { totalGroups: s.totalGroups, activeEnrollments: s.activeEnrollments } };
      }),
      pricing: { ...bundlePricing(subCourses.map((c) => c.price), bundle.bundlePrice), bundlePrice: bundle.bundlePrice },
    };
  }

  async addSubCourse(bundleId: string, courseId: string): Promise<{ bundle: CourseWithInstructor; subCourses: CourseWithInstructor[] }> {
    const [bundle, course] = await Promise.all([this.courses.findById(bundleId), this.courses.findById(courseId)]);
    if (!bundle) throw new NotFoundError('Bundle');
    if (!course) throw new NotFoundError('Course');
    if (bundle.type !== 'bundle') throw new BadRequestError('Target is not a bundle');
    if (course.type === 'bundle') throw new BadRequestError('Cannot nest a bundle inside a bundle');
    if (course.parentBundleId && course.parentBundleId !== bundleId) {
      throw new BadRequestError('Course already belongs to another bundle');
    }
    if (course.parentBundleId !== bundleId) await this.courses.setParentBundle(courseId, bundleId);

    const subCourses = (await this.courses.subCoursesOf([bundleId])).get(bundleId) ?? [];
    return { bundle, subCourses };
  }

  async removeSubCourse(bundleId: string, courseId: string): Promise<void> {
    const [bundle, course] = await Promise.all([this.courses.findById(bundleId), this.courses.findById(courseId)]);
    if (!bundle) throw new NotFoundError('Bundle');
    if (!course) throw new NotFoundError('Course');
    if (course.parentBundleId === bundleId) await this.courses.setParentBundle(courseId, null);
  }
}
