import { and, desc, eq, ne } from 'drizzle-orm';
import type { DbExecutor } from '../../shared/db/client';
import {
  type NewSubscriptionPlanRow,
  type SubscriptionPlanRow,
  subscriptionPlans,
} from './subscription-plans.table';

export interface SubscriptionPlanRepository {
  list(filter?: { activeOnly?: boolean }): Promise<SubscriptionPlanRow[]>;
  findById(id: string): Promise<SubscriptionPlanRow | null>;
  nameTaken(name: string, exceptId?: string): Promise<boolean>;
  create(data: NewSubscriptionPlanRow): Promise<SubscriptionPlanRow>;
  update(id: string, data: Partial<NewSubscriptionPlanRow>): Promise<SubscriptionPlanRow>;
  delete(id: string): Promise<void>;
}

export class DrizzleSubscriptionPlanRepository implements SubscriptionPlanRepository {
  constructor(private readonly db: DbExecutor) {}

  list({ activeOnly = false } = {}): Promise<SubscriptionPlanRow[]> {
    return this.db
      .select()
      .from(subscriptionPlans)
      .where(activeOnly ? eq(subscriptionPlans.isActive, true) : undefined)
      .orderBy(desc(subscriptionPlans.createdAt));
  }

  async findById(id: string): Promise<SubscriptionPlanRow | null> {
    const [row] = await this.db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id)).limit(1);
    return row ?? null;
  }

  async nameTaken(name: string, exceptId?: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: subscriptionPlans.id })
      .from(subscriptionPlans)
      .where(and(eq(subscriptionPlans.name, name), exceptId ? ne(subscriptionPlans.id, exceptId) : undefined))
      .limit(1);
    return Boolean(row);
  }

  async create(data: NewSubscriptionPlanRow): Promise<SubscriptionPlanRow> {
    const [row] = await this.db.insert(subscriptionPlans).values(data).returning();
    if (!row) throw new Error('Insert returned no row');
    return row;
  }

  async update(id: string, data: Partial<NewSubscriptionPlanRow>): Promise<SubscriptionPlanRow> {
    const [row] = await this.db.update(subscriptionPlans).set(data).where(eq(subscriptionPlans.id, id)).returning();
    if (!row) throw new Error(`Subscription plan ${id} not found`);
    return row;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(subscriptionPlans).where(eq(subscriptionPlans.id, id));
  }
}
