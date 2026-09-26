import { and, asc, count, desc, eq, gte, ilike, inArray, lte, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { DbExecutor } from '../../shared/db/client';
import { escapeLike } from '../../shared/db/like';
import { courses } from '../courses/courses.table';
import { users } from '../users/users.table';
import {
  type LeadFollowUpRow,
  type LeadRow,
  type LeadStatus,
  type LeadStatusChangeRow,
  leadFollowUps,
  leads,
  leadStatusChanges,
  type NewLeadRow,
} from './leads.table';

export interface PersonRef {
  id: string;
  name: string;
  email: string;
}
export interface CourseRef {
  id: string;
  title: string;
  price: number;
}

/** A lead with the records it points at and its two logs, as the API returns it. */
export interface Lead extends LeadRow {
  assignedTo: PersonRef | null;
  convertedToStudent: PersonRef | null;
  waitingCourse: CourseRef | null;
  followUps: LeadFollowUpRow[];
  statusHistory: LeadStatusChangeRow[];
}

export interface LeadFilter {
  status?: string;
  interestField?: string;
  referralSource?: string;
  assignedTo?: string;
  search?: string;
  fromDate?: Date;
  toDate?: Date;
}

export type LeadSort = { field: 'leadDate' | 'createdAt' | 'fullName'; dir: 'asc' | 'desc' };

export interface LeadStats {
  total: number;
  interest: number;
  waiting: number;
  student: number;
  blacklist: number;
  recentLeads: number;
  needsFollowUp: number;
}

export interface LeadRepository {
  list(filter: LeadFilter, sort: LeadSort, page: { limit: number; offset: number }): Promise<{ items: Lead[]; total: number }>;
  listWaiting(courseId: string | undefined, page: { limit: number; offset: number }): Promise<{ items: Lead[]; total: number }>;
  findById(id: string): Promise<Lead | null>;
  /** Plain row (no joins), for existence checks and rules. */
  findRow(id: string): Promise<LeadRow | null>;
  /**
   * The lead behind a user account: the one converted into it, or else the
   * first lead whose Arabic or English name equals the account name.
   */
  findForUser(userId: string, name: string): Promise<LeadRow | null>;
  create(data: NewLeadRow): Promise<string>;
  update(id: string, data: Partial<NewLeadRow>): Promise<boolean>;
  delete(id: string): Promise<boolean>;
  addFollowUp(leadId: string, entry: { note: string; date: Date; byId: string | null }): Promise<void>;
  addStatusChange(
    leadId: string,
    entry: { fromStatus: LeadStatus | null; toStatus: LeadStatus; reason: string; changedById: string | null },
  ): Promise<void>;
  stats(now: Date): Promise<LeadStats>;
}

interface BaseRow {
  lead: LeadRow;
  assignee: PersonRef | null;
  student: PersonRef | null;
  course: CourseRef | null;
}

const assignee = alias(users, 'assignee');
const student = alias(users, 'converted_student');

export class DrizzleLeadRepository implements LeadRepository {
  constructor(private readonly db: DbExecutor) {}

  private base() {
    return this.db
      .select({
        lead: leads,
        assignee: { id: assignee.id, name: assignee.name, email: assignee.email },
        student: { id: student.id, name: student.name, email: student.email },
        course: { id: courses.id, title: courses.title, price: courses.price },
      })
      .from(leads)
      .leftJoin(assignee, eq(assignee.id, leads.assignedToId))
      .leftJoin(student, eq(student.id, leads.convertedToStudentId))
      .leftJoin(courses, eq(courses.id, leads.waitingCourseId));
  }

  /** Attaches follow-ups and status history to a page of leads with two batched queries. */
  private async hydrate(rows: BaseRow[]): Promise<Lead[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.lead.id);
    const [followUps, changes] = await Promise.all([
      this.db.select().from(leadFollowUps).where(inArray(leadFollowUps.leadId, ids)).orderBy(asc(leadFollowUps.date), asc(leadFollowUps.id)),
      this.db
        .select()
        .from(leadStatusChanges)
        .where(inArray(leadStatusChanges.leadId, ids))
        .orderBy(asc(leadStatusChanges.changedAt), asc(leadStatusChanges.id)),
    ]);
    const group = <T extends { leadId: string }>(items: T[]) => {
      const map = new Map<string, T[]>();
      for (const item of items) map.set(item.leadId, [...(map.get(item.leadId) ?? []), item]);
      return map;
    };
    const fu = group(followUps);
    const sc = group(changes);
    return rows.map((r) => ({
      ...r.lead,
      assignedTo: r.assignee?.id ? r.assignee : null,
      convertedToStudent: r.student?.id ? r.student : null,
      waitingCourse: r.course?.id ? r.course : null,
      followUps: fu.get(r.lead.id) ?? [],
      statusHistory: sc.get(r.lead.id) ?? [],
    }));
  }

  private static where(f: LeadFilter): SQL | undefined {
    const search = f.search ? `%${escapeLike(f.search)}%` : null;
    return and(
      f.status ? sql`${leads.status}::text = ${f.status}` : undefined,
      f.interestField ? eq(leads.interestField, f.interestField) : undefined,
      f.referralSource ? eq(leads.referralSource, f.referralSource) : undefined,
      f.assignedTo ? eq(leads.assignedToId, f.assignedTo) : undefined,
      search
        ? or(ilike(leads.fullName, search), ilike(leads.firstName, search), ilike(leads.lastName, search), ilike(leads.mobileNumber, search))
        : undefined,
      f.fromDate ? gte(leads.createdAt, f.fromDate) : undefined,
      f.toDate ? lte(leads.createdAt, f.toDate) : undefined,
    );
  }

  async list(f: LeadFilter, sort: LeadSort, page: { limit: number; offset: number }) {
    const where = DrizzleLeadRepository.where(f);
    const column = { leadDate: leads.leadDate, createdAt: leads.createdAt, fullName: leads.fullName }[sort.field];
    // Leads without a lead date always come last, whichever way the list is sorted.
    const order = sort.dir === 'asc' ? sql`${column} asc nulls last` : sql`${column} desc nulls last`;
    const [rows, [totalRow]] = await Promise.all([
      this.base().where(where).orderBy(order, desc(leads.id)).limit(page.limit).offset(page.offset),
      this.db.select({ n: count() }).from(leads).where(where),
    ]);
    return { items: await this.hydrate(rows), total: totalRow?.n ?? 0 };
  }

  async listWaiting(courseId: string | undefined, page: { limit: number; offset: number }) {
    const where = and(eq(leads.status, 'waiting'), courseId ? eq(leads.waitingCourseId, courseId) : undefined);
    const [rows, [totalRow]] = await Promise.all([
      this.base().where(where).orderBy(desc(leads.createdAt)).limit(page.limit).offset(page.offset),
      this.db.select({ n: count() }).from(leads).where(where),
    ]);
    return { items: await this.hydrate(rows), total: totalRow?.n ?? 0 };
  }

  async findById(id: string): Promise<Lead | null> {
    const [lead] = await this.hydrate(await this.base().where(eq(leads.id, id)).limit(1));
    return lead ?? null;
  }

  async findRow(id: string): Promise<LeadRow | null> {
    const [row] = await this.db.select().from(leads).where(eq(leads.id, id)).limit(1);
    return row ?? null;
  }

  async findForUser(userId: string, name: string): Promise<LeadRow | null> {
    const [row] = await this.db
      .select()
      .from(leads)
      .where(or(eq(leads.convertedToStudentId, userId), eq(leads.fullName, name), eq(leads.englishName, name)))
      // The converted lead wins over any same-name match.
      .orderBy(sql`(${leads.convertedToStudentId} = ${userId}) desc nulls last`, asc(leads.createdAt))
      .limit(1);
    return row ?? null;
  }

  async create(data: NewLeadRow): Promise<string> {
    const [row] = await this.db.insert(leads).values(data).returning({ id: leads.id });
    if (!row) throw new Error('Insert returned no row');
    return row.id;
  }

  async update(id: string, data: Partial<NewLeadRow>): Promise<boolean> {
    const rows = await this.db
      .update(leads)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning({ id: leads.id });
    return rows.length > 0;
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.db.delete(leads).where(eq(leads.id, id)).returning({ id: leads.id });
    return rows.length > 0;
  }

  async addFollowUp(leadId: string, entry: { note: string; date: Date; byId: string | null }): Promise<void> {
    await this.db.insert(leadFollowUps).values({ leadId, ...entry });
    await this.db.update(leads).set({ updatedAt: new Date() }).where(eq(leads.id, leadId));
  }

  async addStatusChange(
    leadId: string,
    entry: { fromStatus: LeadStatus | null; toStatus: LeadStatus; reason: string; changedById: string | null },
  ): Promise<void> {
    await this.db.insert(leadStatusChanges).values({ leadId, ...entry });
  }

  async stats(now: Date): Promise<LeadStats> {
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const [row] = await this.db
      .select({
        total: count(),
        interest: sql<number>`count(*) filter (where ${leads.status} = 'interest')`.mapWith(Number),
        waiting: sql<number>`count(*) filter (where ${leads.status} = 'waiting')`.mapWith(Number),
        student: sql<number>`count(*) filter (where ${leads.status} = 'student')`.mapWith(Number),
        blacklist: sql<number>`count(*) filter (where ${leads.status} = 'blacklist')`.mapWith(Number),
        recentLeads: sql<number>`count(*) filter (where ${leads.createdAt} >= ${weekAgo})`.mapWith(Number),
        needsFollowUp: sql<number>`count(*) filter (where ${leads.status} = 'interest' and ${leads.nextFollowUpDate} <= ${now})`.mapWith(Number),
      })
      .from(leads);
    return row ?? { total: 0, interest: 0, waiting: 0, student: 0, blacklist: 0, recentLeads: 0, needsFollowUp: 0 };
  }
}
