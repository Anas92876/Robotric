import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Save, X } from 'lucide-react';
import { readApiError } from '../../../app/apiError';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/utils';
import { Button, Field, PageHeader, Panel, PanelTitle, SelectInput, TextArea, TextInput } from '../../../ui';
import { useDayName } from '../groups/GroupsPage';
import { useSessionMutations, useSessionRole, useTrainerGroupOptions, useTrainerSession } from './api';

/** A growing list of short lines (objectives, materials). */
function Lines({ label, values, onChange, placeholder, addLabel }: { label: string; values: string[]; onChange: (v: string[]) => void; placeholder: string; addLabel: string }) {
  const { t } = useTranslation('dashboardTrainer');
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-ink">{label}</legend>
      <div className="space-y-2">
        {values.map((v, i) => (
          <div key={i} className="flex gap-2">
            <TextInput value={v} onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))} placeholder={placeholder} aria-label={`${label} ${i + 1}`} className="h-10" />
            <Button variant="ghost" size="sm" iconOnly icon={<X />} aria-label={t('sf.removeLine', { n: i + 1 })} onClick={() => onChange(values.filter((_, j) => j !== i))} className="h-10 shrink-0" />
          </div>
        ))}
        <Button variant="ghost" size="sm" icon={<Plus />} onClick={() => onChange([...values, ''])}>{addLabel}</Button>
      </div>
    </fieldset>
  );
}

const youtubeId = (v: string) => v.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)?.[1] ?? (/^[\w-]{11}$/.test(v.trim()) ? v.trim() : '');

