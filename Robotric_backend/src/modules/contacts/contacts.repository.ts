import { and, count, desc, eq, gte, ilike, lte, or, sql, type SQL } from 'drizzle-orm';
import type { DbExecutor } from '../../shared/db/client';
import { escapeLike } from '../../shared/db/like';
import { leads } from '../leads/leads.table';
import { type ContactRow, contacts, type NewContactRow } from './contacts.table';

export interface Contact extends ContactRow {
  convertedToLead: { id: string; fullName: string; mobileNumber: string } | null;
}

export interface ContactFilter {
  status?: string;
  search?: string;
  fromDate?: Date;
  toDate?: Date;
}

export interface ContactCounts {
  total: number;
  new: number;
  read: number;
  replied: number;
  archived: number;
}

export interface ContactRepository {
  list(filter: ContactFilter, page: { limit: number; offset: number }): Promise<{ items: Contact[]; total: number }>;
  counts(): Promise<ContactCounts>;
  findById(id: string): Promise<Contact | null>;
  create(data: NewContactRow): Promise<ContactRow>;
  update(id: string, data: Partial<NewContactRow>): Promise<boolean>;
  delete(id: string): Promise<boolean>;
}

export class DrizzleContactRepository implements ContactRepository {
  constructor(private readonly db: DbExecutor) {}

  private base() {
    return this.db
      .select({ contact: contacts, lead: { id: leads.id, fullName: leads.fullName, mobileNumber: leads.mobileNumber } })
      .from(contacts)
      .leftJoin(leads, eq(leads.id, contacts.convertedToLeadId));
  }

  private static merge(r: { contact: ContactRow; lead: Contact['convertedToLead'] }): Contact {
    return { ...r.contact, convertedToLead: r.lead?.id ? r.lead : null };
  }

  async list(f: ContactFilter, page: { limit: number; offset: number }) {
    const s = f.search ? `%${escapeLike(f.search)}%` : null;
    const where: SQL | undefined = and(
      f.status ? sql`${contacts.status}::text = ${f.status}` : undefined,
      s
        ? or(ilike(contacts.name, s), ilike(contacts.phone, s), ilike(contacts.email, s), ilike(contacts.location, s), ilike(contacts.subject, s))
        : undefined,
      f.fromDate ? gte(contacts.createdAt, f.fromDate) : undefined,
      f.toDate ? lte(contacts.createdAt, f.toDate) : undefined,
    );
    const [rows, [totalRow]] = await Promise.all([
      this.base().where(where).orderBy(desc(contacts.createdAt)).limit(page.limit).offset(page.offset),
      this.db.select({ n: count() }).from(contacts).where(where),
    ]);
    return { items: rows.map(DrizzleContactRepository.merge), total: totalRow?.n ?? 0 };
  }

  async counts(): Promise<ContactCounts> {
    const by = (status: string) => sql<number>`count(*) filter (where ${contacts.status} = ${status})`.mapWith(Number);
    const [row] = await this.db
      .select({ total: count(), new: by('new'), read: by('read'), replied: by('replied'), archived: by('archived') })
      .from(contacts);
    return row ?? { total: 0, new: 0, read: 0, replied: 0, archived: 0 };
  }

  async findById(id: string): Promise<Contact | null> {
    const [row] = await this.base().where(eq(contacts.id, id)).limit(1);
    return row ? DrizzleContactRepository.merge(row) : null;
  }

  async create(data: NewContactRow): Promise<ContactRow> {
    const [row] = await this.db.insert(contacts).values(data).returning();
    if (!row) throw new Error('Insert returned no row');
    return row;
  }

  async update(id: string, data: Partial<NewContactRow>): Promise<boolean> {
    const rows = await this.db.update(contacts).set(data).where(eq(contacts.id, id)).returning({ id: contacts.id });
    return rows.length > 0;
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.db.delete(contacts).where(eq(contacts.id, id)).returning({ id: contacts.id });
    return rows.length > 0;
  }
}
