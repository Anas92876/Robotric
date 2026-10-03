import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BookOpen, ChevronRight, GraduationCap, TrendingUp, UserCheck, Users, UsersRound } from 'lucide-react';
import { api } from '../../../lib/api';
import { useAuth } from '../../../providers/AuthProvider';
import { useFormat } from '../../../app/format';
import { Badge, EmptyState, Panel, PanelTitle, StatTile, WelcomeBanner, type BadgeTone } from '../../../ui';

interface Data {
  stats: {
    trainers: { total: number; active: number; inactive: number };
    courses: { total: number; published: number; draft: number };
    groups: { total: number; active: number; completed: number };
    students: { total: number };
    enrollments: { total: number; active: number; recent: number };
    performance: { attendanceRate: number; completionRate: number };
  };
  topTrainers: { _id: string; trainerName: string; trainerEmail: string; totalGroups: number; avgAttendance: number }[];
  recentActivity: {
    groups: { _id: string; name: string; courseId: { _id: string; title: string } | string | null; trainerId: { name: string } | string | null; startDate?: string; status: string; createdAt: string }[];
    courses: { _id: string; title: string; category?: string; status: string; createdAt: string }[];
  };
}

const TONE: Record<string, BadgeTone> = { active: 'success', published: 'success', draft: 'warning', completed: 'info', archived: 'neutral', cancelled: 'danger', upcoming: 'neutral' };

/** A bar of the share (0–100) with its number. */
function Meter({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm text-frost/80">{label}</span>
        <span className="text-2xl font-bold tabular-nums text-glow" dir="ltr">{Math.round(value)}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15" role="meter" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-glow" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
      <p className="mt-1 text-xs text-frost/60">{hint}</p>
    </div>
  );
}

/** The learning team's home: courses, groups, trainers and how classes are going. */
export default function CloOverviewPage() {
  const { t } = useTranslation('dashboardCLO');
  const f = useFormat();
  const { user } = useAuth();
  const q = useQuery({ queryKey: ['clo', 'overview'], queryFn: async () => (await api.get('/clo/dashboard')).data.data as Data, staleTime: 60_000 });
  const s = q.data?.stats;
  const name = (x: { name: string } | string | null) => (x && typeof x === 'object' ? x.name : '');
  const title = (x: { title: string } | string | null) => (x && typeof x === 'object' ? x.title : '');

  return (
    <div className="space-y-5">
      <WelcomeBanner greeting={t('ov.hello')} name={user?.name ?? ''} note={t('ov.note')} link={{ to: '/clo/sessions', label: t('ov.goSessions') }} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={<BookOpen />} tint="bg-tint-leaf" label={t('ov.courses')} value={s?.courses.published} loading={q.isLoading} to="/clo/courses" />
        <StatTile icon={<UsersRound />} tint="bg-tint-straw" label={t('ov.groups')} value={s?.groups.active} loading={q.isLoading} to="/clo/groups" />
        <StatTile icon={<GraduationCap />} tint="bg-tint-sage" label={t('ov.trainers')} value={s?.trainers.active} loading={q.isLoading} to="/clo/trainers" />
        <StatTile icon={<Users />} tint="bg-tint-sand" label={t('ov.students')} value={s?.students.total} loading={q.isLoading} />
      </div>

      {q.isError ? <Panel><EmptyState icon={<TrendingUp />} title={t('ov.loadError')} /></Panel> : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-5">
            <Panel>
              <PanelTitle title={t('ov.recentGroups')} link={{ to: '/clo/groups', label: t('ov.allGroups') }} />
              {q.isLoading ? <div className="h-24 animate-pulse rounded-card bg-rail" /> : !q.data?.recentActivity.groups.length ? <p className="py-4 text-center text-sm text-ink-4">{t('ov.noGroups')}</p> : (
                <ul className="divide-y divide-line">
                  {q.data.recentActivity.groups.map((g) => (
                    <li key={g._id}>
                      <Link to={typeof g.courseId === 'object' && g.courseId ? `/clo/courses/${g.courseId._id}/${g._id}` : '/clo/groups'} className="flex items-center gap-3 py-2.5 hover:bg-rail focus-visible:bg-rail focus-visible:outline-none">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-tint-straw text-ink"><UsersRound className="size-4" aria-hidden /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink" dir="auto">{g.name}</span>
                          <span className="block truncate text-xs text-ink-4" dir="auto">{[title(g.courseId), name(g.trainerId)].filter(Boolean).join(' · ')}</span>
                        </span>
                        <Badge tone={TONE[g.status] ?? 'neutral'}>{t(`ov.status.${g.status}`, { defaultValue: g.status })}</Badge>
                        <ChevronRight className="size-4 shrink-0 text-ink-4 rtl:rotate-180" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel>
              <PanelTitle title={t('ov.recentCourses')} link={{ to: '/clo/courses', label: t('ov.allCourses') }} />
              {q.isLoading ? <div className="h-24 animate-pulse rounded-card bg-rail" /> : !q.data?.recentActivity.courses.length ? <p className="py-4 text-center text-sm text-ink-4">{t('ov.noCourses')}</p> : (
                <ul className="divide-y divide-line">
                  {q.data.recentActivity.courses.map((c) => (
                    <li key={c._id}>
                      <Link to={`/clo/courses/${c._id}`} className="flex items-center gap-3 py-2.5 hover:bg-rail focus-visible:bg-rail focus-visible:outline-none">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-tint-leaf text-ink"><BookOpen className="size-4" aria-hidden /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink" dir="auto">{c.title}</span>
                          <span className="block truncate text-xs text-ink-4">{t('ov.added', { date: f.date(c.createdAt) })}</span>
                        </span>
                        <Badge tone={TONE[c.status] ?? 'neutral'}>{t(`ov.status.${c.status}`, { defaultValue: c.status })}</Badge>
                        <ChevronRight className="size-4 shrink-0 text-ink-4 rtl:rotate-180" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <div className="space-y-5">
            <div className="space-y-5 rounded-panel bg-ink p-5 text-white">
              <Meter label={t('ov.attendance')} value={s?.performance.attendanceRate ?? 0} hint={t('ov.attendanceHint')} />
              <Meter label={t('ov.completion')} value={s?.performance.completionRate ?? 0} hint={t('ov.completionHint')} />
              <p className="flex items-center gap-2 border-t border-white/15 pt-4 text-sm text-frost/80"><UserCheck className="size-4 text-glow" aria-hidden />{t('ov.newEnrollments', { count: s?.enrollments.recent ?? 0 })}</p>
            </div>
            <Panel>
              <PanelTitle title={t('ov.topTrainers')} link={{ to: '/clo/trainers', label: t('ov.allTrainers') }} />
              {q.isLoading ? <div className="h-24 animate-pulse rounded-card bg-rail" /> : !q.data?.topTrainers.length ? <p className="py-4 text-center text-sm text-ink-4">{t('ov.noTrainers')}</p> : (
                <ol className="space-y-2">
                  {q.data.topTrainers.map((tr, i) => (
                    <li key={tr._id} className="flex items-center gap-3">
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-rail text-xs font-semibold tabular-nums text-ink">{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink" dir="auto">{tr.trainerName}</span>
                        <span className="block text-xs text-ink-4">{t('ov.groupsCount', { count: tr.totalGroups })}</span>
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-ink" dir="ltr">{Math.round(tr.avgAttendance)}%</span>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
