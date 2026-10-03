import { boolean, index, pgEnum, pgTable, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { idRef, primaryId } from '../../shared/db/ids';
import { timestamps } from '../../shared/db/columns';
import { users } from '../users/users.table';

export const pushPlatform = pgEnum('push_platform', ['android', 'ios']);
export const pushTokenType = pgEnum('push_token_type', ['expo', 'fcm']);

export const pushTokens = pgTable(
  'push_tokens',
  {
    id: primaryId(),
    userId: idRef('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: varchar('token', { length: 512 }).notNull(),
    platform: pushPlatform('platform').notNull(),
    deviceId: varchar('device_id', { length: 200 }),
    tokenType: pushTokenType('token_type').notNull().default('expo'),
    isActive: boolean('is_active').notNull().default(true),
    deactivatedAt: timestamp('deactivated_at', { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [uniqueIndex('push_tokens_token_unique').on(t.token), index('push_tokens_user_active_idx').on(t.userId, t.isActive)],
);

export type PushTokenRow = typeof pushTokens.$inferSelect;
