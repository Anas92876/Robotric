import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BookOpen, CalendarCheck, CalendarClock, ChevronRight, ClipboardCheck, ClipboardList, Users, UsersRound } from 'lucide-react';
import { api } from '../../../lib/api';
import { useFormat } from '../../../app/format';
import { cn } from '../../../lib/utils';
import { Badge, Button, DataTable, Dialog, EmptyState, PageHeader, Panel, PanelTitle, SearchInput, StatTile, type BadgeTone, type Column } from '../../../ui';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
interface Group {
  _id: string; name: string; courseId?: { _id: string; title: string } | null; students: { _id: string }[]; maxStudents: number; enrolledCount?: number;
  schedule: { day: string; startTime: string; endTime: string }[]; startDate?: string; endDate?: string; status: string; boardEnabled?: boolean;
  progress?: { completedSessions: number; totalSessions: number; percentageComplete: number }; stats?: { averageAttendance: number };
  nextSession?: { _id: string; title: string; scheduledDate: string; startTime: string; endTime: string } | null; sessionStats?: { total: number; completed: number; upcoming: number };
}
interface Member { _id: string; name: string; email: string; profile?: { phone?: string }; attendance?: { percentage: number; present: number; absent: number; late: number; total: number } }
interface Session { _id: string; title: string; sessionNumber: number; scheduledDate: string; startTime: string; endTime: string; status: string }

const STATUS_TONE: Record<string, BadgeTone> = { active: 'success', completed: 'info', archived: 'neutral', cancelled: 'danger', scheduled: 'neutral', in_progress: 'success' };

/** "Sunday" → day name in the page language (4 Jan 2026 was a Sunday). */
export function useDayName() {
  const f = useFormat();
  return (day: string) => {
    const i = DAYS.indexOf(day);
    return i < 0 ? day : f.custom(new Date(2026, 0, 4 + i), { weekday: 'long' });
  };
}

