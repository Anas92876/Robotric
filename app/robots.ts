import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/config';
import { DASHBOARD_PATHS } from '@/lib/dashboard';

export default function robots(): MetadataRoute.Robots {
  return {
    // The private dashboard shares this domain; keep crawlers out of it
    rules: { userAgent: '*', allow: '/', disallow: ['/*/verify/', '/api/', ...DASHBOARD_PATHS.map((p) => `/${p}`)] },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
