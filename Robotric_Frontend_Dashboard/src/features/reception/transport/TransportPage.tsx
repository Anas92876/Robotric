import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Bus, CalendarClock, Car, Navigation, Plus, UserPlus, Users } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/utils';
import { Button, PageHeader, StatTile } from '../../../ui';
import { useDrivers, useRiders, useTransportMutations, useTrips, type Driver, type StudentOption, type TripFilters } from './api';
import { DriverDialog } from './DriverDialog';
import { DriversTab } from './DriversTab';
import { EnrollRiderDialog } from './EnrollRiderDialog';
import { RidersTab } from './RidersTab';
import { TripDialog } from './TripDialog';
import { TripsTab } from './TripsTab';

// URL names stay as before ("students") so links from other pages keep working
type Tab = 'students' | 'drivers' | 'trips';
const TABS: Tab[] = ['students', 'drivers', 'trips'];
const pad = (n: number) => String(n).padStart(2, '0');
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Reception: the bus service — riders and their homes, drivers and their cars, and the daily trips. */
export default function TransportPage() {
  const { t } = useTranslation('dashboardReception');
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [tab, setTabState] = useState<Tab>(() => (TABS.includes(params.get('tab') as Tab) ? (params.get('tab') as Tab) : 'students'));
  const [tripFilters, setTripFilters] = useState<TripFilters>({ date: '', status: '' });

  const riders = useRiders();
  const drivers = useDrivers();
  const trips = useTrips(tripFilters);
  const todayTrips = useTrips({ date: today(), status: '' });
  const running = useTrips({ date: '', status: 'in_travel' });
  const { enroll, saveDriver, createTrip } = useTransportMutations();

  const [enrollOpen, setEnrollOpen] = useState(false);
  const [preset, setPreset] = useState<StudentOption | null>(null);
  const [driverForm, setDriverForm] = useState<{ driver: Driver | null } | null>(null);
  const [lastDriver, setLastDriver] = useState<Driver | null>(null);
  const [tripOpen, setTripOpen] = useState(false);

  const setTab = (next: Tab) => {
    setTabState(next);
    const p = new URLSearchParams(params);
    p.set('tab', next);
    setParams(p, { replace: true });
  };

  // Arrived from Enrollments with a student to seat: open the form once, then clean the URL
  useEffect(() => {
    const id = params.get('enrollStudentId');
    if (!id) return;
    setPreset({ _id: id, name: params.get('enrollStudentName') || t('transport.enroll.chosenStudent'), email: params.get('enrollStudentEmail') ?? '' });
    setEnrollOpen(true);
    const p = new URLSearchParams(params);
    ['enrollStudentId', 'enrollStudentName', 'enrollStudentEmail', 'enrollmentId'].forEach((k) => p.delete(k));
    setParams(p, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openEnroll = () => { setPreset(null); setEnrollOpen(true); };
  const openDriver = useCallback((driver: Driver | null) => { setLastDriver(driver); setDriverForm({ driver }); }, []);

  const action = {
    students: <Button icon={<UserPlus />} onClick={openEnroll}>{t('transport.enrollRider')}</Button>,
    drivers: <Button icon={<Plus />} onClick={() => openDriver(null)}>{t('transport.addDriver')}</Button>,
    trips: <Button icon={<Plus />} onClick={() => setTripOpen(true)}>{t('transport.newTrip')}</Button>,
  }[tab];

  const riderList = riders.data ?? [];
  const driverList = drivers.data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title={t('transport.title')} description={t('transport.subtitle')} actions={action} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile icon={<Users />} tint="bg-tint-leaf" label={t('transport.tabs.students')} value={riderList.length} loading={riders.isLoading} onClick={() => setTab('students')} active={tab === 'students'} />
        <StatTile icon={<Car />} tint="bg-tint-straw" label={t('transport.tabs.drivers')} value={driverList.length} loading={drivers.isLoading} onClick={() => setTab('drivers')} active={tab === 'drivers'} />
        <StatTile
          icon={<CalendarClock />}
          tint="bg-tint-sage"
          label={t('transport.tripsToday')}
          value={todayTrips.data?.length}
          loading={todayTrips.isLoading}
          onClick={() => { setTab('trips'); setTripFilters({ date: today(), status: '' }); }}
          active={tab === 'trips' && tripFilters.date === today() && !tripFilters.status}
        />
        <StatTile
          icon={<Navigation />}
          tint="bg-tint-khaki"
          label={t('transport.onTheRoad')}
          value={running.data?.length}
          loading={running.isLoading}
          onClick={() => { setTab('trips'); setTripFilters({ date: '', status: 'in_travel' }); }}
          active={tab === 'trips' && tripFilters.status === 'in_travel' && !tripFilters.date}
        />
      </div>

      <div role="tablist" aria-label={t('transport.title')} className="flex w-fit items-center gap-0.5 rounded-pill border border-line bg-rail p-1">
        {TABS.map((k) => (
          <button key={k} id={`tab-${k}`} role="tab" type="button" aria-selected={tab === k} aria-controls={`panel-${k}`} onClick={() => setTab(k)} className={cn('h-9 rounded-pill px-4 text-sm font-medium transition-colors focus-visible:focus-ring', tab === k ? 'bg-ink text-white' : 'text-ink-3 hover:text-ink')}>
            {t(`transport.tabs.${k}`)}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'students' && <RidersTab riders={riderList} drivers={driverList} loading={riders.isLoading} emptyAction={action} />}
        {tab === 'drivers' && <DriversTab drivers={driverList} loading={drivers.isLoading} onEdit={openDriver} emptyAction={action} />}
        {tab === 'trips' && <TripsTab trips={trips.data ?? []} loading={trips.isLoading} filters={tripFilters} onFilters={setTripFilters} emptyAction={<Button icon={<Bus />} onClick={() => setTripOpen(true)}>{t('transport.newTrip')}</Button>} />}
      </div>

      <EnrollRiderDialog
        open={enrollOpen}
        onClose={() => setEnrollOpen(false)}
        drivers={driverList}
        preset={preset}
        seated={new Set(riderList.map((r) => r.studentId?._id))}
        saving={enroll.isPending}
        onSave={async (d) => {
          const res = (await enroll.mutateAsync(d)) as { warning?: string } | undefined;
          toast.success(t('transport.toast.enrolled'));
          if (res?.warning) toast.warning(t('transport.toast.defaultSessions'));
          setEnrollOpen(false);
          setTab('students');
        }}
      />
      <DriverDialog
        open={!!driverForm}
        onClose={() => setDriverForm(null)}
        driver={driverForm ? driverForm.driver : lastDriver}
        saving={saveDriver.isPending}
        onSave={async (d) => {
          const id = driverForm?.driver?._id;
          await saveDriver.mutateAsync({ id, d });
          toast.success(t(id ? 'transport.toast.driverSaved' : 'transport.toast.driverAdded'));
          setDriverForm(null);
        }}
      />
      <TripDialog
        open={tripOpen}
        onClose={() => setTripOpen(false)}
        drivers={driverList}
        riders={riderList}
        saving={createTrip.isPending}
        onSave={async (d) => {
          await createTrip.mutateAsync(d);
          toast.success(t('transport.toast.tripCreated'));
          setTripOpen(false);
        }}
      />
    </div>
  );
}
