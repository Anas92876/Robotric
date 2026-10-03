import type { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../shared/http/errors';
import { parsePagination } from '../../shared/http/pagination';
import { currentUser } from '../../shared/http/request-user';
import { parse } from '../../shared/http/validate';
import type { UserAdminService } from './user-admin.service';
import type { User, UserRepository } from './users.repository';

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

/** The user without secrets (password hash, token version). */
export function userDoc(u: User) {
  return {
    _id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    assignedCompetitionId: u.assignedCompetitionId,
    profile: u.profile ?? {},
    isHourly: u.isHourly,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

type IdReq = Request<{ id: string }>;

/** /api/reception/users — account management from the front desk. */
export class ReceptionUsersController {
  constructor(private readonly users: UserAdminService) {}

  list = async (req: Request, res: Response) => {
    const q = req.query as Record<string, string | undefined>;
    const page = parsePagination(q);
    const { rows, total } = await this.users.list(currentUser(req).role, q, page);
    res.json({ success: true, data: rows.map(userDoc), pagination: { page: page.page, limit: page.limit, total, pages: Math.ceil(total / page.limit) } });
  };

  create = async (req: Request, res: Response) => {
    const user = await this.users.create(currentUser(req).role, req.body);
    res.status(201).json({ success: true, message: 'User created successfully', data: userDoc(user) });
  };

  update = async (req: IdReq, res: Response) => {
    const me = currentUser(req);
    const user = await this.users.update({ id: me.id, role: me.role }, req.params.id, req.body);
    res.json({ success: true, message: 'User updated successfully', data: userDoc(user) });
  };

  delete = async (req: IdReq, res: Response) => {
    const me = currentUser(req);
    await this.users.delete({ id: me.id, role: me.role }, req.params.id);
    res.json({ success: true, message: 'User deleted permanently' });
  };
}
