import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Archive, Check, CheckCircle2, ImagePlus, Lock, Paperclip, Send, Star, X, XCircle } from 'lucide-react';
import { useFormat } from '../../../app/format';
import { readApiError } from '../../../app/apiError';
import { cn } from '../../../lib/utils';
import { Badge, Button, ConfirmDialog, EmptyState, PageHeader, Panel, PanelTitle, TextArea } from '../../../ui';
import { stateOf, useStudentTask, useSubmitTask, type AnswerDraft, type StudentTask, type TaskQuestion, type TaskSubmission } from './api';
import { STATE_TONE } from './TasksPage';

const mb = (b: number) => (b < 1048576 ? `${Math.round(b / 1024)} KB` : `${(b / 1048576).toFixed(1)} MB`);

function QuestionInput({ q, value, onChange, n }: { q: TaskQuestion; value: AnswerDraft; onChange: (a: AnswerDraft) => void; n: number }) {
  const { t, i18n } = useTranslation('dashboardStudent');
  const text = (i18n.language === 'ar' && q.questionTextAr) || q.questionText;
  const ref = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState('');
  const multi = q.type === 'multiple_choice';
  const sel = value.selectedAnswers ?? [];
  const imgs = value.images ?? [];
  const [previews, setPreviews] = useState<string[]>([]);
  useEffect(() => {
    const urls = imgs.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [imgs]);

  const addImages = (list: FileList | null) => {
    setProblem('');
    const next = [...imgs, ...[...(list ?? [])]];
    if (next.length > q.maxImages) return setProblem(t('tsk.maxImages', { count: q.maxImages }));
    const bad = next.find((f) => (q.allowedImageTypes.length ? !q.allowedImageTypes.includes(f.type) : !f.type.startsWith('image/')));
    if (bad) return setProblem(t('tsk.badImage', { name: bad.name }));
    const big = q.maxImageSize ? next.find((f) => f.size > q.maxImageSize! * 1048576) : undefined;
    if (big) return setProblem(t('tsk.bigImage', { name: big.name, size: q.maxImageSize }));
    onChange({ ...value, images: next });
  };

  return (
    <fieldset className="rounded-card border border-line p-4">
      <legend className="sr-only">{t('tsk.questionN', { n })}</legend>
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="font-medium leading-snug text-ink" dir="auto"><span className="text-ink-4">{n}. </span>{text}{q.required && <span className="text-danger" aria-label={t('tsk.required')}> *</span>}</p>
        <span className="shrink-0 text-xs text-ink-4">{t('qz.points', { count: q.points })}</span>
      </div>

      {q.answerType === 'mcq' && (
        <div className="space-y-2">
          <p className="text-xs text-ink-4">{multi ? t('qz.pickMany') : t('qz.pickOne')}</p>
          {q.options.map((o, i) => {
            const on = sel.includes(i);
            return (
              <label key={i} className={cn('flex cursor-pointer items-center gap-3 rounded-input border p-3 has-[:focus-visible]:focus-ring', on ? 'border-ink bg-frost' : 'border-line-strong hover:border-ink')}>
                <input type={multi ? 'checkbox' : 'radio'} name={q._id} checked={on} className="sr-only" onChange={() => onChange({ ...value, selectedAnswers: multi ? (on ? sel.filter((x) => x !== i) : [...sel, i]) : [i] })} />
                <span className={cn('grid size-5 shrink-0 place-items-center border-2', multi ? 'rounded' : 'rounded-full', on ? 'border-ink bg-ink text-glow' : 'border-line-strong')}>{on && <Check className="size-3" aria-hidden />}</span>
                <span className="text-sm text-ink" dir="auto">{o}</span>
              </label>
            );
          })}
        </div>
      )}

      {q.answerType === 'text' && (
        <div>
          <TextArea rows={4} value={value.textAnswer ?? ''} maxLength={q.maxLength || undefined} onChange={(e) => onChange({ ...value, textAnswer: e.target.value })} aria-label={text} dir="auto" />
          {q.maxLength ? <p className="mt-1 text-end text-xs tabular-nums text-ink-4">{(value.textAnswer ?? '').length} / {q.maxLength}</p> : null}
        </div>
      )}

      {q.answerType === 'image' && (
        <div>
          <div className="flex flex-wrap gap-2">
            {imgs.map((f, i) => (
              <div key={f.name + i} className="relative size-24 overflow-hidden rounded-input border border-line">
                {previews[i] && <img src={previews[i]} alt="" className="size-full object-cover" />}
                <button type="button" onClick={() => onChange({ ...value, images: imgs.filter((_, j) => j !== i) })} aria-label={t('asg.removeFile', { name: f.name })} className="absolute end-1 top-1 grid size-6 place-items-center rounded-full bg-paper/95 text-danger shadow-card"><X className="size-3.5" /></button>
              </div>
            ))}
            {imgs.length < q.maxImages && (
              <button type="button" onClick={() => ref.current?.click()} className="grid size-24 place-items-center rounded-input border-2 border-dashed border-line-strong text-ink-3 hover:border-ink hover:text-ink focus-visible:focus-ring">
                <span className="flex flex-col items-center gap-1 text-xs"><ImagePlus className="size-5" aria-hidden />{t('tsk.addPhoto')}</span>
              </button>
            )}
          </div>
          <input ref={ref} type="file" accept={q.allowedImageTypes.length ? q.allowedImageTypes.join(',') : 'image/*'} multiple hidden onChange={(e) => { addImages(e.target.files); e.target.value = ''; }} />
          <p className="mt-1.5 text-xs text-ink-4">{t('tsk.photoRule', { count: q.maxImages })}{q.maxImageSize ? ` · ${t('tsk.photoSize', { size: q.maxImageSize })}` : ''}</p>
          {problem && <p role="alert" className="mt-1 text-xs text-danger">{problem}</p>}
        </div>
      )}
    </fieldset>
  );
}

/** What the student handed in, with right/wrong once graded. */
function Answers({ task, sub }: { task: StudentTask; sub: TaskSubmission }) {
  const { t, i18n } = useTranslation('dashboardStudent');
  const graded = sub.status === 'graded' || sub.status === 'returned';
  return (
    <ol className="space-y-3">
      {[...task.questions].sort((a, b) => a.order - b.order).map((q, i) => {
        const a = sub.answers.find((x) => x.questionId === q._id);
        const right = graded && q.answerType === 'mcq' && q.correctAnswers ? q.correctAnswers.length === (a?.selectedAnswers?.length ?? 0) && q.correctAnswers.every((x) => a?.selectedAnswers?.includes(x)) : null;
        return (
          <li key={q._id} className="rounded-card border border-line p-4">
            <p className="mb-2 flex items-start gap-2 font-medium text-ink" dir="auto">
              {right === true && <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-label={t('qz.right')} />}
              {right === false && <XCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-label={t('qz.wrong')} />}
              <span><span className="text-ink-4">{i + 1}. </span>{(i18n.language === 'ar' && q.questionTextAr) || q.questionText}</span>
            </p>
            {!a ? <p className="text-sm text-ink-4">{t('tsk.noAnswer')}</p> : q.answerType === 'mcq' ? (
              <ul className="space-y-1">
                {q.options.map((o, j) => {
                  const chosen = a.selectedAnswers?.includes(j);
                  const correct = graded && q.correctAnswers?.includes(j);
                  if (!chosen && !correct) return null;
                  return <li key={j} className={cn('rounded-input px-3 py-1.5 text-sm', correct ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger')} dir="auto">{o}{chosen ? ` · ${t('tsk.yourChoice')}` : ` · ${t('tsk.rightAnswer')}`}</li>;
                })}
              </ul>
            ) : q.answerType === 'text' ? (
              <p className="whitespace-pre-line rounded-input bg-canvas px-3 py-2 text-sm text-ink-2" dir="auto">{a.textAnswer}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(a.imageAnswers ?? []).map((im, j) => im.cloudinaryUrl && <a key={j} href={im.cloudinaryUrl} target="_blank" rel="noreferrer" className="size-24 overflow-hidden rounded-input border border-line"><img src={im.cloudinaryUrl} alt={im.filename ?? ''} className="size-full object-cover" /></a>)}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** One task: the brief, the questions to answer and hand in, then the grade and feedback. */
export default function TaskPage() {
  const { taskId = '' } = useParams();
  const { t, i18n } = useTranslation('dashboardStudent');
  const f = useFormat();
  const q = useStudentTask(taskId);
  const submit = useSubmitTask(taskId);
  const [answers, setAnswers] = useState<Record<string, AnswerDraft>>({});
  const [archives, setArchives] = useState<File[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const zipRef = useRef<HTMLInputElement>(null);
  const back = { to: '/student/tasks', label: t('tk.title') };

  if (q.isError) {
    const st = readApiError(q.error).status;
    return (
      <div className="space-y-5">
        <PageHeader back={back} title={t('tsk.title')} />
        <Panel><EmptyState icon={<AlertCircle />} title={st === 404 ? t('tsk.notFound') : st === 403 ? t('tsk.noAccess') : t('tk.loadError')} /></Panel>
      </div>
    );
  }
  if (!q.data) return <div className="space-y-4"><div className="h-10 w-72 max-w-full animate-pulse rounded-md bg-rail" /><div className="h-64 animate-pulse rounded-panel bg-rail" /></div>;
  if ('locked' in q.data) {
    return (
      <div className="space-y-5">
        <PageHeader back={back} title={t('tsk.title')} />
        <Panel><EmptyState icon={<Lock />} title={t('tsk.locked')} description={t('tsk.lockedHint')} /></Panel>
      </div>
    );
  }

  const { task, submission: sub } = q.data;
  const st = stateOf({ ...task, submission: sub ? { _id: sub._id, status: sub.status, isLate: sub.isLate, score: sub.score } : null });
  const questions = [...task.questions].sort((a, b) => a.order - b.order);
  const graded = sub && (sub.status === 'graded' || sub.status === 'returned');
  const canAnswer = task.status === 'open' && (st === 'todo' || st === 'late' || (st === 'review' && editing));
  const title = (i18n.language === 'ar' && task.titleAr) || task.title;
  const desc = (i18n.language === 'ar' && task.descriptionAr) || task.description;
  const draftOf = (qq: TaskQuestion): AnswerDraft => answers[qq._id] ?? { questionId: qq._id, answerType: qq.answerType };
  const isAnswered = (a: AnswerDraft) => (a.answerType === 'mcq' ? !!a.selectedAnswers?.length : a.answerType === 'text' ? !!a.textAnswer?.trim() : !!a.images?.length);
  const missing = questions.filter((qq) => qq.required && !isAnswered(draftOf(qq)));

  const send = () => {
    setError('');
    submit.mutate(
      { answers: questions.map(draftOf).filter(isAnswered), archives },
      { onSuccess: () => { setConfirm(false); setEditing(false); setAnswers({}); setArchives([]); }, onError: (err) => { setConfirm(false); setError(readApiError(err).message); } },
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader back={back} title={title} description={[task.courseId?.title, task.sessionId?.title].filter(Boolean).join(' · ') || undefined} actions={<Badge tone={STATE_TONE[st]}>{t(`tk.state.${st}`)}</Badge>} />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-card border border-line bg-paper px-5 py-4 text-sm">
        <span className="text-ink-3">{t('tk.col.deadline')}: <span className={cn('font-medium tabular-nums', st === 'late' ? 'text-danger' : 'text-ink')}>{f.custom(task.deadline, { weekday: 'long', day: 'numeric', month: 'long' })} · <bdi dir="ltr">{f.time(task.deadline)}</bdi></span></span>
        <span className="inline-flex items-center gap-1.5 text-ink-3"><Star className="size-4" aria-hidden />{t('asg.points', { count: task.maxScore })}</span>
        {task.createdBy?.name && <span className="text-ink-3">{t('tsk.from', { name: task.createdBy.name })}</span>}
        {st === 'late' && <span className="text-xs font-medium text-warning">{t('tsk.lateAllowed')}</span>}
      </div>

      {desc && <Panel><p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-2" dir="auto">{desc}</p></Panel>}

      {graded && sub && (
        <section className="flex flex-wrap items-center gap-5 rounded-panel bg-ink p-6 text-white">
          <div>
            <p className="text-sm text-frost/70">{t('tsk.yourGrade')}</p>
            <p className="text-4xl font-bold tabular-nums text-glow">{sub.score ?? 0}<span className="text-lg text-frost/60"> / {task.maxScore}</span></p>
          </div>
          {sub.feedback && <p className="w-full flex-1 sm:w-auto sm:min-w-56 whitespace-pre-line rounded-card bg-white/10 p-4 text-sm text-frost/90" dir="auto">{sub.feedback}</p>}
        </section>
      )}

      {sub && !canAnswer ? (
        <Panel>
          <PanelTitle title={t('tsk.yourAnswers')} />
          <p className="-mt-2 mb-4 text-xs text-ink-4">{sub.submittedAt ? t('asg.sentOn', { date: f.date(sub.submittedAt) }) : ''}{sub.isLate ? ` · ${t('asg.late')}` : ''}</p>
          <Answers task={task} sub={sub} />
          {!!sub.attachedFiles.length && (
            <ul className="mt-4 space-y-1.5">{sub.attachedFiles.map((x) => <li key={x._id} className="flex items-center gap-2 text-sm text-ink-2"><Archive className="size-4 text-ink-3" aria-hidden />{x.originalName} <span className="text-xs text-ink-4">{mb(x.size)}</span></li>)}</ul>
          )}
          {st === 'review' && task.status === 'open' && <Button className="mt-5" variant="secondary" onClick={() => setEditing(true)}>{t('tsk.changeAnswers')}</Button>}
        </Panel>
      ) : canAnswer ? (
        <Panel>
          <PanelTitle title={t('tsk.answer')} />
          {editing && <p className="-mt-2 mb-4 rounded-input bg-warning-soft px-3 py-2 text-xs text-warning">{t('tsk.replaceNote')}</p>}
          <div className="space-y-4">
            {questions.map((qq, i) => <QuestionInput key={qq._id} q={qq} n={i + 1} value={draftOf(qq)} onChange={(a) => setAnswers((cur) => ({ ...cur, [qq._id]: a }))} />)}
          </div>
          <div className="mt-5 rounded-card border border-dashed border-line-strong p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-ink"><Paperclip className="size-4 text-ink-3" aria-hidden />{t('tsk.extraFiles')}</p>
            {archives.map((x, i) => (
              <p key={x.name + i} className="mb-1 flex items-center gap-2 text-sm text-ink-2"><Archive className="size-4 text-ink-3" aria-hidden />{x.name} <span className="text-xs text-ink-4">{mb(x.size)}</span>
                <button type="button" onClick={() => setArchives(archives.filter((_, j) => j !== i))} aria-label={t('asg.removeFile', { name: x.name })} className="ms-auto grid size-7 place-items-center rounded-full text-ink-4 hover:bg-danger-soft hover:text-danger"><X className="size-3.5" /></button>
              </p>
            ))}
            <Button size="sm" variant="ghost" onClick={() => zipRef.current?.click()}>{t('tsk.addZip')}</Button>
            <input ref={zipRef} type="file" accept=".zip,.rar" multiple hidden onChange={(e) => { setArchives([...archives, ...[...(e.target.files ?? [])]]); e.target.value = ''; }} />
          </div>
          {error && <p role="alert" className="mt-4 rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
          <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
            {editing && <Button variant="ghost" onClick={() => setEditing(false)}>{t('tsk.cancelEdit')}</Button>}
            <Button icon={<Send />} onClick={() => (missing.length ? setError(t('tsk.missing', { list: missing.map((m) => questions.indexOf(m) + 1).join(', ') })) : setConfirm(true))}>{t('tsk.handIn')}</Button>
          </div>
        </Panel>
      ) : (
        <Panel><EmptyState icon={<Lock />} title={t(st === 'missed' ? 'tsk.missed' : 'tsk.closed')} /></Panel>
      )}

      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} title={t('tsk.handInTitle')} message={t(editing ? 'tsk.handInReplace' : 'tsk.handInText')} confirmLabel={t('tsk.handIn')} cancelLabel={t('qz.review')} loading={submit.isPending} onConfirm={send} />
    </div>
  );
}
