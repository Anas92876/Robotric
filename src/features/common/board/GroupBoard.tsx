import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CalendarClock, Check, ClipboardList, Lock, Pencil, Pin, PinOff, Plus, Send, Trash2, UserRound } from 'lucide-react';
import { api } from '../../../lib/api';
import { useAuth } from '../../../providers/AuthProvider';
import { useToast } from '../../../components/ui/Toast';
import { useFormat } from '../../../app/format';
import { readApiError } from '../../../app/apiError';
import { cn } from '../../../lib/utils';
import type { BoardNote, BoardTask } from '../../../hooks/board/useGroupBoard';
import { Badge, Button, ConfirmDialog, Dialog, EmptyState, Field, Panel, PanelTitle, RowMenu, SelectInput, TextArea, TextInput, type BadgeTone } from '../../../ui';

type Role = 'student' | 'trainer';
type Status = BoardTask['status'];
const STATUSES: Status[] = ['todo', 'in_progress', 'done'];
const PRIORITY_TONE: Record<1 | 2 | 3, BadgeTone> = { 1: 'danger', 2: 'warning', 3: 'neutral' };
interface Member { _id: string; name: string }

function useBoard(groupId: string, role: Role) {
  const base = role === 'student' ? '/student/board' : '/trainer/board';
  const key = ['board', role, groupId];
  const qc = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation('dashboardCommon');
  const refresh = () => void qc.invalidateQueries({ queryKey: key });
  const fail = (err: unknown) => toast.error(t('errorMessage'), readApiError(err).message);
  const m = <A,>(fn: (a: A) => Promise<unknown>, ok?: string) => ({ mutationFn: fn, onSuccess: () => { refresh(); if (ok) toast.success(ok); }, onError: fail });
  return {
    board: useQuery({
      queryKey: key,
      queryFn: async () => {
        try {
          const d = (await api.get(`${base}/${groupId}`, { skipErrorToast: true } as object)).data.data;
          return { notes: d.notes as BoardNote[], tasks: d.tasks as BoardTask[], disabled: false };
        } catch (err) {
          if (readApiError(err).code === 'BOARD_NOT_ENABLED') return { notes: [], tasks: [], disabled: true };
          throw err;
        }
      },
      retry: false,
    }),
    addNote: useMutation(m((content: string) => api.post(`${base}/${groupId}/notes`, { content }))),
    editNote: useMutation(m(({ id, ...b }: { id: string; content?: string; isPinned?: boolean }) => api.patch(`${base}/${groupId}/notes/${id}`, b))),
    removeNote: useMutation(m((id: string) => api.delete(`${base}/${groupId}/notes/${id}`), t('board.toast.noteDeleted'))),
    saveTask: useMutation(m(({ id, ...b }: { id?: string } & Record<string, unknown>) => (id ? api.patch(`${base}/${groupId}/tasks/${id}`, b) : api.post(`${base}/${groupId}/tasks`, b)))),
    removeTask: useMutation(m((id: string) => api.delete(`${base}/${groupId}/tasks/${id}`), t('board.toast.taskDeleted'))),
    moveTask: useMutation(m(({ id, status }: { id: string; status: Status }) => (role === 'student' ? api.patch(`${base}/${groupId}/tasks/${id}/status`, { status }) : api.patch(`${base}/${groupId}/tasks/${id}`, { status })))),
  };
}

