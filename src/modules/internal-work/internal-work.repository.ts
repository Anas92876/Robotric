import { and, type AnyColumn, asc, count, desc, eq, gte, inArray, isNull, lt, ne, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { DbExecutor } from '../../shared/db/client';
import { users } from '../users/users.table';
import {
  employeeOfMonth,
  type ExtensionRow,
  internalProjectMembers,
  type InternalProjectRow,
  internalProjects,
  internalTaskAssignees,
  type InternalTaskRow,
  internalTasks,
  type InternalTaskStatus,
  type SubTaskRow,
  subTasks,
  timeExtensionRequests,
  type WorkSessionRow,
  workSessions,
} from './internal-work.table';

export interface Person {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Project extends InternalProjectRow {
  createdBy: Person | null;
  parent: { id: string; name: string; priority: number } | null;
  engineers: Person[];
  clients: Person[];
}

export interface Task extends InternalTaskRow {
  assignees: Person[];
  createdBy: Person | null;
  client: Person | null;
  project: { id: string; name: string; priority: number } | null;
  subProject: { id: string; name: string; priority: number } | null;
}

export interface SubTask extends SubTaskRow {
  createdBy: Person | null;
}

export interface Extension extends ExtensionRow {
  requestedBy: Person | null;
  reviewedBy: Person | null;
  task: { id: string; title: string; dueDate: Date | null; hardDeadline: Date | null; projectId: string } | null;
}

export interface WorkSession extends WorkSessionRow {
  user: Person | null;
}

export interface TaskFilter {
  status?: string;
  priority?: number;
  assignee?: string;
  projectId?: string;
  projectIds?: string[];
  /** null = only tasks directly on the project (not in a sub-project). */
  subProjectId?: string | null;
  source?: 'internal' | 'client';
  clientId?: string;
  completedFrom?: Date;
  completedTo?: Date;
}

export type StatusCounts = Record<string, number>;

const creator = alias(users, 'iw_creator');
const client = alias(users, 'iw_client');
const reviewer = alias(users, 'iw_reviewer');
const project = alias(internalProjects, 'iw_project');
const subProject = alias(internalProjects, 'iw_sub_project');
const parent = alias(internalProjects, 'iw_parent');

/** id, name, email and role of a user table (or an alias of it). */
const personCols = (u: { id: AnyColumn; name: AnyColumn; email: AnyColumn; role: AnyColumn }) => ({
  id: sql<string>`${u.id}`,
  name: sql<string>`${u.name}`,
  email: sql<string>`${u.email}`,
  role: sql<string>`${u.role}::text`,
});
const person = (p: { id: string | null; name: string | null; email: string | null; role: string | null } | null): Person | null =>
  p?.id ? { id: p.id, name: p.name ?? '', email: p.email ?? '', role: p.role ?? '' } : null;

function taskWhere(f: TaskFilter): SQL | undefined {
  const t = internalTasks;
  return and(
    f.status ? sql`${t.status}::text = ${f.status}` : undefined,
    f.priority !== undefined ? eq(t.priority, f.priority) : undefined,
    f.assignee
      ? sql`exists (select 1 from ${internalTaskAssignees} a where a.task_id = ${t.id} and a.user_id = ${f.assignee})`
      : undefined,
    f.projectId ? eq(t.projectId, f.projectId) : undefined,
    f.projectIds ? (f.projectIds.length ? inArray(t.projectId, f.projectIds) : sql`false`) : undefined,
    f.subProjectId === null ? isNull(t.subProjectId) : f.subProjectId ? eq(t.subProjectId, f.subProjectId) : undefined,
    f.source ? eq(t.source, f.source) : undefined,
    f.clientId ? eq(t.clientId, f.clientId) : undefined,
    f.completedFrom ? gte(t.completedAt, f.completedFrom) : undefined,
    f.completedTo ? lt(t.completedAt, f.completedTo) : undefined,
  );
}

export class DrizzleInternalWorkRepository {
  constructor(private readonly db: DbExecutor) {}

  // ════════════════ Users ════════════════

  async usersByIds(ids: string[]): Promise<Person[]> {
    if (ids.length === 0) return [];
    return this.db.select(personCols(users)).from(users).where(inArray(users.id, ids));
  }

  /** Everyone except students (the old "engineers" list). */
  async staff() {
    return this.db
      .select({ ...personCols(users), isHourly: users.isHourly })
      .from(users)
      .where(ne(users.role, 'student'))
      .orderBy(asc(users.name));
  }

  async clients() {
    return this.db.select(personCols(users)).from(users).where(eq(users.role, 'client')).orderBy(asc(users.name));
  }

  async setHourly(userId: string, isHourly: boolean) {
    const [row] = await this.db
      .update(users)
      .set({ isHourly })
      .where(eq(users.id, userId))
      .returning({ ...personCols(users), isHourly: users.isHourly });
    return row ?? null;
  }

  async isHourly(userId: string) {
    const [row] = await this.db.select({ v: users.isHourly }).from(users).where(eq(users.id, userId)).limit(1);
    return Boolean(row?.v);
  }

  // ════════════════ Projects ════════════════

  private async hydrateProjects(rows: { p: InternalProjectRow; creator: Person | null; parent: Project['parent'] }[]): Promise<Project[]> {
    if (rows.length === 0) return [];
    const members = await this.db
      .select({ projectId: internalProjectMembers.projectId, memberRole: internalProjectMembers.role, ...personCols(users) })
      .from(internalProjectMembers)
      .innerJoin(users, eq(users.id, internalProjectMembers.userId))
      .where(
        inArray(
          internalProjectMembers.projectId,
          rows.map((r) => r.p.id),
        ),
      )
      .orderBy(asc(internalProjectMembers.position));
    return rows.map((r) => {
      const mine = members.filter((m) => m.projectId === r.p.id);
      const pick = (role: string) => mine.filter((m) => m.memberRole === role).map(({ id, name, email, role: userRole }) => ({ id, name, email, role: userRole }));
      return { ...r.p, createdBy: r.creator, parent: r.parent, engineers: pick('engineer'), clients: pick('client') };
    });
  }

  private projectQuery() {
    return this.db
      .select({ p: internalProjects, creator: personCols(creator), parent: { id: parent.id, name: parent.name, priority: parent.priority } })
      .from(internalProjects)
      .leftJoin(creator, eq(creator.id, internalProjects.createdById))
      .leftJoin(parent, eq(parent.id, internalProjects.parentProjectId));
  }

  async listProjects(f: { parentId?: string | null; member?: { userId: string; role: 'engineer' | 'client' } }) {
    const rows = await this.projectQuery()
      .where(
        and(
          f.parentId === null ? isNull(internalProjects.parentProjectId) : f.parentId ? eq(internalProjects.parentProjectId, f.parentId) : undefined,
          f.member
            ? sql`exists (select 1 from ${internalProjectMembers} m where m.project_id = ${internalProjects.id} and m.user_id = ${f.member.userId} and m.role = ${f.member.role})`
            : undefined,
        ),
      )
      .orderBy(asc(internalProjects.priority), desc(internalProjects.createdAt));
    return this.hydrateProjects(rows.map((r) => ({ p: r.p, creator: person(r.creator), parent: r.parent?.id ? r.parent : null })));
  }

  async findProject(id: string) {
    const rows = await this.projectQuery().where(eq(internalProjects.id, id)).limit(1);
    return (await this.hydrateProjects(rows.map((r) => ({ p: r.p, creator: person(r.creator), parent: r.parent?.id ? r.parent : null }))))[0] ?? null;
  }

  private async setMembers(tx: DbExecutor, projectId: string, role: 'engineer' | 'client', userIds: string[]) {
    await tx.delete(internalProjectMembers).where(and(eq(internalProjectMembers.projectId, projectId), eq(internalProjectMembers.role, role)));
    const unique = [...new Set(userIds)];
    if (unique.length) await tx.insert(internalProjectMembers).values(unique.map((userId, position) => ({ projectId, userId, role, position })));
  }

  async createProject(row: typeof internalProjects.$inferInsert, engineers: string[], clients: string[]) {
    return this.db.transaction(async (tx) => {
      const [created] = await tx.insert(internalProjects).values(row).returning({ id: internalProjects.id });
      await this.setMembers(tx, created!.id, 'engineer', engineers);
      await this.setMembers(tx, created!.id, 'client', clients);
      return created!.id;
    });
  }

  async updateProject(id: string, patch: Partial<typeof internalProjects.$inferInsert>, engineers?: string[], clients?: string[]) {
    await this.db.transaction(async (tx) => {
      if (Object.keys(patch).length) await tx.update(internalProjects).set(patch).where(eq(internalProjects.id, id));
      if (engineers) await this.setMembers(tx, id, 'engineer', engineers);
      if (clients) await this.setMembers(tx, id, 'client', clients);
    });
  }

  async deleteProject(id: string) {
    await this.db.delete(internalProjects).where(eq(internalProjects.id, id));
  }

  async subProjectCounts(parentIds: string[]) {
    if (parentIds.length === 0) return new Map<string, number>();
    const rows = await this.db
      .select({ parentId: internalProjects.parentProjectId, n: count() })
      .from(internalProjects)
      .where(inArray(internalProjects.parentProjectId, parentIds))
      .groupBy(internalProjects.parentProjectId);
    return new Map(rows.map((r) => [r.parentId!, r.n]));
  }

  /** Task counts per status, grouped by project (or sub-project with `by: 'subProject'`). */
  async statusCounts(by: 'project' | 'subProject', filter: TaskFilter): Promise<Map<string, StatusCounts>> {
    const key = by === 'project' ? internalTasks.projectId : internalTasks.subProjectId;
    const rows = await this.db
      .select({ key, status: sql<string>`${internalTasks.status}::text`, n: count() })
      .from(internalTasks)
      .where(taskWhere(filter))
      .groupBy(key, internalTasks.status);
    const out = new Map<string, StatusCounts>();
    for (const r of rows) {
      if (!r.key) continue;
      const entry = out.get(r.key) ?? {};
      entry[r.status] = r.n;
      out.set(r.key, entry);
    }
    return out;
  }

  /** Makes the project a sub-project of `parentId`; its tasks move with it. */
  async moveProject(id: string, parentId: string) {
    await this.db.transaction(async (tx) => {
      await tx.update(internalProjects).set({ parentProjectId: parentId }).where(eq(internalProjects.id, id));
      await tx.update(internalTasks).set({ projectId: parentId, subProjectId: id }).where(eq(internalTasks.projectId, id));
    });
  }

  async countTasksOf(projectId: string) {
    const [row] = await this.db
      .select({ n: count() })
      .from(internalTasks)
      .where(sql`${internalTasks.projectId} = ${projectId} or ${internalTasks.subProjectId} = ${projectId}`);
    return row?.n ?? 0;
  }

  // ════════════════ Tasks ════════════════

  private taskQuery() {
    return this.db
      .select({
        t: internalTasks,
        creator: personCols(creator),
        client: personCols(client),
        project: { id: project.id, name: project.name, priority: project.priority },
        subProject: { id: subProject.id, name: subProject.name, priority: subProject.priority },
      })
      .from(internalTasks)
      .leftJoin(creator, eq(creator.id, internalTasks.createdById))
      .leftJoin(client, eq(client.id, internalTasks.clientId))
      .leftJoin(project, eq(project.id, internalTasks.projectId))
      .leftJoin(subProject, eq(subProject.id, internalTasks.subProjectId));
  }

  private async hydrateTasks(rows: Awaited<ReturnType<DrizzleInternalWorkRepository['taskQuery']>>): Promise<Task[]> {
    if (rows.length === 0) return [];
    const assignees = await this.db
      .select({ taskId: internalTaskAssignees.taskId, ...personCols(users) })
      .from(internalTaskAssignees)
      .innerJoin(users, eq(users.id, internalTaskAssignees.userId))
      .where(
        inArray(
          internalTaskAssignees.taskId,
          rows.map((r) => r.t.id),
        ),
      )
      .orderBy(asc(internalTaskAssignees.position));
    return rows.map((r) => ({
      ...r.t,
      assignees: assignees.filter((a) => a.taskId === r.t.id).map(({ taskId: _t, ...p }) => p),
      createdBy: person(r.creator),
      client: person(r.client),
      project: r.project?.id ? r.project : null,
      subProject: r.subProject?.id ? r.subProject : null,
    }));
  }

  async listTasks(f: TaskFilter, order: 'priority' | 'newest' = 'priority') {
    const q = this.taskQuery().where(taskWhere(f));
    const rows =
      order === 'newest'
        ? await q.orderBy(desc(internalTasks.createdAt))
        : await q.orderBy(asc(internalTasks.priority), sql`${internalTasks.dueDate} asc nulls last`, asc(internalTasks.createdAt));
    return this.hydrateTasks(rows);
  }

  async findTask(id: string) {
    return (await this.hydrateTasks(await this.taskQuery().where(eq(internalTasks.id, id)).limit(1)))[0] ?? null;
  }

  private async setAssignees(tx: DbExecutor, taskId: string, userIds: string[]) {
    await tx.delete(internalTaskAssignees).where(eq(internalTaskAssignees.taskId, taskId));
    const unique = [...new Set(userIds)];
    if (unique.length) await tx.insert(internalTaskAssignees).values(unique.map((userId, position) => ({ taskId, userId, position })));
  }

  async createTask(row: typeof internalTasks.$inferInsert, assignees: string[]) {
    return this.db.transaction(async (tx) => {
      const [created] = await tx.insert(internalTasks).values(row).returning({ id: internalTasks.id });
      await this.setAssignees(tx, created!.id, assignees);
      return created!.id;
    });
  }

  async updateTask(id: string, patch: Partial<typeof internalTasks.$inferInsert>, assignees?: string[]) {
    await this.db.transaction(async (tx) => {
      if (Object.keys(patch).length) await tx.update(internalTasks).set(patch).where(eq(internalTasks.id, id));
      if (assignees) await this.setAssignees(tx, id, assignees);
    });
  }

  async deleteTask(id: string) {
    await this.db.delete(internalTasks).where(eq(internalTasks.id, id));
  }

  // ════════════════ Sub-tasks ════════════════

  private subTaskQuery() {
    return this.db.select({ s: subTasks, creator: personCols(creator) }).from(subTasks).leftJoin(creator, eq(creator.id, subTasks.createdById));
  }

  async subTasks(taskId: string): Promise<SubTask[]> {
    const rows = await this.subTaskQuery().where(eq(subTasks.taskId, taskId)).orderBy(asc(subTasks.createdAt));
    return rows.map((r) => ({ ...r.s, createdBy: person(r.creator) }));
  }

  async findSubTask(id: string): Promise<SubTask | null> {
    const [r] = await this.subTaskQuery().where(eq(subTasks.id, id)).limit(1);
    return r ? { ...r.s, createdBy: person(r.creator) } : null;
  }

  async createSubTask(row: typeof subTasks.$inferInsert) {
    const [created] = await this.db.insert(subTasks).values(row).returning({ id: subTasks.id });
    return (await this.findSubTask(created!.id))!;
  }

  async updateSubTask(id: string, patch: Partial<typeof subTasks.$inferInsert>) {
    await this.db.update(subTasks).set(patch).where(eq(subTasks.id, id));
    return (await this.findSubTask(id))!;
  }

  async deleteSubTask(id: string) {
    await this.db.delete(subTasks).where(eq(subTasks.id, id));
  }

  // ════════════════ Time extensions ════════════════

  private extensionQuery() {
    return this.db
      .select({
        e: timeExtensionRequests,
        requester: personCols(users),
        reviewer: personCols(reviewer),
        task: { id: internalTasks.id, title: internalTasks.title, dueDate: internalTasks.dueDate, hardDeadline: internalTasks.hardDeadline, projectId: internalTasks.projectId },
      })
      .from(timeExtensionRequests)
      .leftJoin(users, eq(users.id, timeExtensionRequests.requestedById))
      .leftJoin(reviewer, eq(reviewer.id, timeExtensionRequests.reviewedById))
      .leftJoin(internalTasks, eq(internalTasks.id, timeExtensionRequests.taskId));
  }

  private static extension(r: Awaited<ReturnType<DrizzleInternalWorkRepository['extensionQuery']>>[number]): Extension {
    return { ...r.e, requestedBy: person(r.requester), reviewedBy: person(r.reviewer), task: r.task?.id ? r.task : null };
  }

  async extensions(f: { taskId?: string; status?: string; requestedById?: string }) {
    const rows = await this.extensionQuery()
      .where(
        and(
          f.taskId ? eq(timeExtensionRequests.taskId, f.taskId) : undefined,
          f.status ? sql`${timeExtensionRequests.status}::text = ${f.status}` : undefined,
          f.requestedById ? eq(timeExtensionRequests.requestedById, f.requestedById) : undefined,
        ),
      )
      .orderBy(desc(timeExtensionRequests.createdAt));
    return rows.map(DrizzleInternalWorkRepository.extension);
  }

  async findExtension(id: string) {
    const [r] = await this.extensionQuery().where(eq(timeExtensionRequests.id, id)).limit(1);
    return r ? DrizzleInternalWorkRepository.extension(r) : null;
  }

  async createExtension(row: typeof timeExtensionRequests.$inferInsert) {
    const [created] = await this.db.insert(timeExtensionRequests).values(row).returning({ id: timeExtensionRequests.id });
    return (await this.findExtension(created!.id))!;
  }

  /** Reviews a pending request (and moves the task's due date when approved) atomically. False if it was no longer pending. */
  async reviewExtension(id: string, patch: Partial<typeof timeExtensionRequests.$inferInsert>, newDueDate?: { taskId: string; date: Date }) {
    return this.db.transaction(async (tx) => {
      const done = await tx
        .update(timeExtensionRequests)
        .set(patch)
        .where(and(eq(timeExtensionRequests.id, id), eq(timeExtensionRequests.status, 'pending')))
        .returning({ id: timeExtensionRequests.id });
      if (done.length === 0) return false;
      if (newDueDate) await tx.update(internalTasks).set({ dueDate: newDueDate.date }).where(eq(internalTasks.id, newDueDate.taskId));
      return true;
    });
  }

  async deleteExtension(id: string) {
    await this.db.delete(timeExtensionRequests).where(eq(timeExtensionRequests.id, id));
  }

  // ════════════════ Work sessions ════════════════

  /** Closes shifts left open longer than `maxHours`, capping them at that length. */
  async closeStale(now: Date, maxHours: number, userId?: string) {
    const limit = new Date(now.getTime() - maxHours * 3600000);
    await this.db
      .update(workSessions)
      .set({ clockOut: sql`${workSessions.clockIn} + make_interval(hours => ${maxHours})`, durationMinutes: maxHours * 60, autoClosed: true })
      .where(and(isNull(workSessions.clockOut), lt(workSessions.clockIn, limit), userId ? eq(workSessions.userId, userId) : undefined));
  }

  async openSession(userId: string) {
    const [row] = await this.db
      .select()
      .from(workSessions)
      .where(and(eq(workSessions.userId, userId), isNull(workSessions.clockOut)))
      .limit(1);
    return row ?? null;
  }

  async openSessions() {
    return this.db.select({ userId: workSessions.userId, clockIn: workSessions.clockIn }).from(workSessions).where(isNull(workSessions.clockOut));
  }

  async startSession(userId: string, at: Date) {
    const [row] = await this.db.insert(workSessions).values({ userId, clockIn: at }).returning();
    return row!;
  }

  async updateSession(id: string, patch: Partial<typeof workSessions.$inferInsert>) {
    const [row] = await this.db.update(workSessions).set(patch).where(eq(workSessions.id, id)).returning();
    return row ?? null;
  }

  async findSession(id: string) {
    const [row] = await this.db.select().from(workSessions).where(eq(workSessions.id, id)).limit(1);
    return row ?? null;
  }

  async sessions(f: { userId?: string; from: Date; to?: Date }): Promise<WorkSession[]> {
    const rows = await this.db
      .select({ s: workSessions, user: personCols(users) })
      .from(workSessions)
      .leftJoin(users, eq(users.id, workSessions.userId))
      .where(and(f.userId ? eq(workSessions.userId, f.userId) : undefined, gte(workSessions.clockIn, f.from), f.to ? lt(workSessions.clockIn, f.to) : undefined))
      .orderBy(desc(workSessions.clockIn));
    return rows.map((r) => ({ ...r.s, user: person(r.user) }));
  }

  async deleteSession(id: string) {
    const rows = await this.db.delete(workSessions).where(eq(workSessions.id, id)).returning({ id: workSessions.id });
    return rows.length > 0;
  }

  // ════════════════ Analytics ════════════════

  async doneTasks() {
    const rows = await this.db
      .select({ id: internalTasks.id, priority: internalTasks.priority, dueDate: internalTasks.dueDate, completedAt: internalTasks.completedAt, updatedAt: internalTasks.updatedAt })
      .from(internalTasks)
      .where(eq(internalTasks.status, 'done'));
    if (rows.length === 0) return [];
    const assignees = await this.db
      .select({ taskId: internalTaskAssignees.taskId, userId: internalTaskAssignees.userId })
      .from(internalTaskAssignees)
      .where(
        inArray(
          internalTaskAssignees.taskId,
          rows.map((r) => r.id),
        ),
      );
    return rows.map((r) => ({ ...r, assignees: assignees.filter((a) => a.taskId === r.id).map((a) => a.userId) }));
  }

  async countsBy(field: 'status' | 'priority') {
    const col = field === 'status' ? sql<string>`${internalTasks.status}::text` : sql<string>`${internalTasks.priority}::text`;
    return this.db.select({ key: col, n: count() }).from(internalTasks).groupBy(col);
  }

  async overdue(now: Date, field: 'dueDate' | 'hardDeadline') {
    const [row] = await this.db
      .select({ n: count() })
      .from(internalTasks)
      .where(and(ne(internalTasks.status, 'done'), lt(internalTasks[field], now)));
    return row?.n ?? 0;
  }

  async totals() {
    const [[p], [t], [u]] = await Promise.all([
      this.db.select({ n: count() }).from(internalProjects).where(isNull(internalProjects.parentProjectId)),
      this.db.select({ n: count() }).from(internalTasks),
      this.db.select({ n: count() }).from(users).where(ne(users.role, 'student')),
    ]);
    return { totalProjects: p?.n ?? 0, totalTasks: t?.n ?? 0, totalUsers: u?.n ?? 0 };
  }

  async employeeOfMonth(year: number, month: number) {
    const [row] = await this.db
      .select({ userId: employeeOfMonth.userId })
      .from(employeeOfMonth)
      .where(and(eq(employeeOfMonth.year, year), eq(employeeOfMonth.month, month)))
      .limit(1);
    return row?.userId ?? null;
  }

  async setEmployeeOfMonth(year: number, month: number, userId: string) {
    await this.db.insert(employeeOfMonth).values({ year, month, userId }).onConflictDoUpdate({ target: [employeeOfMonth.year, employeeOfMonth.month], set: { userId } });
  }

  async clearEmployeeOfMonth(year: number, month: number) {
    await this.db.delete(employeeOfMonth).where(and(eq(employeeOfMonth.year, year), eq(employeeOfMonth.month, month)));
  }
}

export type InternalWorkRepository = DrizzleInternalWorkRepository;
export type { InternalTaskStatus };
