import type { Metadata } from 'next';
import type { Locale } from './i18n-config';

// Per-page metadata with canonical + hreflang alternates for /en and /ar (fixes the old site's broken /ar hreflang)
export function pageMeta(lang: Locale, path: string, title: string, description: string): Metadata {
  const p = path ? `/${path}` : '';
  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}${p}`,
      languages: { en: `/en${p}`, ar: `/ar${p}`, 'x-default': `/en${p}` },
    },
    openGraph: {
      type: 'website', siteName: 'Robotrick', title, description, url: `/${lang}${p}`,
      locale: lang === 'ar' ? 'ar_SY' : 'en_US', images: ['/og-image.jpg'],
    },
  };
}
