import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Car, Pencil, Phone, Trash2 } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { readApiError } from '../../../app/apiError';
import { cn } from '../../../lib/utils';
import { ConfirmDialog, DataTable, EmptyState, Panel, RowMenu, type Column } from '../../../ui';
import { useTransportMutations, type Driver } from './api';

interface Props {
  drivers: Driver[];
  loading: boolean;
  onEdit: (d: Driver) => void;
  emptyAction: React.ReactNode;
}

/** The drivers, their car and how full it is. */
export function DriversTab({ drivers, loading, onEdit, emptyAction }: Props) {
  const { t } = useTranslation('dashboardReception');
  const toast = useToast();
  const { removeDriver } = useTransportMutations();
  const [deleting, setDeleting] = useState<Driver | null>(null);
  const lastDeleting = useRef<Driver | null>(null);
  if (deleting) lastDeleting.current = deleting;

  const columns: Column<Driver>[] = useMemo(
    () => [
      {
        key: 'driver',
        header: t('transport.col.driver'),
        cell: (d) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{d.name}</p>
            <p className="truncate text-xs text-ink-4" dir="ltr">
              {d.email}
            </p>
          </div>
        ),
      },
      {
        key: 'phone',
        header: t('transport.driver.phone'),
        hideOnMobile: true,
        cell: (d) =>
          d.profile_data?.phoneNumber ? (
            <a href={`tel:${d.profile_data.phoneNumber}`} className="inline-flex items-center gap-1 text-ink-2 hover:text-ink" dir="ltr">
              <Phone className="size-3.5 text-ink-4" aria-hidden />
              {d.profile_data.phoneNumber}
            </a>
          ) : (
            <span className="text-ink-4">—</span>
          ),
      },
      {
        key: 'car',
        header: t('transport.col.car'),
        hideOnMobile: true,
        cell: (d) => {
          const p = d.profile_data;
          const car = [p?.vehicleColor, p?.vehicleModel].filter(Boolean).join(' · ');
          return (
            <div>
              <p className="text-ink-2">{car || '—'}</p>
              {p?.vehiclePlate && (
                <p className="text-xs text-ink-4" dir="ltr">
                  {p.vehiclePlate}
                </p>
              )}
            </div>
          );
        },
      },
      {
        key: 'seats',
        header: t('transport.col.seats'),
        cell: (d) => {
          const pct = d.capacity > 0 ? Math.min(100, (d.studentCount / d.capacity) * 100) : 0;
          const full = d.studentCount >= d.capacity;
          return (
            <div className="min-w-28">
              <p className="text-sm font-semibold tabular-nums text-ink">
                {d.studentCount} <span className="text-xs font-normal text-ink-4">/ {d.capacity}</span>
                {full && <span className="ms-2 text-xs font-medium text-warning">{t('transport.full')}</span>}
              </p>
              <div className="mt-1 h-1.5 overflow-hidden rounded-pill bg-rail">
                <span className={cn('block h-full', full ? 'bg-warning' : 'bg-glow')} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        },
      },
      {
        key: 'actions',
        header: <span className="sr-only">{t('subs.col.actions')}</span>,
        align: 'end',
        cell: (d) => (
          <RowMenu
            label={t('transport.actionsFor', { name: d.name })}
            actions={[
              { label: t('cal.edit'), icon: <Pencil />, onClick: () => onEdit(d) },
              { label: t('transport.driver.delete'), icon: <Trash2 />, tone: 'danger', onClick: () => setDeleting(d) },
            ]}
          />
        ),
      },
    ],
    [t, onEdit],
  );

  const shown = deleting ?? lastDeleting.current;
  return (
    <Panel className="p-0 sm:p-0">
      <DataTable label={t('transport.tabs.drivers')} columns={columns} rows={drivers} rowKey={(d) => d._id} loading={loading} empty={<EmptyState icon={<Car />} title={t('transport.noDrivers')} action={emptyAction} />} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        tone="danger"
        loading={removeDriver.isPending}
        title={t('transport.driver.deleteTitle')}
        message={shown && shown.studentCount > 0 ? t('transport.driver.hasRiders', { name: shown.name, count: shown.studentCount }) : t('transport.driver.deleteText', { name: shown?.name ?? '' })}
        confirmLabel={t('transport.driver.delete')}
        cancelLabel={t('enrollments.cancel')}
        onConfirm={() =>
          void removeDriver
            .mutateAsync(deleting!._id)
            .then(() => toast.success(t('transport.toast.driverDeleted')))
            .catch((err) => toast.error(t('transport.driver.cantDelete'), readApiError(err).message))
            .finally(() => setDeleting(null))
        }
      />
    </Panel>
  );
}
