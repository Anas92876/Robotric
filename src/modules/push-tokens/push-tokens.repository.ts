import { and, eq } from 'drizzle-orm';
import type { DbExecutor } from '../../shared/db/client';
import { pushTokens } from './push-tokens.table';

export interface PushTokenRepository {
  /** Marks every active token of the user inactive; returns how many changed. */
  deactivateAllForUser(userId: string): Promise<number>;
}

export class DrizzlePushTokenRepository implements PushTokenRepository {
  constructor(private readonly db: DbExecutor) {}

  async deactivateAllForUser(userId: string): Promise<number> {
    const rows = await this.db
      .update(pushTokens)
      .set({ isActive: false, deactivatedAt: new Date() })
      .where(and(eq(pushTokens.userId, userId), eq(pushTokens.isActive, true)))
      .returning({ id: pushTokens.id });
    return rows.length;
  }
}
