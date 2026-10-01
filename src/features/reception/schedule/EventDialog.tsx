import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Check, Phone, Plus, UserRound, X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { readApiError } from '../../../app/apiError';
import { Button, Dialog, Field, TextArea, TextInput } from '../../../ui';
import { COMPANY_ROLES, DAY_END, DAY_START, EVENT_COLORS, useLeadSearch, type CalendarEvent, type EventColor, type EventInput, type Participant } from './api';
import { EVENT_SWATCH } from './colors';

interface Props {
  open: boolean;
  onClose: () => void;
  /** The event being edited; null for a new one. */
  event: CalendarEvent | null;
  /** Start of the slot that was clicked, for a new event. */
  slot?: Date;
  saving: boolean;
  onSave: (data: EventInput) => Promise<void>;
}

const pad = (n: number) => String(n).padStart(2, '0');
const dateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const timeInput = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const keyOf = (p: Participant) => (p.type === 'lead' ? `lead-${p.leadId._id}` : p.type === 'company' ? `company-${p.companyRole}` : `custom-${p.customName}-${p.customPhone ?? ''}`);

/** A clicked slot outside working hours (month view gives midnight) starts at 10:00. */
function initialTimes(slot?: Date) {
  const start = new Date(slot ?? Date.now());
  if (start.getHours() < DAY_START || start.getHours() >= DAY_END) start.setHours(DAY_START, 0, 0, 0);
  else start.setMinutes(start.getMinutes() < 30 ? 0 : 30, 0, 0);
  const end = new Date(Math.min(start.getTime() + 3_600_000, new Date(start).setHours(DAY_END, 0, 0, 0)));
  return { date: dateInput(start), from: timeInput(start), to: timeInput(end) };
}

