import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlarmClock, CalendarClock, CalendarRange, Check, CircleDot, Inbox, ListTodo, Plus, ShieldAlert, X } from 'lucide-react';
import { api } from '../../lib/api';
import { useFormat } from '../../app/format';
import { readApiError } from '../../app/apiError';
import { useToast } from '../../components/ui/Toast';
import { cn } from '../../lib/utils';
import { Button, Dialog, EmptyState, Field, PageHeader, Panel, PanelTitle, SearchInput, SelectInput, StatTile, TextArea } from '../../ui';
import { dueOf } from '../common/tasks/api';
import { idOf, useCtoProjects, useCtoTasks, useStaff, type Task } from './api';
import { TaskTable } from './TaskTable';
import { TaskDialog } from './WorkDialogs';

type View = 'requests' | 'open' | 'done' | 'all';

/** Every internal task, plus the requests clients sent that wait to be accepted or declined. */
export default function CtoTasksPage() {
  const { t } = useTranslation('dashboardCommon');
  const q = useCtoTasks();
  const projects = useCtoProjects();
  const staff = useStaff();
  const all = q.data ?? [];
  const requests = all.filter((x) => x.status === 'pending_review');
  const [view, setView] = useState<View>(requests.length ? 'requests' : 'open');
  const [project, setProject] = useState('');
  const [person, setPerson] = useState('');
  const [priority, setPriority] = useState('');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const sq = search.trim().toLowerCase();
  const rows = all
    .filter((x) => (view === 'requests' ? x.status === 'pending_review' : view === 'open' ? x.status === 'todo' || x.status === 'in_progress' : view === 'done' ? x.status === 'done' : true))
    .filter((x) => (!project || idOf(x.projectId) === project) && (!person || x.assignedTo.some((a) => a._id === person)) && (!priority || String(x.priority) === priority))
    .filter((x) => !sq || x.title.toLowerCase().includes(sq))
    .sort((a, b) => (dueOf(a).date ?? '9').localeCompare(dueOf(b).date ?? '9') || a.priority - b.priority);
  const tile = (v: View) => ({ onClick: () => setView(v), active: view === v });

  return (
    <div className="space-y-5">
      <PageHeader title={t('work.tasksTitle')} description={t('work.tasksText')} actions={<Button icon={<Plus />} onClick={() => setCreating(true)}>{t('work.newTask')}</Button>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={<Inbox />} tint="bg-tint-straw" label={t('work.requests')} value={requests.length} loading={q.isLoading} {...tile('requests')} />
        <StatTile icon={<CircleDot />} tint="bg-tint-leaf" label={t('cto.open')} value={all.filter((x) => x.status === 'todo' || x.status === 'in_progress').length} loading={q.isLoading} {...tile('open')} />
        <StatTile icon={<Check />} tint="bg-tint-sage" label={t('myTasks.status.done')} value={all.filter((x) => x.status === 'done').length} loading={q.isLoading} {...tile('done')} />
        <StatTile icon={<ListTodo />} tint="bg-tint-sand" label={t('work.all')} value={all.length} loading={q.isLoading} {...tile('all')} />
      </div>
      <Panel className="p-0 sm:p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <div className="w-full flex-1 sm:w-auto sm:min-w-56"><SearchInput value={search} onChange={setSearch} placeholder={t('work.searchTasks')} /></div>
          <SelectInput aria-label={t('work.project')} value={project} onChange={(e) => setProject(e.target.value)} className="w-full sm:w-auto sm:min-w-40"><option value="">{t('work.allProjects')}</option>{(projects.data ?? []).filter((p) => !p.parentProject).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}</SelectInput>
          <SelectInput aria-label={t('work.assignees')} value={person} onChange={(e) => setPerson(e.target.value)} className="w-full sm:w-auto sm:min-w-40"><option value="">{t('work.everyone')}</option>{(staff.data ?? []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}</SelectInput>
          <SelectInput aria-label={t('work.priority')} value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full sm:w-auto sm:min-w-32"><option value="">{t('work.anyPriority')}</option>{[1, 2, 3].map((p) => <option key={p} value={p}>{t(`myTasks.priority.${p}`)}</option>)}</SelectInput>
        </div>
        {q.isError ? <EmptyState icon={<ListTodo />} title={readApiError(q.error).message} /> : <TaskTable tasks={rows} loading={q.isLoading} empty={view === 'requests' ? t('work.noRequests') : undefined} />}
      </Panel>
      <TaskDialog open={creating} onClose={() => setCreating(false)} task={null} />
    </div>
  );
}

interface Extension { _id: string; taskId: { _id: string; title: string; dueDate?: string | null } | string; requestedBy: { name: string } | string; reason: string; proposedDate: string; status: 'pending' | 'approved' | 'rejected'; createdAt: string }

/** Deadlines across all work: what is late, what is due this week, and requests for more time. */
export function CtoDeadlinesPage() {
  const { t } = useTranslation('dashboardCommon');
  const f = useFormat();
  const toast = useToast();
  const qc = useQueryClient();
  const q = useCtoTasks();
  const ext = useQuery({ queryKey: ['cto', 'work', 'extensions'], queryFn: async () => ((await api.get('/cto/internal/extension-requests', { params: { status: 'pending' } })).data.data ?? []) as Extension[] });
  const [reviewing, setReviewing] = useState<{ e: Extension; action: 'approved' | 'rejected' } | null>(null);
  const last = useRef(reviewing);
  if (reviewing) last.current = reviewing;
  const [note, setNote] = useState('');
  const review = useMutation({
    mutationFn: () => api.patch(`/cto/internal/extension-requests/${reviewing!.e._id}/review`, { action: reviewing!.action, reviewNote: note.trim() }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['cto', 'work'] }); toast.success(t(reviewing!.action === 'approved' ? 'work.toast.extApproved' : 'work.toast.extRejected')); setReviewing(null); },
    onError: (e) => toast.error(t('cto.error'), readApiError(e).message),
  });
  const open = (q.data ?? []).filter((x) => (x.status === 'todo' || x.status === 'in_progress') && dueOf(x).date);
  const late = open.filter((x) => dueOf(x).urgency === 'overdue');
  const week = open.filter((x) => { const d = dueOf(x); return d.urgency !== 'overdue' && (d.days ?? 99) <= 7; });
  const later = open.filter((x) => (dueOf(x).days ?? 0) > 7);
  const breached = late.filter((x) => x.hardDeadline && new Date(x.hardDeadline).getTime() < Date.now());
  const r = reviewing ?? last.current;

  const group = (title: string, list: Task[], tone: string) => (
    <Panel className="p-0 sm:p-0">
      <div className="flex items-center gap-2 p-4 pb-0 sm:p-5 sm:pb-0"><span className={cn('size-2.5 rounded-full', tone)} aria-hidden /><PanelTitle title={`${title} · ${list.length}`} /></div>
      <TaskTable tasks={list} loading={q.isLoading} empty={t('work.nothingHere')} />
    </Panel>
  );

  return (
    <div className="space-y-5">
      <PageHeader title={t('work.deadlinesTitle')} description={t('work.deadlinesText')} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={<AlarmClock />} tint="bg-tint-sand" label={t('cto.overdue')} value={late.length} loading={q.isLoading} />
        <StatTile icon={<ShieldAlert />} tint="bg-tint-sand" label={t('cto.breached')} value={breached.length} loading={q.isLoading} />
        <StatTile icon={<CalendarRange />} tint="bg-tint-straw" label={t('work.thisWeek')} value={week.length} loading={q.isLoading} />
        <StatTile icon={<CalendarClock />} tint="bg-tint-leaf" label={t('work.moreTime')} value={ext.data?.length} loading={ext.isLoading} />
      </div>
      {(ext.data?.length ?? 0) > 0 && (
        <Panel>
          <PanelTitle title={t('work.moreTime')} />
          <ul className="space-y-2">
            {ext.data!.map((e) => (
              <li key={e._id} className="flex flex-wrap items-center gap-3 rounded-card border border-line p-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink" dir="auto">{typeof e.taskId === 'object' ? e.taskId.title : ''}</span>
                  <span className="block text-xs text-ink-4"><span dir="auto">{typeof e.requestedBy === 'object' ? e.requestedBy.name : ''}</span> · {t('work.wantsUntil', { date: f.date(e.proposedDate) })}{typeof e.taskId === 'object' && e.taskId.dueDate ? ` · ${t('work.wasDue', { date: f.date(e.taskId.dueDate) })}` : ''}</span>
                  <span className="mt-1 block text-sm text-ink-2" dir="auto">{e.reason}</span>
                </span>
                <Button size="sm" icon={<Check />} onClick={() => { setNote(''); setReviewing({ e, action: 'approved' }); }}>{t('work.approve')}</Button>
                <Button size="sm" variant="ghost" icon={<X />} className="text-danger" onClick={() => { setNote(''); setReviewing({ e, action: 'rejected' }); }}>{t('work.reject')}</Button>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      {q.isError ? <Panel><EmptyState icon={<CalendarClock />} title={readApiError(q.error).message} /></Panel> : (
        <div className="space-y-5">
          {group(t('cto.overdue'), late, 'bg-danger')}
          {group(t('work.thisWeek'), week, 'bg-warning')}
          {group(t('work.later'), later, 'bg-success')}
        </div>
      )}
      <Dialog open={!!reviewing} onClose={() => setReviewing(null)} title={t(r?.action === 'approved' ? 'work.approveTitle' : 'work.rejectTitle')} description={r && typeof r.e.taskId === 'object' ? r.e.taskId.title : undefined} closeLabel={t('cto.cancel')}
        footer={<><Button variant="ghost" onClick={() => setReviewing(null)}>{t('cto.cancel')}</Button><Button variant={r?.action === 'rejected' ? 'danger' : 'primary'} loading={review.isPending} onClick={() => review.mutate()}>{t(r?.action === 'approved' ? 'work.approve' : 'work.reject')}</Button></>}>
        <div className="space-y-3">
          {r?.action === 'approved' && <p className="text-sm text-ink-2">{t('work.approveText', { date: f.date(r.e.proposedDate) })}</p>}
          <Field label={t('work.note')}>{(c) => <TextArea {...c} rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} dir="auto" />}</Field>
        </div>
      </Dialog>
    </div>
  );
}
