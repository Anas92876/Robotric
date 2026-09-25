import { BadRequestError, NotFoundError } from '../../shared/http/errors';
import type { SubscriptionPlanRepository } from './subscription-plans.repository';
import type { CreatePlanInput, UpdatePlanInput } from './subscription-plans.schemas';
import type { SubscriptionPlanRow } from './subscription-plans.table';

/**
 * How many active user subscriptions use a plan. The real implementation
 * comes with the user-subscriptions module (phase 4).
 */
export interface PlanUsageReader {
  countActiveSubscriptions(planId: string): Promise<number>;
}

export const noPlanUsage: PlanUsageReader = { countActiveSubscriptions: async () => 0 };

const DUPLICATE = 'A subscription plan with this name already exists';

export class SubscriptionPlanService {
  constructor(
    private readonly plans: SubscriptionPlanRepository,
    private readonly usage: PlanUsageReader,
  ) {}

  list(activeOnly = false): Promise<SubscriptionPlanRow[]> {
    return this.plans.list({ activeOnly });
  }

  async get(id: string): Promise<SubscriptionPlanRow> {
    const plan = await this.plans.findById(id);
    if (!plan) throw new NotFoundError('Subscription plan');
    return plan;
  }

  async create(input: CreatePlanInput): Promise<SubscriptionPlanRow> {
    if (await this.plans.nameTaken(input.name)) throw new BadRequestError(DUPLICATE);
    return this.plans.create({
      name: input.name,
      monthlyHours: input.monthlyHours,
      price: input.price,
      isActive: input.isActive ?? true,
      description: input.description ?? null,
    });
  }

  async update(id: string, input: UpdatePlanInput): Promise<SubscriptionPlanRow> {
    await this.get(id);
    if (input.name !== undefined && (await this.plans.nameTaken(input.name, id))) throw new BadRequestError(DUPLICATE);
    return this.plans.update(id, input);
  }

  async delete(id: string): Promise<void> {
    await this.get(id);
    const active = await this.usage.countActiveSubscriptions(id);
    if (active > 0) {
      throw new BadRequestError(`Cannot delete plan. It is being used by ${active} active subscription(s)`);
    }
    await this.plans.delete(id);
  }
}
