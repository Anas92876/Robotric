import { useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, dayjsLocalizer, Views, type Formats, type View } from 'react-big-calendar';
import dayjs from 'dayjs';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../../../ui/calendar.css';
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Clock, Plus } from 'lucide-react';
import { useFormat } from '../../../app/format';
import { cn } from '../../../lib/utils';
import { Button, EmptyState, PageHeader, Panel, SelectInput, StatTile } from '../../../ui';
import { EVENT_SWATCH } from '../../reception/schedule/colors';
import { useTrainerSessionList, type TrainerSession } from '../sessions/api';

const localizer = dayjsLocalizer(dayjs);
const VIEWS = [Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA] as const;
const MIN = new Date(1970, 0, 1, 8, 0);
const MAX = new Date(1970, 0, 1, 22, 0);
/** One flat colour per group, in the order the groups first appear. */
const GROUP_COLORS = ['green', 'blue', 'purple', 'yellow', 'red'] as const;

interface Item { id: string; title: string; start: Date; end: Date; session: TrainerSession; color: { soft: string; bar: string } }
const at = (day: string, hm: string) => { const [h, m] = (hm || '00:00').split(':').map(Number); const d = new Date(`${day.slice(0, 10)}T00:00`); d.setHours(h, m, 0, 0); return d; };
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const weekRange = (d: Date) => { const start = dayjs(d).startOf('week').toDate(); return { start, end: dayjs(start).add(7, 'day').toDate() }; };

