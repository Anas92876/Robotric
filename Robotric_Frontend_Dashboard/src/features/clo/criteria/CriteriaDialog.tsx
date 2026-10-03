import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { api } from '../../../lib/api';
import { readApiError } from '../../../app/apiError';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/utils';
import { Button, Dialog, Field, SelectInput, TextInput } from '../../../ui';
import { useCloCourseOptions, useCloGroups } from '../api';

export type ParamType = 'rating' | 'percentage' | 'grade' | 'boolean' | 'text';
export interface Param { _id?: string; name: string; description?: string; type: ParamType; ratingScale: { min: number; max: number }; weight: number; required: boolean; order: number }
export interface Criteria {
  _id: string;
  name: string;
  description?: string | null;
  appliesTo: 'course' | 'groups';
  courseIds: { _id: string; title: string }[];
  groupIds: { _id: string; name: string }[];
  parameters: Param[];
  includeOverallRating: boolean;
  status: 'active' | 'inactive' | 'archived';
  totalWeight: number;
}
export const PARAM_TYPES: ParamType[] = ['rating', 'percentage', 'grade', 'boolean', 'text'];
const blank = (order: number): Param => ({ name: '', description: '', type: 'rating', ratingScale: { min: 1, max: 5 }, weight: 0, required: true, order });

