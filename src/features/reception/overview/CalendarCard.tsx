import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useFormat } from '../../../app/format';
import type { CalendarEvent } from './api';

/** Short Arabic day names, Sunday first (index = Date.getDay()). */
const AR_DAYS = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

const sameDay =(a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** Month grid with event dots, and the events of the picked day (or the rest of the month) below it. */
export function CalendarCard({ events, loading }: { events: CalendarEvent[]; loading: boolean }) {
  const { t, i18n } = useTranslation('dashboardReception');
  const f = useFormat();
  const isAr = i18n.language === 'ar';
  const today = new Date();
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [picked, setPicked] = useState<Date | null>(null);

  // Week starts on Saturday in Arabic (Syria), Monday in English
  const weekStart = isAr ? 6 : 1;
  const weekdays = useMemo(() => {
    // Arabic single letters (ح ن ث…) are hard to read, so Arabic uses short day words
    if (isAr) return Array.from({ length: 7 }, (_, i) => AR_DAYS[(weekStart + i) % 7]);
    const base = new Date(2024, 0, 7); // a Sunday
    return Array.from({ length: 7 }, (_, i) => f.custom(new Date(base.getFullYear(), 0, 7 + ((weekStart + i) % 7)), { weekday: 'narrow' }));
  }, [f, weekStart, isAr]);

  const days = useMemo(() => {
    const lead = (month.getDay() - weekStart + 7) % 7;
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array<null>(lead).fill(null), ...Array.from({ length: count }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  }, [month, weekStart]);

  const inMonth = events
    .filter((e) => {
      const d = new Date(e.startTime);
      return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth();
    })
    .sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime));
  const shown = picked ? inMonth.filter((e) => sameDay(new Date(e.startTime), picked)) : inMonth.filter((e) => new Date(e.endTime) >= today || month > today);

  const shift = (n: number) => {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));
    setPicked(null);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="rounded-card bg-rail p-4">
        <div className="mb-3 flex items-center justify-between">
          <button type="button" onClick={() => shift(-1)} aria-label={t('overview.prevMonth')} className="grid size-8 place-items-center rounded-full text-ink hover:bg-paper focus-visible:focus-ring">
            <ChevronLeft className="size-4 rtl:rotate-180" />
          </button>
          <p className="text-sm font-semibold text-ink">{f.custom(month, { month: 'long', year: 'numeric' })}</p>
          <button type="button" onClick={() => shift(1)} aria-label={t('overview.nextMonth')} className="grid size-8 place-items-center rounded-full text-ink hover:bg-paper focus-visible:focus-ring">
            <ChevronRight className="size-4 rtl:rotate-180" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-y-1 text-center">
          {weekdays.map((w, i) => (
            <span key={i} className="truncate pb-1 text-[11px] font-medium text-ink-4 rtl:text-[10px]">
              {w}
            </span>
          ))}
          {days.map((d, i) =>
            d ? (
              <DayCell
                key={i}
                day={d}
                isToday={sameDay(d, today)}
                isPicked={!!picked && sameDay(d, picked)}
                hasEvents={inMonth.some((e) => sameDay(new Date(e.startTime), d))}
                onPick={() => setPicked((p) => (p && sameDay(p, d) ? null : d))}
              />
            ) : (
              <span key={i} />
            ),
          )}
        </div>
      </div>

      <div className="mt-4 flex-1">
        <p className="mb-2 text-xs font-medium text-ink-4">{picked ? f.custom(picked, { weekday: 'long', day: 'numeric', month: 'long' }) : t('overview.upcomingThisMonth')}</p>
        {loading ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-input bg-rail" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <p className="py-4 text-sm text-ink-4">{t('overview.noEvents')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {shown.slice(0, 4).map((e) => (
              <li key={e._id} className="flex items-start gap-3 py-2.5">
                <span className="mt-1 size-2.5 shrink-0 rounded-full bg-ink" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{e.title}</p>
                  <p className="text-xs text-ink-4">
                    {f.dayMonth(e.startTime)} <span className="mx-1 text-line-strong">|</span>
                    <span className="font-medium text-ink-2">{f.time(e.startTime)}</span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function DayCell({ day, isToday, isPicked, hasEvents, onPick }: { day: Date; isToday: boolean; isPicked: boolean; hasEvents: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={isPicked}
      className={cn(
        'relative mx-auto grid size-8 place-items-center rounded-full text-xs tabular-nums focus-visible:focus-ring',
        isPicked ? 'bg-glow font-semibold text-ink' : isToday ? 'bg-ink font-semibold text-white' : 'text-ink-2 hover:bg-paper',
      )}
    >
      {day.getDate()}
      {hasEvents && !isPicked && <span aria-hidden className={cn('absolute bottom-0.5 size-1 rounded-full', isToday ? 'bg-glow' : 'bg-ink')} />}
    </button>
  );
}
