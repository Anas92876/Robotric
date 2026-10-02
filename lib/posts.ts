import type { Locale } from './i18n-config';

// Arabic month names with Latin digits, as everywhere else on the site
export const postDate = (iso: string, lang: Locale) =>
  new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SY-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));

/** About 200 words a minute, never less than one. */
export const readingMinutes = (body: string) => Math.max(1, Math.round(body.trim().split(/\s+/).length / 200));

/** First characters of the text on one line, cut at a word. */
export function excerpt(body: string, max: number) {
  const flat = body.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  return flat.slice(0, flat.lastIndexOf(' ', max) > max * 0.6 ? flat.lastIndexOf(' ', max) : max).trimEnd() + '…';
}

/** Paragraphs from the plain text written in the dashboard (blank lines separate them). */
export const paragraphs = (body: string) => body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
