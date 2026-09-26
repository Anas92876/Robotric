import { and, asc, avg, count, desc, eq, gte, lte, type SQL } from 'drizzle-orm';
import type { DbExecutor } from '../../shared/db/client';
import { events } from '../events/events.table';
import { users } from '../users/users.table';
import { type ContactHistoryRow, contactHistory, type NewContactHistoryRow } from './contact-history.table';

export interface ContactHistoryEntry extends ContactHistoryRow {
  createdBy: { id: string; name: string; email: string } | null;
  scheduledEvent: { id: string; title: string; startTime: Date; endTime: Date; color: string } | null;
}

export type HistorySort = { field: 'contactDate' | 'createdAt'; dir: 'asc' | 'desc' };

export interface HistoryStatsFilter {
  leadId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface HistoryStats {
  total: number;
  byOutcome: Record<string, number>;
  byType: Record<string, number>;
  averageDuration: number;
}

export interface ContactHistoryRepository {
  listByLead(leadId: string, sort: HistorySort, page: { limit: number; offset: number }): Promise<{ items: ContactHistoryEntry[]; total: number }>;
  findById(id: string): Promise<ContactHistoryEntry | null>;
  findRow(id: string): Promise<ContactHistoryRow | null>;
  create(data: NewContactHistoryRow): Promise<string>;
  update(id: string, data: Partial<NewContactHistoryRow>): Promise<void>;
  delete(id: string): Promise<void>;
  stats(filter: HistoryStatsFilter): Promise<HistoryStats>;
}

export class DrizzleContactHistoryRepository implements ContactHistoryRepository {
  constructor(private readonly db: DbExecutor) {}

  private base() {
    return this.db
      .select({
        entry: contactHistory,
        creator: { id: users.id, name: users.name, email: users.email },
        event: { id: events.id, title: events.title, startTime: events.startTime, endTime: events.endTime, color: events.color },
      })
      .from(contactHistory)
      .leftJoin(users, eq(users.id, contactHistory.createdById))
      .leftJoin(events, eq(events.id, contactHistory.scheduledEventId));
  }

  private static merge(r: {
    entry: ContactHistoryRow;
    creator: ContactHistoryEntry['createdBy'];
    event: ContactHistoryEntry['scheduledEvent'];
  }): ContactHistoryEntry {
    return { ...r.entry, createdBy: r.creator?.id ? r.creator : null, scheduledEvent: r.event?.id ? r.event : null };
  }

  async listByLead(leadId: string, sort: HistorySort, page: { limit: number; offset: number }) {
    const column = sort.field === 'createdAt' ? contactHistory.createdAt : contactHistory.contactDate;
    const where = eq(contactHistory.leadId, leadId);
    const [rows, [totalRow]] = await Promise.all([
      this.base()
        .where(where)
        .orderBy(sort.dir === 'asc' ? asc(column) : desc(column))
        .limit(page.limit)
        .offset(page.offset),
      this.db.select({ n: count() }).from(contactHistory).where(where),
    ]);
    return { items: rows.map(DrizzleContactHistoryRepository.merge), total: totalRow?.n ?? 0 };
  }

  async findById(id: string): Promise<ContactHistoryEntry | null> {
    const [row] = await this.base().where(eq(contactHistory.id, id)).limit(1);
    return row ? DrizzleContactHistoryRepository.merge(row) : null;
  }

  async findRow(id: string): Promise<ContactHistoryRow | null> {
    const [row] = await this.db.select().from(contactHistory).where(eq(contactHistory.id, id)).limit(1);
    return row ?? null;
  }

  async create(data: NewContactHistoryRow): Promise<string> {
    const [row] = await this.db.insert(contactHistory).values(data).returning({ id: contactHistory.id });
    if (!row) throw new Error('Insert returned no row');
    return row.id;
  }

  async update(id: string, data: Partial<NewContactHistoryRow>): Promise<void> {
    await this.db.update(contactHistory).set(data).where(eq(contactHistory.id, id));
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(contactHistory).where(eq(contactHistory.id, id));
  }

  async stats({ leadId, startDate, endDate }: HistoryStatsFilter): Promise<HistoryStats> {
    const where: SQL | undefined = and(
      leadId ? eq(contactHistory.leadId, leadId) : undefined,
      startDate ? gte(contactHistory.contactDate, startDate) : undefined,
      endDate ? lte(contactHistory.contactDate, endDate) : undefined,
    );
    const [byOutcome, byType, [totals]] = await Promise.all([
      this.db.select({ key: contactHistory.outcome, n: count() }).from(contactHistory).where(where).groupBy(contactHistory.outcome),
      this.db.select({ key: contactHistory.contactType, n: count() }).from(contactHistory).where(where).groupBy(contactHistory.contactType),
      this.db.select({ total: count(), avg: avg(contactHistory.duration) }).from(contactHistory).where(where),
    ]);
    const toMap = (rows: { key: string; n: number }[]) => Object.fromEntries(rows.map((r) => [r.key, r.n]));
    return {
      total: totals?.total ?? 0,
      byOutcome: toMap(byOutcome),
      byType: toMap(byType),
      averageDuration: totals?.avg ? Math.round(Number(totals.avg)) : 0,
    };
  }
}
