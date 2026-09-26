import { boolean, doublePrecision, pgTable, text, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { primaryId } from '../../shared/db/ids';
import { timestamps } from '../../shared/db/columns';

export const SETTINGS_KEY = 'default';

/** Application-wide settings. Exactly one row, identified by `key = 'default'`. */
export const appSettings = pgTable(
  'app_settings',
  {
    id: primaryId(),
    key: varchar('key', { length: 20 }).notNull().default(SETTINGS_KEY),
    usdToSypExchangeRate: doublePrecision('usd_to_syp_exchange_rate').notNull().default(120),
    minimumAppVersion: varchar('minimum_app_version', { length: 20 }).notNull().default('1.0.0'),
    forceUpdate: boolean('force_update').notNull().default(false),
    updateMessage: text('update_message').notNull().default(''),
    ...timestamps(),
  },
  (t) => [uniqueIndex('app_settings_key_unique').on(t.key)],
);

export type AppSettingsRow = typeof appSettings.$inferSelect;
export type AppSettingsUpdate = Partial<
  Pick<AppSettingsRow, 'usdToSypExchangeRate' | 'minimumAppVersion' | 'forceUpdate' | 'updateMessage'>
>;
