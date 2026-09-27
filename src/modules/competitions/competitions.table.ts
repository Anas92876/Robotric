import { doublePrecision, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { idRef, primaryId } from '../../shared/db/ids';
import { timestamps } from '../../shared/db/columns';
import { users } from '../users/users.table';

export const competitions = pgTable('competitions', {
  id: primaryId(),
  title: varchar('title', { length: 300 }).notNull(),
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  endDate: timestamp('end_date', { withTimezone: true }).notNull(),
  description: text('description'),
  /** 0 = no limit. */
  maxTeams: integer('max_teams').notNull().default(0),
  ...timestamps(),
});

/** A team entered in a competition by its coach. */
export const teams = pgTable(
  'teams',
  {
    id: primaryId(),
    competitionId: idRef('competition_id')
      .notNull()
      .references(() => competitions.id, { onDelete: 'cascade' }),
    coachId: idRef('coach_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 200 }).notNull(),
    /** Member names, as free text. */
    members: jsonb('members').$type<string[]>().notNull().default([]),
    ...timestamps(),
  },
  (t) => [index('teams_competition_coach_idx').on(t.competitionId, t.coachId), index('teams_coach_idx').on(t.coachId)],
);

/** A judge's scores for one team; one per judge and team. */
export const competitionEvaluations = pgTable(
  'competition_evaluations',
  {
    id: primaryId(),
    judgeId: idRef('judge_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    teamId: idRef('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    competitionId: idRef('competition_id')
      .notNull()
      .references(() => competitions.id, { onDelete: 'cascade' }),
    scores: jsonb('scores').$type<Record<string, unknown>>().notNull().default({}),
    totalScore: doublePrecision('total_score').notNull().default(0),
    comments: text('comments'),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('competition_evaluations_judge_team_unique').on(t.judgeId, t.teamId),
    index('competition_evaluations_competition_team_idx').on(t.competitionId, t.teamId),
  ],
);

export type CompetitionRow = typeof competitions.$inferSelect;
export type TeamRow = typeof teams.$inferSelect;
export type CompetitionEvaluationRow = typeof competitionEvaluations.$inferSelect;