/** The trainer's classes on a calendar; a click opens the class, an empty slot starts a new one. */
export default function SchedulePage() {
  const { t, i18n } = useTranslation('dashboardTrainer');
  const isAr = i18n.language === 'ar';
  const f = useFormat();
  const navigate = useNavigate();
  const q = useTrainerSessionList();
  const [group, setGroup] = useState('');
  const [view, setView] = useState<View>(() => (window.innerWidth < 768 ? Views.DAY : Views.WEEK));
  const [date, setDate] = useState(() => new Date());

  const all = q.data ?? [];
  const groups = useMemo(() => [...new Map(all.filter((s) => s.groupId).map((s) => [s.groupId!._id, s.groupId!.name])).entries()], [all]);
  const items: Item[] = useMemo(
    () => all
      .filter((s) => !group || s.groupId?._id === group)
      .map((s) => {
        const gi = groups.findIndex(([id]) => id === s.groupId?._id);
        const color = s.status === 'cancelled' ? EVENT_SWATCH.gray : EVENT_SWATCH[GROUP_COLORS[Math.max(gi, 0) % GROUP_COLORS.length]];
        return { id: s._id, title: `${s.title}${s.groupId ? ` · ${s.groupId.name}` : ''}`, start: at(s.scheduledDate, s.startTime), end: at(s.scheduledDate, s.endTime), session: s, color };
      }),
    [all, group, groups],
  );

  const now = new Date();
  const week = weekRange(now);
  const live = items.filter((i) => i.session.status !== 'cancelled');
  const hours = live.filter((i) => i.start >= week.start && i.start < week.end).reduce((s, i) => s + (i.end.getTime() - i.start.getTime()) / 36e5, 0);

  const formats: Formats = useMemo(() => {
    const time = (d: Date) => f.time(d);
    const range = ({ start, end }: { start: Date; end: Date }) => `${time(start)} – ${time(end)}`;
    return {
      timeGutterFormat: time, eventTimeRangeFormat: range, agendaTimeRangeFormat: range, agendaTimeFormat: time, selectRangeFormat: range,
      weekdayFormat: (d: Date) => f.custom(d, { weekday: 'short' }),
      dayFormat: (d: Date) => f.custom(d, { weekday: 'short', day: 'numeric' }),
      dateFormat: (d: Date) => f.custom(d, { day: 'numeric' }),
      agendaDateFormat: (d: Date) => f.custom(d, { weekday: 'short', day: 'numeric', month: 'short' }),
      dayHeaderFormat: (d: Date) => f.custom(d, { weekday: 'long', day: 'numeric', month: 'long' }),
      monthHeaderFormat: (d: Date) => f.custom(d, { month: 'long', year: 'numeric' }),
      dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) => `${f.dayMonth(start)} – ${f.dayMonth(end)}`,
      agendaHeaderFormat: ({ start, end }: { start: Date; end: Date }) => `${f.dayMonth(start)} – ${f.dayMonth(end)}`,
    };
  }, [f]);

  const heading = useMemo(() => {
    if (view === Views.DAY) return f.custom(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (view === Views.WEEK) { const { start } = weekRange(date); return `${f.dayMonth(start)} – ${f.date(dayjs(start).add(6, 'day').toDate())}`; }
    return f.custom(date, { month: 'long', year: 'numeric' });
  }, [view, date, f]);
  const step = (dir: 1 | -1) => setDate((d) => dayjs(d).add(dir, view === Views.DAY ? 'day' : view === Views.WEEK ? 'week' : 'month').toDate());
  const PrevIcon = isAr ? ChevronRight : ChevronLeft;
  const NextIcon = isAr ? ChevronLeft : ChevronRight;
  const newAt = (d?: Date) => navigate(`/trainer/sessions/new${d ? `?date=${dayjs(d).format('YYYY-MM-DD')}&start=${dayjs(d).format('HH:mm')}${group ? `&group=${group}` : ''}` : group ? `?group=${group}` : ''}`);

  return (
    <div className="space-y-5">
      <PageHeader title={t('sch.title')} description={t('sch.subtitle')} actions={<Button icon={<Plus />} onClick={() => newAt()}>{t('ses.new')}</Button>} />
      <div className="grid grid-cols-3 gap-3">
        <StatTile icon={<CalendarDays />} tint="bg-tint-leaf" label={t('sch.today')} value={live.filter((i) => sameDay(i.start, now)).length} loading={q.isLoading} onClick={() => { setView(Views.DAY); setDate(new Date()); }} active={view === Views.DAY && sameDay(date, now)} />
        <StatTile icon={<CalendarRange />} tint="bg-tint-straw" label={t('sch.thisWeek')} value={live.filter((i) => i.start >= week.start && i.start < week.end).length} loading={q.isLoading} onClick={() => { setView(Views.WEEK); setDate(new Date()); }} active={view === Views.WEEK && date >= week.start && date < week.end} />
        <StatTile icon={<Clock />} tint="bg-tint-sage" label={t('sch.hours')} value={Math.round(hours * 10) / 10} loading={q.isLoading} />
      </div>

      <Panel className="p-3 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              <button type="button" onClick={() => step(-1)} aria-label={t('sch.prev')} className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-ink/5 focus-visible:focus-ring"><PrevIcon className="size-5" /></button>
              <button type="button" onClick={() => step(1)} aria-label={t('sch.next')} className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-ink/5 focus-visible:focus-ring"><NextIcon className="size-5" /></button>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setDate(new Date())}>{t('sch.goToday')}</Button>
            <h2 className="ms-1 text-base font-semibold tabular-nums text-ink sm:text-lg" aria-live="polite">{heading}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {groups.length > 1 && (
              <SelectInput aria-label={t('grp.groups')} value={group} onChange={(e) => setGroup(e.target.value)} className="h-10 w-full sm:w-auto sm:min-w-40">
                <option value="">{t('ses.allGroups')}</option>
                {groups.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </SelectInput>
            )}
            <div role="tablist" aria-label={t('sch.views')} className="flex rounded-pill bg-rail p-1">
              {VIEWS.map((v) => (
                <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} className={cn('h-8 rounded-pill px-3.5 text-sm font-medium transition-colors focus-visible:focus-ring', view === v ? 'bg-ink text-white' : 'text-ink-3 hover:text-ink')}>{t(`sch.view.${v}`)}</button>
              ))}
            </div>
          </div>
        </div>
        {groups.length > 1 && (
          <ul className="mb-3 flex flex-wrap items-center gap-3 text-xs text-ink-3" aria-label={t('sch.legend')}>
            {groups.map(([id, name], i) => <li key={id} className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: EVENT_SWATCH[GROUP_COLORS[i % GROUP_COLORS.length]].bar }} aria-hidden /><span dir="auto">{name}</span></li>)}
          </ul>
        )}
        {q.isError ? <EmptyState icon={<CalendarDays />} title={t('ses.loadError')} action={<Button variant="secondary" onClick={() => void q.refetch()}>{t('grp.retry')}</Button>} /> : (
          <div className={cn('rt-cal', view === Views.MONTH ? 'h-[660px]' : view === Views.AGENDA ? 'min-h-[420px]' : 'h-[760px]')} aria-busy={q.isLoading}>
            <Calendar<Item>
              localizer={localizer} culture={isAr ? 'ar' : 'en'} rtl={isAr} events={items} titleAccessor="title" startAccessor="start" endAccessor="end"
              toolbar={false} view={view} onView={setView} views={[...VIEWS]} date={date} onNavigate={setDate} min={MIN} max={MAX} step={30} timeslots={2} selectable popup formats={formats}
              messages={{ showMore: (n: number) => t('sch.more', { count: n }), noEventsInRange: t('sch.noneInRange'), date: t('sch.col.date'), time: t('sch.col.time'), event: t('sch.col.class') }}
              eventPropGetter={(i) => ({ className: i.session.status === 'cancelled' ? 'line-through opacity-70' : undefined, style: { '--ev-soft': i.color.soft, '--ev-bar': i.color.bar, '--ev-text': '#0f1f33' } as CSSProperties })}
              tooltipAccessor={(i) => `${i.title}${i.session.status === 'cancelled' ? ` (${t('ov.status.cancelled')})` : ''}`}
              onSelectEvent={(i) => navigate(`/trainer/sessions/${i.id}`)}
              onSelectSlot={({ start }) => newAt(start)}
              onDrillDown={(d) => { setDate(d); setView(Views.DAY); }}
              style={{ height: view === Views.AGENDA ? 'auto' : '100%' }}
            />
          </div>
        )}
      </Panel>
    </div>
  );
}
