import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlarmClock, Ban, CalendarX2, CreditCard, Pencil, Plus, XCircle } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import UserSubscriptionModal from '../../../components/reception/UserSubscriptionModal';
import { api } from '../../../lib/api';
import { cancelUserSubscription, createUserSubscription, getActiveSubscriptionPlans, getUserSubscriptions, updateUserSubscription, type UserSubscription } from '../../../services/subscription.service';
import { cn } from '../../../lib/utils';
import { useFormat } from '../../../app/format';
import { readApiError } from '../../../app/apiError';
import { Badge, Button, ConfirmDialog, DataTable, EmptyState, PageHeader, Panel, RowMenu, SearchInput, StatTile, type BadgeTone, type Column } from '../../../ui';

type Status = UserSubscription['status'];
type View = Status | 'ending' | '';
const ROOT = ['reception', 'subscriptions'] as const;
const TONE: Record<Status, BadgeTone> = { active: 'success', expired: 'neutral', canceled: 'danger' };
const WEEK = 7 * 864e5;
const studentOf = (s: UserSubscription) => (typeof s.userId === 'object' ? s.userId : null);
const planOf = (s: UserSubscription) => (typeof s.planId === 'object' ? s.planId : null);
const endingSoon = (s: UserSubscription) => s.status === 'active' && new Date(s.endsAt).getTime() - Date.now() < WEEK;

/** Every student account (all pages): the assign form must be able to find anyone, not just the first 20. */
async function allStudents() {
  const out: { _id: string; name: string; email: string; role: string }[] = [];
  for (let page = 1; page < 50; page++) {
    const res = await api.get(`/reception/users?role=student&status=active&limit=200&page=${page}`);
    out.push(...(res.data.data ?? []));
    if (page >= (res.data.pagination?.pages ?? 1)) break;
  }
  return out;
}

