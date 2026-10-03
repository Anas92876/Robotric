import type { Request, Response } from 'express';
import { parse } from '../../shared/http/validate';
import type { CourseWithInstructor, InstructorRef } from './courses.repository';
import { addSubCourseBody, archiveBody, createBody, listQuery, statisticsQuery, updateBody } from './courses.schemas';
import type { CourseService } from './courses.service';

// ─── Response shapes (identical to the old Mongoose documents) ─────────────

const userRef = (u: InstructorRef | null) => (u ? { _id: u.id, name: u.name, email: u.email } : null);

/** A sub-course as `.populate('bundleCourses', 'title price duration totalHours instructor level status')` returned it. */
function subCourseSummary(c: CourseWithInstructor, extra: 'description+category' | 'none' = 'none') {
  return {
    _id: c.id,
    title: c.title,
    ...(extra === 'description+category' ? { description: c.description, category: c.category } : {}),
    price: c.price,
    duration: c.duration,
    totalHours: c.totalHours,
    instructor: userRef(c.instructor),
    level: c.level,
    status: c.status,
  };
}

/**
 * A full course document. `bundleCourses` is either populated summaries or
 * plain ids, depending on the endpoint, exactly as before; `modules` lists the
 * course's module ids in order.
 */
function courseDoc(c: CourseWithInstructor, bundleCourses: unknown[], modules: string[] = []) {
  return {
    _id: c.id,
    title: c.title,
    description: c.description,
    instructor: userRef(c.instructor),
    duration: c.duration,
    totalHours: c.totalHours,
    price: c.price,
    thumbnail: c.thumbnail,
    category: c.category,
    level: c.level,
    status: c.status,
    startDate: c.startDate,
    endDate: c.endDate,
    maxStudents: c.maxStudents,
    enrolledStudents: c.enrolledStudents,
    modules,
    syllabus: c.syllabus,
    prerequisites: c.prerequisites,
    objectives: c.objectives,
    learningOutcomes: c.learningOutcomes,
    tags: c.tags,
    isActive: c.isActive,
    wroDocumentsRequired: c.wroDocumentsRequired,
    type: c.type,
    bundleCourses,
    bundlePrice: c.bundlePrice,
    parentBundle: c.parentBundleId,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

type IdParam = Request<{ id: string }>;

/** Module ids per course, in order (course-modules feature). */
export interface ModuleIdsReader {
  idsByCourse(courseIds: string[]): Promise<Map<string, string[]>>;
}

export class CourseController {
  constructor(
    private readonly courses: CourseService,
    private readonly modules: ModuleIdsReader,
  ) {}

  list = async (req: Request, res: Response) => {
    const items = await this.courses.list(parse(listQuery, req.query));
    const modules = await this.modules.idsByCourse(items.map((i) => i.course.id));
    res.json({
      success: true,
      data: items.map(({ course, subCourses, stats }) => ({
        ...courseDoc(course, subCourses.map((s) => subCourseSummary(s)), modules.get(course.id)),
        stats,
      })),
    });
  };

  details = async (req: IdParam, res: Response) => {
    const { course, subCourseIds, activity } = await this.courses.details(req.params.id);
    const { enrollments, groups, trainers } = activity;
    const total = enrollments.length;
    const active = enrollments.filter((e) => e.status === 'active').length;
    const completed = enrollments.filter((e) => e.status === 'completed').length;
    res.json({
      success: true,
      data: {
        course: courseDoc(course, subCourseIds, (await this.modules.idsByCourse([course.id])).get(course.id)),
        groups,
        trainers,
        enrollments,
        stats: {
          totalGroups: groups.length,
          activeGroups: groups.filter((g) => (g as { status?: string }).status === 'active').length,
          totalEnrollments: total,
          activeEnrollments: active,
          completedEnrollments: completed,
          completionRate: total > 0 ? Number.parseFloat(((completed / total) * 100).toFixed(1)) : 0,
          avgProgress: activity.avgProgress,
          trainersCount: trainers.length,
        },
      },
    });
  };

  create = async (req: Request, res: Response) => {
    const course = await this.courses.create(parse(createBody, req.body));
    res.status(201).json({
      success: true,
      message: course.type === 'bundle' ? 'Bundle created successfully' : 'Course created successfully',
      data: courseDoc(course, []),
    });
  };

  update = async (req: IdParam, res: Response) => {
    const { course, subCourses } = await this.courses.update(req.params.id, parse(updateBody, req.body));
    res.json({
      success: true,
      message: 'Course updated successfully',
      data: courseDoc(course, subCourses.map((s) => subCourseSummary(s))),
    });
  };

  delete = async (req: IdParam, res: Response) => {
    await this.courses.delete(req.params.id);
    res.json({ success: true, message: 'Course deleted successfully' });
  };

  archive = async (req: IdParam, res: Response) => {
    const { action } = parse(archiveBody, req.body);
    const course = await this.courses.setArchived(req.params.id, action);
    res.json({
      success: true,
      message: `Course ${action === 'archive' ? 'archived' : 'unarchived'} successfully`,
      data: { _id: course.id, title: course.title, status: course.status },
    });
  };

  statistics = async (req: IdParam, res: Response) => {
    const { period } = parse(statisticsQuery, req.query);
    const { course, stats } = await this.courses.statistics(req.params.id, period);
    res.json({
      success: true,
      data: { course: { _id: course.id, title: course.title, category: course.category }, period, ...stats },
    });
  };

  bundleSubCourses = async (req: Request<{ bundleId: string }>, res: Response) => {
    const { bundle, subCourses, pricing } = await this.courses.bundle(req.params.bundleId);
    res.json({
      success: true,
      data: {
        bundle: { _id: bundle.id, title: bundle.title, bundlePrice: bundle.bundlePrice },
        subCourses: subCourses.map(({ course, stats }) => ({ ...subCourseSummary(course, 'description+category'), stats })),
        pricing,
      },
    });
  };

  addSubCourse = async (req: Request<{ bundleId: string }>, res: Response) => {
    const { courseId } = parse(addSubCourseBody, req.body);
    const { bundle, subCourses } = await this.courses.addSubCourse(req.params.bundleId, courseId);
    res.json({
      success: true,
      message: 'Sub-course added to bundle',
      data: courseDoc(bundle, subCourses.map((s) => subCourseSummary(s))),
    });
  };

  removeSubCourse = async (req: Request<{ bundleId: string; courseId: string }>, res: Response) => {
    await this.courses.removeSubCourse(req.params.bundleId, req.params.courseId);
    res.json({ success: true, message: 'Sub-course removed from bundle' });
  };
}
