import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, House } from 'lucide-react';
import { readApiError } from '../../../app/apiError';
import { cn } from '../../../lib/utils';
import { Button, Dialog, Field, SelectInput, TextInput } from '../../../ui';
import { idOf, type Driver, type Rider, type TripInput } from './api';

interface Props {
  open: boolean;
  onClose: () => void;
  drivers: Driver[];
  riders: Rider[];
  saving: boolean;
  onSave: (d: TripInput) => Promise<void>;
}

const pad = (n: number) => String(n).padStart(2, '0');
const localInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** Plan one trip of a driver: when, which way, and which of their riders come along. */
export function TripDialog({ open, onClose, drivers, riders, saving, onSave }: Props) {
  const { t } = useTranslation('dashboardReception');
  const [driverId, setDriverId] = useState('');
  const [date, setDate] = useState('');
  const [direction, setDirection] = useState<TripInput['direction']>('to_academy');
  const [picked, setPicked] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isExtra, setIsExtra] = useState(false);
  const [charge, setCharge] = useState('');
  const [error, setError] = useState('');

  const mine = riders.filter((r) => idOf(r.driverId) === driverId).sort((a, b) => a.pickupOrder - b.pickupOrder);

  useEffect(() => {
    if (!open) return;
    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(9, 0, 0, 0);
    setDriverId('');
    setDate(localInput(start));
    setDirection('to_academy');
    setPicked([]);
    setNotes('');
    setIsExtra(false);
    setCharge('');
    setError('');
  }, [open]);

  // Everyone of the chosen driver rides by default
  useEffect(() => {
    setPicked(riders.filter((r) => idOf(r.driverId) === driverId).map((r) => r._id));
  }, [driverId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id: string) => setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!driverId) return setError(t('transport.enroll.errDriver'));
    if (!date) return setError(t('transport.trip.errDate'));
    if (mine.length > 0 && picked.length === 0) return setError(t('transport.trip.errRiders'));
    setError('');
    try {
      await onSave({
        driverId,
        date: new Date(date).toISOString(),
        direction,
        isExtra,
        extraCharge: isExtra && charge ? parseFloat(charge) : 0,
        notes: notes.trim(),
        // Left out = all of the driver's riders
        studentIds: picked.length < mine.length ? picked : undefined,
      });
    } catch (err) {
      setError(readApiError(err).message);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={t('transport.trip.newTitle')}
      closeLabel={t('enrollments.cancel')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('enrollments.cancel')}
          </Button>
          <Button type="submit" form="trip-form" loading={saving}>
            {t('transport.trip.create')}
          </Button>
        </>
      }
    >
      <form id="trip-form" onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('transport.enroll.driver')} required>
            {(c) => (
              <SelectInput {...c} value={driverId} onChange={(e) => setDriverId(e.target.value)}>
                <option value="">{t('transport.enroll.pickDriver')}</option>
                {drivers.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
          <Field label={t('transport.trip.when')} required>
            {(c) => <TextInput {...c} type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />}
          </Field>
        </div>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-ink">{t('transport.trip.direction')}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(['to_academy', 'from_academy'] as const).map((d) => (
              <label key={d} className={cn('flex cursor-pointer items-center gap-3 rounded-card border p-3 transition-colors has-[:focus-visible]:focus-ring', direction === d ? 'border-ink bg-frost' : 'border-line-strong hover:border-ink')}>
                <input type="radio" name="direction" value={d} checked={direction === d} onChange={() => setDirection(d)} className="sr-only" />
                <span className={cn('grid size-9 shrink-0 place-items-center rounded-input', direction === d ? 'bg-ink text-glow' : 'bg-rail text-ink-3')}>
                  {d === 'to_academy' ? <Building2 className="size-4" aria-hidden /> : <House className="size-4" aria-hidden />}
                </span>
                <span>
                  <span className="block text-sm font-medium text-ink">{t(`transport.dir.${d}`)}</span>
                  <span className="block text-xs text-ink-4">{t(`transport.dir.${d}Hint`)}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {driverId && (
          <fieldset>
            <legend className="mb-1.5 flex w-full items-center justify-between text-sm font-medium text-ink">
              {t('transport.trip.riders')}
              <span className="text-xs font-normal tabular-nums text-ink-4">{t('transport.trip.picked', { n: picked.length, total: mine.length })}</span>
            </legend>
            {mine.length === 0 ? (
              <p className="rounded-input bg-rail px-3 py-2 text-sm text-ink-3">{t('transport.trip.noRiders')}</p>
            ) : (
              <ul className="max-h-52 divide-y divide-line overflow-y-auto rounded-input border border-line">
                {mine.map((r) => (
                  <li key={r._id}>
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-rail">
                      <input type="checkbox" checked={picked.includes(r._id)} onChange={() => toggle(r._id)} className="size-4 shrink-0 accent-[#0f1f33]" />
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink text-xs font-semibold text-white tabular-nums" aria-label={t('transport.trip.order', { n: r.pickupOrder })}>
                        {r.pickupOrder}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-ink">{r.studentId?.name}</span>
                      <span className="hidden shrink-0 truncate text-xs text-ink-4 sm:block">{r.homeAddress}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </fieldset>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('cal.notes')} className="sm:col-span-2">
            {(c) => <TextInput {...c} value={notes} onChange={(e) => setNotes(e.target.value)} />}
          </Field>
          <label className="flex items-center gap-2 self-end py-2 text-sm text-ink">
            <input type="checkbox" checked={isExtra} onChange={(e) => setIsExtra(e.target.checked)} className="size-4 accent-[#0f1f33]" />
            {t('transport.trip.extra')}
          </label>
          {isExtra && (
            <Field label={t('transport.trip.charge')} hint={t('transport.syp')}>
              {(c) => <TextInput {...c} type="number" min={0} inputMode="numeric" value={charge} onChange={(e) => setCharge(e.target.value)} />}
            </Field>
          )}
        </div>

        {error && (
          <p role="alert" className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
      </form>
    </Dialog>
  );
}
