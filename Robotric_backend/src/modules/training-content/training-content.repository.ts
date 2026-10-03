import { eq } from 'drizzle-orm';
import type { DbExecutor } from '../../shared/db/client';
import type { Lang, StatsValues, Tracks } from './training-content.schemas';
import { type TrainingPageContentRow, trainingPageContent } from './training-content.table';

export interface TrainingContentRepository {
  find(lang: Lang): Promise<TrainingPageContentRow | null>;
  upsert(lang: Lang, statsValues: StatsValues, tracks: Tracks): Promise<TrainingPageContentRow>;
  /**
   * Applies `edit` to the tracks of every existing language document inside
   * one transaction, with the rows locked, so concurrent edits cannot lose
   * each other's changes. `edit` returns false to leave a document untouched.
   */
  editTracksOfAll(edit: (tracks: Tracks, lang: Lang) => boolean): Promise<void>;
}

export class DrizzleTrainingContentRepository implements TrainingContentRepository {
  constructor(private readonly db: DbExecutor) {}

  async find(lang: Lang): Promise<TrainingPageContentRow | null> {
    const [row] = await this.db.select().from(trainingPageContent).where(eq(trainingPageContent.lang, lang)).limit(1);
    return row ?? null;
  }

  async upsert(lang: Lang, statsValues: StatsValues, tracks: Tracks): Promise<TrainingPageContentRow> {
    const [row] = await this.db
      .insert(trainingPageContent)
      .values({ lang, statsValues, tracks })
      .onConflictDoUpdate({ target: trainingPageContent.lang, set: { statsValues, tracks, updatedAt: new Date() } })
      .returning();
    if (!row) throw new Error('Upsert returned no row');
    return row;
  }

  async editTracksOfAll(edit: (tracks: Tracks, lang: Lang) => boolean): Promise<void> {
    await this.db.transaction(async (tx) => {
      const rows = await tx.select().from(trainingPageContent).orderBy(trainingPageContent.lang).for('update');
      for (const row of rows) {
        const tracks = structuredClone(row.tracks);
        if (edit(tracks, row.lang)) {
          await tx.update(trainingPageContent).set({ tracks }).where(eq(trainingPageContent.id, row.id));
        }
      }
    });
  }
}
