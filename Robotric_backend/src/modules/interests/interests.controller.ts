import type { Request, Response } from 'express';
import { z } from 'zod';
import { currentUser } from '../../shared/http/request-user';
import { withMongoId } from '../../shared/http/serialize';
import { parse } from '../../shared/http/validate';
import type { InterestWithCreator } from './interests.repository';
import type { InterestService } from './interests.service';

const status = z.enum(['active', 'archived'], { error: 'status must be "active" or "archived"' });

const listQuery = z.object({
  status: status.optional().catch(undefined),
  search: z.string().optional(),
});
const createBody = z.object({ name: z.string().optional(), description: z.string().nullish() });
const updateBody = z.object({ name: z.string().optional(), description: z.string().nullish(), status: status.optional() });

function toApi(i: InterestWithCreator) {
  const { createdById: _omit, createdBy, ...rest } = i;
  return { ...withMongoId(rest), createdBy: createdBy ? withMongoId(createdBy) : null };
}

/** Response bodies have no `success` field — that is how the old API answered here. */
export class InterestController {
  constructor(private readonly interests: InterestService) {}

  list = async (req: Request, res: Response) => {
    const interests = (await this.interests.list(parse(listQuery, req.query))).map(toApi);
    res.json({ interests, total: interests.length });
  };

  get = async (req: Request<{ id: string }>, res: Response) => {
    res.json({ interest: toApi(await this.interests.get(req.params.id)) });
  };

  create = async (req: Request, res: Response) => {
    const interest = await this.interests.create(parse(createBody, req.body), currentUser(req).id);
    res.status(201).json({ message: 'Interest created successfully', interest: toApi(interest) });
  };

  update = async (req: Request<{ id: string }>, res: Response) => {
    const interest = await this.interests.update(req.params.id, parse(updateBody, req.body));
    res.json({ message: 'Interest updated successfully', interest: toApi(interest) });
  };

  archive = async (req: Request<{ id: string }>, res: Response) => {
    const interest = await this.interests.archive(req.params.id);
    res.json({ message: 'Interest archived successfully', interest: toApi(interest) });
  };

  delete = async (req: Request<{ id: string }>, res: Response) => {
    await this.interests.delete(req.params.id);
    res.json({ message: 'Interest deleted successfully' });
  };
}
