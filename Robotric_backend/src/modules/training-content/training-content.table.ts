import { jsonb, pgEnum, pgTable, uniqueIndex } from 'drizzle-orm/pg-core';
import { primaryId } from '../../shared/db/ids';
import { timestamps } from '../../shared/db/columns';
import type { StatsValues, Tracks } from './training-content.schemas';

export const contentLang = pgEnum('content_lang', ['ar', 'en']);

/** One row per language. The page content itself is a JSON document. */
export const trainingPageContent = pgTable(
  'training_page_content',
  {
    id: primaryId(),
    lang: contentLang('lang').notNull(),
    statsValues: jsonb('stats_values').$type<StatsValues>().notNull(),
    tracks: jsonb('tracks').$type<Tracks>().notNull(),
    ...timestamps(),
  },
  (t) => [uniqueIndex('training_page_content_lang_unique').on(t.lang)],
);

export type TrainingPageContentRow = typeof trainingPageContent.$inferSelect;
