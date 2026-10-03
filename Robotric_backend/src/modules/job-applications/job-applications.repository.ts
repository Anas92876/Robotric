import { and, count, desc, eq, gte, ilike, lte, or, sql, type SQL } from 'drizzle-orm';
import type { DbExecutor } from '../../shared/db/client';
import { escapeLike } from '../../shared/db/like';
import { users } from '../users/users.table';
import type { ApplicationFilter, JobApplication, JobApplicationRepository } from './job-applications.service';
import { type JobApplicationRow, jobApplications, type NewJobApplicationRow } from './job-applications.table';

function where(f: ApplicationFilter): SQL | undefined {
  const j = jobApplications;
  const s = f.search ? `%${escapeLike(f.search)}%` : null;
  return and(
    f.status ? sql`${j.status}::text = ${f.status}` : undefined,
    f.position ? ilike(j.position, `%${escapeLike(f.position)}%`) : undefined,
    s ? or(ilike(j.fullName, s), ilike(j.phone, s), ilike(j.email, s), ilike(j.location, s), ilike(j.position, s)) : undefined,
    f.fromDate ? gte(j.createdAt, f.fromDate) : undefined,
    f.toDate ? lte(j.createdAt, f.toDate) : undefined,
  );
}

export class DrizzleJobApplicationRepository implements JobApplicationRepository {
  constructor(private readonly db: DbExecutor) {}

  async create(data: NewJobApplicationRow): Promise<JobApplicationRow> {
    const [row] = await this.db.insert(jobApplications).values(data).returning();
    if (!row) throw new Error('Insert returned no row');
    return row;
  }

  private base() {
    return this.db
      .select({ a: jobApplications, reviewer: { id: users.id, name: users.name, email: users.email } })
      .from(jobApplications)
      .leftJoin(users, eq(users.id, jobApplications.reviewedById));
  }

  private static merge(r: { a: JobApplicationRow; reviewer: { id: string; name: string; email: string } | null }): JobApplication {
    return { ...r.a, reviewedBy: r.reviewer?.id ? r.reviewer : null };
  }

  async list(f: ApplicationFilter, page: { limit: number; offset: number }) {
    const rows = await this.base().where(where(f)).orderBy(desc(jobApplications.createdAt)).limit(page.limit).offset(page.offset);
    return rows.map(DrizzleJobApplicationRepository.merge);
  }

  async count(f: ApplicationFilter) {
    const [row] = await this.db.select({ n: count() }).from(jobApplications).where(where(f));
    return row?.n ?? 0;
  }

  async statusCounts() {
    const rows = await this.db.select({ status: jobApplications.status, n: count() }).from(jobApplications).groupBy(jobApplications.status);
    return new Map(rows.map((r) => [r.status as string, r.n]));
  }

  async positions() {
    const rows = await this.db.selectDistinct({ position: jobApplications.position }).from(jobApplications);
    return rows.map((r) => r.position);
  }

  async findById(id: string) {
    const [row] = await this.base().where(eq(jobApplications.id, id)).limit(1);
    return row ? DrizzleJobApplicationRepository.merge(row) : null;
  }

  async update(id: string, patch: Partial<NewJobApplicationRow>) {
    await this.db.update(jobApplications).set(patch).where(eq(jobApplications.id, id));
  }

  async delete(id: string) {
    await this.db.delete(jobApplications).where(eq(jobApplications.id, id));
  }
}
