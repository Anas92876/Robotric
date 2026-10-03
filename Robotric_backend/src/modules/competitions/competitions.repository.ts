import { and, count, desc, eq, sql } from 'drizzle-orm';
import type { DbExecutor } from '../../shared/db/client';
import { competitionEvaluations, type CompetitionEvaluationRow, type CompetitionRow, competitions, type TeamRow, teams } from './competitions.table';

export interface CompetitionRepository {
  list(onlyId?: string): Promise<CompetitionRow[]>;
  findById(id: string): Promise<CompetitionRow | null>;
  create(row: typeof competitions.$inferInsert): Promise<CompetitionRow>;
  update(id: string, patch: Partial<typeof competitions.$inferInsert>): Promise<CompetitionRow | null>;
  delete(id: string): Promise<boolean>;

  teams(filter: { competitionId?: string; coachId?: string }): Promise<TeamRow[]>;
  team(id: string): Promise<TeamRow | null>;
  teamCount(competitionId: string): Promise<number>;
  createTeam(row: typeof teams.$inferInsert): Promise<TeamRow>;
  /** Only the team's coach may change it; null when there is no such team of theirs. */
  updateTeam(id: string, coachId: string, patch: Partial<typeof teams.$inferInsert>): Promise<TeamRow | null>;
  deleteTeam(id: string, coachId: string): Promise<boolean>;

  hasEvaluation(judgeId: string, teamId: string): Promise<boolean>;
  createEvaluation(row: typeof competitionEvaluations.$inferInsert): Promise<CompetitionEvaluationRow>;
  /** Teams by their summed judge totals, highest first. */
  rankings(competitionId: string): Promise<{ teamId: string; teamName: string; total: number }[]>;
}

export class DrizzleCompetitionRepository implements CompetitionRepository {
  constructor(private readonly db: DbExecutor) {}

  list(onlyId?: string) {
    return this.db
      .select()
      .from(competitions)
      .where(onlyId ? eq(competitions.id, onlyId) : undefined)
      .orderBy(competitions.createdAt);
  }

  async findById(id: string) {
    const [row] = await this.db.select().from(competitions).where(eq(competitions.id, id)).limit(1);
    return row ?? null;
  }

  async create(row: typeof competitions.$inferInsert) {
    const [created] = await this.db.insert(competitions).values(row).returning();
    return created!;
  }

  async update(id: string, patch: Partial<typeof competitions.$inferInsert>) {
    if (Object.keys(patch).length === 0) return this.findById(id);
    const [row] = await this.db.update(competitions).set(patch).where(eq(competitions.id, id)).returning();
    return row ?? null;
  }

  async delete(id: string) {
    const rows = await this.db.delete(competitions).where(eq(competitions.id, id)).returning({ id: competitions.id });
    return rows.length > 0;
  }

  teams(f: { competitionId?: string; coachId?: string }) {
    return this.db
      .select()
      .from(teams)
      .where(and(f.competitionId ? eq(teams.competitionId, f.competitionId) : undefined, f.coachId ? eq(teams.coachId, f.coachId) : undefined))
      .orderBy(teams.createdAt);
  }

  async team(id: string) {
    const [row] = await this.db.select().from(teams).where(eq(teams.id, id)).limit(1);
    return row ?? null;
  }

  async teamCount(competitionId: string) {
    const [row] = await this.db.select({ n: count() }).from(teams).where(eq(teams.competitionId, competitionId));
    return row?.n ?? 0;
  }

  async createTeam(row: typeof teams.$inferInsert) {
    const [created] = await this.db.insert(teams).values(row).returning();
    return created!;
  }

  async updateTeam(id: string, coachId: string, patch: Partial<typeof teams.$inferInsert>) {
    const where = and(eq(teams.id, id), eq(teams.coachId, coachId));
    if (Object.keys(patch).length === 0) {
      const [row] = await this.db.select().from(teams).where(where).limit(1);
      return row ?? null;
    }
    const [row] = await this.db.update(teams).set(patch).where(where).returning();
    return row ?? null;
  }

  async deleteTeam(id: string, coachId: string) {
    const rows = await this.db
      .delete(teams)
      .where(and(eq(teams.id, id), eq(teams.coachId, coachId)))
      .returning({ id: teams.id });
    return rows.length > 0;
  }

  async hasEvaluation(judgeId: string, teamId: string) {
    const [row] = await this.db
      .select({ id: competitionEvaluations.id })
      .from(competitionEvaluations)
      .where(and(eq(competitionEvaluations.judgeId, judgeId), eq(competitionEvaluations.teamId, teamId)))
      .limit(1);
    return Boolean(row);
  }

  async createEvaluation(row: typeof competitionEvaluations.$inferInsert) {
    const [created] = await this.db.insert(competitionEvaluations).values(row).returning();
    return created!;
  }

  rankings(competitionId: string) {
    const total = sql<number>`sum(${competitionEvaluations.totalScore})::float8`;
    return this.db
      .select({ teamId: teams.id, teamName: teams.name, total })
      .from(competitionEvaluations)
      .innerJoin(teams, eq(teams.id, competitionEvaluations.teamId))
      .where(eq(competitionEvaluations.competitionId, competitionId))
      .groupBy(teams.id, teams.name)
      .orderBy(desc(total));
  }
}