/** Create or edit evaluation criteria: where it applies and what trainers rate. */
export function CriteriaDialog({ open, onClose, criteria }: { open: boolean; onClose: () => void; criteria: Criteria | null }) {
  const { t } = useTranslation('dashboardCLO');
  const toast = useToast();
  const qc = useQueryClient();
  const courses = useCloCourseOptions();
  const groups = useCloGroups();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [appliesTo, setAppliesTo] = useState<'course' | 'groups'>('course');
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [params, setParams] = useState<Param[]>([]);
  const [overall, setOverall] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    setName(criteria?.name ?? '');
    setDescription(criteria?.description ?? '');
    setAppliesTo(criteria?.appliesTo ?? 'course');
    setCourseIds(criteria?.courseIds.map((c) => c._id) ?? []);
    setGroupIds(criteria?.groupIds.map((g) => g._id) ?? []);
    setParams(criteria?.parameters.length ? criteria.parameters.map((p) => ({ ...p, description: p.description ?? '' })) : [blank(0)]);
    setOverall(criteria?.includeOverallRating ?? true);
    setError('');
  }, [open, criteria]);

  const save = useMutation({
    mutationFn: () => {
      const body = { name: name.trim(), description: description.trim(), appliesTo, courseIds, groupIds: appliesTo === 'groups' ? groupIds : [], includeOverallRating: overall, parameters: params.map((p, i) => ({ ...p, name: p.name.trim(), description: p.description?.trim(), order: i })) };
      return criteria ? api.put(`/clo/evaluation-criteria/${criteria._id}`, body) : api.post('/clo/evaluation-criteria', body);
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['clo', 'criteria'] }); toast.success(t(criteria ? 'cr.toast.saved' : 'cr.toast.created')); onClose(); },
    onError: (e) => setError(readApiError(e).message),
  });
  const setP = (i: number, patch: Partial<Param>) => setParams((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const move = (i: number, d: -1 | 1) => setParams((ps) => { const n = [...ps]; [n[i], n[i + d]] = [n[i + d], n[i]]; return n; });
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const courseGroups = (groups.data ?? []).filter((g) => g.courseId && courseIds.includes(g.courseId._id));
  const weight = params.reduce((s, p) => s + (Number(p.weight) || 0), 0);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError(t('cr.errName'));
    if (!courseIds.length) return setError(t('cr.errCourses'));
    if (appliesTo === 'groups' && !groupIds.length) return setError(t('cr.errGroups'));
    if (params.some((p) => !p.name.trim())) return setError(t('cr.errParam'));
    if (!params.length && !overall) return setError(t('cr.errEmpty'));
    setError('');
    save.mutate();
  };

  return (
    <Dialog open={open} onClose={onClose} size="lg" title={t(criteria ? 'cr.editTitle' : 'cr.newTitle')} closeLabel={t('tr.cancel')}
      footer={<><Button variant="ghost" onClick={onClose}>{t('tr.cancel')}</Button><Button type="submit" form="criteria-form" loading={save.isPending}>{t(criteria ? 'tr.save' : 'cr.create')}</Button></>}>
      <form id="criteria-form" onSubmit={submit} noValidate className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('cr.name')} required>{(c) => <TextInput {...c} value={name} onChange={(e) => setName(e.target.value)} maxLength={200} dir="auto" />}</Field>
          <Field label={t('cr.description')}>{(c) => <TextInput {...c} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} dir="auto" />}</Field>
        </div>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-ink">{t('cr.courses')}</legend>
          <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto">
            {(courses.data ?? []).filter((c) => c.status !== 'archived' || courseIds.includes(c._id)).map((c) => {
              const on = courseIds.includes(c._id);
              return <button key={c._id} type="button" aria-pressed={on} onClick={() => setCourseIds((l) => toggle(l, c._id))} className={cn('h-9 rounded-pill border px-3.5 text-sm focus-visible:focus-ring', on ? 'border-ink bg-ink text-white' : 'border-line-strong text-ink-2 hover:border-ink')}>{c.title}</button>;
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-ink">{t('cr.appliesTo')}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(['course', 'groups'] as const).map((a) => (
              <label key={a} className={cn('flex cursor-pointer items-start gap-3 rounded-card border p-3 has-[:focus-visible]:focus-ring', appliesTo === a ? 'border-ink bg-frost' : 'border-line-strong hover:border-ink')}>
                <input type="radio" name="applies" checked={appliesTo === a} onChange={() => setAppliesTo(a)} className="mt-1 size-4 accent-[#0f1f33]" />
                <span><span className="block text-sm font-medium text-ink">{t(`cr.scope.${a}`)}</span><span className="block text-xs text-ink-4">{t(`cr.scopeHint.${a}`)}</span></span>
              </label>
            ))}
          </div>
          {appliesTo === 'groups' && (
            <div className="mt-3 flex flex-wrap gap-2">
              {!courseIds.length ? <p className="text-sm text-ink-4">{t('cr.pickCoursesFirst')}</p> : courseGroups.length === 0 ? <p className="text-sm text-ink-4">{t('cr.noGroups')}</p> : courseGroups.map((g) => {
                const on = groupIds.includes(g._id);
                return <button key={g._id} type="button" aria-pressed={on} onClick={() => setGroupIds((l) => toggle(l, g._id))} className={cn('h-9 rounded-pill border px-3.5 text-sm focus-visible:focus-ring', on ? 'border-ink bg-ink text-white' : 'border-line-strong text-ink-2 hover:border-ink')}>{g.name}</button>;
              })}
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend className="mb-1.5 flex w-full items-center justify-between text-sm font-medium text-ink"><span>{t('cr.params')}</span><span className={cn('text-xs font-normal tabular-nums', weight === 100 || weight === 0 ? 'text-ink-4' : 'text-warning')}>{t('cr.weightTotal', { n: weight })}</span></legend>
          <div className="space-y-2">
            {params.map((p, i) => (
              <div key={i} className="rounded-card border border-line p-3">
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px_90px_auto]">
                  <TextInput aria-label={t('cr.paramName', { n: i + 1 })} placeholder={t('cr.paramNameHint')} value={p.name} onChange={(e) => setP(i, { name: e.target.value })} maxLength={100} className="h-10" dir="auto" />
                  <SelectInput aria-label={t('cr.paramType', { n: i + 1 })} value={p.type} onChange={(e) => setP(i, { type: e.target.value as ParamType })} className="h-10">
                    {PARAM_TYPES.map((x) => <option key={x} value={x}>{t(`cr.type.${x}`)}</option>)}
                  </SelectInput>
                  <TextInput type="number" min={0} max={100} aria-label={t('cr.paramWeight', { n: i + 1 })} title={t('cr.weight')} value={p.weight} onChange={(e) => setP(i, { weight: Number(e.target.value) || 0 })} className="h-10" />
                  <span className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" iconOnly icon={<ArrowUp />} aria-label={t('cr.up')} disabled={i === 0} onClick={() => move(i, -1)} />
                    <Button size="sm" variant="ghost" iconOnly icon={<ArrowDown />} aria-label={t('cr.down')} disabled={i === params.length - 1} onClick={() => move(i, 1)} />
                    <Button size="sm" variant="ghost" iconOnly icon={<Trash2 />} aria-label={t('cr.removeParam', { n: i + 1 })} className="text-danger" onClick={() => setParams((ps) => ps.filter((_, j) => j !== i))} />
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <TextInput aria-label={t('cr.paramDesc', { n: i + 1 })} placeholder={t('cr.paramDescHint')} value={p.description ?? ''} onChange={(e) => setP(i, { description: e.target.value })} maxLength={200} className="h-9 min-w-48 flex-1 text-sm" dir="auto" />
                  {p.type === 'rating' && (
                    <label className="flex items-center gap-2 text-xs text-ink-3">{t('cr.scale')}
                      <SelectInput value={p.ratingScale.max} onChange={(e) => setP(i, { ratingScale: { min: 1, max: Number(e.target.value) } })} className="h-9 w-20 text-sm">{[3, 4, 5, 10].map((n) => <option key={n} value={n}>1–{n}</option>)}</SelectInput>
                    </label>
                  )}
                  <label className="flex items-center gap-2 text-xs text-ink-3"><input type="checkbox" checked={p.required} onChange={(e) => setP(i, { required: e.target.checked })} className="size-4 accent-[#0f1f33]" />{t('cr.required')}</label>
                </div>
              </div>
            ))}
            <Button size="sm" variant="ghost" icon={<Plus />} onClick={() => setParams((ps) => [...ps, blank(ps.length)])}>{t('cr.addParam')}</Button>
          </div>
        </fieldset>

        <label className="flex items-start gap-3 text-sm text-ink">
          <input type="checkbox" checked={overall} onChange={(e) => setOverall(e.target.checked)} className="mt-0.5 size-4 accent-[#0f1f33]" />
          <span><span className="block font-medium">{t('cr.overall')}</span><span className="block text-xs text-ink-4">{t('cr.overallHint')}</span></span>
        </label>
        {error && <p role="alert" className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      </form>
    </Dialog>
  );
}
