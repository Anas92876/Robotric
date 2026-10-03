import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Ban, Bus, CheckCircle2, Eye, Phone, Play, Trash2 } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { useFormat } from '../../../app/format';
import { readApiError } from '../../../app/apiError';
import { Badge, Button, ConfirmDialog, DataTable, Dialog, EmptyState, Field, Panel, RowMenu, SelectInput, TextArea, TextInput, type BadgeTone, type Column } from '../../../ui';
import { nameOf, useTransportMutations, type Trip, type TripFilters, type TripStatus } from './api';

export const TRIP_TONE: Record<TripStatus, BadgeTone> = { scheduled: 'info', in_travel: 'warning', completed: 'success', cancelled: 'danger' };
const RIDER_TONE: Record<string, BadgeTone> = { pending: 'neutral', picked: 'success', absent: 'danger', dropped: 'info' };

interface Props {
  trips: Trip[];
  loading: boolean;
  filters: TripFilters;
  onFilters: (f: TripFilters) => void;
  emptyAction: React.ReactNode;
}

type Pending = { trip: Trip; action: 'start' | 'complete' | 'delete' };

/** Planned, running and past trips; reception can start, finish, cancel or delete them by hand. */
export function TripsTab({ trips, loading, filters, onFilters, emptyAction }: Props) {
  const { t } = useTranslation('dashboardReception');
  const f = useFormat();
  const toast = useToast();
  const { updateTrip, removeTrip } = useTransportMutations();
  const [open, setOpen] = useState<Trip | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [canceling, setCanceling] = useState<Trip | null>(null);
  const [reason, setReason] = useState('');
  const lastOpen = useRef<Trip | null>(null);
  const lastPending = useRef<Pending | null>(null);
  if (open) lastOpen.current = open;
  if (pending) lastPending.current = pending;
  const shownTrip = open ?? lastOpen.current;
  const shownPending = pending ?? lastPending.current;

  const fail = (err: unknown) => toast.error(t('enrollments.errorTitle'), readApiError(err).message);
  const when = (tr: Trip) => `${f.custom(tr.date, { weekday: 'short', day: 'numeric', month: 'short' })} · ${f.time(tr.date)}`;

  const columns: Column<Trip>[] = useMemo(
    () => [
      {
        key: 'when',
        header: t('transport.col.when'),
        cell: (tr) => (
          <div>
            <p className="whitespace-nowrap font-medium tabular-nums text-ink">{when(tr)}</p>
            <p className="text-xs text-ink-4">
              {t(`transport.dir.${tr.direction}`)}
              {tr.isExtra && <span className="ms-1.5 font-medium text-warning">· {t('transport.trip.extraShort')}</span>}
            </p>
          </div>
        ),
      },
      { key: 'driver', header: t('transport.col.driver'), cell: (tr) => <span className="text-ink-2">{nameOf(tr.driverId as { name: string }) || '—'}</span> },
      { key: 'riders', header: t('transport.col.riders'), hideOnMobile: true, cell: (tr) => <span className="tabular-nums text-ink-2">{tr.studentsSnapshot.length}</span> },
      {
        key: 'earnings',
        header: t('transport.col.earnings'),
        hideOnMobile: true,
        cell: (tr) => (tr.driverEarnings ? <span className="whitespace-nowrap tabular-nums text-ink-2">{tr.driverEarnings.toLocaleString('en-US')} <span className="text-xs text-ink-4">{t('transport.syp')}</span></span> : <span className="text-ink-4">—</span>),
      },
      { key: 'status', header: t('transport.col.status'), cell: (tr) => <Badge tone={TRIP_TONE[tr.status]}>{t(`transport.status.${tr.status}`)}</Badge> },
      {
        key: 'actions',
        header: <span className="sr-only">{t('subs.col.actions')}</span>,
        align: 'end',
        cell: (tr) => (
          <RowMenu
            label={t('transport.actionsFor', { name: when(tr) })}
            actions={[
              { label: t('transport.trip.details'), icon: <Eye />, onClick: () => setOpen(tr) },
              { label: t('transport.trip.start'), icon: <Play />, onClick: () => setPending({ trip: tr, action: 'start' }), hidden: tr.status !== 'scheduled' },
              { label: t('transport.trip.complete'), icon: <CheckCircle2 />, onClick: () => setPending({ trip: tr, action: 'complete' }), hidden: tr.status !== 'in_travel' },
              { label: t('transport.trip.cancel'), icon: <Ban />, tone: 'danger', onClick: () => { setReason(''); setCanceling(tr); }, hidden: tr.status !== 'scheduled' && tr.status !== 'in_travel' },
              { label: t('transport.trip.delete'), icon: <Trash2 />, tone: 'danger', onClick: () => setPending({ trip: tr, action: 'delete' }), hidden: tr.status === 'in_travel' },
            ]}
          />
        ),
      },
    ],
    [t, f], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const runPending = () => {
    const p = pending!;
    const job = p.action === 'delete' ? removeTrip.mutateAsync(p.trip._id) : updateTrip.mutateAsync({ id: p.trip._id, d: { status: p.action === 'start' ? 'in_travel' : 'completed' } });
    void job
      .then(() => toast.success(t(`transport.toast.trip_${p.action}`)))
      .catch(fail)
      .finally(() => setPending(null));
  };

  return (
    <Panel className="p-0 sm:p-0">
      <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <TextInput type="date" aria-label={t('transport.trip.filterDate')} value={filters.date} onChange={(e) => onFilters({ ...filters, date: e.target.value })} className="h-10 w-auto" />
        <SelectInput aria-label={t('transport.col.status')} value={filters.status} onChange={(e) => onFilters({ ...filters, status: e.target.value as TripFilters['status'] })} className="h-10 w-full sm:w-auto sm:min-w-40">
          <option value="">{t('enrollments.anyStatus')}</option>
          {(['scheduled', 'in_travel', 'completed', 'cancelled'] as const).map((s) => (
            <option key={s} value={s}>
              {t(`transport.status.${s}`)}
            </option>
          ))}
        </SelectInput>
        {(filters.date || filters.status) && (
          <button type="button" onClick={() => onFilters({ date: '', status: '' })} className="rounded-md text-sm font-medium text-ink underline underline-offset-2 focus-visible:focus-ring">
            {t('enrollments.clearFilters')}
          </button>
        )}
      </div>
      <DataTable
        label={t('transport.tabs.trips')}
        columns={columns}
        rows={trips}
        rowKey={(tr) => tr._id}
        loading={loading}
        empty={<EmptyState icon={<Bus />} title={t(filters.date || filters.status ? 'transport.noMatch' : 'transport.noTrips')} action={filters.date || filters.status ? undefined : emptyAction} />}
      />

      <Dialog open={!!open} onClose={() => setOpen(null)} size="lg" title={shownTrip ? `${t(`transport.dir.${shownTrip.direction}`)} · ${when(shownTrip)}` : ''} description={shownTrip ? nameOf(shownTrip.driverId as { name: string }) : ''} closeLabel={t('enrollments.cancel')}>
        {shownTrip && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={TRIP_TONE[shownTrip.status]}>{t(`transport.status.${shownTrip.status}`)}</Badge>
              {shownTrip.isExtra && <Badge tone="warning">{t('transport.trip.extraShort')}{shownTrip.extraCharge ? ` · ${shownTrip.extraCharge.toLocaleString('en-US')} ${t('transport.syp')}` : ''}</Badge>}
              {!!shownTrip.driverEarnings && <span className="text-xs text-ink-3">{t('transport.trip.earned', { amount: shownTrip.driverEarnings.toLocaleString('en-US'), cur: t('transport.syp') })}</span>}
            </div>
            {shownTrip.studentsSnapshot.length === 0 ? (
              <p className="text-ink-4">{t('transport.trip.empty')}</p>
            ) : (
              <ol className="divide-y divide-line rounded-input border border-line">
                {[...shownTrip.studentsSnapshot]
                  .sort((a, b) => a.pickupOrder - b.pickupOrder)
                  .map((s) => {
                    const st = shownTrip.studentStatuses?.find((x) => String(x.studentId) === String(s.studentId))?.status ?? 'pending';
                    return (
                      <li key={String(s.studentId)} className="flex items-center gap-3 px-3 py-2">
                        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink text-xs font-semibold tabular-nums text-white">{s.pickupOrder}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-ink">{s.studentName}</span>
                          {s.homeAddress && <span className="block truncate text-xs text-ink-4">{s.homeAddress}</span>}
                        </span>
                        {s.phoneNumber && (
                          <a href={`tel:${s.phoneNumber}`} aria-label={t('transport.call', { name: s.studentName })} className="grid size-8 place-items-center rounded-full text-ink-3 hover:bg-ink/5 hover:text-ink">
                            <Phone className="size-4" />
                          </a>
                        )}
                        <Badge tone={RIDER_TONE[st] ?? 'neutral'}>{t(`transport.rider.${st}`, { defaultValue: st })}</Badge>
                      </li>
                    );
                  })}
              </ol>
            )}
            {shownTrip.notes && (
              <p className="text-ink-2">
                <span className="text-xs font-medium text-ink-3">{t('cal.notes')}: </span>
                {shownTrip.notes}
              </p>
            )}
            {shownTrip.status === 'cancelled' && shownTrip.cancellationReason && (
              <p className="rounded-input bg-danger-soft px-3 py-2 text-danger">{t('transport.trip.reasonWas', { reason: shownTrip.cancellationReason })}</p>
            )}
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        tone={shownPending?.action === 'delete' ? 'danger' : undefined}
        loading={updateTrip.isPending || removeTrip.isPending}
        title={t(`transport.trip.${shownPending?.action ?? 'start'}Title`)}
        message={t(`transport.trip.${shownPending?.action ?? 'start'}Text`)}
        confirmLabel={t(`transport.trip.${shownPending?.action ?? 'start'}`)}
        cancelLabel={t('enrollments.cancel')}
        onConfirm={runPending}
      />

      <Dialog
        open={!!canceling}
        onClose={() => setCanceling(null)}
        title={t('transport.trip.cancelTitle')}
        description={t('transport.trip.cancelText')}
        closeLabel={t('enrollments.cancel')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCanceling(null)}>
              {t('transport.trip.keep')}
            </Button>
            <Button
              variant="danger"
              loading={updateTrip.isPending}
              onClick={() =>
                void updateTrip
                  .mutateAsync({ id: canceling!._id, d: { status: 'cancelled', cancellationReason: reason.trim() } })
                  .then(() => { toast.success(t('transport.toast.trip_cancel')); setCanceling(null); })
                  .catch(fail)
              }
            >
              {t('transport.trip.cancel')}
            </Button>
          </>
        }
      >
        <Field label={t('transport.trip.reason')}>{(c) => <TextArea {...c} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />}</Field>
      </Dialog>
    </Panel>
  );
}
