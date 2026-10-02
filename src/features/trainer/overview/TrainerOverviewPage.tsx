import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CalendarDays, CalendarRange, CheckCircle2, ChevronRight, ClipboardCheck, Star, Users, UsersRound } from 'lucide-react';
import { api } from '../../../lib/api';
import { useAuth } from '../../../providers/AuthProvider';
import { useFormat } from '../../../app/format';
import { Badge, EmptyState, Panel, PanelTitle, StatTile, WelcomeBanner, type BadgeTone } from '../../../ui';

interface Stats { activeGroups: number; todaysSessions: number; completedToday: number; weekSessions: number; totalStudents: number; upcomingSessions: number; averageRating: number; todaysSessionsList: { _id: string; title: string; groupName: string; startTime: string; endTime: string; status: string }[] }
interface Activity { type: string; title: string; description: string; timestamp: string; link?: string }

const STATUS_TONE: Record<string, BadgeTone> = { scheduled: 'neutral', in_progress: 'success', completed: 'info', cancelled: 'danger' };

/** The trainer's home: today's classes, their groups and students, and what happened lately. */
export default function TrainerOverviewPage() {
  const { t } = useTranslation('dashboardTrainer');
  const f = useFormat();
  const { user } = useAuth();
  const stats = useQuery({ queryKey: ['trainer', 'overview', 'stats'], queryFn: async () => (await api.get('/trainer/dashboard/stats')).data.data as Stats, staleTime: 60_000 });
  const activity = useQuery({ queryKey: ['trainer', 'overview', 'activity'], queryFn: async () => ((await api.get('/trainer/dashboard/activities')).data.data ?? []) as Activity[], staleTime: 60_000 });
  const s = stats.data;
  const today = s?.todaysSessionsList ?? [];

  return (
    <div className="space-y-5">
      <WelcomeBanner greeting={t('ov.hello')} name={user?.name ?? ''} note={t('ov.note')} link={{ to: '/trainer/schedule', label: t('ov.goSchedule') }} attention={today.some((x) => x.status === 'in_progress')} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={<CalendarDays />} tint="bg-tint-leaf" label={t('ov.today')} value={s?.todaysSessions ?? today.length} loading={stats.isLoading} to="/trainer/sessions" />
        <StatTile icon={<CalendarRange />} tint="bg-tint-straw" label={t('ov.week')} value={s?.weekSessions ?? 0} loading={stats.isLoading} to="/trainer/schedule" />
        <StatTile icon={<UsersRound />} tint="bg-tint-sage" label={t('ov.groups')} value={s?.activeGroups ?? 0} loading={stats.isLoading} to="/trainer/groups" />
        <StatTile icon={<Users />} tint="bg-tint-sand" label={t('ov.students')} value={s?.totalStudents ?? 0} loading={stats.isLoading} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel>
          <PanelTitle title={t('ov.todayClasses')} link={{ to: '/trainer/schedule', label: t('ov.schedule') }} />
          {stats.isLoading ? <div className="h-24 animate-pulse rounded-card bg-rail" /> : today.length === 0 ? (
            <EmptyState icon={<CalendarDays />} title={t('ov.noClassesToday')} description={t('ov.upcoming', { count: s?.upcomingSessions ?? 0 })} />
          ) : (
            <ul className="space-y-2">
              {today.map((x) => (
                <li key={x._id}>
                  <Link to={`/trainer/sessions/${x._id}`} className="flex items-center gap-3 rounded-card border border-line p-3.5 hover:border-ink focus-visible:focus-ring">
                    <span className="grid min-w-16 place-items-center rounded-input bg-ink px-2 py-1.5 text-sm font-semibold tabular-nums text-glow" dir="ltr">{x.startTime}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink" dir="auto">{x.title}</span>
                      <span className="block truncate text-xs text-ink-4" dir="auto">{x.groupName} · <bdi dir="ltr">{x.startTime}–{x.endTime}</bdi></span>
                    </span>
                    <Badge tone={STATUS_TONE[x.status] ?? 'neutral'}>{t(`ov.status.${x.status}`, { defaultValue: x.status })}</Badge>
                    <ChevronRight className="size-4 shrink-0 text-ink-4 rtl:rotate-180" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-5">
          <div className="rounded-panel bg-ink p-5 text-white">
            <p className="flex items-center gap-2 text-sm text-frost/75"><Star className="size-4 text-glow" aria-hidden />{t('ov.rating')}</p>
            <p className="mt-2 text-4xl font-bold tabular-nums text-glow">{s?.averageRating ? s.averageRating : '—'}<span className="text-lg text-frost/60">{s?.averageRating ? ' / 5' : ''}</span></p>
            <p className="mt-1 text-xs text-frost/70">{t('ov.ratingNote')}</p>
          </div>
          <Panel>
            <PanelTitle title={t('ov.recent')} />
            {activity.isLoading ? <div className="h-24 animate-pulse rounded-card bg-rail" /> : !activity.data?.length ? <p className="py-4 text-center text-sm text-ink-4">{t('ov.noActivity')}</p> : (
              <ul className="divide-y divide-line">
                {activity.data.slice(0, 6).map((a, i) => {
                  const body = (
                    <>
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-tint-sage text-ink">{a.type === 'session_completed' ? <CheckCircle2 className="size-4" aria-hidden /> : <ClipboardCheck className="size-4" aria-hidden />}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-ink">{t(`ov.act.${a.type}`, { defaultValue: a.title })}</span>
                        <span className="block truncate text-xs text-ink-4" dir="auto">{a.description}</span>
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-ink-4">{f.dayMonth(a.timestamp)}</span>
                    </>
                  );
                  return <li key={i}>{a.link ? <Link to={a.link} className="flex items-center gap-3 py-2.5 hover:bg-rail focus-visible:bg-rail focus-visible:outline-none">{body}</Link> : <div className="flex items-center gap-3 py-2.5">{body}</div>}</li>;
                })}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
