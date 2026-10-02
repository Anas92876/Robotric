import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ChevronRight, FolderKanban, FolderTree, ListTodo, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { readApiError } from '../../app/apiError';
import { useToast } from '../../components/ui/Toast';
import { Badge, Button, ConfirmDialog, EmptyState, PageHeader, Panel, PanelTitle, RowMenu, SearchInput, StatTile } from '../../ui';
import { PriorityBadge } from '../common/tasks/bits';
import { useCtoProject, useCtoProjects, useCtoTasks, useSubProjects, useWorkMutations, type Project } from './api';
import { TaskTable } from './TaskTable';
import { ProjectDialog, TaskDialog } from './WorkDialogs';

function Progress({ c }: { c?: Project['taskCounts'] }) {
  const pct = c?.total ? Math.round((c.done / c.total) * 100) : 0;
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-rail"><span className="block h-full rounded-full bg-success" style={{ width: `${pct}%` }} /></span>
      <span className="text-xs tabular-nums text-ink-3" dir="ltr">{c?.done ?? 0}/{c?.total ?? 0}</span>
    </span>
  );
}

/** Internal projects: who works on them and how far along they are. */
export default function CtoProjectsPage() {
  const { t } = useTranslation('dashboardCommon');
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const q = useCtoProjects();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(pathname.endsWith('/new'));
  useEffect(() => { if (pathname.endsWith('/new')) setCreating(true); }, [pathname]);
  const all = (q.data ?? []).filter((p) => !p.parentProject);
  const sq = search.trim().toLowerCase();
  const rows = all.filter((p) => !sq || `${p.name} ${p.description ?? ''}`.toLowerCase().includes(sq)).sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
  const open = all.reduce((n, p) => n + (p.taskCounts ? p.taskCounts.todo + p.taskCounts.in_progress : 0), 0);
  const close = () => { setCreating(false); if (pathname.endsWith('/new')) navigate('/cto-internal/projects', { replace: true }); };

  return (
    <div className="space-y-5">
      <PageHeader title={t('work.projectsTitle')} description={t('work.projectsText')} actions={<Button icon={<Plus />} onClick={() => setCreating(true)}>{t('work.newProject')}</Button>} />
      <div className="grid grid-cols-3 gap-3">
        <StatTile icon={<FolderKanban />} tint="bg-tint-leaf" label={t('work.projectsTitle')} value={all.length} loading={q.isLoading} />
        <StatTile icon={<FolderTree />} tint="bg-tint-sage" label={t('work.subProjects')} value={(q.data ?? []).length - all.length} loading={q.isLoading} />
        <StatTile icon={<ListTodo />} tint="bg-tint-straw" label={t('cto.open')} value={open} loading={q.isLoading} to="/cto-internal/tasks" />
      </div>
      <div className="max-w-md"><SearchInput value={search} onChange={setSearch} placeholder={t('work.searchProjects')} /></div>
      {q.isError ? <Panel><EmptyState icon={<FolderKanban />} title={readApiError(q.error).message} /></Panel>
        : q.isLoading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-panel bg-rail" />)}</div>
        : rows.length === 0 ? <Panel><EmptyState icon={<FolderKanban />} title={t('work.noProjects')} action={<Button icon={<Plus />} onClick={() => setCreating(true)}>{t('work.newProject')}</Button>} /></Panel>
        : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((p) => (
              <li key={p._id}>
                <Link to={`/cto-internal/projects/${p._id}`} className="group flex h-full flex-col rounded-panel border border-line bg-paper p-5 hover:border-ink focus-visible:focus-ring">
                  <div className="flex items-start gap-2">
                    <span className="min-w-0 flex-1 font-semibold text-ink group-hover:underline" dir="auto">{p.name}</span>
                    <PriorityBadge p={p.priority} />
                  </div>
                  {p.description && <p className="mt-1.5 line-clamp-2 text-sm text-ink-3" dir="auto">{p.description}</p>}
                  <div className="mt-auto space-y-2 pt-4">
                    <Progress c={p.taskCounts} />
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-4">
                      <span className="inline-flex items-center gap-1"><Users className="size-3.5" aria-hidden />{t('work.peopleN', { count: p.assignedEngineers.length })}</span>
                      {!!p.subProjectCount && <span className="inline-flex items-center gap-1"><FolderTree className="size-3.5" aria-hidden />{t('work.subsN', { count: p.subProjectCount })}</span>}
                      {!!p.clients?.length && <span dir="auto">{p.clients.map((c) => c.name).join(', ')}</span>}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      <ProjectDialog open={creating} onClose={close} project={null} onSaved={(p) => navigate(`/cto-internal/projects/${p._id}`)} />
    </div>
  );
}

/** One project (or sub-project): its tasks, sub-projects, team and clients. */
export function CtoProjectPage() {
  const { id = '', parentId } = useParams();
  const { t } = useTranslation('dashboardCommon');
  const toast = useToast();
  const navigate = useNavigate();
  const q = useCtoProject(id);
  const p = q.data?.project;
  const isSub = !!parentId || !!p?.parentProject;
  const subs = useSubProjects(id, !!p && !isSub);
  const tasks = useCtoTasks(isSub ? { projectId: parentId ?? (typeof p?.parentProject === 'object' && p?.parentProject ? p.parentProject._id : ''), subProjectId: id } : { projectId: id, subProjectId: 'none' });
  const { deleteProject } = useWorkMutations();
  const [editing, setEditing] = useState(false);
  const [newSub, setNewSub] = useState(false);
  const [newTask, setNewTask] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const parent = p?.parentProject && typeof p.parentProject === 'object' ? p.parentProject : null;
  const back = parent ? { to: `/cto-internal/projects/${parent._id}`, label: parent.name } : { to: '/cto-internal/projects', label: t('work.projectsTitle') };

  if (q.isError) return <div className="space-y-5"><PageHeader back={back} title={t('work.project')} /><Panel><EmptyState icon={<AlertCircle />} title={readApiError(q.error).message} /></Panel></div>;
  if (!p) return <div className="space-y-4"><div className="h-10 w-72 animate-pulse rounded-md bg-rail" /><div className="h-72 animate-pulse rounded-panel bg-rail" /></div>;
  const c = q.data?.taskCounts;

  return (
    <div className="space-y-5">
      <PageHeader back={back} title={p.name} description={p.description}
        actions={<>
          <PriorityBadge p={p.priority} />
          <Button icon={<Plus />} onClick={() => setNewTask(true)}>{t('work.newTask')}</Button>
          <RowMenu label={t('work.actionsFor', { name: p.name })} actions={[
            { label: t('work.edit'), icon: <Pencil />, onClick: () => setEditing(true) },
            { label: t('work.deleteProject'), icon: <Trash2 />, tone: 'danger', onClick: () => setDeleting(true) },
          ]} />
        </>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={<ListTodo />} tint="bg-tint-leaf" label={t('myTasks.status.todo')} value={c?.todo} />
        <StatTile icon={<ListTodo />} tint="bg-tint-sage" label={t('myTasks.status.in_progress')} value={c?.in_progress} />
        <StatTile icon={<ListTodo />} tint="bg-tint-straw" label={t('myTasks.status.done')} value={c?.done} />
        <StatTile icon={<Users />} tint="bg-tint-sand" label={t('work.engineers')} value={p.assignedEngineers.length} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel className="min-w-0 p-0 sm:p-0">
          <div className="p-4 pb-0 sm:p-5 sm:pb-0"><PanelTitle title={t(isSub ? 'work.tasks' : 'work.mainTasks')} /></div>
          {tasks.isError ? <EmptyState icon={<ListTodo />} title={readApiError(tasks.error).message} /> : <TaskTable tasks={tasks.data ?? []} loading={tasks.isLoading} showProject={false} />}
        </Panel>
        <div className="space-y-5">
          {!isSub && (
            <Panel>
              <PanelTitle title={t('work.subProjects')} actions={<Button size="sm" variant="secondary" icon={<Plus />} onClick={() => setNewSub(true)}>{t('work.add')}</Button>} />
              {subs.isLoading ? <div className="h-16 animate-pulse rounded-card bg-rail" /> : !subs.data?.length ? <p className="py-2 text-sm text-ink-4">{t('work.noSubs')}</p> : (
                <ul className="space-y-2">
                  {subs.data.map((s) => (
                    <li key={s._id}>
                      <Link to={`/cto-internal/projects/${p._id}/sub/${s._id}`} className="block rounded-card border border-line p-3 hover:border-ink focus-visible:focus-ring">
                        <span className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-sm font-medium text-ink" dir="auto">{s.name}</span><ChevronRight className="size-4 text-ink-4 rtl:rotate-180" aria-hidden /></span>
                        <span className="mt-2 block"><Progress c={s.taskCounts} /></span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}
          <Panel>
            <PanelTitle title={t('work.team')} />
            {p.assignedEngineers.length === 0 ? <p className="text-sm text-ink-4">{t('work.nobody')}</p> : <ul className="flex flex-wrap gap-1.5">{p.assignedEngineers.map((e) => <li key={e._id}><Badge tone="neutral">{e.name}</Badge></li>)}</ul>}
            {!!p.clients?.length && <><p className="mb-1.5 mt-4 text-sm font-medium text-ink">{t('work.clients')}</p><ul className="flex flex-wrap gap-1.5">{p.clients.map((x) => <li key={x._id}><Badge tone="info">{x.name}</Badge></li>)}</ul></>}
          </Panel>
        </div>
      </div>
      <ProjectDialog open={editing} onClose={() => setEditing(false)} project={p} />
      <ProjectDialog open={newSub} onClose={() => setNewSub(false)} project={null} parentId={p._id} />
      <TaskDialog open={newTask} onClose={() => setNewTask(false)} task={null} projectId={parent?._id ?? p._id} subProjectId={parent ? p._id : undefined} />
      <ConfirmDialog open={deleting} onClose={() => setDeleting(false)} tone="danger" title={t('work.deleteProjectTitle', { name: p.name })} message={t('work.deleteProjectText')} confirmLabel={t('work.deleteProject')} cancelLabel={t('cto.cancel')} loading={deleteProject.isPending}
        onConfirm={() => deleteProject.mutate(p._id, { onSuccess: () => { toast.success(t('work.toast.projectDeleted')); navigate(back.to); }, onError: (e) => toast.error(t('cto.error'), readApiError(e).message), onSettled: () => setDeleting(false) })} />
    </div>
  );
}