/** New class or edit a class: what, which group, when, lesson plan and (for the CLO) video. */
export default function SessionFormPage() {
  const { sessionId } = useParams();
  const [params] = useSearchParams();
  const editing = !!sessionId;
  const { t } = useTranslation('dashboardTrainer');
  const day = useDayName();
  const navigate = useNavigate();
  const toast = useToast();
  const r = useSessionRole();
  // Only the CLO's video is saved; the backend ignores it from trainers
  const withVideo = r.role === 'clo';
  const groups = useTrainerGroupOptions();
  const current = useTrainerSession(sessionId ?? '');
  const { save } = useSessionMutations();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [groupId, setGroupId] = useState(params.get('group') ?? '');
  // A slot clicked on the schedule arrives as ?date=YYYY-MM-DD&start=HH:mm (two hours long)
  const slotStart = params.get('start');
  const [custom, setCustom] = useState(!!params.get('date'));
  const [date, setDate] = useState(params.get('date') ?? '');
  const [start, setStart] = useState(slotStart ?? '16:00');
  const [end, setEnd] = useState(slotStart ? `${String(Math.min(Number(slotStart.slice(0, 2)) + 2, 23)).padStart(2, '0')}${slotStart.slice(2)}` : '18:00');
  const [objectives, setObjectives] = useState<string[]>(['']);
  const [materials, setMaterials] = useState<string[]>(['']);
  const [notes, setNotes] = useState('');
  const [video, setVideo] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const s = current.data;
    if (!s) return;
    setTitle(s.title);
    setDescription(s.description ?? '');
    setGroupId(s.groupId?._id ?? '');
    setCustom(true);
    setDate(s.scheduledDate.slice(0, 10));
    setStart(s.startTime);
    setEnd(s.endTime);
    setObjectives(s.lessonPlan?.objectives?.length ? s.lessonPlan.objectives : ['']);
    setMaterials(s.lessonPlan?.materialsNeeded?.length ? s.lessonPlan.materialsNeeded : ['']);
    setNotes(s.lessonPlan?.notes ?? '');
    setVideo(s.video?.youtubeId ?? '');
  }, [current.data]);

  const group = groups.data?.find((g) => g._id === groupId);
  const back = editing ? { to: `${r.base}/sessions/${sessionId}`, label: current.data?.title ?? t('ses.title') } : { to: `${r.base}/sessions`, label: t('ses.title') };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError(t('sf.errTitle'));
    if (!groupId) return setError(t('sf.errGroup'));
    if (custom && (!date || !start || !end)) return setError(t('sf.errWhen'));
    if (custom && end <= start) return setError(t('sf.errOrder'));
    const yt = withVideo && video.trim() ? youtubeId(video) : '';
    if (withVideo && video.trim() && !yt) return setError(t('sf.errVideo'));
    setError('');
    save.mutate(
      {
        id: sessionId,
        d: {
          title: title.trim(),
          description: description.trim(),
          ...(editing ? {} : { groupId }),
          overrideSchedule: custom,
          ...(custom ? { scheduledDate: date, startTime: start, endTime: end } : {}),
          lessonPlan: { objectives: objectives.map((x) => x.trim()).filter(Boolean), materialsNeeded: materials.map((x) => x.trim()).filter(Boolean), notes: notes.trim() },
          ...(withVideo ? { video: { hasVideo: !!yt, youtubeId: yt } } : {}),
        },
      },
      {
        onSuccess: (s) => { toast.success(t(editing ? 'sf.toast.saved' : 'sf.toast.created')); navigate(`${r.base}/sessions/${s?._id ?? sessionId}`); },
        onError: (err) => setError(readApiError(err).message),
      },
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader back={back} title={t(editing ? 'sf.editTitle' : 'sf.newTitle')} description={t('sf.subtitle')} />
      <form onSubmit={submit} noValidate className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <Panel>
            <PanelTitle title={t('sf.basics')} />
            <div className="space-y-4">
              <Field label={t('sf.title')} required>{(c) => <TextInput {...c} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder={t('sf.titleHint')} />}</Field>
              <Field label={t('sf.group')} required hint={editing ? t('sf.groupLocked') : undefined}>
                {(c) => (
                  <SelectInput {...c} value={groupId} onChange={(e) => setGroupId(e.target.value)} disabled={editing}>
                    <option value="">{t('sf.pickGroup')}</option>
                    {(groups.data ?? []).filter((g) => g.status === 'active' || g._id === groupId).map((g) => <option key={g._id} value={g._id}>{g.name}{g.courseId?.title ? ` — ${g.courseId.title}` : ''}</option>)}
                  </SelectInput>
                )}
              </Field>
              <Field label={t('sf.description')}>{(c) => <TextArea {...c} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />}</Field>
            </div>
          </Panel>
          <Panel>
            <PanelTitle title={t('sf.plan')} />
            <div className="space-y-5">
              <Lines label={t('sf.objectives')} values={objectives} onChange={setObjectives} placeholder={t('sf.objectiveHint')} addLabel={t('sf.addObjective')} />
              <Lines label={t('sf.materials')} values={materials} onChange={setMaterials} placeholder={t('sf.materialHint')} addLabel={t('sf.addMaterial')} />
              <Field label={t('sf.notes')}>{(c) => <TextArea {...c} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />}</Field>
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel>
            <PanelTitle title={t('sf.when')} />
            {!editing && (
              <div role="radiogroup" aria-label={t('sf.when')} className="mb-4 grid gap-2">
                {[false, true].map((c) => (
                  <label key={String(c)} className={cn('flex cursor-pointer items-start gap-3 rounded-card border p-3 has-[:focus-visible]:focus-ring', custom === c ? 'border-ink bg-frost' : 'border-line-strong hover:border-ink')}>
                    <input type="radio" name="when" checked={custom === c} onChange={() => setCustom(c)} className="mt-1 size-4 accent-[#0f1f33]" />
                    <span>
                      <span className="block text-sm font-medium text-ink">{t(c ? 'sf.custom' : 'sf.next')}</span>
                      <span className="block text-xs text-ink-4">{c ? t('sf.customHint') : group ? group.schedule.map((s) => `${day(s.day)} ${s.startTime}`).join(' · ') : t('sf.nextHint')}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
            {custom && (
              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <Field label={t('sf.date')} required>{(c) => <TextInput {...c} type="date" value={date} onChange={(e) => setDate(e.target.value)} />}</Field>
                <Field label={t('sf.start')} required>{(c) => <TextInput {...c} type="time" value={start} onChange={(e) => setStart(e.target.value)} dir="ltr" />}</Field>
                <Field label={t('sf.end')} required>{(c) => <TextInput {...c} type="time" value={end} onChange={(e) => setEnd(e.target.value)} dir="ltr" />}</Field>
              </div>
            )}
          </Panel>
          {withVideo && (
            <Panel>
              <PanelTitle title={t('sf.video')} />
              <Field label={t('sf.youtube')} hint={t('sf.youtubeHint')}>{(c) => <TextInput {...c} value={video} onChange={(e) => setVideo(e.target.value)} dir="ltr" placeholder="https://youtu.be/…" />}</Field>
            </Panel>
          )}
          {error && <p role="alert" className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => navigate(back.to)}>{t('sf.cancel')}</Button>
            <Button type="submit" icon={<Save />} loading={save.isPending}>{t(editing ? 'sf.save' : 'sf.create')}</Button>
          </div>
        </div>
      </form>
    </div>
  );
}
