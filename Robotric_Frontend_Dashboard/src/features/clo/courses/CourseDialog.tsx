import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BookOpen, Package, Plus, X } from 'lucide-react';
import { api } from '../../../lib/api';
import { readApiError } from '../../../app/apiError';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/utils';
import { Button, Dialog, Field, SelectInput, TextArea, TextInput } from '../../../ui';

export interface Course {
  _id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  status: 'draft' | 'published' | 'archived';
  duration?: string | number | null;
  totalHours?: number | null;
  price?: number | null;
  type: 'single' | 'bundle';
  bundlePrice?: number | null;
  objectives?: string[];
  prerequisites?: string[];
  wroDocumentsRequired?: boolean;
  thumbnail?: string | null;
  parentBundle?: string | null;
  stats?: { totalGroups: number; activeGroups: number; totalEnrollments: number; activeEnrollments: number; trainersCount: number; completionRate: number; subCourseCount?: number };
  createdAt: string;
}
const LEVELS = ['beginner', 'intermediate', 'advanced'];

/** A list of short lines (objectives, prerequisites). */
function Lines({ label, values, onChange, addLabel }: { label: string; values: string[]; onChange: (v: string[]) => void; addLabel: string }) {
  const { t } = useTranslation('dashboardCLO');
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-ink">{label}</legend>
      <div className="space-y-2">
        {values.map((v, i) => (
          <div key={i} className="flex gap-2">
            <TextInput value={v} onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))} aria-label={`${label} ${i + 1}`} className="h-10" dir="auto" />
            <Button variant="ghost" size="sm" iconOnly icon={<X />} aria-label={t('crs.removeLine', { n: i + 1 })} onClick={() => onChange(values.filter((_, j) => j !== i))} className="h-10 shrink-0" />
          </div>
        ))}
        <Button variant="ghost" size="sm" icon={<Plus />} onClick={() => onChange([...values, ''])}>{addLabel}</Button>
      </div>
    </fieldset>
  );
}

