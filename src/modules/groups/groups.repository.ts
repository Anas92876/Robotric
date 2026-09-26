import { and, asc, count, countDistinct, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import type { DbExecutor } from '../../shared/db/client';
import { escapeLike } from '../../shared/db/like';
import { courses } from '../courses/courses.table';
import { type UserProfile, users } from '../users/users.table';
import { type GroupRow, groups, groupStudents, type NewGroupRow } from './groups.table';

export interface CourseSummary {
  id: string;
  title: string;
  category: string;
  level: string;
  thumbnail: string | null;
  duration: string;
}
export interface TrainerSummary {
  id: string;
  name: string;
  email: string;
  profile: UserProfile | null;
}
export interface GroupMember {
  id: string;
  name: string;
  email: string;
  role: string;
  profile: UserProfile | null;
  createdAt: Date;
  addedAt: Date;
}

export interface Group extends GroupRow {
  course: CourseSummary | null;
  trainer: TrainerSummary | null;
}

export const GROUP_SORT_FIELDS = ['createdAt', 'updatedAt', 'name', 'startDate', 'endDate', 'status'] as const;

export interface GroupFilter {
  status?: string;
  courseId?: string;
  trainerId?: string;
  /** Matches the group name; with `searchCourse` also description and course title. */
  search?: string;
  searchCourse?: boolean;
  sortBy?: (typeof GROUP_SORT_FIELDS)[number];
  order?: 'asc' | 'desc';
}

export type AddStudentResult = 'added' | 'already_member' | 'full' | 'no_group';

export interface CourseGroupCounts {
  totalGroups: number;
  activeGroups: number;
  trainersCount: number;
}

export interface GroupRepository {
  list(filter: GroupFilter): Promise<Group[]>;
  findById(id: string): Promise<Group | null>;
  /** Members of each group, in the order they joined. */
  membersOf(groupIds: string[]): Promise<Map<string, GroupMember[]>>;
  memberCounts(groupIds: string[]): Promise<Map<string, number>>;
  isMember(groupId: string, studentId: string): Promise<boolean>;
  create(data: NewGroupRow): Promise<string>;
  update(id: string, data: Partial<NewGroupRow>): Promise<boolean>;
  delete(id: string): Promise<void>;
  /** Adds a student unless the group is full; the capacity check and insert are atomic. */
  addStudent(groupId: string, studentId: string, enforceCapacity: boolean): Promise<AddStudentResult>;
  removeStudent(groupId: string, studentId: string): Promise<boolean>;
  /** Removes the student from every group of the course (used when an enrollment is deleted). */
  removeStudentFromCourse(studentId: string, courseId: string): Promise<void>;
  /** The student's group in a course, if any. */
  groupOfStudentInCourse(studentId: string, courseId: string): Promise<Group | null>;
  countsByCourse(courseIds: string[]): Promise<Map<string, CourseGroupCounts>>;
}

export class DrizzleGroupRepository implements GroupRepository {
  constructor(private readonly db: DbExecutor) {}

  private base() {
    return this.db
      .select({
        group: groups,
        course: {
          id: courses.id,
          title: courses.title,
          category: courses.category,
          level: courses.level,
          thumbnail: courses.thumbnail,
          duration: courses.duration,
        },
        trainer: { id: users.id, name: users.name, email: users.email, profile: users.profile },
      })
      .from(groups)
      .leftJoin(courses, eq(courses.id, groups.courseId))
      .leftJoin(users, eq(users.id, groups.trainerId));
  }

  private static merge(r: { group: GroupRow; course: CourseSummary | null; trainer: TrainerSummary | null }): Group {
    return { ...r.group, course: r.course?.id ? r.course : null, trainer: r.trainer?.id ? r.trainer : null };
  }

  async list(f: GroupFilter): Promise<Group[]> {
    const s = f.search ? `%${escapeLike(f.search)}%` : null;
    const where: SQL | undefined = and(
      f.status ? sql`${groups.status}::text = ${f.status}` : undefined,
      f.courseId ? eq(groups.courseId, f.courseId) : undefined,
      f.trainerId ? eq(groups.trainerId, f.trainerId) : undefined,
      s
        ? f.searchCourse
          ? or(ilike(groups.name, s), ilike(groups.description, s), ilike(courses.title, s))
          : ilike(groups.name, s)
        : undefined,
    );
    const column = groups[f.sortBy ?? 'createdAt'];
    const rows = await this.base()
      .where(where)
      .orderBy(f.order === 'asc' ? asc(column) : desc(column));
    return rows.map(DrizzleGroupRepository.merge);
  }

  async findById(id: string): Promise<Group | null> {
    const [row] = await this.base().where(eq(groups.id, id)).limit(1);
    return row ? DrizzleGroupRepository.merge(row) : null;
  }

  async membersOf(groupIds: string[]): Promise<Map<string, GroupMember[]>> {
    const result = new Map<string, GroupMember[]>(groupIds.map((id) => [id, []]));
    if (groupIds.length === 0) return result;
    const rows = await this.db
      .select({
        groupId: groupStudents.groupId,
        addedAt: groupStudents.addedAt,
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        profile: users.profile,
        createdAt: users.createdAt,
      })
      .from(groupStudents)
      .innerJoin(users, eq(users.id, groupStudents.studentId))
      .where(inArray(groupStudents.groupId, groupIds))
      .orderBy(asc(groupStudents.addedAt));
    for (const { groupId, ...member } of rows) result.get(groupId)?.push(member);
    return result;
  }

  async memberCounts(groupIds: string[]): Promise<Map<string, number>> {
    const result = new Map<string, number>(groupIds.map((id) => [id, 0]));
    if (groupIds.length === 0) return result;
    const rows = await this.db
      .select({ groupId: groupStudents.groupId, n: count() })
      .from(groupStudents)
      .where(inArray(groupStudents.groupId, groupIds))
      .groupBy(groupStudents.groupId);
    for (const r of rows) result.set(r.groupId, r.n);
    return result;
  }

  async isMember(groupId: string, studentId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ g: groupStudents.groupId })
      .from(groupStudents)
      .where(and(eq(groupStudents.groupId, groupId), eq(groupStudents.studentId, studentId)))
      .limit(1);
    return Boolean(row);
  }

  async create(data: NewGroupRow): Promise<string> {
    const [row] = await this.db.insert(groups).values(data).returning({ id: groups.id });
    if (!row) throw new Error('Insert returned no row');
    return row.id;
  }

  async update(id: string, data: Partial<NewGroupRow>): Promise<boolean> {
    const rows = await this.db.update(groups).set(data).where(eq(groups.id, id)).returning({ id: groups.id });
    return rows.length > 0;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(groups).where(eq(groups.id, id));
  }

  async addStudent(groupId: string, studentId: string, enforceCapacity: boolean): Promise<AddStudentResult> {
    return this.db.transaction(async (tx) => {
      // Lock the group row so two concurrent adds cannot both take the last seat.
      const [group] = await tx.select({ max: groups.maxStudents }).from(groups).where(eq(groups.id, groupId)).for('update');
      if (!group) return 'no_group';
      const [existing] = await tx
        .select({ g: groupStudents.groupId })
        .from(groupStudents)
        .where(and(eq(groupStudents.groupId, groupId), eq(groupStudents.studentId, studentId)));
      if (existing) return 'already_member';
      if (enforceCapacity) {
        const [c] = await tx.select({ n: count() }).from(groupStudents).where(eq(groupStudents.groupId, groupId));
        if ((c?.n ?? 0) >= group.max) return 'full';
      }
      await tx.insert(groupStudents).values({ groupId, studentId });
      return 'added';
    });
  }

  async removeStudent(groupId: string, studentId: string): Promise<boolean> {
    const rows = await this.db
      .delete(groupStudents)
      .where(and(eq(groupStudents.groupId, groupId), eq(groupStudents.studentId, studentId)))
      .returning({ g: groupStudents.groupId });
    return rows.length > 0;
  }

  async removeStudentFromCourse(studentId: string, courseId: string): Promise<void> {
    await this.db
      .delete(groupStudents)
      .where(
        and(
          eq(groupStudents.studentId, studentId),
          inArray(groupStudents.groupId, this.db.select({ id: groups.id }).from(groups).where(eq(groups.courseId, courseId))),
        ),
      );
  }

  async groupOfStudentInCourse(studentId: string, courseId: string): Promise<Group | null> {
    const [row] = await this.base()
      .innerJoin(groupStudents, and(eq(groupStudents.groupId, groups.id), eq(groupStudents.studentId, studentId)))
      .where(eq(groups.courseId, courseId))
      .limit(1);
    return row ? DrizzleGroupRepository.merge(row) : null;
  }

  async countsByCourse(courseIds: string[]): Promise<Map<string, CourseGroupCounts>> {
    const result = new Map<string, CourseGroupCounts>();
    if (courseIds.length === 0) return result;
    const rows = await this.db
      .select({
        courseId: groups.courseId,
        totalGroups: count(),
        activeGroups: sql<number>`count(*) filter (where ${groups.status} = 'active')`.mapWith(Number),
        trainersCount: countDistinct(groups.trainerId),
      })
      .from(groups)
      .where(inArray(groups.courseId, courseIds))
      .groupBy(groups.courseId);
    for (const { courseId, ...counts } of rows) result.set(courseId, counts);
    return result;
  }
}
