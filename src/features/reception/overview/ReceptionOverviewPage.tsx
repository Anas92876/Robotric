import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, BookOpen, GraduationCap, Plus, RefreshCw, Users, UsersRound } from 'lucide-react';
import { useAuth } from '../../../providers';
import { cn } from '../../../lib/utils';
import { useFormat } from '../../../app/format';
import { Panel, PanelTitle } from '../../../ui';
import { useEvents, useLeadStats, useOverviewStats, usePendingSessionRequests, usePendingTransport, useRecentEnrollments, type LeadStats, type RecentEnrollment } from './api';
import { WelcomeBanner } from './WelcomeBanner';
import { CalendarCard } from './CalendarCard';
import { ConversionGauge } from './ConversionGauge';

/** Reception home: greeting, headline numbers, calendar, recent enrollments and what needs attention. */
export default function ReceptionOverviewPage() {
  const { t } = useTranslation('dashboardReception');
  const { user } = useAuth();
  const stats = useOverviewStats();
  const recent = useRecentEnrollments(6);
  const leads = useLeadStats();
  const events = useEvents();

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-5">
        <WelcomeBanner name={user?.name ?? ''} />

        {stats.isError && (
          <div className="flex items-center justify-between gap-3 rounded-card bg-danger-soft px-4 py-3 text-sm text-danger">
            {t('overview.loadError')}
            <button type="button" onClick={() => void stats.refetch()} className="inline-flex items-center gap-1.5 font-medium hover:underline">
              <RefreshCw className="size-4" aria-hidden />
              {t('overview.retry')}
            </button>
          </div>
        )}

        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-4 rounded-panel border border-line p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile icon={<GraduationCap />} tint="bg-tint-leaf" label={t('overview.students')} value={stats.data?.totalStudents} loading={stats.isLoading} to="/reception/users" />
              <StatTile icon={<Users />} tint="bg-tint-straw" label={t('overview.trainers')} value={stats.data?.totalTrainers} loading={stats.isLoading} to="/reception/users" />
              <StatTile icon={<BookOpen />} tint="bg-tint-sage" label={t('overview.enrollments')} value={stats.data?.totalEnrollments} loading={stats.isLoading} to="/reception/enrollments" />
              <StatTile icon={<UsersRound />} tint="bg-tint-sand" label={t('overview.activeGroups')} value={stats.data?.activeGroups} loading={stats.isLoading} />
            </div>
            <LatestEnrollment enrollment={recent.data?.[0]} loading={recent.isLoading} />
            <LeadsPipeline stats={leads.data} loading={leads.isLoading} />
          </div>
          <div className="rounded-panel border border-line p-4">
            <CalendarCard events={events.data ?? []} loading={events.isLoading} />
          </div>
        </div>

        <div className="rounded-panel border border-line p-4 sm:p-5">
          <PanelTitle title={t('overview.recentEnrollments')} link={{ to: '/reception/enrollments', label: t('overview.viewAll') }} />
          <RecentEnrollmentsTable rows={recent.data ?? []} loading={recent.isLoading} />
        </div>
      </div>

      <aside className="space-y-5">
        <TodayPanel events={events.data ?? []} leads={leads.data} />
        <Panel>
          <PanelTitle title={t('overview.conversion')} />
          {leads.isLoading ? <div className="h-40 animate-pulse rounded-card bg-rail" /> : <ConversionGauge converted={leads.data?.student ?? 0} total={leads.data?.total ?? 0} />}
        </Panel>
      </aside>
    </div>
  );
}

