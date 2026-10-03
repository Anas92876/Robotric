import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Save, X } from 'lucide-react';
import { readApiError } from '../../../app/apiError';
import { useToast } from '../../../components/ui/Toast';
import { Button, Field, PageHeader, Panel, PanelTitle, SelectInput, TextArea, TextInput } from '../../../ui';
import { useTrainerGroupOptions } from '../sessions/api';
import { useGroupStudents, useProject, useProjectMutations } from './api';
import { ownerOf } from './ProjectsPage';

/** Short names typed one at a time and shown as removable chips (parts, tools). */
function Chips({ label, hint, values, onChange }: { label: string; hint: string; values: string[]; onChange: (v: string[]) => void }) {
  const { t } = useTranslation('dashboardTrainer');
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft('');
  };
  return (
    <Field label={label} hint={hint}>
      {(c) => (
        <div>
          <div className="flex gap-2">
            <TextInput {...c} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }} maxLength={200} dir="auto" className="h-10" />
            <Button variant="secondary" size="sm" icon={<Plus />} onClick={add} className="h-10 shrink-0">{t('pjf.add')}</Button>
          </div>
          {values.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {values.map((v) => (
                <li key={v} className="inline-flex items-center gap-1 rounded-pill bg-rail py-1 ps-3 pe-1 text-sm text-ink">
                  <span dir="auto">{v}</span>
                  <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} aria-label={t('pjf.remove', { name: v })} className="grid size-6 place-items-center rounded-full text-ink-3 hover:bg-ink/10 focus-visible:focus-ring"><X className="size-3.5" /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Field>
  );
}

/** New project for a student of the group, or edit an existing one. */
export default function ProjectFormPage() {
  const { projectId } = useParams();
  const [params] = useSearchParams();
  const editing = !!projectId;
  const { t } = useTranslation('dashboardTrainer');
  const navigate = useNavigate();
  const toast = useToast();
  const groups = useTrainerGroupOptions();
  const current = useProject(projectId ?? '');
  const { save } = useProjectMutations();
  const [groupId, setGroupId] = useState(params.get('group') ?? '');
  const [studentId, setStudentId] = useState('');
  const [title, setTitle] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');
  const [components, setComponents] = useState<string[]>([]);
  const [technologies, setTechnologies] = useState<string[]>([]);
  const [error, setError] = useState('');
  const students = useGroupStudents(groupId);

  useEffect(() => {
    const p = current.data;
    if (!p) return;
    setGroupId(typeof p.groupId === 'object' ? p.groupId._id : p.groupId);
    setStudentId(ownerOf(p)._id);
    setTitle(p.title);
    setTitleAr(p.titleAr ?? '');
    setDescription(p.description ?? '');
    setDescriptionAr(p.descriptionAr ?? '');
    setComponents(p.components ?? []);
    setTechnologies(p.technologies ?? []);
  }, [current.data]);

  const back = editing ? { to: `/trainer/projects/${projectId}`, label: current.data?.title ?? t('pjt.title') } : { to: `/trainer/projects${groupId ? `?group=${groupId}` : ''}`, label: t('pjt.title') };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!groupId) return setError(t('sf.errGroup'));
    if (!studentId) return setError(t('pjf.errStudent'));
    if (!title.trim()) return setError(t('pjf.errTitle'));
    setError('');
    save.mutate(
      { id: projectId, d: { ...(editing ? {} : { groupId, studentId }), title: title.trim(), titleAr: titleAr.trim(), description: description.trim(), descriptionAr: descriptionAr.trim(), components, technologies } },
      { onSuccess: (p) => { toast.success(t(editing ? 'pjf.toast.saved' : 'pjf.toast.created')); navigate(`/trainer/projects/${p?._id ?? projectId}`); }, onError: (err) => setError(readApiError(err).message) },
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader back={back} title={t(editing ? 'pjf.editTitle' : 'pjf.newTitle')} description={t('pjf.subtitle')} />
      <form onSubmit={submit} noValidate className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <Panel>
            <PanelTitle title={t('pjf.about')} />
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label={t('tb.title')} required>{(c) => <TextInput {...c} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} dir="auto" />}</Field>
                <Field label={t('tb.titleAr')}>{(c) => <TextInput {...c} value={titleAr} onChange={(e) => setTitleAr(e.target.value)} maxLength={200} dir="rtl" />}</Field>
              </div>
              <Field label={t('pjf.description')}>{(c) => <TextArea {...c} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} dir="auto" />}</Field>
              <Field label={t('pjf.descriptionAr')}>{(c) => <TextArea {...c} rows={3} value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value)} maxLength={5000} dir="rtl" />}</Field>
            </div>
          </Panel>
          <Panel>
            <PanelTitle title={t('pjf.parts')} />
            <div className="space-y-4">
              <Chips label={t('pjf.components')} hint={t('pjf.componentsHint')} values={components} onChange={setComponents} />
              <Chips label={t('pjf.technologies')} hint={t('pjf.technologiesHint')} values={technologies} onChange={setTechnologies} />
            </div>
          </Panel>
        </div>
        <div className="space-y-5">
          <Panel>
            <PanelTitle title={t('pjf.who')} />
            <div className="space-y-4">
              <Field label={t('tk.group')} required hint={editing ? t('sf.groupLocked') : undefined}>
                {(c) => (
                  <SelectInput {...c} value={groupId} onChange={(e) => { setGroupId(e.target.value); setStudentId(''); }} disabled={editing}>
                    <option value="">{t('sf.pickGroup')}</option>
                    {(groups.data ?? []).filter((g) => g.status === 'active' || g._id === groupId).map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}
                  </SelectInput>
                )}
              </Field>
              <Field label={t('pjf.student')} required hint={editing ? t('pjf.studentLocked') : undefined}>
                {(c) => (
                  <SelectInput {...c} value={studentId} onChange={(e) => setStudentId(e.target.value)} disabled={editing || !groupId}>
                    <option value="">{groupId && !students.isLoading && !students.data?.length ? t('pjf.noStudents') : t('pjf.pickStudent')}</option>
                    {(students.data ?? []).map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                    {editing && current.data && !students.data?.some((s) => s._id === studentId) && <option value={studentId}>{ownerOf(current.data).name}</option>}
                  </SelectInput>
                )}
              </Field>
            </div>
          </Panel>
          {!editing && <p className="text-sm text-ink-3">{t('pjf.photosLater')}</p>}
          {error && <p role="alert" className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => navigate(back.to)}>{t('sf.cancel')}</Button>
            <Button type="submit" icon={<Save />} loading={save.isPending}>{t(editing ? 'sf.save' : 'pjf.create')}</Button>
          </div>
        </div>
      </form>
    </div>
  );
}
