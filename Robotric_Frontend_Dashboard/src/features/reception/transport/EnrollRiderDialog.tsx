import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Calculator, Check, X } from 'lucide-react';
import { readApiError } from '../../../app/apiError';
import { Button, Dialog, Field, SelectInput, TextInput } from '../../../ui';
import { getEstimate, useStudentSearch, type CostEstimate, type Driver, type RiderInput, type StudentOption } from './api';
import { LocationPicker } from './LocationPicker';

interface Props {
  open: boolean;
  onClose: () => void;
  drivers: Driver[];
  /** Student chosen before opening (deep link from Enrollments). */
  preset: StudentOption | null;
  /** Students who already have a seat (left out of the search). */
  seated: Set<string>;
  saving: boolean;
  onSave: (d: RiderInput) => Promise<void>;
}

/** Search-as-you-type student field: shows the chosen student as a chip. */
function StudentPicker({ value, onChange, seated }: { value: StudentOption | null; onChange: (s: StudentOption | null) => void; seated: Set<string> }) {
  const { t } = useTranslation('dashboardReception');
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(id);
  }, [q]);
  const found = useStudentSearch(debounced, !value && debounced.length >= 2);

  if (value)
    return (
      <div className="flex items-center gap-3 rounded-input border border-ink bg-frost px-3 py-2">
        <Check className="size-4 shrink-0 text-glow-deep" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{value.name}</p>
          {value.email && (
            <p className="truncate text-xs text-ink-4" dir="ltr">
              {value.email}
            </p>
          )}
        </div>
        <button type="button" onClick={() => onChange(null)} aria-label={t('transport.enroll.change')} className="grid size-8 place-items-center rounded-full text-ink-3 hover:bg-ink/10 hover:text-ink focus-visible:focus-ring">
          <X className="size-4" />
        </button>
      </div>
    );

  const list = (found.data ?? []).filter((s) => !seated.has(s._id));
  return (
    <div>
      <TextInput type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('transport.enroll.studentPlaceholder')} aria-label={t('transport.enroll.student')} />
      {debounced.length >= 2 && (
        <ul className="mt-1 max-h-48 overflow-y-auto rounded-input border border-line" aria-label={t('transport.enroll.matches')}>
          {found.isLoading ? (
            <li className="px-3 py-2 text-sm text-ink-4">{t('cal.f.searching')}</li>
          ) : list.length === 0 ? (
            <li className="px-3 py-2 text-sm text-ink-4">{t('transport.enroll.noStudents')}</li>
          ) : (
            list.map((s) => (
              <li key={s._id}>
                <button type="button" onClick={() => onChange(s)} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-start text-sm hover:bg-rail focus-visible:bg-rail focus-visible:outline-none">
                  <span className="truncate text-ink">{s.name}</span>
                  <span className="shrink-0 truncate text-xs text-ink-4" dir="ltr">
                    {s.email}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

/** Give a student a seat with a driver: home on the map, optional fee preview. */
export function EnrollRiderDialog({ open, onClose, drivers, preset, seated, saving, onSave }: Props) {
  const { t } = useTranslation('dashboardReception');
  const [student, setStudent] = useState<StudentOption | null>(null);
  const [driverId, setDriverId] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [sessions, setSessions] = useState('');
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setStudent(preset);
    setDriverId('');
    setAddress('');
    setPhone('');
    setSessions('');
    setPos(null);
    setEstimate(null);
    setError('');
  }, [open, preset]);

  // A new pin or class count makes the old estimate wrong
  useEffect(() => setEstimate(null), [pos, sessions]);

  const calc = async () => {
    if (!pos) return;
    setEstimating(true);
    setError('');
    try {
      setEstimate(await getEstimate(pos.lat, pos.lng, sessions ? parseInt(sessions, 10) : undefined));
    } catch (err) {
      setError(readApiError(err).message);
    } finally {
      setEstimating(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!student) return setError(t('transport.enroll.errStudent'));
    if (!driverId) return setError(t('transport.enroll.errDriver'));
    if (!pos) return setError(t('transport.enroll.errPin'));
    setError('');
    try {
      await onSave({
        studentId: student._id,
        driverId,
        homeLocation: pos,
        homeAddress: address.trim() || undefined,
        phoneNumber: phone.trim() || undefined,
        sessionsPerMonthOverride: sessions ? parseInt(sessions, 10) : undefined,
      });
    } catch (err) {
      setError(readApiError(err).message);
    }
  };

  const full = (d: Driver) => d.studentCount >= d.capacity;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={t('transport.enroll.title')}
      description={t('transport.enroll.subtitle')}
      closeLabel={t('enrollments.cancel')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('enrollments.cancel')}
          </Button>
          <Button type="submit" form="rider-form" loading={saving}>
            {t('transport.enroll.save')}
          </Button>
        </>
      }
    >
      <form id="rider-form" onSubmit={submit} className="space-y-4" noValidate>
        <Field label={t('transport.enroll.student')} required>
          {() => <StudentPicker value={student} onChange={setStudent} seated={seated} />}
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('transport.enroll.driver')} required>
            {(c) => (
              <SelectInput {...c} value={driverId} onChange={(e) => setDriverId(e.target.value)}>
                <option value="">{t('transport.enroll.pickDriver')}</option>
                {drivers.map((d) => (
                  <option key={d._id} value={d._id}>
                    {t('transport.enroll.driverOption', { name: d.name, count: d.studentCount, cap: d.capacity })}
                    {full(d) ? ` · ${t('transport.full')}` : ''}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
          <Field label={t('transport.enroll.phone')}>{(c) => <TextInput {...c} type="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} />}</Field>
          <Field label={t('transport.enroll.address')}>{(c) => <TextInput {...c} value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t('transport.enroll.addressHint')} />}</Field>
          <Field label={t('transport.enroll.sessions')} hint={t('transport.enroll.sessionsHint')}>
            {(c) => <TextInput {...c} type="number" min={1} inputMode="numeric" value={sessions} onChange={(e) => setSessions(e.target.value)} />}
          </Field>
        </div>

        <Field label={t('transport.enroll.home')} required>
          {() => (
            <LocationPicker
              lat={pos?.lat ?? null}
              lng={pos?.lng ?? null}
              onChange={(lat, lng, addr) => {
                setPos({ lat, lng });
                if (addr) setAddress((cur) => cur || addr);
              }}
            />
          )}
        </Field>

        <div className="flex flex-wrap items-center gap-3 rounded-card border border-line p-3">
          <Button variant="secondary" size="sm" icon={<Calculator />} onClick={() => void calc()} disabled={!pos} loading={estimating}>
            {t('transport.enroll.calc')}
          </Button>
          {estimate ? (
            <dl className="flex flex-1 flex-wrap items-center gap-x-5 gap-y-1 text-sm" aria-live="polite">
              <div className="flex gap-1.5">
                <dt className="text-ink-3">{t('transport.col.distance')}</dt>
                <dd className="font-semibold tabular-nums text-ink">{t('transport.km', { n: estimate.distanceKm })}</dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="text-ink-3">{t('transport.col.sessions')}</dt>
                <dd className="font-semibold tabular-nums text-ink">{estimate.sessionsPerMonth}</dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="text-ink-3">{t('transport.col.fee')}</dt>
                <dd className="font-bold tabular-nums text-glow-deep">{t('transport.perMonth', { amount: (estimate.monthlyFee ?? 0).toLocaleString('en-US'), cur: t('transport.syp') })}</dd>
              </div>
            </dl>
          ) : (
            <p className="flex-1 text-xs text-ink-4">{t(pos ? 'transport.enroll.calcHint' : 'transport.enroll.pinFirst')}</p>
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
