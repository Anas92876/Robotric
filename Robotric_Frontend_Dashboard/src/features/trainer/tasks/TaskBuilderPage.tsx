import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Save, Send } from 'lucide-react';
import { readApiError } from '../../../app/apiError';
import { useToast } from '../../../components/ui/Toast';
import { Button, Field, PageHeader, Panel, PanelTitle, SelectInput, TextArea, TextInput } from '../../../ui';
import { QuestionsEditor, questionProblems, type QuestionDraft } from '../../common/taskBuilder/QuestionsEditor';
import { useTrainerGroupOptions } from '../sessions/api';
import { ClassPicker } from '../../clo/tasks/ClassPicker';
import { idOf, useTaskDetails, useTaskMutations, useTaskRole } from './api';

const pad = (n: number) => String(n).padStart(2, '0');
/** ISO time as the value of a local date-time input. */
const toLocal = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const inAWeek = () => { const d = new Date(Date.now() + 7 * 864e5); d.setHours(20, 0, 0, 0); return toLocal(d.toISOString()); };

/** New task or edit a task: details, deadline, questions; saved as a draft or published. The trainer picks a group, the CLO picks classes. */
export default function TaskBuilderPage() {
  const { taskId } = useParams();
  const [params] = useSearchParams();
  const editing = !!taskId;
  const { t } = useTranslation('dashboardTrainer');
  const { t: tc } = useTranslation('dashboardCommon');
  const navigate = useNavigate();
  const toast = useToast();
  const r = useTaskRole();
  const clo = r.role === 'clo';
  const groups = useTrainerGroupOptions();
  const current = useTaskDetails(taskId ?? '');
  const { save } = useTaskMutations();

  const [title, setTitle] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');
  const [groupId, setGroupId] = useState(params.get('group') ?? '');
  const [sessionIds, setSessionIds] = useState<string[]>(() => (params.get('session') ? [params.get('session')!] : []));
  const [deadline, setDeadline] = useState(inAWeek);
  const [maxScore, setMaxScore] = useState(100);
  const [late, setLate] = useState(false);
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [error, setError] = useState('');
  const task = current.data?.task;
  const draft = !editing || task?.status === 'draft';

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setTitleAr(task.titleAr ?? '');
    setDescription(task.description);
    setDescriptionAr(task.descriptionAr ?? '');
    setGroupId(idOf(task.groupId));
    setSessionIds((task.sessionIds ?? []).map(idOf).filter(Boolean));
    setDeadline(toLocal(task.deadline));
    setMaxScore(task.maxScore);
    setLate(task.allowLateSubmission);
    setQuestions(task.questions.map((q) => ({ ...q, options: q.options ?? [], correctAnswers: q.correctAnswers ?? [] })));
  }, [task]);

  const session = params.get('session');
  const listPath = clo ? '/clo/tasks' : `/trainer/tasks${groupId ? `?group=${groupId}` : ''}`;
  const resultsPath = (id: string) => (clo ? `/clo/tasks/${id}/results` : `/trainer/tasks/${id}/submissions`);
  const back = editing ? { to: task?.status === 'draft' ? listPath : resultsPath(taskId!), label: task?.title ?? t('tk.title') } : session ? { to: `${r.base}/sessions/${session}`, label: t('tk.backClass') } : { to: listPath, label: t('tk.title') };

  const submit = (status: 'draft' | 'open') => (e?: FormEvent) => {
    e?.preventDefault();
    if (!title.trim()) return setError(t('tb.errTitle'));
    if (clo ? !sessionIds.length : !groupId) return setError(clo ? t('dashboardCLO:ctk.errClasses') : t('tb.errGroup'));
    if (!description.trim()) return setError(t('tb.errDescription'));
    if (!deadline) return setError(t('tb.errDeadline'));
    if (status === 'open') {
      if (new Date(deadline).getTime() < Date.now()) return setError(t('tb.errPast'));
      const p = questionProblems(questions)[0];
      if (p) return setError(tc(p.key, { n: p.n }));
    }
    setError('');
    save.mutate(
      {
        id: taskId,
        d: {
          ...(clo ? { sessionIds } : editing ? {} : { groupId }),
          title: title.trim(), titleAr: titleAr.trim(), description: description.trim(), descriptionAr: descriptionAr.trim(),
          deadline: new Date(deadline).toISOString(), maxScore, allowLateSubmission: late,
          questions: questions.map((q, i) => ({ ...q, order: i, options: q.answerType === 'mcq' ? q.options.map((o) => o.trim()) : [], correctAnswers: q.answerType === 'mcq' ? q.correctAnswers : [] })),
          ...(draft ? { status } : {}),
        },
      },
      {
        onSuccess: (saved) => {
          toast.success(t(status === 'draft' && draft ? 'tb.toast.draft' : editing && !draft ? 'tb.toast.saved' : 'tb.toast.published'));
          navigate(status === 'open' || !draft ? resultsPath(saved?._id ?? taskId!) : listPath);
        },
        onError: (err) => setError(readApiError(err).message),
      },
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader back={back} title={t(editing ? 'tb.editTitle' : 'tb.newTitle')} description={t('tb.subtitle')} />
      <form onSubmit={submit('open')} noValidate className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <Panel>
            <PanelTitle title={t('tb.details')} />
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label={t('tb.title')} required>{(c) => <TextInput {...c} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} dir="auto" />}</Field>
                <Field label={t('tb.titleAr')}>{(c) => <TextInput {...c} value={titleAr} onChange={(e) => setTitleAr(e.target.value)} maxLength={200} dir="rtl" />}</Field>
              </div>
              <Field label={t('tb.description')} required hint={t('tb.descriptionHint')}>{(c) => <TextArea {...c} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} dir="auto" />}</Field>
              <Field label={t('tb.descriptionAr')}>{(c) => <TextArea {...c} rows={3} value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value)} maxLength={5000} dir="rtl" />}</Field>
            </div>
          </Panel>
          {clo && (
            <Panel>
              <PanelTitle title={t('dashboardCLO:ctk.classes')} />
              <p className="-mt-2 mb-4 text-sm text-ink-3">{t('dashboardCLO:ctk.classesHint')}</p>
              <ClassPicker value={sessionIds} onChange={setSessionIds} />
            </Panel>
          )}
          <Panel>
            <PanelTitle title={t('tb.questions')} />
            <p className="-mt-2 mb-4 text-sm text-ink-3">{t('tb.questionsHint')}</p>
            <QuestionsEditor value={questions} onChange={setQuestions} />
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel>
            <PanelTitle title={t('tb.settings')} />
            <div className="space-y-4">
              {!clo && (
                <Field label={t('tk.group')} required hint={editing ? t('sf.groupLocked') : undefined}>
                  {(c) => (
                    <SelectInput {...c} value={groupId} onChange={(e) => setGroupId(e.target.value)} disabled={editing}>
                      <option value="">{t('sf.pickGroup')}</option>
                      {(groups.data ?? []).filter((g) => g.status === 'active' || g._id === groupId).map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}
                    </SelectInput>
                  )}
                </Field>
              )}
              <Field label={t('tk.col.deadline')} required>{(c) => <TextInput {...c} type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} dir="ltr" />}</Field>
              <Field label={t('tb.maxScore')}>{(c) => <TextInput {...c} type="number" min={1} max={1000} value={maxScore} onChange={(e) => setMaxScore(Number(e.target.value) || 0)} />}</Field>
              <label className="flex items-start gap-3 text-sm text-ink">
                <input type="checkbox" checked={late} onChange={(e) => setLate(e.target.checked)} className="mt-0.5 size-4 accent-[#0f1f33]" />
                <span><span className="block font-medium">{t('tb.late')}</span><span className="block text-xs text-ink-4">{t('tb.lateHint')}</span></span>
              </label>
            </div>
          </Panel>
          {editing && !draft && <p className="rounded-input bg-info-soft px-3 py-2 text-sm text-ink-2">{t('tb.liveNote')}</p>}
          {error && <p role="alert" className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => navigate(back.to)}>{t('sf.cancel')}</Button>
            {draft ? <>
              <Button variant="secondary" icon={<Save />} loading={save.isPending && save.variables?.d.status === 'draft'} disabled={save.isPending} onClick={() => submit('draft')()}>{t('tb.saveDraft')}</Button>
              <Button type="submit" icon={<Send />} loading={save.isPending && save.variables?.d.status === 'open'} disabled={save.isPending}>{t('tb.publish')}</Button>
            </> : <Button type="submit" icon={<Save />} loading={save.isPending}>{t('sf.save')}</Button>}
          </div>
        </div>
      </form>
    </div>
  );
}
