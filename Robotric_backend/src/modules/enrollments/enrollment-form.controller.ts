import type { Request, Response } from 'express';
import type { CourseFilter, CourseWithInstructor } from '../courses/courses.repository';
import type { GroupRepository } from '../groups/groups.repository';
import type { UserRepository } from '../users/users.repository';
import type { EnrollmentRepository } from './enrollments.repository';

export interface CourseCatalog {
  list(filter: CourseFilter): Promise<CourseWithInstructor[]>;
  subCoursesOf(ids: string[]): Promise<Map<string, CourseWithInstructor[]>>;
}

/**
 * Look-ups that fill the reception enrollment form. Read-only, no rules, so
 * the controller reads the repositories directly.
 */
export class EnrollmentFormController {
  constructor(
    private readonly courses: CourseCatalog,
    private readonly groups: Pick<GroupRepository, 'list' | 'membersOf'>,
    private readonly enrollments: Pick<EnrollmentRepository, 'studentIdsEnrolledIn'>,
    private readonly users: Pick<UserRepository, 'searchStudents'>,
  ) {}

  /** GET /api/reception/enrollments/available-courses */
  availableCourses = async (req: Request, res: Response) => {
    const q = req.query as Record<string, string | undefined>;
    const filter: CourseFilter = { includeSubCourses: true, sortBy: 'title', order: 'asc' };
    if (q.all !== 'true') filter.status = 'published';
    if (q.type) filter.type = q.type;
    else if (q.includeBundles !== 'true') filter.excludeType = 'bundle';

    const list = await this.courses.list(filter);
    const subs = q.type === 'bundle' ? await this.courses.subCoursesOf(list.map((c) => c.id)) : null;
    res.json({
      success: true,
      data: list.map((c) => ({
        _id: c.id,
        title: c.title,
        description: c.description,
        price: c.price,
        category: c.category,
        level: c.level,
        instructor: c.instructor ? { _id: c.instructor.id, name: c.instructor.name } : null,
        status: c.status,
        type: c.type,
        bundlePrice: c.bundlePrice,
        bundleCourses: subs
          ? (subs.get(c.id) ?? []).map((s) => ({ _id: s.id, title: s.title, price: s.price, level: s.level, status: s.status, duration: s.duration, totalHours: s.totalHours }))
          : [],
      })),
    });
  };

  /** GET /api/reception/enrollments/available-groups/:courseId */
  availableGroups = async (req: Request<{ courseId: string }>, res: Response) => {
    const list = await this.groups.list({ courseId: req.params.courseId, status: 'active', sortBy: 'name', order: 'asc' });
    const members = await this.groups.membersOf(list.map((g) => g.id));
    res.json({
      success: true,
      data: list.map((g) => {
        const students = (members.get(g.id) ?? []).map((m) => m.id);
        return {
          _id: g.id,
          name: g.name,
          trainerId: g.trainer ? { _id: g.trainer.id, name: g.trainer.name } : g.trainerId,
          maxStudents: g.maxStudents,
          students,
          schedule: g.schedule,
          startDate: g.startDate,
          endDate: g.endDate,
          availableSeats: g.maxStudents - students.length,
          isFull: students.length >= g.maxStudents,
        };
      }),
    });
  };

  /** GET /api/reception/enrollments/available-students — first 50 students not yet in the course. */
  availableStudents = async (req: Request, res: Response) => {
    const q = req.query as Record<string, string | undefined>;
    const exclude = q.courseId ? await this.enrollments.studentIdsEnrolledIn(q.courseId) : [];
    const students = await this.users.searchStudents(q.search, exclude, 50);
    res.json({ success: true, data: students.map((s) => ({ _id: s.id, name: s.name, email: s.email })) });
  };
}
