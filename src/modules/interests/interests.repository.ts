import { and, desc, eq, ilike } from 'drizzle-orm';
import type { DbExecutor } from '../../shared/db/client';
import { escapeLike } from '../../shared/db/like';
import { users } from '../users/users.table';
import { type InterestRow, interests, type NewInterestRow } from './interests.table';

export interface InterestWithCreator extends InterestRow {
  createdBy: { id: string; name: string; email: string } | null;
}

export interface InterestFilter {
  status?: 'active' | 'archived';
  search?: string;
}

export interface InterestRepository {
  list(filter: InterestFilter): Promise<InterestWithCreator[]>;
  findById(id: string): Promise<InterestWithCreator | null>;
  nameExists(name: string): Promise<boolean>;
  create(data: NewInterestRow): Promise<InterestWithCreator>;
  update(id: string, data: Partial<NewInterestRow>): Promise<InterestWithCreator>;
  delete(id: string): Promise<void>;
}

export class DrizzleInterestRepository implements InterestRepository {
  constructor(private readonly db: DbExecutor) {}

  private query() {
    return this.db
      .select({ interest: interests, creator: { id: users.id, name: users.name, email: users.email } })
      .from(interests)
      .leftJoin(users, eq(users.id, interests.createdById));
  }

  private static merge(row: { interest: InterestRow; creator: InterestWithCreator['createdBy'] }): InterestWithCreator {
    return { ...row.interest, createdBy: row.creator?.id ? row.creator : null };
  }

  async list({ status, search }: InterestFilter): Promise<InterestWithCreator[]> {
    const rows = await this.query()
      .where(
        and(
          status ? eq(interests.status, status) : undefined,
          search ? ilike(interests.name, `%${escapeLike(search)}%`) : undefined,
        ),
      )
      .orderBy(desc(interests.createdAt));
    return rows.map(DrizzleInterestRepository.merge);
  }

  async findById(id: string): Promise<InterestWithCreator | null> {
    const [row] = await this.query().where(eq(interests.id, id)).limit(1);
    return row ? DrizzleInterestRepository.merge(row) : null;
  }

  async nameExists(name: string): Promise<boolean> {
    const [row] = await this.db.select({ id: interests.id }).from(interests).where(eq(interests.name, name)).limit(1);
    return Boolean(row);
  }

  async create(data: NewInterestRow): Promise<InterestWithCreator> {
    const [row] = await this.db.insert(interests).values(data).returning({ id: interests.id });
    if (!row) throw new Error('Insert returned no row');
    return (await this.findById(row.id))!;
  }

  async update(id: string, data: Partial<NewInterestRow>): Promise<InterestWithCreator> {
    await this.db.update(interests).set(data).where(eq(interests.id, id));
    const updated = await this.findById(id);
    if (!updated) throw new Error(`Interest ${id} not found`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(interests).where(eq(interests.id, id));
  }
}