/** Create or edit a course (a single course, or a bundle of courses sold together). */
export function CourseDialog({ open, onClose, course, onSaved }: { open: boolean; onClose: () => void; course: Course | null; onSaved?: (c: Course) => void }) {
  const { t } = useTranslation('dashboardCLO');
  const toast = useToast();
  const qc = useQueryClient();
  const [type, setType] = useState<'single' | 'bundle'>('single');
  const [d, setD] = useState({ title: '', category: '', level: 'beginner', duration: '', price: '', bundlePrice: '', description: '' });
  const [objectives, setObjectives] = useState<string[]>([]);
  const [prerequisites, setPrerequisites] = useState<string[]>([]);
  const [wro, setWro] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    setType(course?.type ?? 'single');
    setD({
      title: course?.title ?? '', category: course?.category ?? '', level: (course?.level ?? 'beginner').toLowerCase(), duration: course?.duration ? String(course.duration) : '',
      price: course?.price != null ? String(course.price) : '', bundlePrice: course?.bundlePrice != null ? String(course.bundlePrice) : '', description: course?.description ?? '',
    });
    setObjectives(course?.objectives ?? []);
    setPrerequisites(course?.prerequisites ?? []);
    setWro(!!course?.wroDocumentsRequired);
    setError('');
  }, [open, course]);
  const set = (k: keyof typeof d) => (e: { target: { value: string } }) => setD((x) => ({ ...x, [k]: e.target.value }));
  const save = useMutation({
    mutationFn: async () => {
      const body = {
        title: d.title.trim(), category: d.category.trim(), level: d.level, description: d.description.trim(), duration: Number(d.duration) || 0,
        ...(type === 'bundle' ? { bundlePrice: Number(d.bundlePrice) || 0 } : { price: Number(d.price) || 0 }),
        type, objectives: objectives.map((x) => x.trim()).filter(Boolean), prerequisites: prerequisites.map((x) => x.trim()).filter(Boolean), wroDocumentsRequired: wro,
      };
      return ((course ? await api.put(`/clo/courses/${course._id}`, body) : await api.post('/clo/courses', body)).data.data) as Course;
    },
    onSuccess: (c) => { void qc.invalidateQueries({ queryKey: ['clo', 'courses'] }); toast.success(t(course ? 'crs.toast.saved' : 'crs.toast.created')); onClose(); onSaved?.(c); },
    onError: (e) => setError(readApiError(e).message),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!d.title.trim()) return setError(t('crs.errTitle'));
    if (!d.category.trim()) return setError(t('crs.errCategory'));
    if (!d.description.trim()) return setError(t('crs.errDescription'));
    if (type === 'bundle' ? d.bundlePrice.trim() === '' : false) return setError(t('crs.errBundlePrice'));
    setError('');
    save.mutate();
  };

  return (
    <Dialog open={open} onClose={onClose} size="lg" title={t(course ? 'crs.editTitle' : 'crs.newTitle')} closeLabel={t('tr.cancel')}
      footer={<><Button variant="ghost" onClick={onClose}>{t('tr.cancel')}</Button><Button type="submit" form="course-form" loading={save.isPending}>{t(course ? 'tr.save' : 'crs.create')}</Button></>}>
      <form id="course-form" onSubmit={submit} noValidate className="space-y-4">
        {!course && (
          <div role="radiogroup" aria-label={t('crs.kind')} className="grid gap-2 sm:grid-cols-2">
            {(['single', 'bundle'] as const).map((k) => (
              <label key={k} className={cn('flex cursor-pointer items-start gap-3 rounded-card border p-3 has-[:focus-visible]:focus-ring', type === k ? 'border-ink bg-frost' : 'border-line-strong hover:border-ink')}>
                <input type="radio" name="kind" checked={type === k} onChange={() => setType(k)} className="sr-only" />
                {k === 'single' ? <BookOpen className="mt-0.5 size-5 text-ink-3" aria-hidden /> : <Package className="mt-0.5 size-5 text-ink-3" aria-hidden />}
                <span><span className="block text-sm font-medium text-ink">{t(`crs.type.${k}`)}</span><span className="block text-xs text-ink-4">{t(`crs.typeHint.${k}`)}</span></span>
              </label>
            ))}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('crs.title')} required>{(c) => <TextInput {...c} value={d.title} onChange={set('title')} maxLength={200} dir="auto" />}</Field>
          <Field label={t('crs.category')} required hint={t('crs.categoryHint')}>{(c) => <TextInput {...c} value={d.category} onChange={set('category')} maxLength={100} dir="auto" />}</Field>
          <Field label={t('crs.level')}>{(c) => <SelectInput {...c} value={d.level} onChange={set('level')}>{LEVELS.map((l) => <option key={l} value={l}>{t(`crs.levels.${l}`)}</option>)}</SelectInput>}</Field>
          <Field label={t('crs.hours')}>{(c) => <TextInput {...c} type="number" min={0} value={d.duration} onChange={set('duration')} />}</Field>
          {type === 'bundle'
            ? <Field label={t('crs.bundlePrice')} required hint={t('crs.bundlePriceHint')}>{(c) => <TextInput {...c} type="number" min={0} step="0.01" value={d.bundlePrice} onChange={set('bundlePrice')} dir="ltr" />}</Field>
            : <Field label={t('crs.price')}>{(c) => <TextInput {...c} type="number" min={0} step="0.01" value={d.price} onChange={set('price')} dir="ltr" />}</Field>}
        </div>
        <Field label={t('crs.description')} required>{(c) => <TextArea {...c} rows={4} value={d.description} onChange={set('description')} maxLength={2000} dir="auto" />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Lines label={t('crs.objectives')} values={objectives} onChange={setObjectives} addLabel={t('crs.addObjective')} />
          <Lines label={t('crs.prerequisites')} values={prerequisites} onChange={setPrerequisites} addLabel={t('crs.addPrerequisite')} />
        </div>
        <label className="flex items-start gap-3 text-sm text-ink">
          <input type="checkbox" checked={wro} onChange={(e) => setWro(e.target.checked)} className="mt-0.5 size-4 accent-[#0f1f33]" />
          <span><span className="block font-medium">{t('crs.wro')}</span><span className="block text-xs text-ink-4">{t('crs.wroHint')}</span></span>
        </label>
        {error && <p role="alert" className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      </form>
    </Dialog>
  );
}
