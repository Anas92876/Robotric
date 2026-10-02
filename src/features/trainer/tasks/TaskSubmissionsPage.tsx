import { useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarClock, Check, CheckCircle2, ClipboardCheck, Download, Hourglass, Paperclip, Pencil, RotateCcw, Users, X } from 'lucide-react';
import { useFormat } from '../../../app/format';
import { readApiError } from '../../../app/apiError';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/utils';
import { Badge, Button, DataTable, Dialog, EmptyState, Field, PageHeader, Panel, PanelTitle, StatTile, TextArea, TextInput, type BadgeTone, type Column } from '../../../ui';
import { fileLink, idOf, useTaskDetails, useTaskMutations, type Submission, type TrainerTask } from './api';
import { TASK_TONE } from './TasksPage';

const SUB_TONE: Record<Submission['status'], BadgeTone> = { not_submitted: 'neutral', pending_review: 'warning', graded: 'success', returned: 'info' };
const student = (s: Submission) => (typeof s.studentId === 'object' ? s.studentId : { _id: s.studentId, name: '', email: '' });

/** What the student answered, question by question, with right MCQ choices marked. */
function Answers({ task, sub }: { task: TrainerTask; sub: Submission }) {
  const { t, i18n } = useTranslation('dashboardTrainer');
  const toast = useToast();
  const ar = i18n.language === 'ar';
  const byId = new Map(sub.answers.map((a) => [a.questionId, a]));
  const open = async (fileId: string) => {
    try { window.open((await fileLink(task._id, sub._id, fileId)).downloadUrl, '_blank', 'noopener'); } catch (e) { toast.error(t('sp.actionError'), readApiError(e).message); }
  };
  return (
    <div className="space-y-3">
      {task.questions.length === 0 && !sub.attachedFiles.length && <p className="text-sm text-ink-4">{t('ts.nothing')}</p>}
      {task.questions.map((q, i) => {
        const a = byId.get(q._id);
        return (
          <section key={q._id} className="rounded-card border border-line p-3">
            <div className="flex items-start gap-2">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-rail text-xs font-semibold text-ink">{i + 1}</span>
              <p className="min-w-0 flex-1 text-sm font-medium text-ink" dir="auto">{(ar && q.questionTextAr) || q.questionText}</p>
              <span className="shrink-0 text-xs text-ink-4">{t('ts.points', { count: q.points })}</span>
            </div>
            <div className="mt-2 ps-8">
              {!a ? <p className="text-sm italic text-ink-4">{t('ts.noAnswer')}</p>
                : q.answerType === 'mcq' ? (
                  <ul className="space-y-1">
                    {q.options.map((o, k) => {
                      const picked = a.selectedAnswers?.includes(k);
                      const right = q.correctAnswers.includes(k);
                      return (
                        <li key={k} className={cn('flex items-center gap-2 rounded-md px-2 py-1 text-sm', picked && right && 'bg-success-soft text-ink', picked && !right && 'bg-danger-soft text-ink', !picked && 'text-ink-3')}>
                          {picked ? (right ? <Check className="size-4 text-success" aria-hidden /> : <X className="size-4 text-danger" aria-hidden />) : <span className="size-4" />}
                          <span dir="auto" className="min-w-0 flex-1">{o}</span>
                          {picked && <span className="text-xs">{t('ts.picked')}</span>}
                          {right && !picked && <span className="text-xs text-success">{t('ts.right')}</span>}
                        </li>
                      );
                    })}
                  </ul>
                ) : q.answerType === 'text' ? <p className="whitespace-pre-wrap text-sm text-ink-2" dir="auto">{a.textAnswer}</p>
                : (
                  <div className="flex flex-wrap gap-2">
                    {(a.imageAnswers ?? []).map((img, k) => img.cloudinaryUrl
                      ? <a key={k} href={img.cloudinaryUrl} target="_blank" rel="noopener noreferrer" className="block rounded-md focus-visible:focus-ring"><img src={img.cloudinaryUrl} alt={t('ts.photo', { n: k + 1 })} className="size-28 rounded-md border border-line object-cover" /></a>
                      : <span key={k} className="text-xs text-ink-4">{img.filename}</span>)}
                  </div>
                )}
            </div>
          </section>
        );
      })}
      {sub.attachedFiles.length > 0 && (
        <section className="rounded-card border border-line p-3">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-ink"><Paperclip className="size-4" aria-hidden />{t('ts.files')}</p>
          <ul className="space-y-1">
            {sub.attachedFiles.map((file) => (
              <li key={file._id} className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate" dir="auto">{file.originalName || file.filename}</span>
                <Button size="sm" variant="ghost" icon={<Download />} onClick={() => void open(file._id)}>{t('ts.download')}</Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** One task: who handed it in, and grading each submission. */
export default function TaskSubmissionsPage() {
  const { taskId = '' } = useParams();
  const { t, i18n } = useTranslation('dashboardTrainer');
  const f = useFormat();
  const toast = useToast();
  const q = useTaskDetails(taskId);
  const { grade } = useTaskMutations();
  const [open, setOpen] = useState<Submission | null>(null);
  const last = useRef(open);
  if (open) last.current = open;
  const shown = open ?? last.current;
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const task = q.data?.task;
  const subs = q.data?.submissions ?? [];
  const ar = i18n.language === 'ar';
  const name = task ? (ar && task.titleAr) || task.title : '';
  const state = task ? (task.status === 'draft' ? 'draft' : task.status === 'closed' || new Date(task.deadline).getTime() < Date.now() ? 'past' : 'open') : 'open';

  const review = (s: Submission) => { setOpen(s); setScore(s.score != null ? String(s.score) : ''); setFeedback(s.feedback ?? ''); setError(''); };
  const send = (status: 'graded' | 'returned') => {
    const n = Number(score);
    if (status === 'graded' && (score.trim() === '' || Number.isNaN(n) || n < 0 || n > task!.maxScore)) return setError(t('ts.errScore', { max: task!.maxScore }));
    setError('');
    grade.mutate(
      { taskId, subId: open!._id, d: { score: score.trim() === '' ? 0 : n, feedback: feedback.trim(), status } },
      { onSuccess: () => { toast.success(t(status === 'graded' ? 'ts.toast.graded' : 'ts.toast.returned')); setOpen(null); }, onError: (e) => setError(readApiError(e).message) },
    );
  };

  /** Points earned on the multiple-choice questions, to help pick a score. */
  const mcqHint = (s: Submission) => {
    if (!task) return null;
    const mcq = task.questions.filter((x) => x.answerType === 'mcq');
    if (!mcq.length) return null;
    const got = mcq.reduce((sum, x) => {
      const a = s.answers.find((y) => y.questionId === x._id)?.selectedAnswers ?? [];
      const ok = a.length === x.correctAnswers.length && a.every((k) => x.correctAnswers.includes(k));
      return sum + (ok ? x.points : 0);
    }, 0);
    return { got, of: mcq.reduce((sum, x) => sum + x.points, 0) };
  };

  const columns: Column<Submission>[] = useMemo(
    () => [
      { key: 'student', header: t('ts.col.student'), cell: (s) => <span className="block max-w-xs"><span className="block truncate font-medium text-ink" dir="auto">{student(s).name}</span><span className="block truncate text-xs text-ink-4" dir="ltr">{student(s).email}</span></span> },
      { key: 'when', header: t('ts.col.submitted'), cell: (s) => s.submittedAt ? <span className="flex flex-wrap items-center gap-1.5 whitespace-nowrap tabular-nums text-ink-2">{f.dayMonth(s.submittedAt)} · <bdi dir="ltr">{f.time(s.submittedAt)}</bdi>{s.isLate && <Badge tone="danger">{t('ts.late')}</Badge>}</span> : <span className="text-ink-4">—</span> },
      { key: 'status', header: t('tk.col.status'), cell: (s) => <Badge tone={SUB_TONE[s.status]}>{t(`ts.status.${s.status}`)}</Badge> },
      { key: 'score', header: t('tk.col.score'), align: 'end', cell: (s) => <span className="tabular-nums text-ink-2" dir="ltr">{s.score != null && s.status !== 'pending_review' ? `${s.score} / ${task?.maxScore ?? ''}` : '—'}</span> },
      { key: 'go', header: <span className="sr-only">{t('tk.col.actions')}</span>, align: 'end', cell: (s) => <Button size="sm" variant={s.status === 'pending_review' ? 'primary' : 'secondary'} icon={s.status === 'pending_review' ? <ClipboardCheck /> : <Pencil />} onClick={() => review(s)} aria-label={`${t(s.status === 'pending_review' ? 'ts.grade' : 'ts.view')} — ${student(s).name}`}>{t(s.status === 'pending_review' ? 'ts.grade' : 'ts.view')}</Button> },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, f, task?.maxScore],
  );
  const hint = shown ? mcqHint(shown) : null;

  return (
    <div className="space-y-5">
      <PageHeader
        back={{ to: `/trainer/tasks${task ? `?group=${idOf(task.groupId)}` : ''}`, label: t('tk.title') }}
        title={<span dir="auto">{name || t('ts.title')}</span>}
        description={task && <span className="flex flex-wrap items-center gap-2"><Badge tone={TASK_TONE[state]}>{t(`tk.state.${state}`)}</Badge><span>{typeof task.groupId === 'object' ? task.groupId.name : ''}</span><span className="inline-flex items-center gap-1"><CalendarClock className="size-4" aria-hidden />{f.custom(task.deadline, { weekday: 'short', day: 'numeric', month: 'short' })} · <bdi dir="ltr">{f.time(task.deadline)}</bdi></span></span>}
        actions={task && <Link to={`/trainer/tasks/${taskId}/edit`} className="inline-flex h-11 items-center gap-2 rounded-pill border border-line-strong px-5 text-sm font-medium text-ink hover:border-ink focus-visible:focus-ring"><Pencil className="size-4" aria-hidden />{t('sp.edit')}</Link>}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile icon={<Users />} tint="bg-tint-leaf" label={t('ts.handedIn')} value={subs.filter((s) => s.status !== 'not_submitted').length} loading={q.isLoading} />
        <StatTile icon={<Hourglass />} tint="bg-tint-straw" label={t('ts.toGrade')} value={subs.filter((s) => s.status === 'pending_review').length} loading={q.isLoading} />
        <StatTile icon={<CheckCircle2 />} tint="bg-tint-sage" label={t('ts.graded')} value={subs.filter((s) => s.status === 'graded').length} loading={q.isLoading} />
        <StatTile icon={<RotateCcw />} tint="bg-tint-sand" label={t('ts.returned')} value={subs.filter((s) => s.status === 'returned').length} loading={q.isLoading} />
      </div>
      {task?.description && (
        <Panel>
          <PanelTitle title={t('tb.description')} />
          <p className="whitespace-pre-wrap text-sm text-ink-2" dir="auto">{(ar && task.descriptionAr) || task.description}</p>
        </Panel>
      )}
      <Panel className="p-0 sm:p-0">
        {q.isError ? <EmptyState icon={<ClipboardCheck />} title={readApiError(q.error).message} action={<Button variant="secondary" onClick={() => void q.refetch()}>{t('grp.retry')}</Button>} /> : (
          <DataTable label={t('ts.title')} columns={columns} rows={subs.filter((s) => s.status !== 'not_submitted')} rowKey={(s) => s._id} loading={q.isLoading} empty={<EmptyState icon={<ClipboardCheck />} title={t(task?.status === 'draft' ? 'ts.draftNone' : 'ts.none')} />} />
        )}
      </Panel>

      <Dialog
        open={!!open} onClose={() => setOpen(null)} size="lg" closeLabel={t('sf.cancel')}
        title={shown ? student(shown).name : ''}
        description={shown?.submittedAt ? <>{t('ts.submittedOn', { date: f.dayMonth(shown.submittedAt) })} <bdi dir="ltr">{f.time(shown.submittedAt)}</bdi>{shown.isLate ? ` · ${t('ts.late')}` : ''}</> : undefined}
        footer={<>
          <Button variant="ghost" icon={<RotateCcw />} onClick={() => send('returned')} disabled={grade.isPending}>{t('ts.return')}</Button>
          <Button icon={<Check />} onClick={() => send('graded')} loading={grade.isPending && grade.variables?.d.status === 'graded'} disabled={grade.isPending}>{t('ts.save')}</Button>
        </>}
      >
        {task && shown && (
          <div className="space-y-4">
            <Answers task={task} sub={shown} />
            <div id="grade-form" className="grid gap-3 rounded-card bg-frost p-3 sm:grid-cols-[160px_minmax(0,1fr)]">
              <Field label={t('ts.score', { max: task.maxScore })} hint={hint ? t('ts.mcqHint', { got: hint.got, of: hint.of }) : undefined}>{(c) => <TextInput {...c} type="number" min={0} max={task.maxScore} value={score} onChange={(e) => setScore(e.target.value)} />}</Field>
              <Field label={t('ts.feedback')} hint={t('ts.feedbackHint')}>{(c) => <TextArea {...c} rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} maxLength={5000} dir="auto" />}</Field>
            </div>
            {error && <p role="alert" className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
          </div>
        )}
      </Dialog>
    </div>
  );
}
