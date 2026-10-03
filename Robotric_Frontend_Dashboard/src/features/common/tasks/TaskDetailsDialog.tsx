import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarClock, Check, ImagePlus, Link2, ListChecks, Paperclip, Plus, Trash2, X } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { useFormat } from '../../../app/format';
import { readApiError } from '../../../app/apiError';
import { cn } from '../../../lib/utils';
import { Badge, Button, Dialog, Field, TextArea, TextInput, type BadgeTone } from '../../../ui';
import { projectName, useExtensions, useSubTasks, useSubmission, type Task, type TaskStatus } from './api';
import { DueChip, PriorityBadge, STATUS_TONE } from './bits';

interface Props {
  task: Task | null;
  onClose: () => void;
  currentUserId?: string;
  busy: boolean;
  onStatus: (t: Task, s: TaskStatus) => void;
}

function Section({ icon, title, extra, children }: { icon: ReactNode; title: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t border-line pt-4">
      <h3 className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-ink">
        <span className="text-ink-3 [&_svg]:size-4">{icon}</span>
        {title}
        {extra && <span className="ms-auto text-xs font-normal text-ink-4">{extra}</span>}
      </h3>
      {children}
    </section>
  );
}

function SubTasks({ taskId, me }: { taskId: string; me?: string }) {
  const { t } = useTranslation('dashboardCommon');
  const toast = useToast();
  const { list, add, toggle, remove } = useSubTasks(taskId);
  const [title, setTitle] = useState('');
  const items = list.data ?? [];
  const done = items.filter((s) => s.isDone).length;
  const fail = (err: unknown) => toast.error(t('errorMessage'), readApiError(err).message);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    add.mutate({ title: title.trim() }, { onSuccess: () => setTitle(''), onError: fail });
  };

  return (
    <Section icon={<ListChecks />} title={t('myTasks.steps')} extra={items.length ? t('myTasks.stepsDone', { done, total: items.length }) : undefined}>
      {items.length > 0 && (
        <>
          <div className="mb-2 h-1.5 overflow-hidden rounded-pill bg-rail">
            <span className="block h-full bg-glow transition-[width]" style={{ width: `${(done / items.length) * 100}%` }} />
          </div>
          <ul className="mb-2 space-y-0.5">
            {items.map((s) => {
              const mine = s.createdBy?._id === me;
              return (
                <li key={s._id} className="group flex items-start gap-2.5 rounded-input px-1 py-1.5 hover:bg-rail">
                  <input type="checkbox" checked={s.isDone} disabled={!mine || toggle.isPending} onChange={() => toggle.mutate(s._id, { onError: fail })} aria-label={s.title} className="mt-0.5 size-4 shrink-0 accent-[#0f1f33]" />
                  <span className="min-w-0 flex-1">
                    <span className={cn('block text-sm text-ink', s.isDone && 'text-ink-4 line-through')}>{s.title}</span>
                    {s.note && <span className="block text-xs text-ink-4">{s.note}</span>}
                    {!mine && <span className="block text-xs text-ink-4">{t('myTasks.by', { name: s.createdBy?.name })}</span>}
                  </span>
                  {mine && (
                    <button type="button" onClick={() => remove.mutate(s._id, { onError: fail })} aria-label={t('myTasks.removeStep', { title: s.title })} className="grid size-7 shrink-0 place-items-center rounded-full text-ink-4 opacity-100 hover:bg-danger-soft hover:text-danger focus-visible:focus-ring sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100">
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
      {items.length === 0 && !list.isLoading && <p className="mb-2 text-sm text-ink-4">{t('myTasks.noSteps')}</p>}
      <form onSubmit={submit} className="flex gap-2">
        <TextInput className="h-10" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('myTasks.stepPlaceholder')} aria-label={t('myTasks.addStep')} />
        <Button type="submit" variant="secondary" size="sm" className="h-10 shrink-0" icon={<Plus />} disabled={!title.trim()} loading={add.isPending}>
          {t('add')}
        </Button>
      </form>
    </Section>
  );
}

function MyWork({ task }: { task: Task }) {
  const { t } = useTranslation('dashboardCommon');
  const toast = useToast();
  const { upload, removeImage, saveLinks } = useSubmission(task._id);
  const [images, setImages] = useState(task.submission?.images ?? []);
  const [links, setLinks] = useState<string[]>(task.submission?.links ?? []);
  const [note, setNote] = useState(task.submission?.note ?? '');
  const [savedNote, setSavedNote] = useState(task.submission?.note ?? '');
  const [link, setLink] = useState('');
  const [linkError, setLinkError] = useState('');
  const [zoom, setZoom] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const fail = (err: unknown) => toast.error(t('errorMessage'), readApiError(err).message);

  const addLink = (e: FormEvent) => {
    e.preventDefault();
    const v = link.trim();
    if (!/^https:\/\/\S+$/.test(v)) return setLinkError(t('myTasks.linkHttps'));
    setLinkError('');
    saveLinks.mutate({ links: [...links, v], note: savedNote }, { onSuccess: (s) => { setLinks(s.links); setLink(''); }, onError: fail });
  };

  return (
    <Section icon={<Paperclip />} title={t('myTasks.myWork')} extra={images.length + links.length ? t('myTasks.items', { count: images.length + links.length }) : undefined}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {images.map((img) => (
            <div key={img.publicId} className="group relative size-20 overflow-hidden rounded-input border border-line bg-rail">
              <button type="button" onClick={() => setZoom(img.url)} aria-label={t('myTasks.viewPhoto')} className="size-full">
                <img src={img.url} alt="" className="size-full object-cover" />
              </button>
              <button
                type="button"
                onClick={() => removeImage.mutate(img.publicId, { onSuccess: () => setImages((cur) => cur.filter((i) => i.publicId !== img.publicId)), onError: fail })}
                aria-label={t('myTasks.removePhoto')}
                className="absolute end-1 top-1 grid size-6 place-items-center rounded-full bg-paper/95 text-danger shadow-card"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => fileRef.current?.click()} disabled={upload.isPending} className="grid size-20 place-items-center rounded-input border border-dashed border-line-strong text-ink-3 hover:border-ink hover:text-ink focus-visible:focus-ring disabled:opacity-50">
            <span className="flex flex-col items-center gap-1 text-xs">
              <ImagePlus className="size-5" aria-hidden />
              {upload.isPending ? t('myTasks.uploading') : t('myTasks.addPhotos')}
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            hidden
            onChange={(e) => {
              const files = [...(e.target.files ?? [])];
              e.target.value = '';
              if (files.length) upload.mutate(files, { onSuccess: (s) => setImages(s.images), onError: fail });
            }}
          />
        </div>

        {links.length > 0 && (
          <ul className="space-y-1">
            {links.map((l, i) => (
              <li key={l + i} className="flex items-center gap-2 text-sm">
                <Link2 className="size-3.5 shrink-0 text-ink-4" aria-hidden />
                <a href={l} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-info underline-offset-2 hover:underline" dir="ltr">
                  {l}
                </a>
                <button
                  type="button"
                  onClick={() => saveLinks.mutate({ links: links.filter((_, j) => j !== i), note: savedNote }, { onSuccess: (s) => setLinks(s.links), onError: fail })}
                  aria-label={t('myTasks.removeLink')}
                  className="grid size-7 place-items-center rounded-full text-ink-4 hover:bg-danger-soft hover:text-danger"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={addLink}>
          <div className="flex gap-2">
            <TextInput className="h-10" type="url" dir="ltr" value={link} onChange={(e) => { setLink(e.target.value); setLinkError(''); }} placeholder="https://…" aria-label={t('myTasks.addLink')} aria-invalid={!!linkError} />
            <Button type="submit" variant="secondary" size="sm" className="h-10 shrink-0" icon={<Plus />} disabled={!link.trim()} loading={saveLinks.isPending && !!link}>
              {t('myTasks.addLink')}
            </Button>
          </div>
          {linkError && <p role="alert" className="mt-1 text-xs text-danger">{linkError}</p>}
        </form>

        <Field label={t('myTasks.noteForManager')}>
          {(c) => <TextArea {...c} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />}
        </Field>
        {note !== savedNote && (
          <Button size="sm" variant="secondary" icon={<Check />} loading={saveLinks.isPending} onClick={() => saveLinks.mutate({ links, note }, { onSuccess: () => { setSavedNote(note); toast.success(t('myTasks.noteSaved')); }, onError: fail })}>
            {t('myTasks.saveNote')}
          </Button>
        )}
      </div>

      <Dialog open={!!zoom} onClose={() => setZoom(null)} size="lg" title={t('myTasks.viewPhoto')} closeLabel={t('close')}>
        {zoom && <img src={zoom} alt="" className="max-h-[70vh] w-full rounded-input object-contain" />}
      </Dialog>
    </Section>
  );
}

const EXT_TONE: Record<string, BadgeTone> = { pending: 'warning', approved: 'success', rejected: 'danger' };

function MoreTime({ task }: { task: Task }) {
  const { t } = useTranslation('dashboardCommon');
  const f = useFormat();
  const toast = useToast();
  const { list, request, withdraw } = useExtensions(task._id);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [date, setDate] = useState('');
  const [error, setError] = useState('');
  const items = list.data ?? [];
  const pending = items.some((r) => r.status === 'pending');
  const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return setError(t('myTasks.errReason'));
    if (!date) return setError(t('myTasks.errDate'));
    setError('');
    request.mutate(
      { reason: reason.trim(), proposedDate: new Date(`${date}T17:00`).toISOString() },
      { onSuccess: () => { setOpen(false); setReason(''); setDate(''); toast.success(t('myTasks.requestSent')); }, onError: (err) => setError(readApiError(err).message) },
    );
  };

  return (
    <Section icon={<CalendarClock />} title={t('myTasks.moreTime')}>
      {(task.dueDate || task.hardDeadline) && (
        <p className="mb-2 text-sm text-ink-3">
          {task.dueDate && t('myTasks.dueOn', { date: f.date(task.dueDate) })}
          {task.dueDate && task.hardDeadline && ' · '}
          {task.hardDeadline && <span className="font-medium text-danger">{t('myTasks.hardOn', { date: f.date(task.hardDeadline) })}</span>}
        </p>
      )}
      {items.length > 0 && (
        <ul className="mb-2 space-y-2">
          {items.map((r) => (
            <li key={r._id} className="rounded-input border border-line p-3 text-sm">
              <div className="flex items-start gap-2">
                <p className="min-w-0 flex-1 text-ink">{r.reason}</p>
                <Badge tone={EXT_TONE[r.status]}>{t(`myTasks.ext.${r.status}`)}</Badge>
                {r.status === 'pending' && (
                  <button type="button" onClick={() => withdraw.mutate(r._id)} aria-label={t('myTasks.withdraw')} title={t('myTasks.withdraw')} className="grid size-7 place-items-center rounded-full text-ink-4 hover:bg-danger-soft hover:text-danger">
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-ink-4">{t('myTasks.askedFor', { date: f.date(r.proposedDate), sent: f.date(r.createdAt) })}</p>
              {r.reviewNote && <p className="mt-2 rounded-input bg-rail px-2.5 py-1.5 text-xs text-ink-2">{t('myTasks.managerNote', { note: r.reviewNote })}</p>}
            </li>
          ))}
        </ul>
      )}
      {pending ? (
        <p className="text-xs text-ink-4">{t('myTasks.waitReply')}</p>
      ) : open ? (
        <form onSubmit={submit} className="space-y-3 rounded-input border border-line bg-canvas p-3">
          <Field label={t('myTasks.reason')} required>{(c) => <TextArea {...c} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />}</Field>
          <Field label={t('myTasks.newDate')} required>{(c) => <TextInput {...c} type="date" min={tomorrow} value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />}</Field>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" loading={request.isPending}>{t('myTasks.sendRequest')}</Button>
            <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setError(''); }}>{t('cancel')}</Button>
          </div>
        </form>
      ) : (
        <Button size="sm" variant="secondary" icon={<CalendarClock />} onClick={() => setOpen(true)} disabled={task.status === 'done'}>
          {t('myTasks.askMoreTime')}
        </Button>
      )}
    </Section>
  );
}

/** Everything about one task: what to do, steps, the work handed in, and asking for more time. */
export function TaskDetailsDialog({ task, onClose, currentUserId, busy, onStatus }: Props) {
  const { t } = useTranslation('dashboardCommon');
  const last = useRef<Task | null>(null);
  if (task) last.current = task;
  const shown = task ?? last.current;
  // Fresh sections for each task (their local state starts from that task)
  const [key, setKey] = useState(0);
  useEffect(() => { if (task) setKey((k) => k + 1); }, [task?._id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!shown) return null;

  const next: { label: string; to: TaskStatus; variant: 'primary' | 'ghost' }[] =
    shown.status === 'todo'
      ? [{ label: t('myTasks.start'), to: 'in_progress', variant: 'primary' }]
      : shown.status === 'in_progress'
        ? [{ label: t('myTasks.backToDo'), to: 'todo', variant: 'ghost' }, { label: t('myTasks.markDone'), to: 'done', variant: 'primary' }]
        : [{ label: t('myTasks.reopen'), to: 'in_progress', variant: 'ghost' }];

  return (
    <Dialog
      open={!!task}
      onClose={onClose}
      size="lg"
      title={shown.title}
      description={projectName(shown) || undefined}
      closeLabel={t('close')}
      footer={next.map((n) => (
        <Button key={n.to} variant={n.variant} loading={busy && n.variant === 'primary'} disabled={busy} onClick={() => onStatus(shown, n.to)}>
          {n.label}
        </Button>
      ))}
    >
      <div key={key} className="max-h-[62vh] space-y-4 overflow-y-auto pe-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={STATUS_TONE[shown.status]}>{t(`myTasks.status.${shown.status}`)}</Badge>
          <PriorityBadge p={shown.priority} />
          {shown.status !== 'done' && <DueChip task={shown} />}
        </div>
        {shown.description ? <p className="whitespace-pre-line text-sm leading-relaxed text-ink-2">{shown.description}</p> : <p className="text-sm text-ink-4">{t('myTasks.noDescription')}</p>}
        {!!shown.attachments?.length && (
          <div>
            <p className="mb-1.5 text-xs font-medium text-ink-3">{t('myTasks.fromManager')}</p>
            <div className="flex flex-wrap gap-2">
              {shown.attachments.map((a) => (
                <a key={a.publicId} href={a.url} target="_blank" rel="noreferrer" className="size-20 overflow-hidden rounded-input border border-line">
                  <img src={a.url} alt={a.name ?? ''} className="size-full object-cover" />
                </a>
              ))}
            </div>
          </div>
        )}
        <SubTasks taskId={shown._id} me={currentUserId} />
        <MyWork task={shown} />
        <MoreTime task={shown} />
      </div>
    </Dialog>
  );
}