/** Create or edit a meeting/event: when, colour label and who takes part. */
export function EventDialog({ open, onClose, event, slot, saving, onSave }: Props) {
  const { t } = useTranslation('dashboardReception');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [color, setColor] = useState<EventColor>('blue');
  const [people, setPeople] = useState<Participant[]>([]);
  const [search, setSearch] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [error, setError] = useState('');
  const leads = useLeadSearch(search);

  useEffect(() => {
    if (!open) return;
    if (event) {
      const s = new Date(event.startTime);
      setTitle(event.title);
      setDescription(event.description ?? '');
      setDate(dateInput(s));
      setFrom(timeInput(s));
      setTo(timeInput(new Date(event.endTime)));
      setColor(event.color);
      setPeople(event.participants.filter((p) => p.type !== 'lead' || p.leadId));
    } else {
      const i = initialTimes(slot);
      setTitle('');
      setDescription('');
      setDate(i.date);
      setFrom(i.from);
      setTo(i.to);
      setColor('blue');
      setPeople([]);
    }
    setSearch('');
    setGuestName('');
    setGuestPhone('');
    setError('');
  }, [open, event, slot]);

  const add = (p: Participant) => setPeople((cur) => (cur.some((x) => keyOf(x) === keyOf(p)) ? cur : [...cur, p]));
  const remove = (p: Participant) => setPeople((cur) => cur.filter((x) => keyOf(x) !== keyOf(p)));
  const hasRole = (r: string) => people.some((p) => p.type === 'company' && p.companyRole === r);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const start = new Date(`${date}T${from}`);
    const end = new Date(`${date}T${to}`);
    if (!title.trim()) return setError(t('cal.errTitle'));
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return setError(t('cal.errTime'));
    if (end <= start) return setError(t('cal.errOrder'));
    if (from < `${pad(DAY_START)}:00` || to > `${pad(DAY_END)}:00`) return setError(t('cal.errHours', { from: `${pad(DAY_START)}:00`, to: `${pad(DAY_END)}:00` }));
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        startTime: start,
        endTime: end,
        color,
        participants: people.map((p) =>
          p.type === 'lead' ? { type: 'lead', leadId: p.leadId._id } : p.type === 'company' ? { type: 'company', companyRole: p.companyRole } : { type: 'custom', customName: p.customName, customPhone: p.customPhone ?? '' },
        ),
      });
    } catch (err) {
      setError(readApiError(err).message);
    }
  };

  const chosen = new Set(people.map(keyOf));
  const results = (leads.data ?? []).filter((l) => !chosen.has(`lead-${l._id}`));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={t(event ? 'cal.editTitle' : 'cal.newTitle')}
      closeLabel={t('enrollments.cancel')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('enrollments.cancel')}
          </Button>
          <Button type="submit" form="event-form" loading={saving}>
            {t(event ? 'cal.save' : 'cal.create')}
          </Button>
        </>
      }
    >
      <form id="event-form" onSubmit={submit} className="space-y-4" noValidate>
        <Field label={t('cal.f.title')} required>
          {(c) => <TextInput {...c} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('cal.f.titleHint')} autoFocus />}
        </Field>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t('cal.f.date')} required>
            {(c) => <TextInput {...c} type="date" value={date} onChange={(e) => setDate(e.target.value)} />}
          </Field>
          <Field label={t('cal.f.from')} required>
            {(c) => <TextInput {...c} type="time" step={900} min={`${pad(DAY_START)}:00`} max={`${pad(DAY_END)}:00`} value={from} onChange={(e) => setFrom(e.target.value)} dir="ltr" />}
          </Field>
          <Field label={t('cal.f.to')} required>
            {(c) => <TextInput {...c} type="time" step={900} min={`${pad(DAY_START)}:00`} max={`${pad(DAY_END)}:00`} value={to} onChange={(e) => setTo(e.target.value)} dir="ltr" />}
          </Field>
        </div>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-ink">{t('cal.f.color')}</legend>
          <div className="flex flex-wrap gap-2">
            {EVENT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={color === c}
                aria-label={t(`cal.colors.${c}`)}
                title={t(`cal.colors.${c}`)}
                onClick={() => setColor(c)}
                className={cn('grid size-9 place-items-center rounded-full border-2 focus-visible:focus-ring', color === c ? 'border-ink' : 'border-transparent')}
              >
                <span className="grid size-6 place-items-center rounded-full text-white" style={{ background: EVENT_SWATCH[c].bar }}>
                  {color === c && <Check className="size-3.5" aria-hidden />}
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        <Field label={t('cal.f.description')}>
          {(c) => <TextArea {...c} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />}
        </Field>

        <fieldset className="space-y-3 rounded-card border border-line p-4">
          <legend className="px-1 text-sm font-medium text-ink">{t('cal.f.people')}</legend>

          {people.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label={t('cal.f.chosen')}>
              {people.map((p) => (
                <li key={keyOf(p)} className="inline-flex h-8 items-center gap-1.5 rounded-pill bg-rail ps-3 pe-1 text-sm text-ink">
                  {p.type === 'company' ? <Building2 className="size-3.5 text-ink-3" aria-hidden /> : <UserRound className="size-3.5 text-ink-3" aria-hidden />}
                  {p.type === 'lead' ? p.leadId.fullName : p.type === 'company' ? p.companyRole : p.customName}
                  <button type="button" onClick={() => remove(p)} aria-label={t('cal.f.remove', { name: p.type === 'lead' ? p.leadId.fullName : p.type === 'company' ? p.companyRole : p.customName })} className="grid size-6 place-items-center rounded-full text-ink-3 hover:bg-ink/10 hover:text-ink focus-visible:focus-ring">
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div>
            <p className="mb-1.5 text-xs font-medium text-ink-3">{t('cal.f.team')}</p>
            <div className="flex flex-wrap gap-2">
              {COMPANY_ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={hasRole(r)}
                  onClick={() => (hasRole(r) ? remove({ type: 'company', companyRole: r }) : add({ type: 'company', companyRole: r }))}
                  className={cn('inline-flex h-8 items-center gap-1 rounded-pill border px-3 text-sm transition-colors focus-visible:focus-ring', hasRole(r) ? 'border-ink bg-ink text-white' : 'border-line-strong text-ink-2 hover:border-ink')}
                >
                  {hasRole(r) && <Check className="size-3.5" aria-hidden />}
                  {r}
                </button>
              ))}
            </div>
          </div>

          <Field label={t('cal.f.findLead')} hint={search.trim().length < 2 ? t('cal.f.findHint') : undefined}>
            {(c) => <TextInput {...c} type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('cal.f.findPlaceholder')} />}
          </Field>
          {search.trim().length >= 2 && (
            <ul className="max-h-44 overflow-y-auto rounded-input border border-line" aria-label={t('cal.f.results')}>
              {leads.isLoading ? (
                <li className="px-3 py-2 text-sm text-ink-4">{t('cal.f.searching')}</li>
              ) : results.length === 0 ? (
                <li className="px-3 py-2 text-sm text-ink-4">{t('cal.f.noLeads')}</li>
              ) : (
                results.map((l) => (
                  <li key={l._id}>
                    <button
                      type="button"
                      onClick={() => add({ type: 'lead', leadId: { _id: l._id, fullName: l.fullName, mobileNumber: l.mobileNumber } })}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-start text-sm hover:bg-rail focus-visible:bg-rail focus-visible:outline-none"
                    >
                      <span className="truncate text-ink">{l.fullName}</span>
                      <span className="shrink-0 text-xs text-ink-4" dir="ltr">
                        {l.mobileNumber}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}

          <div>
            <p className="mb-1.5 text-xs font-medium text-ink-3">{t('cal.f.guest')}</p>
            <div className="flex flex-wrap gap-2">
              <TextInput className="h-10 min-w-36 flex-1" value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder={t('cal.f.guestName')} aria-label={t('cal.f.guestName')} />
              <div className="relative min-w-36 flex-1">
                <Phone className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink-4" aria-hidden />
                <TextInput className="h-10 ps-9" type="tel" dir="ltr" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder={t('cal.f.guestPhone')} aria-label={t('cal.f.guestPhone')} />
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="h-10"
                icon={<Plus />}
                disabled={!guestName.trim()}
                onClick={() => {
                  add({ type: 'custom', customName: guestName.trim(), customPhone: guestPhone.trim() });
                  setGuestName('');
                  setGuestPhone('');
                }}
              >
                {t('cal.f.addGuest')}
              </Button>
            </div>
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
      </form>
    </Dialog>
  );
}
