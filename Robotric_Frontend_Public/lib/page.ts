import 'server-only';
import { notFound } from 'next/navigation';
import { hasLocale, type Locale } from './i18n-config';
import { getContent } from './content';

// Resolve the [lang] route param for a page: 404 for unknown languages, otherwise content + link base
export async function resolvePage(params: Promise<{ lang: string }>) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return { lang: lang as Locale, c: getContent(lang), base: `/${lang}`, isAr: lang === 'ar' };
}
