import { useMemo, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, dayjsLocalizer, Views, type Formats, type View } from 'react-big-calendar';
import dayjs from 'dayjs';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './calendar.css';
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, GraduationCap, Plus } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { useFormat } from '../../../app/format';
import { readApiError } from '../../../app/apiError';
import { cn } from '../../../lib/utils';
import { Button, ConfirmDialog, EmptyState, PageHeader, Panel, StatTile } from '../../../ui';
import { DAY_END, DAY_START, useCalendarItems, useEventMutations, type CalendarEvent, type CalendarItem } from './api';
import { EVENT_SWATCH, SESSION_SWATCH } from './colors';
import { EventDialog } from './EventDialog';
import { EventDetailsDialog } from './EventDetailsDialog';

const localizer = dayjsLocalizer(dayjs);
const VIEWS = [Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA] as const;
const MIN = new Date(1970, 0, 1, DAY_START, 0);
const MAX = new Date(1970, 0, 1, DAY_END, 0);

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const weekRange = (d: Date) => {
  const start = dayjs(d).startOf('week').toDate();
  return { start, end: dayjs(start).add(7, 'day').toDate() };
};

/** Reception: meetings and events of the centre, with the students' booked private sessions on the same calendar. */
export default function SchedulePage() {
  const { t, i18n } = useTranslation('dashboardReception');
  const isAr = i18n.language === 'ar';
  const f = useFormat();
  const toast = useToast();
  const { items, isLoading, isError, refetch } = useCalendarItems((name) => t('cal.sessionOf', { name: name || t('enrollments.unknownStudent') }));
  const { save, remove } = useEventMutations();

  const [view, setView] = useState<View>(() => (window.innerWidth < 768 ? Views.DAY : Views.WEEK));
  const [date, setDate] = useState(() => new Date());
  const [details, setDetails] = useState<CalendarItem | null>(null);
  const [form, setForm] = useState<{ event: CalendarEvent | null; slot?: Date } | null>(null);
  const [deleting, setDeleting] = useState<CalendarEvent | null>(null);
  const lastForm = useRef(form);
  if (form) lastForm.current = form;
  const lastDeleting = useRef(deleting);
  if (deleting) lastDeleting.current = deleting;

  const now = new Date();
  const week = weekRange(now);
  const inWeek = (i: CalendarItem) => i.start >= week.start && i.start < week.end;

  // All labels go through Intl, so Arabic gets Arabic month/day names with Latin digits
  const formats: Formats = useMemo(() => {
    const time = (d: Date) => f.time(d);
    const range = ({ start, end }: { start: Date; end: Date }) => `${time(start)} – ${time(end)}`;
    return {
      timeGutterFormat: time,
      eventTimeRangeFormat: range,
      agendaTimeRangeFormat: range,
      agendaTimeFormat: time,
      selectRangeFormat: range,
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
    if (view === Views.WEEK) {
      const { start } = weekRange(date);
      const end = dayjs(start).add(6, 'day').toDate();
      return `${f.dayMonth(start)} – ${f.date(end)}`;
    }
    return f.custom(date, { month: 'long', year: 'numeric' });
  }, [view, date, f]);

  const step = (dir: 1 | -1) => {
    const unit = view === Views.MONTH ? 'month' : view === Views.DAY ? 'day' : view === Views.AGENDA ? 'month' : 'week';
    setDate((d) => dayjs(d).add(dir, unit).toDate());
  };
  const PrevIcon = isAr ? ChevronRight : ChevronLeft;
  const NextIcon = isAr ? ChevronLeft : ChevronRight;

  const blockStyle = (item: CalendarItem) => {
    const s = item.kind === 'session' ? SESSION_SWATCH : EVENT_SWATCH[item.event.color] ?? EVENT_SWATCH.blue;
    return { style: { '--ev-soft': s.soft, '--ev-bar': s.bar, '--ev-text': item.kind === 'session' ? '#eefcf1' : '#0f1f33' } as CSSProperties };
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('cal.title')}
        description={t('cal.subtitle')}
        actions={
          <Button icon={<Plus />} onClick={() => setForm({ event: null, slot: view === Views.DAY ? date : undefined })}>
            {t('cal.new')}
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <StatTile
          icon={<CalendarDays />}
          tint="bg-tint-leaf"
          label={t('cal.today')}
          value={items.filter((i) => sameDay(i.start, now)).length}
          loading={isLoading}
          onClick={() => { setView(Views.DAY); setDate(new Date()); }}
          active={view === Views.DAY && sameDay(date, now)}
        />
        <StatTile
          icon={<CalendarRange />}
          tint="bg-tint-straw"
          label={t('cal.thisWeek')}
          value={items.filter(inWeek).length}
          loading={isLoading}
          onClick={() => { setView(Views.WEEK); setDate(new Date()); }}
          active={view === Views.WEEK && date >= week.start && date < week.end}
        />
        <StatTile icon={<GraduationCap />} tint="bg-tint-sage" label={t('cal.sessionsWeek')} value={items.filter((i) => i.kind === 'session' && inWeek(i)).length} loading={isLoading} />
      </div>

      <Panel className="p-3 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              <button type="button" onClick={() => step(-1)} aria-label={t('cal.prev')} className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-ink/5 focus-visible:focus-ring">
                <PrevIcon className="size-5" />
              </button>
              <button type="button" onClick={() => step(1)} aria-label={t('cal.next')} className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-ink/5 focus-visible:focus-ring">
                <NextIcon className="size-5" />
              </button>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setDate(new Date())}>
              {t('cal.goToday')}
            </Button>
            <h2 className="ms-1 text-base font-semibold tabular-nums text-ink sm:text-lg" aria-live="polite">
              {heading}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ul className="hidden items-center gap-3 text-xs text-ink-3 md:flex" aria-label={t('cal.legend')}>
              <li className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full" style={{ background: SESSION_SWATCH.soft, boxShadow: `inset 0 0 0 2px ${SESSION_SWATCH.bar}` }} aria-hidden />
                {t('cal.legendSessions')}
              </li>
              <li className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full" style={{ background: EVENT_SWATCH.blue.bar }} aria-hidden />
                {t('cal.legendEvents')}
              </li>
            </ul>
            <div role="tablist" aria-label={t('cal.views')} className="flex rounded-pill bg-rail p-1">
              {VIEWS.map((v) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => setView(v)}
                  className={cn('h-8 rounded-pill px-3.5 text-sm font-medium transition-colors focus-visible:focus-ring', view === v ? 'bg-ink text-white' : 'text-ink-3 hover:text-ink')}
                >
                  {t(`cal.view.${v}`)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isError ? (
          <EmptyState icon={<CalendarDays />} title={t('cal.loadError')} action={<Button variant="secondary" onClick={refetch}>{t('leads.retry')}</Button>} />
        ) : (
          <div className={cn('rt-cal', view === Views.MONTH ? 'h-[660px]' : view === Views.AGENDA ? 'min-h-[420px]' : 'h-[720px]')} aria-busy={isLoading}>
            <Calendar<CalendarItem>
              localizer={localizer}
              culture={isAr ? 'ar' : 'en'}
              rtl={isAr}
              events={items}
              titleAccessor="title"
              startAccessor="start"
              endAccessor="end"
              toolbar={false}
              view={view}
              onView={setView}
              views={[...VIEWS]}
              date={date}
              onNavigate={setDate}
              min={MIN}
              max={MAX}
              step={30}
              timeslots={2}
              selectable
              popup
              formats={formats}
              messages={{ showMore: (n: number) => t('cal.more', { count: n }), noEventsInRange: t('cal.noneInRange'), date: t('cal.col.date'), time: t('cal.col.time'), event: t('cal.col.event') }}
              eventPropGetter={blockStyle}
              onSelectEvent={(item) => setDetails(item)}
              onSelectSlot={({ start }) => setForm({ event: null, slot: start })}
              onDrillDown={(d) => { setDate(d); setView(Views.DAY); }}
              style={{ height: view === Views.AGENDA ? 'auto' : '100%' }}
            />
          </div>
        )}
      </Panel>

      <EventDetailsDialog
        item={details}
        onClose={() => setDetails(null)}
        onEdit={() => {
          if (details?.kind !== 'event') return;
          const event = details.event;
          setDetails(null);
          setForm({ event });
        }}
        onDelete={() => {
          if (details?.kind !== 'event') return;
          setDeleting(details.event);
          setDetails(null);
        }}
      />
      <EventDialog
        open={!!form}
        onClose={() => setForm(null)}
        event={(form ?? lastForm.current)?.event ?? null}
        slot={(form ?? lastForm.current)?.slot}
        saving={save.isPending}
        onSave={async (data) => {
          const id = form?.event?._id;
          await save.mutateAsync({ id, data });
          toast.success(t(id ? 'cal.toast.saved' : 'cal.toast.created'));
          setForm(null);
        }}
      />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        tone="danger"
        loading={remove.isPending}
        title={t('cal.deleteTitle')}
        message={t('cal.deleteText', { title: (deleting ?? lastDeleting.current)?.title ?? '' })}
        confirmLabel={t('cal.delete')}
        cancelLabel={t('enrollments.cancel')}
        onConfirm={() =>
          void remove
            .mutateAsync(deleting!._id)
            .then(() => toast.success(t('cal.toast.deleted')))
            .catch((err) => toast.error(t('enrollments.errorTitle'), readApiError(err).message))
            .finally(() => setDeleting(null))
        }
      />
    </div>
  );
}