function TaskDialog({ open, onClose, task, members, saving, onSave }: { open: boolean; onClose: () => void; task: BoardTask | null; members: Member[]; saving: boolean; onSave: (b: Record<string, unknown>) => void }) {
  const { t } = useTranslation('dashboardCommon');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<1 | 2 | 3>(2);
  const [due, setDue] = useState('');
  const [assigned, setAssigned] = useState<string[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? '');
    setDescription(task?.description ?? '');
    setPriority(task?.priority ?? 2);
    setDue(task?.dueDate ? task.dueDate.slice(0, 10) : '');
    setAssigned(task?.assignedTo.map((a) => a._id) ?? []);
    setError('');
  }, [open, task]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError(t('board.errTitle'));
    onSave({ title: title.trim(), description: description.trim(), priority, assignedTo: assigned, dueDate: due || null });
  };
  return (
    <Dialog open={open} onClose={onClose} title={t(task ? 'board.editTask' : 'board.newTask')} closeLabel={t('close')}
      footer={<><Button variant="ghost" onClick={onClose}>{t('cancel')}</Button><Button type="submit" form="board-task" loading={saving}>{t(task ? 'save' : 'create')}</Button></>}>
      <form id="board-task" onSubmit={submit} className="space-y-4" noValidate>
        <Field label={t('board.f.title')} required>{(c) => <TextInput {...c} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={300} autoFocus />}</Field>
        <Field label={t('board.f.description')}>{(c) => <TextArea {...c} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />}</Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('board.f.priority')}>
            {(c) => <SelectInput {...c} value={priority} onChange={(e) => setPriority(Number(e.target.value) as 1 | 2 | 3)}>{[1, 2, 3].map((p) => <option key={p} value={p}>{t(`board.priority.${p}`)}</option>)}</SelectInput>}
          </Field>
          <Field label={t('board.f.due')}>{(c) => <TextInput {...c} type="date" value={due} onChange={(e) => setDue(e.target.value)} />}</Field>
        </div>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-ink">{t('board.f.assign')}</legend>
          {members.length === 0 ? <p className="text-sm text-ink-4">{t('board.noMembers')}</p> : (
            <div className="flex flex-wrap gap-2">
              {members.map((mm) => {
                const on = assigned.includes(mm._id);
                return (
                  <button key={mm._id} type="button" aria-pressed={on} onClick={() => setAssigned(on ? assigned.filter((x) => x !== mm._id) : [...assigned, mm._id])}
                    className={cn('inline-flex h-8 items-center gap-1 rounded-pill border px-3 text-sm focus-visible:focus-ring', on ? 'border-ink bg-ink text-white' : 'border-line-strong text-ink-2 hover:border-ink')}>
                    {on && <Check className="size-3.5" aria-hidden />}{mm.name}
                  </button>
                );
              })}
            </div>
          )}
        </fieldset>
        {error && <p role="alert" className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      </form>
    </Dialog>
  );
}

