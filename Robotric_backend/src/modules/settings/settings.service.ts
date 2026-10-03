import { BadRequestError } from '../../shared/http/errors';
import type { SettingsRepository } from './settings.repository';
import type { AppSettingsUpdate } from './settings.table';

export const DEFAULT_EXCHANGE_RATE = 120;
export const DOWNLOAD_URL = 'http://robotrick.net/download-app';

export interface AppVersionInfo {
  minimumAppVersion: string;
  forceUpdate: boolean;
  updateMessage: string;
  downloadUrl: string;
}

export interface AppVersionInput {
  minimumAppVersion?: unknown;
  forceUpdate?: unknown;
  updateMessage?: unknown;
}

const SEMVER = /^\d+\.\d+\.\d+$/;

export class SettingsService {
  constructor(private readonly settings: SettingsRepository) {}

  async exchangeRate(): Promise<number> {
    return (await this.settings.get())?.usdToSypExchangeRate ?? DEFAULT_EXCHANGE_RATE;
  }

  async setExchangeRate(raw: unknown): Promise<number> {
    if (raw === undefined || raw === null) throw new BadRequestError('usdToSypExchangeRate is required');
    const rate = Number.parseFloat(String(raw));
    if (Number.isNaN(rate) || rate < 1 || rate > 10000) {
      throw new BadRequestError('Exchange rate must be between 1 and 10000 S.P. per USD');
    }
    return (await this.settings.save({ usdToSypExchangeRate: rate })).usdToSypExchangeRate;
  }

  /** Public: the mobile app calls this before login to decide whether to force an update. */
  async appVersion(): Promise<AppVersionInfo> {
    const s = await this.settings.get();
    return {
      minimumAppVersion: s?.minimumAppVersion ?? '1.0.0',
      forceUpdate: s?.forceUpdate ?? false,
      updateMessage: s?.updateMessage ?? '',
      downloadUrl: DOWNLOAD_URL,
    };
  }

  async setAppVersion(input: AppVersionInput): Promise<AppVersionInfo> {
    const changes: AppSettingsUpdate = {};
    if (input.minimumAppVersion !== undefined) {
      if (typeof input.minimumAppVersion !== 'string' || !SEMVER.test(input.minimumAppVersion)) {
        throw new BadRequestError('minimumAppVersion must be a valid semver string (e.g. "1.3.0")');
      }
      changes.minimumAppVersion = input.minimumAppVersion;
    }
    if (input.forceUpdate !== undefined) changes.forceUpdate = Boolean(input.forceUpdate);
    if (input.updateMessage !== undefined) changes.updateMessage = String(input.updateMessage);

    const s = await this.settings.save(changes);
    return {
      minimumAppVersion: s.minimumAppVersion,
      forceUpdate: s.forceUpdate,
      updateMessage: s.updateMessage,
      downloadUrl: DOWNLOAD_URL,
    };
  }
}
