import { eq } from 'drizzle-orm';
import type { DbExecutor } from '../../shared/db/client';
import { type AppSettingsRow, type AppSettingsUpdate, appSettings, SETTINGS_KEY } from './settings.table';

export interface SettingsRepository {
  /** The settings row, or null if nothing was ever saved (callers use defaults). */
  get(): Promise<AppSettingsRow | null>;
  /** Creates the row on first save; returns the full row afterwards. */
  save(changes: AppSettingsUpdate): Promise<AppSettingsRow>;
}

export class DrizzleSettingsRepository implements SettingsRepository {
  constructor(private readonly db: DbExecutor) {}

  async get(): Promise<AppSettingsRow | null> {
    const [row] = await this.db.select().from(appSettings).where(eq(appSettings.key, SETTINGS_KEY)).limit(1);
    return row ?? null;
  }

  async save(changes: AppSettingsUpdate): Promise<AppSettingsRow> {
    const [row] = await this.db
      .insert(appSettings)
      .values({ key: SETTINGS_KEY, ...changes })
      .onConflictDoUpdate({ target: appSettings.key, set: { ...changes, updatedAt: new Date() } })
      .returning();
    if (!row) throw new Error('Settings upsert returned no row');
    return row;
  }
}
