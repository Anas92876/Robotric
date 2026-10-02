import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, CheckSquare, CircleDot, ImageIcon, Plus, Trash2, Type, X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button, Field, SelectInput, TextInput } from '../../../ui';

export interface QuestionDraft {
  _id?: string;
  questionText: string;
  questionTextAr?: string;
  answerType: 'mcq' | 'text' | 'image';
  type?: 'single_choice' | 'multiple_choice';
  options: string[];
  correctAnswers: number[];
  points: number;
  order: number;
  required: boolean;
  maxLength?: number;
  maxImages?: number;
  allowedImageTypes?: string[];
  maxImageSize?: number;
}

export const newQuestion = (answerType: QuestionDraft['answerType'], order: number): QuestionDraft => ({
  questionText: '', questionTextAr: '', answerType, type: 'single_choice', options: answerType === 'mcq' ? ['', ''] : [], correctAnswers: [], points: 10, order, required: true,
  ...(answerType === 'text' ? { maxLength: 1000 } : {}), ...(answerType === 'image' ? { maxImages: 3, allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'], maxImageSize: 5 } : {}),
});

/** Problems that block publishing, as translation keys with their question number. */
export function questionProblems(qs: QuestionDraft[]): { key: string; n: number }[] {
  const out: { key: string; n: number }[] = [];
  qs.forEach((q, i) => {
    const n = i + 1;
    if (!q.questionText.trim()) out.push({ key: 'qe.errText', n });
    if (q.answerType === 'mcq') {
      if (q.options.filter((o) => o.trim()).length < 2) out.push({ key: 'qe.errOptions', n });
      if (!q.correctAnswers.length) out.push({ key: 'qe.errCorrect', n });
    }
  });
  return out;
}

const ICON = { mcq: CircleDot, text: Type, image: ImageIcon };

/** Questions of a task: multiple choice (one or several right answers), written answer, or photos. */
export function QuestionsEditor({ value, onChange }: { value: QuestionDraft[]; onChange: (q: QuestionDraft[]) => void }) {
  const { t } = useTranslation('dashboardCommon');
  const set = (i: number, patch: Partial<QuestionDraft>) => onChange(value.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...value];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next.map((q, j) => ({ ...q, order: j })));
  };
  const total = value.reduce((s, q) => s + (Number(q.points) || 0), 0);

  return (
    <div className="space-y-4">
      {value.length === 0 && <p className="rounded-card border border-dashed border-line-strong px-4 py-6 text-center text-sm text-ink-4">{t('qe.none')}</p>}
      {value.map((q, i) => {
        const Icon = ICON[q.answerType];
        return (
          <fieldset key={i} className="rounded-card border border-line p-4">
            <legend className="sr-only">{t('qe.question', { n: i + 1 })}</legend>
            <div className="mb-3 flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-full bg-ink text-xs font-semibold text-glow">{i + 1}</span>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink"><Icon className="size-4 text-ink-3" aria-hidden />{t(`qe.type.${q.answerType}`)}</span>
              <span className="ms-auto flex items-center gap-1">
                <Button size="sm" variant="ghost" iconOnly icon={<ArrowUp />} aria-label={t('qe.up')} disabled={i === 0} onClick={() => move(i, -1)} />
                <Button size="sm" variant="ghost" iconOnly icon={<ArrowDown />} aria-label={t('qe.down')} disabled={i === value.length - 1} onClick={() => move(i, 1)} />
                <Button size="sm" variant="ghost" iconOnly icon={<Trash2 />} aria-label={t('qe.remove', { n: i + 1 })} className="text-danger" onClick={() => onChange(value.filter((_, j) => j !== i).map((x, j) => ({ ...x, order: j })))} />
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label={t('qe.text')} required>{(c) => <TextInput {...c} value={q.questionText} onChange={(e) => set(i, { questionText: e.target.value })} dir="auto" />}</Field>
              <Field label={t('qe.textAr')}>{(c) => <TextInput {...c} value={q.questionTextAr ?? ''} onChange={(e) => set(i, { questionTextAr: e.target.value })} dir="rtl" />}</Field>
            </div>

            {q.answerType === 'mcq' && (
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm font-medium text-ink">{t('qe.options')}</p>
                  <SelectInput aria-label={t('qe.kind')} value={q.type ?? 'single_choice'} onChange={(e) => set(i, { type: e.target.value as QuestionDraft['type'], correctAnswers: e.target.value === 'single_choice' ? q.correctAnswers.slice(0, 1) : q.correctAnswers })} className="h-8 w-auto text-xs">
                    <option value="single_choice">{t('qe.single')}</option>
                    <option value="multiple_choice">{t('qe.multiple')}</option>
                  </SelectInput>
                  <span className="text-xs text-ink-4">{t('qe.markRight')}</span>
                </div>
                {q.options.map((o, k) => {
                  const right = q.correctAnswers.includes(k);
                  return (
                    <div key={k} className="flex items-center gap-2">
                      <button type="button" role={q.type === 'multiple_choice' ? 'checkbox' : 'radio'} aria-checked={right} aria-label={t('qe.isRight', { n: k + 1 })}
                        onClick={() => set(i, { correctAnswers: q.type === 'multiple_choice' ? (right ? q.correctAnswers.filter((x) => x !== k) : [...q.correctAnswers, k]) : [k] })}
                        className={cn('grid size-9 shrink-0 place-items-center rounded-full border-2 focus-visible:focus-ring', right ? 'border-success bg-success text-white' : 'border-line-strong text-ink-4')}>
                        {q.type === 'multiple_choice' ? <CheckSquare className="size-4" /> : <CircleDot className="size-4" />}
                      </button>
                      <TextInput value={o} onChange={(e) => set(i, { options: q.options.map((x, j) => (j === k ? e.target.value : x)) })} placeholder={t('qe.option', { n: k + 1 })} aria-label={t('qe.option', { n: k + 1 })} className="h-10" dir="auto" />
                      <Button size="sm" variant="ghost" iconOnly icon={<X />} aria-label={t('qe.removeOption', { n: k + 1 })} disabled={q.options.length <= 2}
                        onClick={() => set(i, { options: q.options.filter((_, j) => j !== k), correctAnswers: q.correctAnswers.filter((x) => x !== k).map((x) => (x > k ? x - 1 : x)) })} />
                    </div>
                  );
                })}
                {q.options.length < 8 && <Button size="sm" variant="ghost" icon={<Plus />} onClick={() => set(i, { options: [...q.options, ''] })}>{t('qe.addOption')}</Button>}
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-end gap-3">
              <Field label={t('qe.points')} className="w-28">{(c) => <TextInput {...c} type="number" min={0} value={q.points} onChange={(e) => set(i, { points: Number(e.target.value) || 0 })} className="h-10" />}</Field>
              {q.answerType === 'text' && <Field label={t('qe.maxLength')} className="w-36">{(c) => <TextInput {...c} type="number" min={1} value={q.maxLength ?? ''} onChange={(e) => set(i, { maxLength: Number(e.target.value) || undefined })} className="h-10" />}</Field>}
              {q.answerType === 'image' && <>
                <Field label={t('qe.maxImages')} className="w-32">{(c) => <TextInput {...c} type="number" min={1} max={10} value={q.maxImages ?? 1} onChange={(e) => set(i, { maxImages: Number(e.target.value) || 1 })} className="h-10" />}</Field>
                <Field label={t('qe.maxSize')} className="w-32">{(c) => <TextInput {...c} type="number" min={1} max={20} value={q.maxImageSize ?? 5} onChange={(e) => set(i, { maxImageSize: Number(e.target.value) || 5 })} className="h-10" />}</Field>
              </>}
              <label className="flex h-10 items-center gap-2 text-sm text-ink"><input type="checkbox" checked={q.required} onChange={(e) => set(i, { required: e.target.checked })} className="size-4 accent-[#0f1f33]" />{t('qe.required')}</label>
            </div>
          </fieldset>
        );
      })}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-ink-3">{t('qe.add')}</span>
        {(['mcq', 'text', 'image'] as const).map((k) => {
          const Icon = ICON[k];
          return <Button key={k} size="sm" variant="secondary" icon={<Icon />} onClick={() => onChange([...value, newQuestion(k, value.length)])}>{t(`qe.type.${k}`)}</Button>;
        })}
        {value.length > 0 && <span className="ms-auto text-sm text-ink-3">{t('qe.total', { points: total })}</span>}
      </div>
    </div>
  );
}