/** The groups the trainer teaches. */
export default function GroupsPage() {
  const { t } = useTranslation('dashboardTrainer');
  const day = useDayName();
  const q = useQuery({ queryKey: ['trainer', 'groups'], queryFn: async () => ((await api.get('/trainer/groups')).data.data ?? []) as Group[], staleTime: 60_000 });
  const [search, setSearch] = useState('');
  const all = q.data ?? [];
  const s = search.trim().toLowerCase();
  const rows = all.filter((g) => !s || g.name.toLowerCase().includes(s) || (g.courseId?.title ?? '').toLowerCase().includes(s));
  const students = all.reduce((n, g) => n + (g.enrolledCount ?? g.students.length), 0);

  return (
    <div className="space-y-5">
      <PageHeader title={t('grp.title')} description={t('grp.subtitle')} />
      <div className="grid grid-cols-3 gap-3">
        <StatTile icon={<UsersRound />} tint="bg-tint-leaf" label={t('grp.groups')} value={all.length} loading={q.isLoading} />
        <StatTile icon={<Users />} tint="bg-tint-straw" label={t('ov.students')} value={students} loading={q.isLoading} />
        <StatTile icon={<CalendarCheck />} tint="bg-tint-sage" label={t('grp.avgAttendance')} value={all.length ? `${Math.round(all.reduce((n, g) => n + (g.stats?.averageAttendance ?? 0), 0) / all.length)}%` : '—'} loading={q.isLoading} />
      </div>
      {all.length > 4 && <SearchInput value={search} onChange={setSearch} placeholder={t('grp.search')} />}
      {q.isError ? (
        <Panel><EmptyState icon={<UsersRound />} title={t('grp.loadError')} action={<Button variant="secondary" onClick={() => void q.refetch()}>{t('grp.retry')}</Button>} /></Panel>
      ) : q.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">{[0, 1].map((i) => <div key={i} className="h-56 animate-pulse rounded-card bg-rail" />)}</div>
      ) : rows.length === 0 ? (
        <Panel><EmptyState icon={<UsersRound />} title={t(all.length ? 'grp.noMatch' : 'grp.none')} description={all.length ? undefined : t('grp.noneHint')} /></Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((g) => {
            const pct = g.progress?.percentageComplete ?? 0;
            const count = g.enrolledCount ?? g.students.length;
            return (
              <Link key={g._id} to={`/trainer/groups/${g._id}`} className="flex flex-col gap-3 rounded-card border border-line bg-paper p-5 shadow-card transition-colors hover:border-ink focus-visible:focus-ring">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold text-ink" dir="auto">{g.name}</h2>
                    <p className="truncate text-sm text-ink-3" dir="auto">{g.courseId?.title}</p>
                  </div>
                  <Badge tone={STATUS_TONE[g.status] ?? 'neutral'}>{t(`grp.status.${g.status}`, { defaultValue: g.status })}</Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {g.schedule.map((sl, i) => <span key={i} className="rounded-pill bg-rail px-2.5 py-0.5 text-xs text-ink-2">{day(sl.day)} · <bdi dir="ltr">{sl.startTime}–{sl.endTime}</bdi></span>)}
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs text-ink-3"><span>{t('grp.classesDone', { done: g.progress?.completedSessions ?? 0, total: g.progress?.totalSessions ?? 0 })}</span><span className="font-semibold tabular-nums text-ink">{pct}%</span></div>
                  <div className="h-1.5 overflow-hidden rounded-pill bg-rail"><span className="block h-full bg-glow" style={{ width: `${pct}%` }} /></div>
                </div>
                <div className="flex items-center gap-4 text-xs text-ink-3">
                  <span className="inline-flex items-center gap-1"><Users className="size-3.5" aria-hidden />{t('grp.seats', { count, max: g.maxStudents })}</span>
                  <span className="inline-flex items-center gap-1"><CalendarCheck className="size-3.5" aria-hidden />{t('grp.attendance', { pct: Math.round(g.stats?.averageAttendance ?? 0) })}</span>
                  <ChevronRight className="ms-auto size-4 text-ink-4 rtl:rotate-180" aria-hidden />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** One group: students with attendance, classes, next class, and taking attendance. */
export function GroupPage() {
  const { groupId = '' } = useParams();
  const { t } = useTranslation('dashboardTrainer');
  const f = useFormat();
  const day = useDayName();
  const navigate = useNavigate();
  const group = useQuery({ queryKey: ['trainer', 'group', groupId], queryFn: async () => (await api.get(`/trainer/groups/${groupId}`)).data.data as Group });
  const members = useQuery({ queryKey: ['trainer', 'group', groupId, 'students'], queryFn: async () => ((await api.get(`/trainer/groups/${groupId}/students`)).data.data ?? []) as Member[] });
  const sessions = useQuery({ queryKey: ['trainer', 'group', groupId, 'sessions'], queryFn: async () => ((await api.get(`/trainer/sessions?groupId=${groupId}`)).data.data ?? []) as Session[] });
  const [picking, setPicking] = useState(false);
  const g = group.data;
  const list = [...(sessions.data ?? [])].sort((a, b) => a.sessionNumber - b.sessionNumber);
  const open = list.filter((x) => x.status === 'scheduled' || x.status === 'in_progress');
  const todayKey = new Date().toDateString();
  const todays = open.filter((x) => new Date(x.scheduledDate).toDateString() === todayKey);

  const takeAttendance = () => (todays.length === 1 ? navigate(`/trainer/attendance?session=${todays[0]._id}`) : setPicking(true));

  const columns: Column<Member>[] = useMemo(
    () => [
      { key: 'name', header: t('grp.col.student'), cell: (m) => <div className="min-w-0"><p className="truncate font-medium text-ink" dir="auto">{m.name}</p><p className="truncate text-xs text-ink-4" dir="ltr">{m.email}</p></div> },
      { key: 'phone', header: t('grp.col.phone'), hideOnMobile: true, cell: (m) => (m.profile?.phone ? <a href={`tel:${m.profile.phone}`} className="text-ink-2 hover:text-ink" dir="ltr">{m.profile.phone}</a> : <span className="text-ink-4">—</span>) },
      {
        key: 'att',
        header: t('grp.col.attendance'),
        cell: (m) => m.attendance ? (
          <div className="min-w-32">
            <p className={cn('text-sm font-semibold tabular-nums', m.attendance.percentage >= 85 ? 'text-success' : m.attendance.percentage >= 70 ? 'text-warning' : 'text-danger')}>{Math.round(m.attendance.percentage)}%</p>
            <p className="text-xs text-ink-4">{t('grp.attCounts', { present: m.attendance.present, late: m.attendance.late, absent: m.attendance.absent })}</p>
          </div>
        ) : <span className="text-ink-4">—</span>,
      },
    ],
    [t],
  );

  if (group.isError) return <div className="space-y-5"><PageHeader back={{ to: '/trainer/groups', label: t('grp.title') }} title={t('grp.one')} /><Panel><EmptyState icon={<UsersRound />} title={t('grp.loadError')} /></Panel></div>;

  return (
    <div className="space-y-5">
      <PageHeader
        back={{ to: '/trainer/groups', label: t('grp.title') }}
        title={g?.name ?? <span className="inline-block h-8 w-64 animate-pulse rounded-md bg-rail" />}
        description={g ? [g.courseId?.title, g.schedule.map((sl) => `${day(sl.day)} ${sl.startTime}`).join(' · ')].filter(Boolean).join(' — ') : undefined}
        actions={<>
          {g?.boardEnabled && <Link to={`/trainer/groups/${groupId}/board`} className="inline-flex h-11 items-center gap-2 rounded-pill border border-ink px-5 text-sm font-medium text-ink hover:bg-ink hover:text-white focus-visible:focus-ring"><ClipboardList className="size-[18px]" aria-hidden />{t('grp.board')}</Link>}
          <Button icon={<ClipboardCheck />} onClick={takeAttendance} disabled={sessions.isLoading}>{t('grp.takeAttendance')}</Button>
        </>}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile icon={<Users />} tint="bg-tint-leaf" label={t('ov.students')} value={g ? `${g.enrolledCount ?? g.students.length} / ${g.maxStudents}` : undefined} loading={group.isLoading} />
        <StatTile icon={<BookOpen />} tint="bg-tint-straw" label={t('grp.done')} value={g?.sessionStats ? `${g.sessionStats.completed} / ${g.sessionStats.total}` : undefined} loading={group.isLoading} />
        <StatTile icon={<CalendarCheck />} tint="bg-tint-sage" label={t('grp.avgAttendance')} value={g ? `${Math.round(g.stats?.averageAttendance ?? 0)}%` : undefined} loading={group.isLoading} />
        <StatTile icon={<CalendarClock />} tint="bg-tint-sand" label={t('grp.upcoming')} value={g?.sessionStats?.upcoming ?? 0} loading={group.isLoading} />
      </div>

      {g?.nextSession && (
        <Link to={`/trainer/sessions/${g.nextSession._id}`} className="flex flex-wrap items-center gap-4 rounded-panel bg-ink p-5 text-white focus-visible:focus-ring">
          <span className="grid size-12 shrink-0 place-items-center rounded-input bg-white/10"><CalendarClock className="size-6 text-glow" aria-hidden /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm text-glow">{t('grp.next')}</span>
            <span className="block truncate text-lg font-semibold" dir="auto">{g.nextSession.title}</span>
            <span className="block text-sm text-frost/75">{f.custom(g.nextSession.scheduledDate, { weekday: 'long', day: 'numeric', month: 'long' })} · <bdi dir="ltr">{g.nextSession.startTime}–{g.nextSession.endTime}</bdi></span>
          </span>
          <ChevronRight className="size-5 text-glow rtl:rotate-180" aria-hidden />
        </Link>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel className="min-w-0 p-0 sm:p-0">
          <div className="px-5 pt-5"><PanelTitle title={t('grp.students')} /></div>
          <DataTable label={t('grp.students')} columns={columns} rows={members.data ?? []} rowKey={(m) => m._id} loading={members.isLoading} empty={<EmptyState icon={<Users />} title={t('grp.noStudents')} />} />
        </Panel>
        <Panel>
          <PanelTitle title={t('grp.classes')} link={{ to: '/trainer/sessions', label: t('grp.allClasses') }} />
          {sessions.isLoading ? <div className="h-32 animate-pulse rounded-card bg-rail" /> : list.length === 0 ? <p className="py-4 text-center text-sm text-ink-4">{t('grp.noClasses')}</p> : (
            <ol className="space-y-1.5">
              {list.map((x) => (
                <li key={x._id}>
                  <Link to={`/trainer/sessions/${x._id}`} className="flex items-center gap-3 rounded-input px-2 py-2 hover:bg-rail focus-visible:bg-rail focus-visible:outline-none">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-tint-sage text-xs font-semibold tabular-nums text-ink">{x.sessionNumber}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-ink" dir="auto">{x.title}</span><span className="block text-xs text-ink-4">{f.dayMonth(x.scheduledDate)}</span></span>
                    <Badge tone={STATUS_TONE[x.status] ?? 'neutral'}>{t(`ov.status.${x.status}`, { defaultValue: x.status })}</Badge>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      <Dialog open={picking} onClose={() => setPicking(false)} title={t('grp.pickTitle')} description={open.length ? t(todays.length ? 'grp.pickToday' : 'grp.pickAny') : undefined} closeLabel={t('grp.close')}>
        {(todays.length ? todays : open).length === 0 ? <p className="text-sm text-ink-3">{t('grp.noOpen')}</p> : (
          <ul className="space-y-2">
            {(todays.length ? todays : open).map((x) => (
              <li key={x._id}>
                <button type="button" onClick={() => navigate(`/trainer/attendance?session=${x._id}`)} className="flex w-full items-center gap-3 rounded-card border border-line p-3 text-start hover:border-ink focus-visible:focus-ring">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-tint-sage text-xs font-semibold text-ink">{x.sessionNumber}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate font-medium text-ink" dir="auto">{x.title}</span><span className="block text-xs text-ink-4">{f.custom(x.scheduledDate, { weekday: 'short', day: 'numeric', month: 'short' })} · <bdi dir="ltr">{x.startTime}</bdi></span></span>
                  <ChevronRight className="size-4 text-ink-4 rtl:rotate-180" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Dialog>
    </div>
  );
}
