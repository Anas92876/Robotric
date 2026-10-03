import type { Request, Response } from 'express';
import type { SettingsService } from './settings.service';

type Body = Record<string, unknown> | undefined;

export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  /** GET /api/reception/settings/exchange-rate */
  getExchangeRate = async (_req: Request, res: Response) => {
    res.json({ success: true, data: { usdToSypExchangeRate: await this.settings.exchangeRate() } });
  };

  /** PUT /api/reception/settings/exchange-rate */
  setExchangeRate = async (req: Request, res: Response) => {
    const rate = await this.settings.setExchangeRate((req.body as Body)?.usdToSypExchangeRate);
    res.json({ success: true, data: { usdToSypExchangeRate: rate } });
  };

  /** GET /api/app-version — public */
  getAppVersion = async (_req: Request, res: Response) => {
    res.json({ success: true, data: await this.settings.appVersion() });
  };

  /** PUT /api/admin/settings/version */
  setAppVersion = async (req: Request, res: Response) => {
    res.json({ success: true, data: await this.settings.setAppVersion((req.body as Body) ?? {}) });
  };
}
