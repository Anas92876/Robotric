import { existsSync } from 'node:fs';
import type { Logger } from '../logger';
import { ServiceUnavailableError } from '../http/errors';

/** Turns an HTML page into a PDF. Swappable (Puppeteer today, a PDF API tomorrow). */
/** `document`: A4 portrait with margins (receipts). `landscape`: full-bleed A4 landscape (certificates). */
export type PdfLayout = 'document' | 'landscape';

export interface PdfRenderer {
  render(html: string, layout?: PdfLayout): Promise<Buffer>;
}

const LANDSCAPE_OPTIONS = {
  format: 'A4' as const,
  landscape: true,
  margin: { top: '0', bottom: '0', left: '0', right: '0' },
  printBackground: true,
};

const PDF_OPTIONS = {
  format: 'A4' as const,
  margin: { top: '40px', bottom: '40px', left: '50px', right: '50px' },
  printBackground: true,
  preferCSSPageSize: true,
  scale: 0.95,
};

/**
 * Renders with headless Chrome (needed for correct Arabic / RTL text).
 *  - On Vercel / AWS Lambda: the bundled serverless Chromium (@sparticuz/chromium).
 *  - Elsewhere: the Chrome at CHROME_BIN, or a locally installed Chrome/Edge.
 * Both packages are loaded lazily so the rest of the app never pays for them.
 */
export class PuppeteerPdfRenderer implements PdfRenderer {
  constructor(
    private readonly logger: Logger,
    private readonly chromePath: string | undefined,
  ) {}

  private async launch() {
    const puppeteer = await import('puppeteer-core');
    const serverless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    if (serverless) {
      const chromium = (await import('@sparticuz/chromium')).default;
      return puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: true });
    }
    const executablePath = this.chromePath ?? localChrome();
    if (!executablePath) {
      throw new ServiceUnavailableError('PDF rendering needs Chrome: set CHROME_BIN to a Chrome or Edge executable', 'PDF_UNAVAILABLE');
    }
    return puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
  }

  async render(html: string, layout: PdfLayout = 'document'): Promise<Buffer> {
    const browser = await this.launch();
    try {
      const page = await browser.newPage();
      if (layout === 'landscape') await page.setViewport({ width: 1123, height: 794, deviceScaleFactor: 2 });
      else await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
      await page.setContent(html, { waitUntil: 'load', timeout: 30000 });
      // Certificates use web fonts; print only once they have loaded.
      if (layout === 'landscape') await page.evaluate('document.fonts.ready');
      return Buffer.from(await page.pdf(layout === 'landscape' ? LANDSCAPE_OPTIONS : PDF_OPTIONS));
    } catch (err) {
      this.logger.error({ err }, 'PDF rendering failed');
      throw err;
    } finally {
      await browser.close().catch(() => undefined);
    }
  }
}

/** Common install locations, so local development works without configuration. */
function localChrome(): string | undefined {
  const candidates =
    process.platform === 'win32'
      ? [
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
          'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        ]
      : process.platform === 'darwin'
        ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
        : ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  return candidates.find((p) => existsSync(p));
}
