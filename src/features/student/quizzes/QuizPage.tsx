import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ArrowLeft, ArrowRight, Check, CheckCircle2, ClipboardList, Clock, RotateCcw, Target, Trophy, X, XCircle } from 'lucide-react';
import { api } from '../../../lib/api';
import { useFormat } from '../../../app/format';
import { readApiError } from '../../../app/apiError';
import { cn } from '../../../lib/utils';
import { Badge, Button, ConfirmDialog, EmptyState, PageHeader, Panel, PanelTitle, StatTile } from '../../../ui';

interface Question { _id: string; question: string; type: 'single' | 'multiple'; points: number; options: { index: number; text: string }[] }
interface Quiz { _id: string; title: string; description?: string | null; instructions?: string | null; passingScore: number; timeLimit?: number | null; maxAttempts: number; questions: Question[] }
interface Attempt { _id: string; attemptNumber: number; score: number; passed: boolean; submittedAt?: string; timeSpent?: number }
interface Result {
  score: number; earnedPoints: number; totalPoints: number; passed: boolean; attemptNumber: number;
  detailedResults?: { question: string; selectedOptions: number[]; correctOptions: number[]; isCorrect: boolean }[] | null;
}

const pad = (n: number) => String(n).padStart(2, '0');
const mmss = (s: number) => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;

