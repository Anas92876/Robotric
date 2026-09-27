import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import type { DbExecutor } from '../../shared/db/client';
import { type ImageRow, images } from './images.table';

export interface ImageRepository {
  create(row: typeof images.$inferInsert): Promise<ImageRow>;
  findById(id: string): Promise<ImageRow | null>;
  /** The newest active image of this type for the item. */
  latestFor(imageType: string, associatedId: string): Promise<ImageRow | null>;
  latestForMany(imageType: string, associatedIds: string[]): Promise<Map<string, ImageRow>>;
}

export class DrizzleImageRepository implements ImageRepository {
  constructor(private readonly db: DbExecutor) {}

  async create(row: typeof images.$inferInsert) {
    const [created] = await this.db.insert(images).values(row).returning();
    return created!;
  }

  async findById(id: string) {
    const [row] = await this.db.select().from(images).where(eq(images.id, id)).limit(1);
    return row ?? null;
  }

  async latestFor(imageType: string, associatedId: string) {
    const [row] = await this.db
      .select()
      .from(images)
      .where(and(sql`${images.imageType}::text = ${imageType}`, eq(images.associatedId, associatedId), eq(images.isActive, true)))
      .orderBy(desc(images.createdAt))
      .limit(1);
    return row ?? null;
  }

  async latestForMany(imageType: string, associatedIds: string[]) {
    const out = new Map<string, ImageRow>();
    if (associatedIds.length === 0) return out;
    const rows = await this.db
      .select()
      .from(images)
      .where(and(sql`${images.imageType}::text = ${imageType}`, inArray(images.associatedId, associatedIds), eq(images.isActive, true)))
      .orderBy(desc(images.createdAt));
    for (const r of rows) if (r.associatedId && !out.has(r.associatedId)) out.set(r.associatedId, r);
    return out;
  }
}
