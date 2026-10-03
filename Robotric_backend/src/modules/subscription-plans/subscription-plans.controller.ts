import type { Request, Response } from 'express';
import { withBothIds } from '../../shared/http/serialize';
import { parse } from '../../shared/http/validate';
import { createPlanBody, updatePlanBody } from './subscription-plans.schemas';
import type { SubscriptionPlanService } from './subscription-plans.service';

// The old model had `toJSON: { virtuals: true }`, so plans carried both `_id` and `id`.
const toApi = withBothIds;

export class SubscriptionPlanController {
  constructor(private readonly plans: SubscriptionPlanService) {}

  /** GET /api/clo/subscription-plans */
  list = async (_req: Request, res: Response) => {
    const plans = await this.plans.list();
    res.json({ success: true, data: { plans: plans.map(toApi) } });
  };

  /** GET /api/reception/subscription-plans/active */
  listActive = async (_req: Request, res: Response) => {
    const plans = await this.plans.list(true);
    res.json({ success: true, data: { plans: plans.map(toApi) } });
  };

  get = async (req: Request<{ id: string }>, res: Response) => {
    res.json({ success: true, data: toApi(await this.plans.get(req.params.id)) });
  };

  create = async (req: Request, res: Response) => {
    const plan = await this.plans.create(parse(createPlanBody, req.body));
    res.status(201).json({ success: true, message: 'Subscription plan created successfully', data: toApi(plan) });
  };

  update = async (req: Request<{ id: string }>, res: Response) => {
    const plan = await this.plans.update(req.params.id, parse(updatePlanBody, req.body));
    res.json({ success: true, message: 'Subscription plan updated successfully', data: toApi(plan) });
  };

  delete = async (req: Request<{ id: string }>, res: Response) => {
    await this.plans.delete(req.params.id);
    res.json({ success: true, message: 'Subscription plan deleted successfully' });
  };
}