/** Group board shared by trainers and students: tasks in three columns and a wall of notes. */
export function GroupBoard({ groupId, role, members = [] }: { groupId: string; role: Role; members?: Member[] }) {
  const { t } = useTranslation('dashboardCommon');
  const f = useFormat();
  const { user } = useAuth();
  const me = user?._id || user?.id;
  const b = useBoard(groupId, role);
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState<BoardNote | null>(null);
  const [editText, setEditText] = useState('');
  const [taskForm, setTaskForm] = useState<{ task: BoardTask | null } | null>(null);
  const [deleting, setDeleting] = useState<{ kind: 'note' | 'task'; id: string } | null>(null);
  const lastForm = useRef<BoardTask | null>(null);
  if (taskForm) lastForm.current = taskForm.task;
  const trainer = role === 'trainer';

  if (b.board.isError) return <Panel><EmptyState icon={<ClipboardList />} title={readApiError(b.board.error).message} /></Panel>;
  if (b.board.data?.disabled) return <Panel><EmptyState icon={<Lock />} title={t('board.disabled')} description={t('board.disabledHint')} /></Panel>;
  const notes = [...(b.board.data?.notes ?? [])].sort((x, y) => Number(y.isPinned) - Number(x.isPinned) || +new Date(y.createdAt) - +new Date(x.createdAt));
  const tasks = b.board.data?.tasks ?? [];

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Panel className="min-w-0">
        <PanelTitle title={t('board.tasks')} actions={trainer ? <Button size="sm" icon={<Plus />} onClick={() => setTaskForm({ task: null })}>{t('board.newTask')}</Button> : undefined} />
        {b.board.isLoading ? <div className="h-48 animate-pulse rounded-card bg-rail" /> : (
          <div className="grid gap-3 md:grid-cols-3">
            {STATUSES.map((s) => {
              const col = tasks.filter((x) => x.status === s);
              return (
                <section key={s} aria-label={t(`board.status.${s}`)} className="rounded-card bg-canvas p-3">
                  <h3 className="mb-2 flex items-center justify-between text-sm font-semibold text-ink">{t(`board.status.${s}`)}<span className="text-xs font-normal tabular-nums text-ink-4">{col.length}</span></h3>
                  <ul className="space-y-2">
                    {col.length === 0 && <li className="py-3 text-center text-xs text-ink-4">{t('board.emptyCol')}</li>}
                    {col.map((x) => {
                      const mine = x.assignedTo.some((a) => a._id === me);
                      const canMove = trainer || mine;
                      return (
                        <li key={x._id} className="rounded-input border border-line bg-paper p-3">
                          <div className="flex items-start gap-2">
                            <p className="min-w-0 flex-1 text-sm font-medium text-ink" dir="auto">{x.title}</p>
                            {trainer && <RowMenu label={t('board.taskActions', { title: x.title })} actions={[{ label: t('edit'), icon: <Pencil />, onClick: () => setTaskForm({ task: x }) }, { label: t('delete'), icon: <Trash2 />, tone: 'danger', onClick: () => setDeleting({ kind: 'task', id: x._id }) }]} />}
                          </div>
                          {x.description && <p className="mt-1 line-clamp-3 text-xs text-ink-3" dir="auto">{x.description}</p>}
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <Badge tone={PRIORITY_TONE[x.priority]}>{t(`board.priority.${x.priority}`)}</Badge>
                            {x.dueDate && <span className="inline-flex items-center gap-1 text-xs text-ink-4"><CalendarClock className="size-3.5" aria-hidden />{f.dayMonth(x.dueDate)}</span>}
                          </div>
                          {x.assignedTo.length > 0 && <p className="mt-1.5 flex items-center gap-1 text-xs text-ink-4"><UserRound className="size-3.5 shrink-0" aria-hidden /><span className="truncate">{x.assignedTo.map((a) => (a._id === me ? t('board.you') : a.name)).join('، ')}</span></p>}
                          {canMove && (
                            <SelectInput aria-label={t('board.moveTo')} value={x.status} onChange={(e) => b.moveTask.mutate({ id: x._id, status: e.target.value as Status })} className="mt-2 h-8 text-xs">
                              {STATUSES.map((st) => <option key={st} value={st}>{t(`board.status.${st}`)}</option>)}
                            </SelectInput>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel>
        <PanelTitle title={t('board.notes')} />
        <form onSubmit={(e) => { e.preventDefault(); if (note.trim()) b.addNote.mutate(note.trim(), { onSuccess: () => setNote('') }); }} className="mb-4 space-y-2">
          <TextArea rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} placeholder={t('board.notePlaceholder')} aria-label={t('board.newNote')} />
          <div className="flex justify-end"><Button type="submit" size="sm" icon={<Send />} disabled={!note.trim()} loading={b.addNote.isPending}>{t('board.post')}</Button></div>
        </form>
        {notes.length === 0 ? <p className="py-4 text-center text-sm text-ink-4">{t('board.noNotes')}</p> : (
          <ul className="space-y-2">
            {notes.map((n) => {
              const own = n.author?._id === me;
              return (
                <li key={n._id} className={cn('rounded-card border p-3', n.isPinned ? 'border-glow-deep/40 bg-frost' : 'border-line')}>
                  <div className="mb-1 flex items-center gap-2 text-xs text-ink-4">
                    {n.isPinned && <Pin className="size-3.5 text-glow-deep" aria-label={t('board.pinned')} />}
                    <span className="font-medium text-ink-2">{own ? t('board.you') : n.author?.name}</span>
                    <span>· {f.date(n.createdAt)}</span>
                    {(own || trainer) && (
                      <span className="ms-auto">
                        <RowMenu label={t('board.noteActions')} actions={[
                          { label: t('edit'), icon: <Pencil />, onClick: () => { setEditing(n); setEditText(n.content); }, hidden: !own && !trainer },
                          { label: t(n.isPinned ? 'board.unpin' : 'board.pin'), icon: n.isPinned ? <PinOff /> : <Pin />, onClick: () => b.editNote.mutate({ id: n._id, isPinned: !n.isPinned }), hidden: !trainer },
                          { label: t('delete'), icon: <Trash2 />, tone: 'danger', onClick: () => setDeleting({ kind: 'note', id: n._id }) },
                        ]} />
                      </span>
                    )}
                  </div>
                  {editing?._id === n._id ? (
                    <form onSubmit={(e) => { e.preventDefault(); if (editText.trim()) b.editNote.mutate({ id: n._id, content: editText.trim() }, { onSuccess: () => setEditing(null) }); }} className="space-y-2">
                      <TextArea rows={3} value={editText} onChange={(e) => setEditText(e.target.value)} maxLength={2000} aria-label={t('edit')} autoFocus />
                      <div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => setEditing(null)}>{t('cancel')}</Button><Button type="submit" size="sm" loading={b.editNote.isPending}>{t('save')}</Button></div>
                    </form>
                  ) : (
                    <p className="whitespace-pre-line text-sm text-ink" dir="auto">{n.content}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {trainer && (
        <TaskDialog open={!!taskForm} onClose={() => setTaskForm(null)} task={taskForm ? taskForm.task : lastForm.current} members={members} saving={b.saveTask.isPending}
          onSave={(body) => b.saveTask.mutate({ id: taskForm?.task?._id, ...body }, { onSuccess: () => setTaskForm(null) })} />
      )}
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} tone="danger" title={t(deleting?.kind === 'task' ? 'board.deleteTask' : 'board.deleteNote')} message={t('board.deleteText')} confirmLabel={t('delete')} cancelLabel={t('cancel')}
        loading={b.removeNote.isPending || b.removeTask.isPending}
        onConfirm={() => (deleting!.kind === 'note' ? b.removeNote : b.removeTask).mutate(deleting!.id, { onSettled: () => setDeleting(null) })} />
    </div>
  );
}
