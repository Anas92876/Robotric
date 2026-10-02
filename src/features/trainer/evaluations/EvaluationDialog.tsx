import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Sparkles, Star } from 'lucide-react';
import { api } from '../../../lib/api';
import { readApiError } from '../../../app/apiError';
import { cn } from '../../../lib/utils';
import { Button, Dialog, Field, SelectInput, TextArea, TextInput } from '../../../ui';

export interface CriteriaParam { name: string; description?: string; type: 'rating' | 'percentage' | 'grade' | 'boolean' | 'text'; ratingScale?: { min: number; max: number }; weight: number; required: boolean; order: number }
export interface EvaluationDraft { overallRating: number; parameters: Record<string, unknown>; trainerNotes: string; flags: { needsAttention: boolean; excelling: boolean } }

const GRADES = ['A', 'B', 'C', 'D', 'F'];

/** One parameter value turned into 1–5, the same way the old form averaged them. */
function toFive(p: CriteriaParam, v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = p.type === 'rating' ? Number(v) : p.type === 'percentage' ? Number(v) / 20 : p.type === 'grade' ? ({ A: 5, B: 4, C: 3, D: 2, F: 1 } as Record<string, number>)[String(v)] ?? 0 : p.type === 'boolean' ? (v === true ? 5 : 1) : null;
  return n === null || Number.isNaN(n) ? null : Math.max(1, Math.min(5, n));
}

function Stars({ value, onChange, max = 5, label }: { value: number; onChange: (n: number) => void; max?: number; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1" dir="ltr">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} / ${max}`} onClick={() => onChange(n)} className="rounded focus-visible:focus-ring">
          <Star className={cn('size-7', n <= value ? 'fill-glow text-glow' : 'text-line-strong')} />
        </button>
      ))}
    </div>
  );
}

