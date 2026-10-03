// Shared by proxy.ts (edge) and the app — keep this file free of Node-only imports.
export const LOCALES = ['en', 'ar'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';
export const hasLocale = (value: string): value is Locale => (LOCALES as readonly string[]).includes(value);
export const isRtl = (lang: Locale) => lang === 'ar';
