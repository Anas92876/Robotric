import { and, desc, eq } from 'drizzle-orm';
import type { DbExecutor } from '../../shared/db/client';
import { type PostRow, posts } from './posts.table';

export interface PostRepository {
  published(): Promise<PostRow[]>;
  /** Drafts and published, newest first (for staff). */
  all(): Promise<PostRow[]>;
  findPublished(by: { id?: string; slug?: string }): Promise<PostRow | null>;
  findById(id: string): Promise<PostRow | null>;
  slugTaken(slug: string): Promise<boolean>;
  create(row: typeof posts.$inferInsert): Promise<PostRow>;
  update(id: string, patch: Partial<typeof posts.$inferInsert>): Promise<PostRow | null>;
  delete(id: string): Promise<boolean>;
}

export class DrizzlePostRepository implements PostRepository {
  constructor(private readonly db: DbExecutor) {}

  published() {
    return this.db.select().from(posts).where(eq(posts.status, 'published')).orderBy(desc(posts.publishedAt));
  }

  all() {
    return this.db.select().from(posts).orderBy(desc(posts.updatedAt));
  }

  async findPublished(by: { id?: string; slug?: string }) {
    const [row] = await this.db
      .select()
      .from(posts)
      .where(and(eq(posts.status, 'published'), by.id ? eq(posts.id, by.id) : undefined, by.slug ? eq(posts.slug, by.slug) : undefined))
      .limit(1);
    return row ?? null;
  }

  async findById(id: string) {
    const [row] = await this.db.select().from(posts).where(eq(posts.id, id)).limit(1);
    return row ?? null;
  }

  async slugTaken(slug: string) {
    const [row] = await this.db.select({ id: posts.id }).from(posts).where(eq(posts.slug, slug)).limit(1);
    return Boolean(row);
  }

  async create(row: typeof posts.$inferInsert) {
    const [created] = await this.db.insert(posts).values(row).returning();
    return created!;
  }

  async update(id: string, patch: Partial<typeof posts.$inferInsert>) {
    if (Object.keys(patch).length === 0) return this.findById(id);
    const [row] = await this.db.update(posts).set(patch).where(eq(posts.id, id)).returning();
    return row ?? null;
  }

  async delete(id: string) {
    const rows = await this.db.delete(posts).where(eq(posts.id, id)).returning({ id: posts.id });
    return rows.length > 0;
  }
}
