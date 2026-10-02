import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { AlarmClock, CheckCircle2, CircleDot, Eye, Flame, ListTodo, Play, RotateCcw } from 'lucide-react';
import { useAuth } from '../../../providers/AuthProvider';
import { useToast } from '../../../components/ui/Toast';
import { readApiError } from '../../../app/apiError';
import { cn } from '../../../lib/utils';
import { Badge, Button, DataTable, EmptyState, PageHeader, Panel, RowMenu, SearchInput, SelectInput, StatTile, type Column } from '../../../ui';
import { dueOf, projectName, useMyProjects, useMyTasks, useSetTaskStatus, type Task, type TaskStatus, type Urgency } from './api';
import { DueChip, PriorityBadge, STATUS_TONE } from './bits';
import { TaskDetailsDialog } from './TaskDetailsDialog';

type View = '' | TaskStatus;
const URGENCY_ORDER: Record<Urgency, number> = { overdue: 0, today: 1, soon: 2, ok: 3, none: 4 };

/** Tasks assigned to me: what is urgent first, open one to work on it. */
export default function MyTasksPage() {
  const { t } = useTranslation('dashboardCommon');
  const toast = useToast();
  const { user } = useAuth();
  const me = user?._id || user?.id;
  const tasks = useMyTasks();
  const projects = useMyProjects();
  const setStatus = useSetTaskStatus();

  const [view, setView] = useState<View>('');
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('');
  const [project, setProject] = useState('');
  // ?task=<id> opens that task (links from the overview pages)
  const [params] = useSearchParams();
  const [openId, setOpenId] = useState<string | null>(() => params.get('task'));

  const all = tasks.data ?? [];
  const open = all.find((x) => x._id === openId) ?? null;
  const active = all.filter((x) => x.status !== 'done');
  const overdue = active.filter((x) => dueOf(x).urgency === 'overdue').length;
  const today = active.filter((x) => dueOf(x).urgency === 'today').length;

  const q = search.trim().toLowerCase();
  const rows = all
    .filter((x) => !view || x.status === view)
    .filter((x) => !priority || String(x.priority) === priority)
    .filter((x) => !project || (typeof x.projectId === 'object' ? x.projectId?._id : x.projectId) === project)
    .filter((x) => !q || x.title.toLowerCase().includes(q) || (x.description ?? '').toLowerCase().includes(q))
    .sort((a, b) => {
      if ((a.status === 'done') !== (b.status === 'done')) return a.status === 'done' ? 1 : -1;
      return URGENCY_ORDER[dueOf(a).urgency] - URGENCY_ORDER[dueOf(b).urgency] || a.priority - b.priority;
    });

  const change = (task: Task, status: TaskStatus) =>
    setStatus.mutate(
      { id: task._id, status },
      {
        onSuccess: () => toast.success(t(`myTasks.toast.${status}`)),
        onError: (err) => toast.error(t('errorMessage'), readApiError(err).message),
      },
    );

  const columns: Column<Task>[] = useMemo(
    () => [
      {
        key: 'task',
        header: t('myTasks.col.task'),
        cell: (x) => (
          <button type="button" onClick={() => setOpenId(x._id)} className="block max-w-md rounded-md text-start focus-visible:focus-ring">
            <span className={cn('block truncate font-medium text-ink underline-offset-2 hover:underline', x.status === 'done' && 'text-ink-4 line-through')}>{x.title}</span>
            {projectName(x) && <span className="block truncate text-xs text-ink-4">{projectName(x)}</span>}
          </button>
        ),
      },
      { key: 'priority', header: t('myTasks.col.priority'), hideOnMobile: true, cell: (x) => <PriorityBadge p={x.priority} /> },
      { key: 'due', header: t('myTasks.col.due'), cell: (x) => (x.status === 'done' ? <span className="text-sm text-ink-4">—</span> : <DueChip task={x} compact />) },
      { key: 'status', header: t('myTasks.col.status'), cell: (x) => <Badge tone={STATUS_TONE[x.status]}>{t(`myTasks.status.${x.status}`)}</Badge> },
      {
        key: 'actions',
        header: <span className="sr-only">{t('actions')}</span>,
        align: 'end',
        cell: (x) => (
          <div className="flex items-center justify-end gap-1">
            {x.status !== 'done' && (
              <Button size="sm" variant={x.status === 'todo' ? 'secondary' : 'primary'} className="hidden sm:inline-flex" icon={x.status === 'todo' ? <Play /> : <CheckCircle2 />} disabled={setStatus.isPending} onClick={() => change(x, x.status === 'todo' ? 'in_progress' : 'done')}>
                {t(x.status === 'todo' ? 'myTasks.start' : 'myTasks.markDone')}
              </Button>
            )}
            <RowMenu
              label={t('myTasks.actionsFor', { title: x.title })}
              actions={[
                { label: t('myTasks.open'), icon: <Eye />, onClick: () => setOpenId(x._id) },
                { label: t('myTasks.start'), icon: <Play />, onClick: () => change(x, 'in_progress'), hidden: x.status !== 'todo' },
                { label: t('myTasks.markDone'), icon: <CheckCircle2 />, onClick: () => change(x, 'done'), hidden: x.status !== 'in_progress' },
                { label: t('myTasks.backToDo'), icon: <RotateCcw />, onClick: () => change(x, 'todo'), hidden: x.status !== 'in_progress' },
                { label: t('myTasks.reopen'), icon: <RotateCcw />, onClick: () => change(x, 'in_progress'), hidden: x.status !== 'done' },
              ]}
            />
          </div>
        ),
      },
    ],
    [t, setStatus.isPending], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const tile = (v: View) => ({ onClick: () => setView(view === v ? '' : v), active: view === v });
  const filtered = !!(view || q || priority || project);

  return (
    <div className="space-y-5">
      <PageHeader title={t('myTasks.title')} description={t('myTasks.subtitle')} />

      {(overdue > 0 || today > 0) && (
        <div role="status" className={cn('flex items-center gap-3 rounded-card px-4 py-3 text-sm font-medium', overdue ? 'bg-danger-soft text-danger' : 'bg-warning-soft text-warning')}>
          {overdue ? <Flame className="size-5 shrink-0" aria-hidden /> : <AlarmClock className="size-5 shrink-0" aria-hidden />}
          {[overdue && t('myTasks.alertOverdue', { count: overdue }), today && t('myTasks.alertToday', { count: today })].filter(Boolean).join(' · ')}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile icon={<ListTodo />} tint="bg-tint-leaf" label={t('myTasks.all')} value={all.length} loading={tasks.isLoading} {...tile('')} />
        <StatTile icon={<CircleDot />} tint="bg-tint-sand" label={t('myTasks.status.todo')} value={all.filter((x) => x.status === 'todo').length} loading={tasks.isLoading} {...tile('todo')} />
        <StatTile icon={<Play />} tint="bg-tint-straw" label={t('myTasks.status.in_progress')} value={all.filter((x) => x.status === 'in_progress').length} loading={tasks.isLoading} {...tile('in_progress')} />
        <StatTile icon={<CheckCircle2 />} tint="bg-tint-sage" label={t('myTasks.status.done')} value={all.filter((x) => x.status === 'done').length} loading={tasks.isLoading} {...tile('done')} />
      </div>

      <Panel className="p-0 sm:p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <div className="w-full flex-1 sm:w-auto sm:min-w-56">
            <SearchInput value={search} onChange={setSearch} placeholder={t('myTasks.search')} />
          </div>
          <SelectInput aria-label={t('myTasks.col.priority')} value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full sm:w-auto sm:min-w-40">
            <option value="">{t('myTasks.anyPriority')}</option>
            {[1, 2, 3].map((p) => (
              <option key={p} value={p}>
                {t(`myTasks.priority.${p}`)}
              </option>
            ))}
          </SelectInput>
          {(projects.data?.length ?? 0) > 0 && (
            <SelectInput aria-label={t('myTasks.project')} value={project} onChange={(e) => setProject(e.target.value)} className="w-full sm:w-auto sm:min-w-40">
              <option value="">{t('myTasks.anyProject')}</option>
              {projects.data!.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </SelectInput>
          )}
        </div>
        {tasks.isError ? (
          <EmptyState icon={<ListTodo />} title={t('myTasks.loadError')} action={<Button variant="secondary" onClick={() => void tasks.refetch()}>{t('retry')}</Button>} />
        ) : (
          <DataTable label={t('myTasks.title')} columns={columns} rows={rows} rowKey={(x) => x._id} loading={tasks.isLoading} empty={<EmptyState icon={<ListTodo />} title={t(filtered ? 'myTasks.noMatch' : 'myTasks.none')} description={filtered ? undefined : t('myTasks.noneHint')} />} />
        )}
      </Panel>

      <TaskDetailsDialog task={open} onClose={() => setOpenId(null)} currentUserId={me} busy={setStatus.isPending} onStatus={change} />
    </div>
  );
}