/** Evaluate one student in one class: the CLO's criteria when set, an overall rating, notes and flags. */
export function EvaluationDialog({ open, onClose, student, groupId, initial, saving, onSave }: {
  open: boolean; onClose: () => void; student: { _id: string; name: string } | null; groupId: string; initial?: Partial<EvaluationDraft> | null; saving: boolean; onSave: (d: EvaluationDraft) => Promise<void>;
}) {
  const { t } = useTranslation('dashboardTrainer');
  const criteria = useQuery({
    queryKey: ['trainer', 'criteria', groupId],
    queryFn: async () => {
      try { return (await api.get(`/trainer/evaluations/criteria/group/${groupId}`, { skipErrorToast: true } as object)).data.data as { parameters: CriteriaParam[]; includeOverallRating: boolean }; }
      catch (err) { if (readApiError(err).status === 404) return null; throw err; }
    },
    enabled: open && !!groupId,
    staleTime: 5 * 60_000,
  });
  const params = useMemo(() => [...(criteria.data?.parameters ?? [])].sort((a, b) => a.order - b.order), [criteria.data]);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [used, setUsed] = useState<Set<string>>(new Set());
  const [overall, setOverall] = useState(3);
  const [notes, setNotes] = useState('');
  const [flags, setFlags] = useState({ needsAttention: false, excelling: false });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setValues(initial?.parameters ?? {});
    setOverall(initial?.overallRating ?? 3);
    setNotes(initial?.trainerNotes ?? '');
    setFlags({ needsAttention: !!initial?.flags?.needsAttention, excelling: !!initial?.flags?.excelling });
    setError('');
  }, [open, initial]);
  useEffect(() => {
    // Editing keeps the criteria that were filled; a new evaluation starts with all of them
    const filled = Object.keys(initial?.parameters ?? {});
    setUsed(new Set(filled.length ? filled : params.map((p) => p.name)));
  }, [params, initial]);

  // With criteria, the overall rating follows the used ones (weighted when weights are set)
  const computed = useMemo(() => {
    const scored = params.filter((p) => used.has(p.name)).map((p) => ({ p, v: toFive(p, values[p.name]) })).filter((x) => x.v !== null) as { p: CriteriaParam; v: number }[];
    if (!scored.length) return null;
    const w = scored.reduce((s, x) => s + (x.p.weight || 0), 0);
    return Math.round(w ? scored.reduce((s, x) => s + x.v * (x.p.weight || 0), 0) / w : scored.reduce((s, x) => s + x.v, 0) / scored.length);
  }, [params, used, values]);
  const rating = computed ?? overall;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const missing = params.find((p) => p.required && used.has(p.name) && (values[p.name] === undefined || values[p.name] === ''));
    if (missing) return setError(t('evd.required', { name: missing.name }));
    setError('');
    const chosen = Object.fromEntries(Object.entries(values).filter(([k, v]) => used.has(k) && v !== undefined && v !== ''));
    try { await onSave({ overallRating: rating, parameters: chosen, trainerNotes: notes.trim(), flags }); } catch (err) { setError(readApiError(err).message); }
  };

  const input = (p: CriteriaParam) => {
    const v = values[p.name];
    const set = (x: unknown) => setValues((cur) => ({ ...cur, [p.name]: x }));
    if (p.type === 'rating') return <Stars value={Number(v) || 0} onChange={set} max={p.ratingScale?.max ?? 5} label={p.name} />;
    if (p.type === 'percentage') return <TextInput type="number" min={0} max={100} value={v === undefined ? '' : String(v)} onChange={(e) => set(e.target.value === '' ? '' : Number(e.target.value))} className="h-10 w-28" aria-label={p.name} />;
    if (p.type === 'grade') return <SelectInput value={String(v ?? '')} onChange={(e) => set(e.target.value)} className="h-10 w-28" aria-label={p.name}><option value="">—</option>{GRADES.map((g) => <option key={g} value={g}>{g}</option>)}</SelectInput>;
    if (p.type === 'boolean') return <div className="flex gap-1.5">{[true, false].map((b) => <button key={String(b)} type="button" aria-pressed={v === b} onClick={() => set(b)} className={cn('h-9 rounded-pill border px-3.5 text-sm focus-visible:focus-ring', v === b ? 'border-ink bg-ink text-white' : 'border-line-strong text-ink-2')}>{t(b ? 'evd.yes' : 'evd.no')}</button>)}</div>;
    return <TextInput value={String(v ?? '')} onChange={(e) => set(e.target.value)} className="h-10" aria-label={p.name} />;
  };

  return (
    <Dialog open={open} onClose={onClose} size="lg" title={t('evd.title', { name: student?.name ?? '' })} closeLabel={t('grp.close')}
      footer={<><Button variant="ghost" onClick={onClose}>{t('sf.cancel')}</Button><Button type="submit" form="eval-form" loading={saving}>{t('evd.save')}</Button></>}>
      <form id="eval-form" onSubmit={submit} className="space-y-5" noValidate>
        {criteria.isLoading ? <div className="h-24 animate-pulse rounded-card bg-rail" /> : params.length > 0 ? (
          <fieldset className="space-y-3">
            <legend className="mb-1 text-sm font-medium text-ink">{t('evd.criteria')}</legend>
            {params.map((p) => (
              <div key={p.name} className={cn('rounded-card border p-3', used.has(p.name) ? 'border-line' : 'border-dashed border-line opacity-60')}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex min-w-0 items-center gap-2 text-sm font-medium text-ink">
                    <input type="checkbox" checked={used.has(p.name)} onChange={() => setUsed((cur) => { const n = new Set(cur); if (n.has(p.name)) n.delete(p.name); else n.add(p.name); return n; })} className="size-4 accent-[#0f1f33]" />
                    <span className="truncate" dir="auto">{p.name}{p.required && <span className="text-danger"> *</span>}</span>
                  </label>
                  {used.has(p.name) && input(p)}
                </div>
                {p.description && <p className="mt-1 text-xs text-ink-4" dir="auto">{p.description}</p>}
              </div>
            ))}
          </fieldset>
        ) : (
          <p className="rounded-card bg-rail px-3 py-2 text-xs text-ink-3">{t('evd.noCriteria')}</p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-canvas p-4">
          <div>
            <p className="text-sm font-medium text-ink">{t('evd.overall')}</p>
            <p className="text-xs text-ink-4">{computed !== null ? t('evd.fromCriteria') : t('evd.pick')}</p>
          </div>
          {computed !== null ? <span className="text-3xl font-bold tabular-nums text-ink">{computed}<span className="text-base text-ink-4"> / 5</span></span> : <Stars value={overall} onChange={setOverall} label={t('evd.overall')} />}
        </div>

        <Field label={t('evd.notes')} hint={t('evd.notesHint')}>{(c) => <TextArea {...c} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />}</Field>

        <div className="flex flex-wrap gap-2">
          {([['excelling', <Sparkles key="s" className="size-4" aria-hidden />], ['needsAttention', <AlertTriangle key="a" className="size-4" aria-hidden />]] as const).map(([k, icon]) => (
            <button key={k} type="button" aria-pressed={flags[k]} onClick={() => setFlags((cur) => ({ ...cur, [k]: !cur[k] }))} className={cn('inline-flex h-9 items-center gap-1.5 rounded-pill border px-3.5 text-sm focus-visible:focus-ring', flags[k] ? (k === 'excelling' ? 'border-success bg-success-soft text-success' : 'border-warning bg-warning-soft text-warning') : 'border-line-strong text-ink-2')}>
              {icon}{t(`evd.flag.${k}`)}
            </button>
          ))}
        </div>
        {error && <p role="alert" className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      </form>
    </Dialog>
  );
}
