import type { Request, Response } from 'express';
import { currentUser } from '../../shared/http/request-user';
import type { CompetitionService } from './competitions.service';
import type { CompetitionEvaluationRow, CompetitionRow, TeamRow } from './competitions.table';

// These endpoints returned bare Mongoose documents (no `success` wrapper).
const competitionDoc = (c: CompetitionRow) => ({
  _id: c.id,
  title: c.title,
  startDate: c.startDate,
  endDate: c.endDate,
  description: c.description,
  maxTeams: c.maxTeams,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
});
const teamDoc = (t: TeamRow) => ({ _id: t.id, competitionId: t.competitionId, coachId: t.coachId, name: t.name, members: t.members, createdAt: t.createdAt, updatedAt: t.updatedAt });
const evaluationDoc = (e: CompetitionEvaluationRow) => ({
  _id: e.id,
  judgeId: e.judgeId,
  teamId: e.teamId,
  competitionId: e.competitionId,
  scores: e.scores,
  totalScore: e.totalScore,
  comments: e.comments,
  createdAt: e.createdAt,
  updatedAt: e.updatedAt,
});

const actor = (req: Request) => {
  const u = currentUser(req);
  return { id: u.id, role: u.role };
};
type IdReq = Request<{ id: string }>;

/** /api/competitions */
export class CompetitionController {
  constructor(private readonly competitions: CompetitionService) {}

  list = async (req: Request, res: Response) => {
    res.json((await this.competitions.list(actor(req))).map(competitionDoc));
  };

  create = async (req: Request, res: Response) => {
    res.status(201).json(competitionDoc(await this.competitions.create(req.body)));
  };

  update = async (req: IdReq, res: Response) => {
    res.json(competitionDoc(await this.competitions.update(req.params.id, req.body)));
  };

  delete = async (req: IdReq, res: Response) => {
    await this.competitions.delete(req.params.id);
    res.json({ success: true, message: 'Competition deleted successfully' });
  };

  evaluate = async (req: IdReq, res: Response) => {
    res.status(201).json(evaluationDoc(await this.competitions.evaluate(actor(req), req.params.id, req.body)));
  };

  rankings = async (req: IdReq, res: Response) => {
    res.json(await this.competitions.rankings(actor(req), req.params.id));
  };
}

/** /api/teams */
export class TeamController {
  constructor(private readonly competitions: CompetitionService) {}

  list = async (req: Request, res: Response) => {
    res.json((await this.competitions.teams(actor(req), req.query as Record<string, string | undefined>)).map(teamDoc));
  };

  get = async (req: IdReq, res: Response) => {
    res.json(teamDoc(await this.competitions.team(req.params.id)));
  };

  create = async (req: Request, res: Response) => {
    res.status(201).json(teamDoc(await this.competitions.createTeam(actor(req), req.body)));
  };

  update = async (req: IdReq, res: Response) => {
    res.json(teamDoc(await this.competitions.updateTeam(actor(req), req.params.id, req.body)));
  };

  delete = async (req: IdReq, res: Response) => {
    await this.competitions.deleteTeam(actor(req), req.params.id);
    res.json({ success: true, message: 'Team deleted successfully' });
  };
}
