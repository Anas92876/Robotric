import { and, asc, count, desc, eq, gt, gte, inArray, lte, ne, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { DbExecutor } from '../../shared/db/client';
import { subscriptionPlans } from '../subscription-plans/subscription-plans.table';
import { users } from '../users/users.table';
import {
  type SessionReportRow,
  sessionReports,
  type SessionRequestRow,
  sessionRequests,
  type SessionRequestStatus,
  type UserSubscriptionRow,
  userSubscriptions,
} from './subscriptions.table';

export interface PersonRef {
  id: string;
  name: string;
  email: string;
}

export interface UserSubscription extends UserSubscriptionRow {
  user: (PersonRef & { role: string }) | null;
  plan: { id: string; name: string; monthlyHours: number; price: number } | null;
}

export interface SessionRequest extends SessionRequestRow {
  user: PersonRef | null;
  approvedBy: PersonRef | null;
  declinedBy: PersonRef | null;
}

export interface SessionReport extends SessionReportRow {
  createdBy: PersonRef | null;
  request: SessionRequest | null;
}

// ─── Subscriptions ───────────────────────────────────────────────────────────

export interface UserSubscriptionRepository {
  list(filter: { status?: string; userId?: string }): Promise<UserSubscription[]>;
  findById(id: string): Promise<UserSubscription | null>;
  /** The subscription that is active and running right now. */
  findCurrent(userId: string, now: Date): Promise<UserSubscription | null>;
  /** Active and not yet ended (may start in the future). */
  findActiveNotEnded(userId: string, now: Date): Promise<UserSubscriptionRow | null>;
  create(data: typeof userSubscriptions.$inferInsert): Promise<string>;
  update(id: string, data: Partial<typeof userSubscriptions.$inferInsert>): Promise<void>;
  countActiveForPlan(planId: string): Promise<number>;
  /** Subtracts hours only if enough remain; false when they don't. Atomic. */
  deductHours(id: string, hours: number): Promise<boolean>;
}

const subUser = alias(users, 'sub_user');

export class DrizzleUserSubscriptionRepository implements UserSubscriptionRepository {
  constructor(private readonly db: DbExecutor) {}

  private base() {
    return this.db
      .select({
        s: userSubscriptions,
        user: { id: subUser.id, name: subUser.name, email: subUser.email, role: subUser.role },
        plan: { id: subscriptionPlans.id, name: subscriptionPlans.name, monthlyHours: subscriptionPlans.monthlyHours, price: subscriptionPlans.price },
      })
      .from(userSubscriptions)
      .leftJoin(subUser, eq(subUser.id, userSubscriptions.userId))
      .leftJoin(subscriptionPlans, eq(subscriptionPlans.id, userSubscriptions.planId));
  }

  private static merge(r: { s: UserSubscriptionRow; user: UserSubscription['user']; plan: UserSubscription['plan'] }): UserSubscription {
    return { ...r.s, user: r.user?.id ? r.user : null, plan: r.plan?.id ? r.plan : null };
  }

  async list({ status, userId }: { status?: string; userId?: string }) {
    const rows = await this.base()
      .where(and(status ? sql`${userSubscriptions.status}::text = ${status}` : undefined, userId ? eq(userSubscriptions.userId, userId) : undefined))
      .orderBy(desc(userSubscriptions.createdAt));
    return rows.map(DrizzleUserSubscriptionRepository.merge);
  }

  async findById(id: string) {
    const [row] = await this.base().where(eq(userSubscriptions.id, id)).limit(1);
    return row ? DrizzleUserSubscriptionRepository.merge(row) : null;
  }

  async findCurrent(userId: string, now: Date) {
    const [row] = await this.base()
      .where(
        and(
          eq(userSubscriptions.userId, userId),
          eq(userSubscriptions.status, 'active'),
          lte(userSubscriptions.startsAt, now),
          gt(userSubscriptions.endsAt, now),
        ),
      )
      .orderBy(desc(userSubscriptions.createdAt))
      .limit(1);
    return row ? DrizzleUserSubscriptionRepository.merge(row) : null;
  }

  async findActiveNotEnded(userId: string, now: Date) {
    const [row] = await this.db
      .select()
      .from(userSubscriptions)
      .where(and(eq(userSubscriptions.userId, userId), eq(userSubscriptions.status, 'active'), gt(userSubscriptions.endsAt, now)))
      .limit(1);
    return row ?? null;
  }

  async create(data: typeof userSubscriptions.$inferInsert) {
    const [row] = await this.db.insert(userSubscriptions).values(data).returning({ id: userSubscriptions.id });
    if (!row) throw new Error('Insert returned no row');
    return row.id;
  }

  async update(id: string, data: Partial<typeof userSubscriptions.$inferInsert>) {
    await this.db.update(userSubscriptions).set(data).where(eq(userSubscriptions.id, id));
  }

  async countActiveForPlan(planId: string) {
    const [row] = await this.db
      .select({ n: count() })
      .from(userSubscriptions)
      .where(and(eq(userSubscriptions.planId, planId), eq(userSubscriptions.status, 'active')));
    return row?.n ?? 0;
  }

  async deductHours(id: string, hours: number) {
    const rows = await this.db
      .update(userSubscriptions)
      .set({ remainingHours: sql`${userSubscriptions.remainingHours} - ${hours}` })
      .where(and(eq(userSubscriptions.id, id), gte(userSubscriptions.remainingHours, hours)))
      .returning({ id: userSubscriptions.id });
    return rows.length > 0;
  }
}

// ─── Session requests and reports ────────────────────────────────────────────

export interface SessionRequestRepository {
  list(filter: { status?: SessionRequestStatus; userId?: string }): Promise<SessionRequest[]>;
  findById(id: string): Promise<SessionRequest | null>;
  /** Pending or approved requests of the user on that day, except one. */
  activeOnDay(userId: string, date: Date, exceptId?: string): Promise<SessionRequestRow[]>;
  create(data: typeof sessionRequests.$inferInsert): Promise<string>;
  update(id: string, data: Partial<typeof sessionRequests.$inferInsert>): Promise<void>;
  findReport(requestId: string): Promise<SessionReport | null>;
  createReport(data: typeof sessionReports.$inferInsert): Promise<string>;
  reports(filter: { createdById?: string; userId?: string }): Promise<SessionReport[]>;
}

const reqUser = alias(users, 'req_user');
const approver = alias(users, 'req_approver');
const decliner = alias(users, 'req_decliner');
const reporter = alias(users, 'report_creator');

export class DrizzleSessionRequestRepository implements SessionRequestRepository {
  constructor(private readonly db: DbExecutor) {}

  private base() {
    return this.db
      .select({
        r: sessionRequests,
        user: { id: reqUser.id, name: reqUser.name, email: reqUser.email },
        approvedBy: { id: approver.id, name: approver.name, email: approver.email },
        declinedBy: { id: decliner.id, name: decliner.name, email: decliner.email },
      })
      .from(sessionRequests)
      .leftJoin(reqUser, eq(reqUser.id, sessionRequests.userId))
      .leftJoin(approver, eq(approver.id, sessionRequests.approvedById))
      .leftJoin(decliner, eq(decliner.id, sessionRequests.declinedById));
  }

  private static merge(r: { r: SessionRequestRow; user: PersonRef | null; approvedBy: PersonRef | null; declinedBy: PersonRef | null }): SessionRequest {
    const ref = (p: PersonRef | null) => (p?.id ? p : null);
    return { ...r.r, user: ref(r.user), approvedBy: ref(r.approvedBy), declinedBy: ref(r.declinedBy) };
  }

  async list({ status, userId }: { status?: SessionRequestStatus; userId?: string }) {
    const where = and(status ? eq(sessionRequests.status, status) : undefined, userId ? eq(sessionRequests.userId, userId) : undefined);
    // Reception sees the schedule in date order; a student sees newest requests first.
    const order = userId ? [desc(sessionRequests.createdAt)] : [asc(sessionRequests.date), asc(sessionRequests.startTime)];
    const rows = await this.base().where(where).orderBy(...order);
    return rows.map(DrizzleSessionRequestRepository.merge);
  }

  async findById(id: string) {
    const [row] = await this.base().where(eq(sessionRequests.id, id)).limit(1);
    return row ? DrizzleSessionRequestRepository.merge(row) : null;
  }

  activeOnDay(userId: string, date: Date, exceptId?: string) {
    return this.db
      .select()
      .from(sessionRequests)
      .where(
        and(
          eq(sessionRequests.userId, userId),
          eq(sessionRequests.date, date),
          inArray(sessionRequests.status, ['pending', 'approved']),
          exceptId ? ne(sessionRequests.id, exceptId) : undefined,
        ),
      );
  }

  async create(data: typeof sessionRequests.$inferInsert) {
    const [row] = await this.db.insert(sessionRequests).values(data).returning({ id: sessionRequests.id });
    if (!row) throw new Error('Insert returned no row');
    return row.id;
  }

  async update(id: string, data: Partial<typeof sessionRequests.$inferInsert>) {
    await this.db.update(sessionRequests).set(data).where(eq(sessionRequests.id, id));
  }

  private async withRequests(rows: { rep: SessionReportRow; creator: PersonRef | null }[]): Promise<SessionReport[]> {
    const ids = rows.map((r) => r.rep.sessionRequestId);
    const requests = ids.length ? (await this.base().where(inArray(sessionRequests.id, ids))).map(DrizzleSessionRequestRepository.merge) : [];
    const byId = new Map(requests.map((r) => [r.id, r]));
    return rows.map((r) => ({ ...r.rep, createdBy: r.creator?.id ? r.creator : null, request: byId.get(r.rep.sessionRequestId) ?? null }));
  }

  private reportBase() {
    return this.db
      .select({ rep: sessionReports, creator: { id: reporter.id, name: reporter.name, email: reporter.email } })
      .from(sessionReports)
      .leftJoin(reporter, eq(reporter.id, sessionReports.createdById));
  }

  async findReport(requestId: string) {
    const [report] = await this.withRequests(await this.reportBase().where(eq(sessionReports.sessionRequestId, requestId)).limit(1));
    return report ?? null;
  }

  async createReport(data: typeof sessionReports.$inferInsert) {
    const [row] = await this.db.insert(sessionReports).values(data).returning({ id: sessionReports.id });
    if (!row) throw new Error('Insert returned no row');
    return row.id;
  }

  async reports({ createdById, userId }: { createdById?: string; userId?: string }) {
    const rows = await this.reportBase()
      .where(
        and(
          createdById ? eq(sessionReports.createdById, createdById) : undefined,
          userId
            ? inArray(sessionReports.sessionRequestId, this.db.select({ id: sessionRequests.id }).from(sessionRequests).where(eq(sessionRequests.userId, userId)))
            : undefined,
        ),
      )
      .orderBy(desc(sessionReports.createdAt));
    return this.withRequests(rows);
  }
}