function StatTile({ icon, tint, label, value, loading, to }: { icon: ReactNode; tint: string; label: string; value?: number; loading: boolean; to?: string }) {
  const body = (
    <>
      <span className={cn('mx-auto grid size-10 place-items-center rounded-input text-ink [&_svg]:size-5', tint)}>{icon}</span>
      {loading ? <span className="mx-auto mt-3 block h-7 w-10 animate-pulse rounded-md bg-rail" /> : <span className="mt-2 block text-2xl font-bold tabular-nums text-ink">{value ?? 0}</span>}
      <span className="mt-0.5 block text-xs text-ink-3">{label}</span>
    </>
  );
  const cls = 'block rounded-card border border-line bg-paper px-3 py-4 text-center shadow-card';
  return to ? (
    <Link to={to} className={cn(cls, 'transition-colors hover:border-ink focus-visible:focus-ring')}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** The reference's highlighted row: the newest enrollment at a glance. */
function LatestEnrollment({ enrollment, loading }: { enrollment?: RecentEnrollment; loading: boolean }) {
  const { t } = useTranslation('dashboardReception');
  const f = useFormat();
  if (loading) return <div className="h-20 animate-pulse rounded-card bg-rail" />;
  if (!enrollment) return null;
  const d = new Date(enrollment.enrolledAt);
  const name = enrollment.student?.name ?? '—';
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-card bg-tint-leaf px-4 py-3">
      <div className="text-center">
        <p className="text-xs text-ink-3">{f.custom(d, { month: 'short' })}</p>
        <p className="text-2xl font-semibold tabular-nums text-ink">{d.getDate()}</p>
      </div>
      <span className="hidden h-10 w-px bg-line-strong sm:block" aria-hidden />
      <div className="flex min-w-48 flex-1 items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-base font-semibold text-cream">{name.charAt(0).toUpperCase()}</span>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink-3">{t('overview.latestEnrollment')}</p>
          <p className="truncate font-semibold text-ink">{name}</p>
          <p className="truncate text-xs text-ink-3">{enrollment.course?.title ?? '—'}</p>
        </div>
      </div>
      {enrollment.payment && (
        <div className="ms-auto flex gap-6 text-center">
          <div>
            <p className="text-xs text-ink-3">{t('overview.paid')}</p>
            <p className="text-lg font-semibold tabular-nums text-ink">{f.money(enrollment.payment.paidAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-3">{t('overview.remaining')}</p>
            <p className="text-lg font-semibold tabular-nums text-ink">{f.money(enrollment.payment.remainingAmount)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/** Where the leads are: one flat segmented bar. */
function LeadsPipeline({ stats, loading }: { stats?: LeadStats; loading: boolean }) {
  const { t } = useTranslation('dashboardReception');
  if (loading) return <div className="h-20 animate-pulse rounded-card bg-rail" />;
  if (!stats) return null;
  const parts = [
    { key: 'interested', value: stats.interest, bar: 'bg-gold' },
    { key: 'waiting', value: stats.waiting, bar: 'bg-tint-moss' },
    { key: 'converted', value: stats.student, bar: 'bg-ink' },
    { key: 'blacklist', value: stats.blacklist, bar: 'bg-danger' },
  ];
  const total = Math.max(stats.total, 1);
  return (
    <Link to="/reception/leads" className="flex items-center gap-5 rounded-card border border-line px-4 py-3 transition-colors hover:border-ink focus-visible:focus-ring">
      <div className="shrink-0">
        <p className="text-xs text-ink-3">{t('overview.leads')}</p>
        <p className="text-2xl font-semibold tabular-nums text-ink">{stats.total}</p>
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-3">
          {parts.map((p) => (
            <span key={p.key} className="inline-flex items-center gap-1.5">
              <span className={cn('size-2 rounded-full', p.bar)} aria-hidden />
              {t(`overview.${p.key}`)} <span className="font-semibold tabular-nums text-ink">{p.value}</span>
            </span>
          ))}
        </div>
        <div className="flex h-2 overflow-hidden rounded-pill bg-rail">
          {parts.map((p) => (p.value > 0 ? <span key={p.key} className={p.bar} style={{ width: `${(p.value / total) * 100}%` }} /> : null))}
        </div>
      </div>
    </Link>
  );
}

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-ink text-white',
  completed: 'bg-gold text-ink',
  pending: 'bg-tint-straw text-ink',
  suspended: 'bg-warning-soft text-warning',
  cancelled: 'bg-danger-soft text-danger',
  dropped: 'bg-danger-soft text-danger',
};

function RecentEnrollmentsTable({ rows, loading }: { rows: RecentEnrollment[]; loading: boolean }) {
  const { t } = useTranslation('dashboardReception');
  const f = useFormat();
  const navigate = useNavigate();
  if (loading)
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-input bg-rail" />
        ))}
      </div>
    );
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-ink-4">{t('noRecentEnrollments')}</p>;

  return (
    <div className="-mx-2 overflow-x-auto">
      <table className="w-full min-w-[640px] text-start">
        <thead>
          <tr className="text-sm text-ink-3">
            <th className="px-2 pb-3 text-start font-medium">{t('overview.student')}</th>
            <th className="px-2 pb-3 text-start font-medium">{t('overview.course')}</th>
            <th className="px-2 pb-3 text-start font-medium">{t('overview.enrolled')}</th>
            <th className="px-2 pb-3 text-start font-medium">{t('overview.payment')}</th>
            <th className="px-2 pb-3 text-start font-medium">{t('overview.status')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const name = r.student?.name ?? '—';
            return (
              <tr key={r._id} onClick={() => navigate('/reception/enrollments')} className="cursor-pointer border-t border-line hover:bg-rail/60">
                <td className="px-2 py-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-tint-sage font-semibold text-ink">{name.charAt(0).toUpperCase()}</span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{name}</p>
                      <p className="truncate text-xs text-ink-4">{r.student?.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-2 py-3 text-sm text-ink-2">{r.course?.title ?? '—'}</td>
                <td className="px-2 py-3 text-sm tabular-nums text-ink-2">{f.date(r.enrolledAt)}</td>
                <td className="px-2 py-3 text-sm tabular-nums text-ink-2">
                  {r.payment ? (
                    <>
                      <span className="font-semibold text-ink">{f.money(r.payment.paidAmount)}</span> / {f.money(r.payment.totalAmount)}
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-2 py-3">
                  <span className={cn('inline-block rounded-input px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide', STATUS_STYLE[r.status] ?? 'bg-rail text-ink-2')}>
                    {t(`overview.statuses.${r.status}`, r.status)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Right column: today's date, what needs attention (solid cards), the next event. */
function TodayPanel({ events, leads }: { events: { _id: string; title: string; startTime: string }[]; leads?: LeadStats }) {
  const { t } = useTranslation('dashboardReception');
  const f = useFormat();
  const requests = usePendingSessionRequests();
  const transport = usePendingTransport();
  const now = new Date();
  const next = events.filter((e) => new Date(e.startTime) >= now).sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime))[0];

  return (
    <Panel>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ink">{t('overview.today')}</h2>
          <p className="mt-0.5 text-base font-semibold text-ink-2">{f.custom(now, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <Link to="/reception/enrollments" aria-label={t('overview.newEnrollment')} title={t('overview.newEnrollment')} className="grid size-11 shrink-0 place-items-center rounded-input bg-ink text-white hover:bg-ink-deep focus-visible:focus-ring">
          <Plus className="size-5" />
        </Link>
      </div>

      <p className="mb-3 mt-6 text-sm font-medium text-ink">{t('overview.needsAttention')}</p>
      <div className="space-y-3">
        <AttentionCard title={t('overview.followUps')} note={t('overview.followUpsNote')} value={leads?.needsFollowUp} to="/reception/leads" />
        <AttentionCard title={t('overview.sessionRequests')} note={t('overview.sessionRequestsNote')} value={requests.data} to="/reception/session-requests" />
        <AttentionCard title={t('overview.transport')} note={t('overview.transportNote')} value={transport.data} to="/reception/transport" />
      </div>

      <p className="mb-3 mt-6 text-sm font-medium text-ink">{t('overview.nextEvent')}</p>
      {next ? (
        <div className="flex items-center gap-3">
          <span className="shrink-0 rounded-input border border-line bg-paper px-3 py-2 text-sm font-semibold tabular-nums text-ink shadow-card">{f.time(next.startTime)}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{next.title}</p>
            <p className="text-xs text-ink-4">{f.custom(next.startTime, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-ink-4">{t('overview.noUpcoming')}</p>
      )}
      <Link to="/reception/schedule" className="mt-4 block rounded-md text-center text-sm font-medium text-ink underline underline-offset-4 hover:text-ink-deep focus-visible:focus-ring">
        {t('overview.showSchedule')}
      </Link>
    </Panel>
  );
}

function AttentionCard({ title, note, value, to }: { title: string; note: string; value?: number; to: string }) {
  const { t } = useTranslation('dashboardReception');
  return (
    <Link to={to} className="group block rounded-card bg-ink p-4 text-white transition-colors hover:bg-ink-deep focus-visible:focus-ring">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold leading-snug">{title}</p>
          <p className="mt-1 text-xs text-gold">{note}</p>
        </div>
        <span className="grid size-12 shrink-0 place-items-center rounded-input bg-paper text-xl font-bold tabular-nums text-ink">{value ?? '–'}</span>
      </div>
      <span className="mt-3 flex items-center justify-end gap-1 text-xs font-medium text-cream">
        {t('overview.open')}
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" aria-hidden />
      </span>
    </Link>
  );
}
