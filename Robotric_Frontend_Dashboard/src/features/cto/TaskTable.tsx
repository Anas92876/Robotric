import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Ban, CheckCircle2, Inbox, Pencil, Trash2 } from 'lucide-react';
import { readApiError } from '../../app/apiError';
import { useToast } from '../../components/ui/Toast';
import { Badge, Button, ConfirmDialog, DataTable, Dialog, EmptyState, Field, RowMenu, TextArea, type Column } from '../../ui';
import { DueChip, PriorityBadge, STATUS_TONE } from '../common/tasks/bits';
import { nameOf, useWorkMutations, type Task } from './api';
import { TaskDialog } from './WorkDialogs';

/** Tasks with their project, people, deadline, priority and status; edit, accept/decline client requests, delete. */
export function TaskTable({ tasks, loading, showProject = true, empty }: { tasks: Task[]; loading: boolean; showProject?: boolean; empty?: string }) {
  const { t } = useTranslation('dashboardCommon');
  const toast = useToast();
  const m = useWorkMutations();
  const [editing, setEditing] = useState<Task | null>(null);
  const lastEdit = useRef(editing);
  if (editing) lastEdit.current = editing;
  const [deleting, setDeleting] = useState<Task | null>(null);
  const lastDel = useRef(deleting);
  if (deleting) lastDel.current = deleting;
  const [declining, setDeclining] = useState<Task | null>(null);
  const [reason, setReason] = useState('');
  const fail = (e: unknown) => toast.error(t('cto.error'), readApiError(e).message);

  const columns: Column<Task>[] = useMemo(
    () => [
      {
        key: 'task', header: t('myTasks.col.task'),
        cell: (x) => (
          <button type="button" onClick={() => setEditing(x)} className="block max-w-sm rounded-md text-start focus-visible:focus-ring">
            <span className="flex items-center gap-1.5">
              {x.source === 'client' && <Badge tone="info" icon={<Inbox />}>{t('work.fromClient')}</Badge>}
              <span className="truncate font-medium text-ink underline-offset-2 hover:underline" dir="auto">{x.title}</span>
            </span>
            {showProject && <span className="block truncate text-xs text-ink-4" dir="auto">{[nameOf(x.projectId), nameOf(x.subProjectId ?? null)].filter(Boolean).join(' › ')}</span>}
          </button>
        ),
      },
      { key: 'people', header: t('work.assignees'), hideOnMobile: true, cell: (x) => <span className="block max-w-[200px] truncate text-sm text-ink-2" dir="auto">{x.assignedTo.map((a) => a.name).join(', ') || <span className="text-ink-4">{t('work.nobody')}</span>}</span> },
      { key: 'due', header: t('myTasks.col.due'), cell: (x) => (x.status === 'done' || x.status === 'declined' ? <span className="text-ink-4">—</span> : <DueChip task={x} compact />) },
      { key: 'priority', header: t('myTasks.col.priority'), hideOnMobile: true, cell: (x) => <PriorityBadge p={x.priority} /> },
      { key: 'status', header: t('work.status'), cell: (x) => <Badge tone={STATUS_TONE[x.status]}>{t(`myTasks.status.${x.status}`)}</Badge> },
      {
        key: 'menu', header: <span className="sr-only">{t('work.actions')}</span>, align: 'end',
        cell: (x) => <RowMenu label={t('work.actionsFor', { name: x.title })} actions={[
          { label: t(x.status === 'pending_review' ? 'work.accept' : 'work.edit'), icon: x.status === 'pending_review' ? <CheckCircle2 /> : <Pencil />, onClick: () => setEditing(x) },
          { label: t('work.decline'), icon: <Ban />, onClick: () => { setReason(''); setDeclining(x); }, hidden: !(x.source === 'client' && x.status === 'pending_review') },
          { label: t('work.deleteTask'), icon: <Trash2 />, tone: 'danger', onClick: () => setDeleting(x), hidden: x.status !== 'todo' },
        ]} />,
      },
    ],
    [t, showProject],
  );

  return (
    <>
      <DataTable label={t('work.tasks')} columns={columns} rows={tasks} rowKey={(x) => x._id} loading={loading} empty={<EmptyState icon={<Inbox />} title={empty ?? t('work.noTasks')} />} />
      <TaskDialog open={!!editing} onClose={() => setEditing(null)} task={editing ?? lastEdit.current} />
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} tone="danger" title={t('work.deleteTaskTitle')} message={t('work.deleteTaskText', { name: (deleting ?? lastDel.current)?.title ?? '' })} confirmLabel={t('work.deleteTask')} cancelLabel={t('cto.cancel')} loading={m.deleteTask.isPending}
        onConfirm={() => m.deleteTask.mutate(deleting!._id, { onSuccess: () => toast.success(t('work.toast.taskDeleted')), onError: fail, onSettled: () => setDeleting(null) })} />
      <Dialog open={!!declining} onClose={() => setDeclining(null)} title={t('work.declineTitle')} description={declining?.title} closeLabel={t('cto.cancel')}
        footer={<><Button variant="ghost" onClick={() => setDeclining(null)}>{t('cto.cancel')}</Button><Button variant="danger" disabled={!reason.trim()} loading={m.declineTask.isPending} onClick={() => m.declineTask.mutate({ id: declining!._id, reason: reason.trim() }, { onSuccess: () => { toast.success(t('work.toast.declined')); setDeclining(null); }, onError: fail })}>{t('work.decline')}</Button></>}>
        <Field label={t('work.reason')} hint={t('work.reasonHint')}>{(c) => <TextArea {...c} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} dir="auto" />}</Field>
      </Dialog>
    </>
  );
}
