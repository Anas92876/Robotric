/**
 * What the courses module needs to know about groups and enrollments, which
 * are ported later (phases 4–5). Until then `noCourseActivity` reports an
 * empty academy: zero groups, zero enrollments. The groups/enrollments
 * modules will provide the real implementation in `src/container.ts`.
 */

export interface CourseActivitySummary {
  totalGroups: number;
  activeGroups: number;
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  trainersCount: number;
}

export interface CourseDetailsActivity {
  groups: unknown[];
  trainers: unknown[];
  enrollments: { status: string; progress?: unknown }[];
  avgProgress: number;
}

export interface CourseStatistics {
  enrollmentTrends: { _id: string; count: number }[];
  completionTrends: { _id: string; count: number }[];
  progressDistribution: unknown[];
  groupPerformance: unknown[];
}

export interface CourseActivityReader {
  summarize(courseIds: string[]): Promise<Map<string, CourseActivitySummary>>;
  details(courseId: string): Promise<CourseDetailsActivity>;
  statistics(courseId: string, since: Date): Promise<CourseStatistics>;
}

export const EMPTY_SUMMARY: CourseActivitySummary = {
  totalGroups: 0,
  activeGroups: 0,
  totalEnrollments: 0,
  activeEnrollments: 0,
  completedEnrollments: 0,
  trainersCount: 0,
};

export const noCourseActivity: CourseActivityReader = {
  summarize: async (ids) => new Map(ids.map((id) => [id, EMPTY_SUMMARY])),
  details: async () => ({ groups: [], trainers: [], enrollments: [], avgProgress: 0 }),
  statistics: async () => ({ enrollmentTrends: [], completionTrends: [], progressDistribution: [], groupPerformance: [] }),
};
