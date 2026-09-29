import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

/** Locale for Intl: Arabic months/days with Latin digits (as on the public site), or British English. */
export const intlLocale = (lang: string) => (lang === 'ar' ? 'ar-SY-u-nu-latn' : 'en-GB');

/** Date, time and money formatting in the current dashboard language. */
export function useFormat() {
  const { i18n } = useTranslation();
  const locale = intlLocale(i18n.language);

  return useMemo(() => {
    const dateFmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' });
    const dayMonthFmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
    const timeFmt = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    // Plain "$" in both languages (Arabic Intl currency format prints "US$")
    const numberFmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
    const toDate = (d: string | Date) => (typeof d === 'string' ? new Date(d) : d);
    return {
      locale,
      date: (d: string | Date) => dateFmt.format(toDate(d)),
      dayMonth: (d: string | Date) => dayMonthFmt.format(toDate(d)),
      time: (d: string | Date) => timeFmt.format(toDate(d)),
      money: (n: number) => (n < 0 ? '-$' : '$') + numberFmt.format(Math.abs(n)),
      /** Custom one-off formats, e.g. { month: 'long', year: 'numeric' }. */
      custom: (d: string | Date, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, options).format(toDate(d)),
    };
  }, [locale]);
}
