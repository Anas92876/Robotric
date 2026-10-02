import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlarmClock, CalendarClock, ChevronRight, CircleDot, FolderKanban, ListTodo, PlayCircle, Timer } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../providers/AuthProvider';
import { Badge, EmptyState, Panel, PanelTitle, StatTile, WelcomeBanner } from '../../ui';
import { dueOf, projectName, useMyProjects, useMyTasks } from '../common/tasks/api';
import { DueChip, STATUS_TONE } from '../common/tasks/bits';

/** The engineer's home: what is due, what is running, and their projects. */
export default function EngineerOverviewPage() {
  const { t } = useTranslation('dashboardCommon');
  const { user } = useAuth();
  const tasks = useMyTasks();
  const projects = useMyProjects();
  const work = useQuery({ queryKey: ['my', 'hours', 'status'], queryFn: async () => (await api.get('/engineer/work/status')).data.data as { isHourly: boolean; active: { startedAt: string } | null }, staleTime: 30_000 });
  const all = tasks.data ?? [];
  const open = all.filter((x) => x.status === 'todo' || x.status === 'in_progress');
  const overdue = open.filter((x) => dueOf(x).urgency === 'overdue');
  const next = [...open].filter((x) => dueOf(x).date).sort((a, b) => (dueOf(a).date ?? '').localeCompare(dueOf(b).date ?? '')).slice(0, 6);

  return (
    <div className="space-y-5">
      <WelcomeBanner greeting={t('eng.hello')} name={user?.name ?? ''} note={overdue.length ? t('eng.noteLate', { count: overdue.length }) : t('eng.note')} link={{ to: '/my-tasks', label: t('eng.goTasks') }} attention={overdue.length > 0} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={<ListTodo />} tint="bg-tint-leaf" label={t('eng.todo')} value={all.filter((x) => x.status === 'todo').length} loading={tasks.isLoading} to="/my-tasks" />
        <StatTile icon={<CircleDot />} tint="bg-tint-sage" label={t('eng.doing')} value={all.filter((x) => x.status === 'in_progress').length} loading={tasks.isLoading} to="/my-tasks" />
        <StatTile icon={<AlarmClock />} tint="bg-tint-sand" label={t('eng.overdue')} value={overdue.length} loading={tasks.isLoading} to="/my-tasks" />
        <StatTile icon={<FolderKanban />} tint="bg-tint-straw" label={t('eng.projects')} value={projects.data?.length} loading={projects.isLoading} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel>
          <PanelTitle title={t('eng.next')} link={{ to: '/my-tasks', label: t('eng.allTasks') }} />
          {tasks.isLoading ? <div className="h-24 animate-pulse rounded-card bg-rail" /> : next.length === 0 ? <EmptyState icon={<CalendarClock />} title={t('eng.nothingDue')} /> : (
            <ul className="divide-y divide-line">
              {next.map((x) => (
                <li key={x._id}>
                  <Link to={`/my-tasks?task=${x._id}`} className="flex items-center gap-3 py-2.5 hover:bg-rail focus-visible:bg-rail focus-visible:outline-none">
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-ink" dir="auto">{x.title}</span><span className="block truncate text-xs text-ink-4" dir="auto">{projectName(x)}</span></span>
                    <DueChip task={x} compact />
                    <Badge tone={STATUS_TONE[x.status]}>{t(`myTasks.status.${x.status}`)}</Badge>
                    <ChevronRight className="size-4 shrink-0 text-ink-4 rtl:rotate-180" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <div className="space-y-5">
          {work.data?.isHourly && (
            <Link to="/my-hours" className="block rounded-panel bg-ink p-5 text-white focus-visible:focus-ring">
              <p className="flex items-center gap-2 text-sm text-frost/75"><Timer className="size-4 text-glow" aria-hidden />{t('eng.hours')}</p>
              <p className="mt-2 flex items-center gap-2 text-lg font-semibold">{work.data.active ? <><span className="size-2.5 rounded-full bg-glow" aria-hidden />{t('eng.working')}</> : <><PlayCircle className="size-5 text-glow" aria-hidden />{t('eng.startWork')}</>}</p>
            </Link>
          )}
          <Panel>
            <PanelTitle title={t('eng.myProjects')} />
            {projects.isLoading ? <div className="h-20 animate-pulse rounded-card bg-rail" /> : !projects.data?.length ? <p className="py-3 text-center text-sm text-ink-4">{t('eng.noProjects')}</p> : (
              <ul className="space-y-2">
                {projects.data.slice(0, 6).map((p) => (
                  <li key={p._id} className="rounded-card border border-line p-3">
                    <p className="truncate text-sm font-medium text-ink" dir="auto">{p.name}</p>
                    {p.taskCounts && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-rail"><span className="block h-full rounded-full bg-success" style={{ width: `${p.taskCounts.total ? (p.taskCounts.done / p.taskCounts.total) * 100 : 0}%` }} /></span>
                        <span className="text-xs tabular-nums text-ink-3" dir="ltr">{p.taskCounts.done}/{p.taskCounts.total}</span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
