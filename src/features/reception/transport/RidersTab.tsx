import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Phone, UserMinus, Users } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { readApiError } from '../../../app/apiError';
import { ConfirmDialog, DataTable, EmptyState, Panel, RowMenu, SearchInput, SelectInput, type Column } from '../../../ui';
import { idOf, nameOf, useTransportMutations, type Driver, type Rider } from './api';

interface Props {
  riders: Rider[];
  drivers: Driver[];
  loading: boolean;
  /** Empty-state button: opens the enroll form. */
  emptyAction: React.ReactNode;
}

/** Students who ride with a driver: where they live, their driver and monthly fee. */
export function RidersTab({ riders, drivers, loading, emptyAction }: Props) {
  const { t } = useTranslation('dashboardReception');
  const toast = useToast();
  const { removeRider } = useTransportMutations();
  const [search, setSearch] = useState('');
  const [driver, setDriver] = useState('');
  const [removing, setRemoving] = useState<Rider | null>(null);
  const lastRemoving = useRef<Rider | null>(null);
  if (removing) lastRemoving.current = removing;

  const q = search.trim().toLowerCase();
  const rows = riders
    .filter((r) => !driver || idOf(r.driverId) === driver)
    .filter((r) => !q || r.studentId?.name?.toLowerCase().includes(q) || (r.homeAddress ?? '').toLowerCase().includes(q) || (r.phoneNumber ?? '').includes(q));

  const columns: Column<Rider>[] = useMemo(
    () => [
      {
        key: 'student',
        header: t('transport.col.student'),
        cell: (r) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{r.studentId?.name ?? t('enrollments.unknownStudent')}</p>
            {r.phoneNumber && (
              <a href={`tel:${r.phoneNumber}`} className="inline-flex items-center gap-1 text-xs text-ink-4 hover:text-ink" dir="ltr">
                <Phone className="size-3" aria-hidden />
                {r.phoneNumber}
              </a>
            )}
          </div>
        ),
      },
      { key: 'driver', header: t('transport.col.driver'), cell: (r) => <span className="text-ink-2">{nameOf(r.driverId) || '—'}</span> },
      {
        key: 'home',
        header: t('transport.col.home'),
        hideOnMobile: true,
        cell: (r) => (
          <div className="max-w-64">
            <p className="truncate text-ink-2" title={r.homeAddress ?? ''}>
              {r.homeAddress || '—'}
            </p>
            {r.homeLocation?.lat != null && (
              <a href={`https://www.google.com/maps?q=${r.homeLocation.lat},${r.homeLocation.lng}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-ink underline-offset-2 hover:underline">
                <MapPin className="size-3" aria-hidden />
                {t('transport.map.open')}
              </a>
            )}
          </div>
        ),
      },
      { key: 'distance', header: t('transport.col.distance'), hideOnMobile: true, cell: (r) => <span className="tabular-nums text-ink-2">{t('transport.km', { n: r.distanceKm ?? 0 })}</span> },
      { key: 'sessions', header: t('transport.col.sessions'), hideOnMobile: true, cell: (r) => <span className="tabular-nums text-ink-2">{r.sessionsPerMonth}</span> },
      {
        key: 'fee',
        header: t('transport.col.fee'),
        cell: (r) => (
          <span className="whitespace-nowrap font-semibold tabular-nums text-ink">
            {(r.monthlyFee ?? 0).toLocaleString('en-US')} <span className="text-xs font-normal text-ink-4">{t('transport.syp')}</span>
          </span>
        ),
      },
      {
        key: 'actions',
        header: <span className="sr-only">{t('subs.col.actions')}</span>,
        align: 'end',
        cell: (r) => (
          <RowMenu
            label={t('transport.actionsFor', { name: r.studentId?.name ?? '' })}
            actions={[{ label: t('transport.removeRider'), icon: <UserMinus />, tone: 'danger', onClick: () => setRemoving(r) }]}
          />
        ),
      },
    ],
    [t],
  );

  const shown = removing ?? lastRemoving.current;
  return (
    <Panel className="p-0 sm:p-0">
      <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <div className="min-w-56 flex-1">
          <SearchInput value={search} onChange={setSearch} placeholder={t('transport.searchRiders')} />
        </div>
        <SelectInput aria-label={t('transport.col.driver')} value={driver} onChange={(e) => setDriver(e.target.value)} className="w-auto min-w-44">
          <option value="">{t('transport.allDrivers')}</option>
          {drivers.map((d) => (
            <option key={d._id} value={d._id}>
              {d.name}
            </option>
          ))}
        </SelectInput>
      </div>
      <DataTable
        label={t('transport.tabs.riders')}
        columns={columns}
        rows={rows}
        rowKey={(r) => r._id}
        loading={loading}
        empty={<EmptyState icon={<Users />} title={t(riders.length ? 'transport.noMatch' : 'transport.noRiders')} action={riders.length ? undefined : emptyAction} />}
      />
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        tone="danger"
        loading={removeRider.isPending}
        title={t('transport.removeTitle')}
        message={t('transport.removeText', { name: shown?.studentId?.name ?? '', driver: nameOf(shown?.driverId) })}
        confirmLabel={t('transport.removeRider')}
        cancelLabel={t('enrollments.cancel')}
        onConfirm={() =>
          void removeRider
            .mutateAsync(removing!._id)
            .then(() => toast.success(t('transport.toast.removed')))
            .catch((err) => toast.error(t('enrollments.errorTitle'), readApiError(err).message))
            .finally(() => setRemoving(null))
        }
      />
    </Panel>
  );
}
