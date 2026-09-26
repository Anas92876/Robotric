import type { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../shared/http/errors';
import { parse } from '../../shared/http/validate';
import type { UserRepository } from './users.repository';

const assignCompetitionBody = z.object({
  competitionId: z.string({ error: '"competitionId" must be a string' }).nullish(),
});

/**
 * Admin operations on user accounts. The single route today has no business
 * rules beyond "set this field", so the controller talks to the repository
 * interface directly; a UserService appears when real rules do.
 */
export class UsersController {
  constructor(private readonly users: Pick<UserRepository, 'setAssignedCompetition'>) {}

  /** PUT /api/users/:id/assigned-competition — superadmin only. Old response had no `success` field. */
  assignCompetition = async (req: Request<{ id: string }>, res: Response) => {
    const { competitionId } = parse(assignCompetitionBody, req.body);
    const user = await this.users.setAssignedCompetition(req.params.id, competitionId || null);
    if (!user) throw new AppError('Not found', 404, 'NOT_FOUND');
    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      assignedCompetitionId: user.assignedCompetitionId,
    });
  };
}
