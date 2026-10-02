import { useEffect, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { api } from '../../lib/api';
import { readApiError } from '../../app/apiError';
import MediaGrid from '../../components/media/MediaGrid';
import type { ClientMediaItem } from '../../hooks/cto/useCTOProjects';
import { useToast } from '../../components/ui/Toast';
import { cn } from '../../lib/utils';
import { Button, Dialog, Field, SelectInput, TextArea, TextInput } from '../../ui';
import { idOf, PRIORITIES, useClients, useCtoProjects, useStaff, useSubProjects, useWorkMutations, type Person, type Project, type Task } from './api';

/** Pick several people as chips. */
export function PeoplePicker({ label, people, value, onChange, empty }: { label: string; people: Person[]; value: string[]; onChange: (ids: string[]) => void; empty: string }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-ink">{label}</legend>
      {people.length === 0 ? <p className="text-sm text-ink-4">{empty}</p> : (
        <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
          {people.map((p) => {
            const on = value.includes(p._id);
            return (
              <button key={p._id} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== p._id) : [...value, p._id])}
                className={cn('inline-flex h-9 items-center gap-1.5 rounded-pill border px-3 text-sm focus-visible:focus-ring', on ? 'border-ink bg-ink text-white' : 'border-line-strong text-ink-2 hover:border-ink')}>
                {on && <Check className="size-3.5" aria-hidden />}<span dir="auto">{p.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}

function PriorityPicker({ value, onChange }: { value: 1 | 2 | 3; onChange: (p: 1 | 2 | 3) => void }) {
  const { t } = useTranslation('dashboardCommon');
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-ink">{t('work.priority')}</legend>
      <div className="flex gap-1.5">
        {PRIORITIES.map((p) => (
          <label key={p} className={cn('inline-flex h-9 cursor-pointer items-center rounded-pill border px-3.5 text-sm has-[:focus-visible]:focus-ring', value === p ? (p === 1 ? 'border-danger bg-danger text-white' : 'border-ink bg-ink text-white') : 'border-line-strong text-ink-2 hover:border-ink')}>
            <input type="radio" className="sr-only" checked={value === p} onChange={() => onChange(p)} />{t(`myTasks.priority.${p}`)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Create or edit a project (or a sub-project of `parentId`). */
export function ProjectDialog({ open, onClose, project, parentId, onSaved }: { open: boolean; onClose: () => void; project: Project | null; parentId?: string; onSaved?: (p: Project) => void }) {
  const { t } = useTranslation('dashboardCommon');
  const toast = useToast();
  const staff = useStaff();
  const clients = useClients();
  const { saveProject } = useWorkMutations();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<1 | 2 | 3>(3);
  const [engineers, setEngineers] = useState<string[]>([]);
  const [clientIds, setClientIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    setName(project?.name ?? ''); setDescription(project?.description ?? ''); setPriority(project?.priority ?? 3);
    setEngineers(project?.assignedEngineers.map((e) => e._id) ?? []); setClientIds(project?.clients?.map((c) => c._id) ?? []); setError('');
  }, [open, project]);
  const sub = !!(parentId || project?.parentProject);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError(t('work.errName'));
    setError('');
    saveProject.mutate(
      { id: project?._id, d: { name: name.trim(), description: description.trim(), priority, assignedEngineers: engineers, clients: clientIds, ...(parentId && !project ? { parentProject: parentId } : {}) } },
      { onSuccess: (p) => { toast.success(t(project ? 'work.toast.projectSaved' : 'work.toast.projectCreated')); onClose(); onSaved?.(p); }, onError: (err) => setError(readApiError(err).message) },
    );
  };
  return (
    <Dialog open={open} onClose={onClose} size="lg" title={t(project ? (sub ? 'work.editSub' : 'work.editProject') : sub ? 'work.newSub' : 'work.newProject')} closeLabel={t('cto.cancel')}
      footer={<><Button variant="ghost" onClick={onClose}>{t('cto.cancel')}</Button><Button type="submit" form="project-form" loading={saveProject.isPending}>{t(project ? 'work.save' : 'work.create')}</Button></>}>
      <form id="project-form" onSubmit={submit} noValidate className="space-y-4">
        <Field label={t('work.name')} required>{(c) => <TextInput {...c} value={name} onChange={(e) => setName(e.target.value)} maxLength={200} dir="auto" />}</Field>
        <Field label={t('work.description')}>{(c) => <TextArea {...c} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} dir="auto" />}</Field>
        <PriorityPicker value={priority} onChange={setPriority} />
        <PeoplePicker label={t('work.engineers')} people={staff.data ?? []} value={engineers} onChange={setEngineers} empty={t('work.noStaff')} />
        {!sub && <PeoplePicker label={t('work.clients')} people={clients.data ?? []} value={clientIds} onChange={setClientIds} empty={t('work.noClients')} />}
        {error && <p role="alert" className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      </form>
    </Dialog>
  );
}

const day = (iso?: string | null) => (iso ? iso.slice(0, 10) : '');

/** Create or edit a task; a new task can be placed in a project and sub-project. */
export function TaskDialog({ open, onClose, task, projectId, subProjectId }: { open: boolean; onClose: () => void; task: Task | null; projectId?: string; subProjectId?: string }) {
  const { t } = useTranslation('dashboardCommon');
  const toast = useToast();
  const staff = useStaff();
  const projects = useCtoProjects();
  const { saveTask } = useWorkMutations();
  const [project, setProject] = useState('');
  const [sub, setSub] = useState('');
  const subs = useSubProjects(project, open && !task);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<1 | 2 | 3>(3);
  const [people, setPeople] = useState<string[]>([]);
  const [due, setDue] = useState('');
  const [hard, setHard] = useState('');
  const [status, setStatus] = useState<Task['status']>('todo');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    setProject(task ? idOf(task.projectId) : projectId ?? ''); setSub(task ? idOf(task.subProjectId) : subProjectId ?? '');
    setTitle(task?.title ?? ''); setDescription(task?.description ?? ''); setPriority(task?.priority ?? 3); setPeople(task?.assignedTo.map((a) => a._id) ?? []);
    setDue(day(task?.dueDate)); setHard(day(task?.hardDeadline)); setStatus(task?.status === 'pending_review' ? 'todo' : task?.status ?? 'todo'); setError('');
  }, [open, task, projectId, subProjectId]);
  const reviewing = task?.status === 'pending_review';
  const media = useQuery({ queryKey: ['cto', 'work', 'tasks', task?._id, 'media'], queryFn: async () => ((await api.get(`/cto/internal/tasks/${task!._id}/client-media`)).data.data ?? []) as ClientMediaItem[], enabled: open && task?.source === 'client' });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!task && !project) return setError(t('work.errProject'));
    if (!title.trim()) return setError(t('work.errTitle'));
    if (due && hard && hard < due) return setError(t('work.errHard'));
    setError('');
    const d = { title: title.trim(), description: description.trim(), priority, assignedTo: people, dueDate: due || null, hardDeadline: hard || null, ...(task ? { status } : { projectId: project, subProjectId: sub || null }) };
    saveTask.mutate({ id: task?._id, d }, { onSuccess: () => { toast.success(t(reviewing ? 'work.toast.accepted' : task ? 'work.toast.taskSaved' : 'work.toast.taskCreated')); onClose(); }, onError: (err) => setError(readApiError(err).message) });
  };
  const topProjects = (projects.data ?? []).filter((p) => !p.parentProject);
  return (
    <Dialog open={open} onClose={onClose} size="lg" title={t(reviewing ? 'work.acceptTitle' : task ? 'work.editTask' : 'work.newTask')} description={reviewing ? t('work.acceptText') : undefined} closeLabel={t('cto.cancel')}
      footer={<><Button variant="ghost" onClick={onClose}>{t('cto.cancel')}</Button><Button type="submit" form="task-form" loading={saveTask.isPending}>{t(reviewing ? 'work.accept' : task ? 'work.save' : 'work.createTask')}</Button></>}>
      <form id="task-form" onSubmit={submit} noValidate className="space-y-4">
        {!task && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('work.project')} required>{(c) => <SelectInput {...c} value={project} onChange={(e) => { setProject(e.target.value); setSub(''); }}><option value="">{t('work.pickProject')}</option>{topProjects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}</SelectInput>}</Field>
            {(subs.data?.length ?? 0) > 0 && <Field label={t('work.subProject')}>{(c) => <SelectInput {...c} value={sub} onChange={(e) => setSub(e.target.value)}><option value="">{t('work.noSub')}</option>{subs.data!.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}</SelectInput>}</Field>}
          </div>
        )}
        <Field label={t('work.title')} required>{(c) => <TextInput {...c} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={300} dir="auto" />}</Field>
        <Field label={t('work.description')}>{(c) => <TextArea {...c} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} dir="auto" />}</Field>
        <div className="flex flex-wrap items-end gap-4">
          <PriorityPicker value={priority} onChange={setPriority} />
          {task && !reviewing && (
            <Field label={t('work.status')} className="w-44">{(c) => <SelectInput {...c} value={status} onChange={(e) => setStatus(e.target.value as Task['status'])}>{(['todo', 'in_progress', 'done'] as const).map((s) => <option key={s} value={s}>{t(`myTasks.status.${s}`)}</option>)}</SelectInput>}</Field>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('work.due')} hint={t('work.dueHint')}>{(c) => <TextInput {...c} type="date" value={due} onChange={(e) => setDue(e.target.value)} />}</Field>
          <Field label={t('work.hard')} hint={t('work.hardHint')}>{(c) => <TextInput {...c} type="date" value={hard} onChange={(e) => setHard(e.target.value)} />}</Field>
        </div>
        <PeoplePicker label={t('work.assignees')} people={staff.data ?? []} value={people} onChange={setPeople} empty={t('work.noStaff')} />
        {task?.source === 'client' && (
          <div>
            <p className="mb-1.5 text-sm font-medium text-ink">{t('work.clientFiles', { name: typeof task.clientId === 'object' && task.clientId ? task.clientId.name : '' })}</p>
            {media.isLoading ? <div className="h-16 animate-pulse rounded-card bg-rail" /> : <MediaGrid items={media.data ?? []} />}
          </div>
        )}
        {error && <p role="alert" className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      </form>
    </Dialog>
  );
}
