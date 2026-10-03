import { z } from 'zod';
import { isValidId } from '../../shared/db/ids';
import { AppError, BadRequestError, ConflictError, ForbiddenError } from '../../shared/http/errors';
import { parse } from '../../shared/http/validate';
import type { UserRepository } from '../users/users.repository';
import type { CompetitionRepository } from './competitions.repository';

/** Joi-style messages, as the old API worded them. */
const required = (field: string) => ({ error: (i: { input: unknown }) => (i.input === undefined ? `"${field}" is required` : `"${field}" must be a string`) });
const date = (field: string) => z.coerce.date({ error: `"${field}" must be a valid date` });

const competitionFields = {
  title: z.string(required('title')).min(1, '"title" is not allowed to be empty'),
  startDate: date('startDate'),
  endDate: date('endDate'),
  description: z.string().optional(),
  maxTeams: z.coerce.number({ error: '"maxTeams" must be a number' }).int().min(0, '"maxTeams" must be greater than or equal to 0'),
};
const createCompetitionSchema = z.object({ ...competitionFields, maxTeams: competitionFields.maxTeams.default(0) });
const updateCompetitionSchema = z.object(competitionFields).partial();

const members = z.array(z.string({ error: '"members" must contain only strings' }), { error: '"members" must be an array' });
const createTeamSchema = z.object({
  competitionId: z.string(required('competitionId')),
  name: z.string(required('name')).min(1, '"name" is not allowed to be empty'),
  members: members.default([]),
});
const updateTeamSchema = z.object({ name: z.string().min(1, '"name" is not allowed to be empty').optional(), members: members.optional() });
const evaluationSchema = z.object({
  teamId: z.string(required('teamId')),
  scores: z.record(z.string(), z.unknown(), { error: '"scores" must be of type object' }).default({}),
  comments: z.string().optional(),
});

export interface Actor {
  id: string;
  role: string;
}

const competitionNotFound = () => new AppError('Competition not found', 404, 'NOT_FOUND');
const teamNotFound = () => new AppError('Team not found', 404, 'NOT_FOUND');

/**
 * Competitions with coach-run teams and judge scoring. A judge only ever
 * sees the one competition assigned to them.
 */
export class CompetitionService {
  constructor(
    private readonly competitions: CompetitionRepository,
    private readonly users: Pick<UserRepository, 'findById'>,
  ) {}

  /** For judges: their assigned competition (403 when none). Null for everyone else. */
  async judgeCompetition(actor: Actor): Promise<string | null> {
    if (actor.role !== 'judge') return null;
    const user = await this.users.findById(actor.id);
    if (!user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    if (!user.assignedCompetitionId) throw new ForbiddenError('No competition assigned', 'NO_COMPETITION_ASSIGNED');
    return user.assignedCompetitionId;
  }

  /** Judges may only open their own competition. */
  private async checkJudge(actor: Actor, competitionId: string) {
    const assigned = await this.judgeCompetition(actor);
    if (assigned && assigned !== competitionId) throw new ForbiddenError('Forbidden');
  }

  async list(actor: Actor) {
    return this.competitions.list((await this.judgeCompetition(actor)) ?? undefined);
  }

  create(body: unknown) {
    const input = parse(createCompetitionSchema, body);
    return this.competitions.create(input);
  }

  async update(id: string, body: unknown) {
    const input = parse(updateCompetitionSchema, body);
    const updated = isValidId(id) ? await this.competitions.update(id, input) : null;
    if (!updated) throw competitionNotFound();
    return updated;
  }

  /** Also removes its teams and scores. */
  async delete(id: string) {
    if (!isValidId(id) || !(await this.competitions.delete(id))) throw competitionNotFound();
  }

  async evaluate(actor: Actor, competitionId: string, body: unknown) {
    await this.checkJudge(actor, competitionId);
    const input = parse(evaluationSchema, body);
    const team = isValidId(input.teamId) ? await this.competitions.team(input.teamId) : null;
    // New: the team must be in this competition, and a judge scores a team once.
    if (!team || team.competitionId !== competitionId) throw new BadRequestError('Team is not part of this competition', 'TEAM_NOT_IN_COMPETITION');
    if (await this.competitions.hasEvaluation(actor.id, team.id)) throw new ConflictError('You have already evaluated this team', 'ALREADY_EVALUATED');
    const totalScore = Object.values(input.scores).reduce<number>((sum, v) => sum + (Number(v) || 0), 0);
    return this.competitions.createEvaluation({ judgeId: actor.id, competitionId, teamId: team.id, scores: input.scores, totalScore, comments: input.comments });
  }

  async rankings(actor: Actor, competitionId: string) {
    await this.checkJudge(actor, competitionId);
    if (!isValidId(competitionId)) return [];
    return (await this.competitions.rankings(competitionId)).map((r, i) => ({ ...r, rank: i + 1 }));
  }

  // ---- Teams ----

  async teams(actor: Actor, q: Record<string, string | undefined>) {
    const assigned = await this.judgeCompetition(actor);
    const competitionId = assigned ?? q.competitionId;
    return this.competitions.teams({ competitionId: isValidId(competitionId) ? competitionId : undefined, coachId: isValidId(q.coachId) ? q.coachId : undefined });
  }

  async team(id: string) {
    const team = isValidId(id) ? await this.competitions.team(id) : null;
    if (!team) throw teamNotFound();
    return team;
  }

  /** The caller becomes the coach. New: the competition must exist and have room. */
  async createTeam(actor: Actor, body: unknown) {
    const input = parse(createTeamSchema, body);
    const competition = isValidId(input.competitionId) ? await this.competitions.findById(input.competitionId) : null;
    if (!competition) throw competitionNotFound();
    if (competition.maxTeams && (await this.competitions.teamCount(competition.id)) >= competition.maxTeams) {
      throw new BadRequestError('Max teams reached for this competition', 'MAX_TEAMS_REACHED');
    }
    return this.competitions.createTeam({ competitionId: competition.id, name: input.name, members: input.members, coachId: actor.id });
  }

  async updateTeam(actor: Actor, id: string, body: unknown) {
    const input = parse(updateTeamSchema, body);
    const team = isValidId(id) ? await this.competitions.updateTeam(id, actor.id, input) : null;
    if (!team) throw teamNotFound();
    return team;
  }

  async deleteTeam(actor: Actor, id: string) {
    if (!isValidId(id) || !(await this.competitions.deleteTeam(id, actor.id))) throw teamNotFound();
  }
}
