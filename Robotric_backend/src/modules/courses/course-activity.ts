import type { EnrollmentRepository } from '../enrollments/enrollments.repository';
import type { GroupRepository } from '../groups/groups.repository';
import type { CourseActivityReader, CourseActivitySummary, CourseDetailsActivity, CourseStatistics } from './courses.ports';

/**
 * Course statistics built from the groups and enrollments modules. Replaces
 * the "empty academy" stand-in now that both exist.
 */
export class GroupEnrollmentCourseActivity implements CourseActivityReader {
  constructor(
    private readonly groups: Pick<GroupRepository, 'countsByCourse' | 'list' | 'membersOf'>,
    private readonly enrollments: Pick<EnrollmentRepository, 'countsByCourse' | 'forCourse' | 'dailyCounts' | 'progressBands'>,
  ) {}

  async summarize(courseIds: string[]): Promise<Map<string, CourseActivitySummary>> {
    const [g, e] = await Promise.all([this.groups.countsByCourse(courseIds), this.enrollments.countsByCourse(courseIds)]);
    return new Map(
      courseIds.map((id) => [
        id,
        {
          totalGroups: g.get(id)?.totalGroups ?? 0,
          activeGroups: g.get(id)?.activeGroups ?? 0,
          trainersCount: g.get(id)?.trainersCount ?? 0,
          totalEnrollments: e.get(id)?.total ?? 0,
          activeEnrollments: e.get(id)?.active ?? 0,
          completedEnrollments: e.get(id)?.completed ?? 0,
        },
      ]),
    );
  }

  async details(courseId: string): Promise<CourseDetailsActivity> {
    const [groupList, enrollmentList] = await Promise.all([this.groups.list({ courseId }), this.enrollments.forCourse(courseId)]);
    const members = await this.groups.membersOf(groupList.map((g) => g.id));
    const trainers = new Map(groupList.flatMap((g) => (g.trainer ? [[g.trainer.id, g.trainer] as const] : [])));
    const total = enrollmentList.length;
    return {
      groups: groupList.map((g) => ({
        _id: g.id,
        name: g.name,
        trainerId: g.trainer ? { _id: g.trainer.id, name: g.trainer.name, email: g.trainer.email } : g.trainerId,
        students: (members.get(g.id) ?? []).map((m) => m.id),
        status: g.status,
        startDate: g.startDate,
        endDate: g.endDate,
        schedule: g.schedule,
      })),
      trainers: [...trainers.values()].map((t) => ({ _id: t.id, name: t.name, email: t.email, profile: t.profile })),
      enrollments: enrollmentList.map((e) => ({
        _id: e.id,
        student: e.student ? { _id: e.student.id, name: e.student.name, email: e.student.email } : e.studentId,
        status: e.status,
        enrolledAt: e.enrolledAt,
        completedAt: e.completedAt,
        progress: e.percentageComplete,
      })),
      avgProgress: total > 0 ? Number.parseFloat((enrollmentList.reduce((s, e) => s + e.percentageComplete, 0) / total).toFixed(1)) : 0,
    };
  }

  async statistics(courseId: string, since: Date): Promise<CourseStatistics> {
    const [enrollmentTrends, completionTrends, progressDistribution, groupList] = await Promise.all([
      this.enrollments.dailyCounts(courseId, since, 'enrolledAt'),
      this.enrollments.dailyCounts(courseId, since, 'completedAt'),
      this.enrollments.progressBands(courseId),
      this.groups.list({ courseId }),
    ]);
    const members = await this.groups.membersOf(groupList.map((g) => g.id));
    return {
      enrollmentTrends,
      completionTrends,
      progressDistribution,
      groupPerformance: groupList.map((g) => ({
        _id: g.id,
        name: g.name,
        trainerName: g.trainer?.name ?? null,
        studentsCount: members.get(g.id)?.length ?? 0,
        status: g.status,
        startDate: g.startDate,
        endDate: g.endDate,
      })),
    };
  }
}