/** Take a quiz: rules and past tries, one question at a time with a timer, then the result. */
export default function QuizPage() {
  const { quizId = '' } = useParams();
  const { t } = useTranslation('dashboardStudent');
  const f = useFormat();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const quiz = useQuery({ queryKey: ['student', 'quiz', quizId], queryFn: async () => (await api.get(`/student/quizzes/${quizId}`)).data.data as Quiz });
  const attempts = useQuery({ queryKey: ['student', 'quiz', quizId, 'attempts'], queryFn: async () => ((await api.get(`/student/quizzes/${quizId}/attempts`)).data.data ?? []) as Attempt[] });

  const [stage, setStage] = useState<'intro' | 'taking' | 'result'>('intro');
  const [attemptId, setAttemptId] = useState('');
  const [startedAt, setStartedAt] = useState(0);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [now, setNow] = useState(Date.now());
  const autoSent = useRef(false);

  const q = quiz.data;
  const used = attempts.data?.length ?? 0;
  const left = q ? Math.max(0, q.maxAttempts - used) : 0;
  const best = attempts.data?.reduce<Attempt | null>((b, a) => (!b || a.score > b.score ? a : b), null);
  const limit = q?.timeLimit ? q.timeLimit * 60 : 0;
  const remaining = limit ? Math.max(0, limit - Math.floor((now - startedAt) / 1000)) : 0;

  const start = useMutation({
    mutationFn: async () => (await api.post(`/student/quizzes/${quizId}/start`)).data.data as { attemptId: string; attempt: { startedAt: string } },
    onSuccess: (d) => {
      setAttemptId(d.attemptId);
      setStartedAt(new Date(d.attempt.startedAt).getTime()); // a resumed attempt keeps its original clock
      setAnswers({});
      setCurrent(0);
      autoSent.current = false;
      setStage('taking');
    },
  });
  const submit = useMutation({
    mutationFn: async () =>
      (await api.post(`/student/quizzes/${quizId}/submit`, { attemptId, answers: Object.entries(answers).map(([questionId, selectedOptions]) => ({ questionId, selectedOptions })) })).data.data as Result,
    onSuccess: (r) => {
      setResult(r);
      setStage('result');
      setConfirm(false);
      void qc.invalidateQueries({ queryKey: ['student', 'quiz', quizId, 'attempts'] });
      void qc.invalidateQueries({ queryKey: ['student', 'course'] });
    },
  });

  useEffect(() => {
    if (stage !== 'taking' || !limit) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [stage, limit]);

  // Time is up: hand in what is answered
  useEffect(() => {
    if (stage === 'taking' && limit && remaining === 0 && !autoSent.current && !submit.isPending) {
      autoSent.current = true;
      submit.mutate();
    }
  }, [stage, limit, remaining, submit]);

  const back = { to: '/student/courses', label: t('courses.title') };
  if (quiz.isError) {
    return (
      <div className="space-y-5">
        <PageHeader back={back} title={t('qz.title')} />
        <Panel><EmptyState icon={<AlertCircle />} title={readApiError(quiz.error).status === 404 ? t('qz.notFound') : readApiError(quiz.error).message} /></Panel>
      </div>
    );
  }
  if (!q) return <div className="space-y-4"><div className="h-10 w-72 animate-pulse rounded-md bg-rail" /><div className="h-48 animate-pulse rounded-panel bg-rail" /></div>;

  const pick = (qq: Question, idx: number) =>
    setAnswers((cur) => {
      const sel = cur[qq._id] ?? [];
      return { ...cur, [qq._id]: qq.type === 'multiple' ? (sel.includes(idx) ? sel.filter((x) => x !== idx) : [...sel, idx]) : [idx] };
    });
  const answered = q.questions.filter((qq) => (answers[qq._id] ?? []).length > 0).length;

  if (stage === 'taking') {
    const qq = q.questions[current];
    const sel = answers[qq._id] ?? [];
    const last = current === q.questions.length - 1;
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-ink" dir="auto">{q.title}</h1>
          {limit > 0 && (
            <span role="timer" aria-live={remaining < 60 ? 'assertive' : 'off'} className={cn('inline-flex items-center gap-2 rounded-pill px-4 py-1.5 font-mono text-sm font-semibold tabular-nums', remaining < 60 ? 'bg-danger-soft text-danger' : 'bg-ink text-glow')} dir="ltr">
              <Clock className="size-4" aria-hidden />{mmss(remaining)}
            </span>
          )}
        </div>

        <div>
          <div className="mb-1.5 flex justify-between text-xs text-ink-3">
            <span>{t('qz.questionOf', { n: current + 1, total: q.questions.length })}</span>
            <span>{t('qz.answered', { n: answered, total: q.questions.length })}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-pill bg-rail"><span className="block h-full bg-glow transition-[width]" style={{ width: `${((current + 1) / q.questions.length) * 100}%` }} /></div>
        </div>

        <Panel>
          <fieldset>
            <legend className="mb-1 text-lg font-semibold leading-snug text-ink" dir="auto">{qq.question}</legend>
            <p className="mb-4 text-xs text-ink-4">{qq.type === 'multiple' ? t('qz.pickMany') : t('qz.pickOne')} · {t('qz.points', { count: qq.points })}</p>
            <div className="space-y-2">
              {qq.options.map((o) => {
                const on = sel.includes(o.index);
                return (
                  <label key={o.index} className={cn('flex cursor-pointer items-center gap-3 rounded-card border p-3.5 transition-colors has-[:focus-visible]:focus-ring', on ? 'border-ink bg-frost' : 'border-line-strong hover:border-ink')}>
                    <input type={qq.type === 'multiple' ? 'checkbox' : 'radio'} name={qq._id} checked={on} onChange={() => pick(qq, o.index)} className="sr-only" />
                    <span className={cn('grid size-6 shrink-0 place-items-center border-2', qq.type === 'multiple' ? 'rounded-md' : 'rounded-full', on ? 'border-ink bg-ink text-glow' : 'border-line-strong')}>
                      {on && <Check className="size-3.5" aria-hidden />}
                    </span>
                    <span className="text-ink" dir="auto">{o.text}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </Panel>

        <nav aria-label={t('qz.questions')} className="flex flex-wrap gap-1.5">
          {q.questions.map((x, i) => (
            <button key={x._id} type="button" onClick={() => setCurrent(i)} aria-label={t('qz.questionOf', { n: i + 1, total: q.questions.length })} aria-current={i === current ? 'step' : undefined}
              className={cn('grid size-9 place-items-center rounded-full text-sm font-semibold tabular-nums focus-visible:focus-ring', i === current ? 'bg-ink text-white' : (answers[x._id] ?? []).length ? 'bg-tint-sage text-ink' : 'bg-rail text-ink-3')}>
              {i + 1}
            </button>
          ))}
        </nav>

        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" icon={<ArrowLeft className="rtl:rotate-180" />} disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>{t('qz.prev')}</Button>
          {last ? (
            <Button icon={<CheckCircle2 />} onClick={() => setConfirm(true)}>{t('qz.finish')}</Button>
          ) : (
            <Button onClick={() => setCurrent((c) => c + 1)}>{t('qz.next')} <ArrowRight className="size-[18px] rtl:rotate-180" aria-hidden /></Button>
          )}
        </div>
        {submit.isError && <p role="alert" className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{readApiError(submit.error).message}</p>}

        <ConfirmDialog
          open={confirm}
          onClose={() => setConfirm(false)}
          title={t('qz.finishTitle')}
          message={answered < q.questions.length ? t('qz.unanswered', { count: q.questions.length - answered }) : t('qz.allAnswered')}
          confirmLabel={t('qz.finish')}
          cancelLabel={t('qz.review')}
          loading={submit.isPending}
          onConfirm={() => submit.mutate()}
        />
      </div>
    );
  }

  if (stage === 'result' && result) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <section className={cn('rounded-panel p-8 text-center', result.passed ? 'bg-ink text-white' : 'border border-line bg-paper')}>
          <span className={cn('mx-auto grid size-16 place-items-center rounded-full', result.passed ? 'bg-glow text-ink' : 'bg-warning-soft text-warning')}>
            {result.passed ? <Trophy className="size-8" aria-hidden /> : <RotateCcw className="size-8" aria-hidden />}
          </span>
          <p className={cn('mt-4 text-5xl font-bold tabular-nums', result.passed ? 'text-glow' : 'text-ink')}>{Math.round(result.score)}%</p>
          <p className={cn('mt-2 text-lg font-semibold', result.passed ? 'text-white' : 'text-ink')}>{t(result.passed ? 'qz.passed' : 'qz.notPassed')}</p>
          <p className={cn('mt-1 text-sm', result.passed ? 'text-frost/75' : 'text-ink-3')}>{t('qz.pointsOf', { got: result.earnedPoints, total: result.totalPoints, pass: q.passingScore })}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {!result.passed && left - 0 > 0 && <Button variant={result.passed ? 'glow' : 'primary'} icon={<RotateCcw />} loading={start.isPending} onClick={() => start.mutate()}>{t('qz.tryAgain', { count: left })}</Button>}
            <Button variant={result.passed ? 'glow' : 'secondary'} onClick={() => navigate(-1)}>{t('qz.done')}</Button>
          </div>
        </section>
        {!!result.detailedResults?.length && (
          <Panel>
            <PanelTitle title={t('qz.yourAnswers')} />
            <ol className="space-y-2">
              {result.detailedResults.map((r, i) => (
                <li key={i} className="flex items-start gap-3 rounded-card bg-canvas p-3">
                  {r.isCorrect ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-label={t('qz.right')} /> : <XCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-label={t('qz.wrong')} />}
                  <span className="text-sm text-ink" dir="auto">{i + 1}. {r.question}</span>
                </li>
              ))}
            </ol>
          </Panel>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader back={back} title={q.title} description={q.description || undefined} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile icon={<ClipboardList />} tint="bg-tint-leaf" label={t('qz.questions')} value={q.questions.length} />
        <StatTile icon={<Clock />} tint="bg-tint-straw" label={t('qz.time')} value={q.timeLimit ? t('qz.minutes', { count: q.timeLimit }) : t('qz.noLimit')} />
        <StatTile icon={<Target />} tint="bg-tint-sage" label={t('qz.toPass')} value={`${q.passingScore}%`} />
        <StatTile icon={<RotateCcw />} tint="bg-tint-sand" label={t('qz.triesLeft')} value={`${left} / ${q.maxAttempts}`} loading={attempts.isLoading} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <Panel>
          <PanelTitle title={t('qz.beforeStart')} />
          {q.instructions && <p className="mb-4 whitespace-pre-line text-sm text-ink-2" dir="auto">{q.instructions}</p>}
          <ul className="mb-6 space-y-2 text-sm text-ink-2">
            <li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-glow-deep" aria-hidden />{t('qz.rule1')}</li>
            {q.timeLimit ? <li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-glow-deep" aria-hidden />{t('qz.rule2', { count: q.timeLimit })}</li> : null}
            <li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-glow-deep" aria-hidden />{t('qz.rule3')}</li>
          </ul>
          {left > 0 ? (
            <Button size="md" loading={start.isPending} onClick={() => start.mutate()}>{used ? t('qz.startAgain') : t('qz.start')}</Button>
          ) : (
            <p className="flex items-center gap-2 rounded-input bg-rail px-3 py-2.5 text-sm text-ink-3"><X className="size-4" aria-hidden />{t('qz.noTriesLeft')}</p>
          )}
          {start.isError && <p role="alert" className="mt-3 text-sm text-danger">{readApiError(start.error).message}</p>}
        </Panel>

        <Panel>
          <PanelTitle title={t('qz.yourTries')} />
          {!attempts.data?.length ? (
            <p className="py-4 text-center text-sm text-ink-4">{t('qz.noTries')}</p>
          ) : (
            <ul className="space-y-2">
              {attempts.data.map((a) => (
                <li key={a._id} className="flex items-center gap-3 rounded-card bg-canvas px-3 py-2.5 text-sm">
                  <span className="font-medium text-ink">{t('qz.try', { n: a.attemptNumber })}</span>
                  <span className="text-xs text-ink-4">{a.submittedAt ? f.date(a.submittedAt) : ''}</span>
                  <span className="ms-auto font-semibold tabular-nums text-ink">{Math.round(a.score)}%</span>
                  <Badge tone={a.passed ? 'success' : 'warning'}>{t(a.passed ? 'qz.pass' : 'qz.fail')}</Badge>
                </li>
              ))}
            </ul>
          )}
          {best && <p className="mt-3 text-xs text-ink-3">{t('qz.best', { score: Math.round(best.score) })}</p>}
        </Panel>
      </div>
    </div>
  );
}