/** Reception: monthly hour packages of students (used to book private sessions). */
export default function SubscriptionsPage() {
  const { t } = useTranslation('dashboardReception');
  const f = useFormat();
  const toast = useToast();
  const qc = useQueryClient();
  const subs = useQuery({ queryKey: [...ROOT, 'list'], queryFn: () => getUserSubscriptions(), staleTime: 30_000 });
  const plans = useQuery({ queryKey: [...ROOT, 'plans'], queryFn: getActiveSubscriptionPlans, staleTime: 5 * 60_000 });
  const [formOpen, setFormOpen] = useState(false);
  const students = useQuery({ queryKey: ['reception', 'students', 'all'], queryFn: allStudents, enabled: formOpen, staleTime: 60_000 });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ROOT });
    void qc.invalidateQueries({ queryKey: ['reception', 'sessions'] });
  };
  const save = useMutation({
    mutationFn: ({ id, data }: { id?: string; data: Parameters<typeof createUserSubscription>[0] }) => (id ? updateUserSubscription(id, data) : createUserSubscription(data)),
    onSuccess: refresh,
  });
  const cancel = useMutation({ mutationFn: (id: string) => cancelUserSubscription(id), onSuccess: refresh });

  const [view, setView] = useState<View>('active');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<UserSubscription | null>(null);
  const [canceling, setCanceling] = useState<UserSubscription | null>(null);
  const lastCanceling = useRef<UserSubscription | null>(null);
  if (canceling) lastCanceling.current = canceling;
  const shownCancel = canceling ?? lastCanceling.current;

  const all = subs.data ?? [];
  const q = search.trim().toLowerCase();
  const rows = all
    .filter((s) => (view === 'ending' ? endingSoon(s) : !view || s.status === view))
    .filter((s) => !q || studentOf(s)?.name.toLowerCase().includes(q) || studentOf(s)?.email.toLowerCase().includes(q) || planOf(s)?.name.toLowerCase().includes(q))
    .sort((a, b) => +new Date(a.endsAt) - +new Date(b.endsAt));

  const columns: Column<UserSubscription>[] = useMemo(
    () => [
      {
        key: 'student',
        header: t('subs.col.student'),
        cell: (s) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{studentOf(s)?.name ?? t('enrollments.unknownStudent')}</p>
            <p className="truncate text-xs text-ink-4" dir="ltr">
              {studentOf(s)?.email}
            </p>
          </div>
        ),
      },
      {
        key: 'plan',
        header: t('subs.col.plan'),
        cell: (s) => (
          <div>
            <p className="text-ink">{planOf(s)?.name ?? '—'}</p>
            {planOf(s) && <p className="text-xs text-ink-4">{t('subs.perMonth', { hours: planOf(s)!.monthlyHours, price: f.money(planOf(s)!.price) })}</p>}
          </div>
        ),
      },
      {
        key: 'hours',
        header: t('subs.col.hoursLeft'),
        cell: (s) => {
          const total = planOf(s)?.monthlyHours ?? s.remainingHours;
          const pct = total > 0 ? Math.min(100, (s.remainingHours / total) * 100) : 0;
          return (
            <div className="min-w-28">
              <p className="text-sm font-semibold tabular-nums text-ink">
                {s.remainingHours} <span className="text-xs font-normal text-ink-4">/ {total}</span>
              </p>
              <div className="mt-1 h-1.5 overflow-hidden rounded-pill bg-rail">
                <span className={cn('block h-full', s.remainingHours <= 1 ? 'bg-danger' : 'bg-glow')} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        },
      },
      {
        key: 'period',
        header: t('subs.col.period'),
        hideOnMobile: true,
        cell: (s) => (
          <div className="tabular-nums">
            <p className="text-ink-2">
              {f.date(s.startsAt)} → {f.date(s.endsAt)}
            </p>
            {endingSoon(s) && <p className="text-xs font-medium text-warning">{t('subs.endsSoon')}</p>}
          </div>
        ),
      },
      { key: 'status', header: t('subs.col.status'), cell: (s) => <Badge tone={TONE[s.status]}>{t(`subs.status.${s.status}`)}</Badge> },
      {
        key: 'actions',
        header: <span className="sr-only">{t('subs.col.actions')}</span>,
        align: 'end',
        cell: (s) => (
          <RowMenu
            label={t('subs.actionsFor', { name: studentOf(s)?.name ?? '' })}
            actions={[
              { label: t('subs.edit'), icon: <Pencil />, onClick: () => { setEditing(s); setFormOpen(true); }, hidden: s.status !== 'active' },
              { label: t('subs.cancel'), icon: <Ban />, tone: 'danger', onClick: () => setCanceling(s), hidden: s.status !== 'active' },
            ]}
          />
        ),
      },
    ],
     
    [t, f],
  );

  const tile = (v: View) => ({ onClick: () => setView(v), active: view === v });

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('subs.title')}
        description={t('subs.subtitle')}
        actions={
          <Button icon={<Plus />} onClick={() => { setEditing(null); setFormOpen(true); }}>
            {t('subs.assign')}
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile icon={<CreditCard />} tint="bg-tint-leaf" label={t('subs.status.active')} value={all.filter((s) => s.status === 'active').length} loading={subs.isLoading} {...tile('active')} />
        <StatTile icon={<AlarmClock />} tint="bg-tint-straw" label={t('subs.endingSoon')} value={all.filter(endingSoon).length} loading={subs.isLoading} {...tile('ending')} />
        <StatTile icon={<CalendarX2 />} tint="bg-tint-sand" label={t('subs.status.expired')} value={all.filter((s) => s.status === 'expired').length} loading={subs.isLoading} {...tile('expired')} />
        <StatTile icon={<XCircle />} tint="bg-tint-khaki" label={t('subs.status.canceled')} value={all.filter((s) => s.status === 'canceled').length} loading={subs.isLoading} {...tile('canceled')} />
      </div>

      <Panel className="p-0 sm:p-0">
        <div className="border-b border-line p-4">
          <SearchInput value={search} onChange={setSearch} placeholder={t('subs.search')} />
        </div>
        {subs.isError ? (
          <EmptyState icon={<CreditCard />} title={t('subs.loadError')} action={<Button variant="secondary" onClick={() => void subs.refetch()}>{t('leads.retry')}</Button>} />
        ) : (
          <DataTable
            label={t('subs.title')}
            columns={columns}
            rows={rows}
            rowKey={(s) => s._id}
            loading={subs.isLoading}
            empty={<EmptyState icon={<CreditCard />} title={t('subs.none')} action={view === 'active' && !search ? <Button icon={<Plus />} onClick={() => { setEditing(null); setFormOpen(true); }}>{t('subs.assign')}</Button> : undefined} />}
          />
        )}
      </Panel>

      {formOpen && (
        <UserSubscriptionModal
          isOpen
          onClose={() => setFormOpen(false)}
          subscription={editing}
          activePlans={plans.data ?? []}
          users={(students.data ?? []) as never[]}
          isSubmitting={save.isPending}
          onSubmit={async (data) => {
            try {
              await save.mutateAsync({ id: editing?._id, data: data as Parameters<typeof createUserSubscription>[0] });
              toast.success(t(editing ? 'subs.toast.saved' : 'subs.toast.assigned'));
              setFormOpen(false);
            } catch (err) {
              toast.error(t('enrollments.errorTitle'), readApiError(err).message);
            }
          }}
        />
      )}
      <ConfirmDialog
        open={!!canceling}
        onClose={() => setCanceling(null)}
        tone="danger"
        loading={cancel.isPending}
        title={t('subs.cancelTitle')}
        message={shownCancel ? t('subs.cancelText', { name: studentOf(shownCancel)?.name ?? '', hours: shownCancel.remainingHours }) : ''}
        confirmLabel={t('subs.cancel')}
        cancelLabel={t('enrollments.cancel')}
        onConfirm={() =>
          void cancel
            .mutateAsync(canceling!._id)
            .then(() => toast.success(t('subs.toast.canceled')))
            .catch((err) => toast.error(t('enrollments.errorTitle'), readApiError(err).message))
            .finally(() => setCanceling(null))
        }
      />
    </div>
  );
}
