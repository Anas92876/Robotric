import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Clock, CreditCard, Pause, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import { api } from '../../../lib/api';
import { useFormat } from '../../../app/format';
import { readApiError } from '../../../app/apiError';
import { useToast } from '../../../components/ui/Toast';
import { Badge, Button, ConfirmDialog, Dialog, EmptyState, Field, PageHeader, Panel, RowMenu, TextArea, TextInput } from '../../../ui';

interface Plan { _id: string; name: string; monthlyHours: number; price: number; isActive: boolean; description?: string | null }
const KEY = ['clo', 'plans'];

/** Monthly subscription plans for private sessions: hours per month and price. */
export default function PlansPage() {
  const { t } = useTranslation('dashboardCLO');
  const f = useFormat();
  const toast = useToast();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: KEY, queryFn: async () => ((await api.get('/clo/subscription-plans')).data.data?.plans ?? []) as Plan[] });
  const [form, setForm] = useState<{ plan: Plan | null } | null>(null);
  const lastForm = useRef(form);
  if (form) lastForm.current = form;
  const [d, setD] = useState({ name: '', monthlyHours: '8', price: '', description: '', isActive: true });
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<Plan | null>(null);
  const lastDel = useRef(deleting);
  if (deleting) lastDel.current = deleting;
  useEffect(() => {
    if (!form) return;
    const p = form.plan;
    setD({ name: p?.name ?? '', monthlyHours: String(p?.monthlyHours ?? 8), price: p ? String(p.price) : '', description: p?.description ?? '', isActive: p?.isActive ?? true });
    setError('');
  }, [form]);
  const refresh = () => void qc.invalidateQueries({ queryKey: KEY });
  const fail = (e: unknown) => toast.error(t('tr.actionError'), readApiError(e).message);
  const save = useMutation({
    mutationFn: () => {
      const body = { name: d.name.trim(), monthlyHours: Number(d.monthlyHours), price: Number(d.price), description: d.description.trim(), isActive: d.isActive };
      return form?.plan ? api.put(`/clo/subscription-plans/${form.plan._id}`, body) : api.post('/clo/subscription-plans', body);
    },
    onSuccess: () => { refresh(); toast.success(t(form?.plan ? 'pl.toast.saved' : 'pl.toast.created')); setForm(null); },
    onError: (e) => setError(readApiError(e).message),
  });
  const toggle = useMutation({ mutationFn: (p: Plan) => api.put(`/clo/subscription-plans/${p._id}`, { isActive: !p.isActive }), onSuccess: (_r, p) => { refresh(); toast.success(t(p.isActive ? 'pl.toast.paused' : 'pl.toast.resumed')); }, onError: fail });
  const remove = useMutation({ mutationFn: (p: Plan) => api.delete(`/clo/subscription-plans/${p._id}`), onSuccess: () => { refresh(); toast.success(t('pl.toast.deleted')); }, onError: fail });
  const set = (k: 'name' | 'monthlyHours' | 'price' | 'description') => (e: { target: { value: string } }) => setD((x) => ({ ...x, [k]: e.target.value }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!d.name.trim()) return setError(t('pl.errName'));
    const h = Number(d.monthlyHours);
    if (!Number.isFinite(h) || h < 1 || h > 1000) return setError(t('pl.errHours'));
    if (d.price.trim() === '' || !(Number(d.price) >= 0)) return setError(t('pl.errPrice'));
    setError('');
    save.mutate();
  };
  const plans = [...(q.data ?? [])].sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.monthlyHours - b.monthlyHours);

  return (
    <div className="space-y-5">
      <PageHeader title={t('pl.title')} description={t('pl.subtitle')} actions={<Button icon={<Plus />} onClick={() => setForm({ plan: null })}>{t('pl.new')}</Button>} />
      {q.isError ? <Panel><EmptyState icon={<CreditCard />} title={readApiError(q.error).message} action={<Button variant="secondary" onClick={() => void q.refetch()}>{t('tr.retry')}</Button>} /></Panel>
        : q.isLoading ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-44 animate-pulse rounded-panel bg-rail" />)}</div>
        : plans.length === 0 ? <Panel><EmptyState icon={<CreditCard />} title={t('pl.none')} description={t('pl.noneHint')} action={<Button icon={<Plus />} onClick={() => setForm({ plan: null })}>{t('pl.new')}</Button>} /></Panel>
        : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {plans.map((p) => (
              <li key={p._id} className={p.isActive ? '' : 'opacity-70'}>
                <Panel className="flex h-full flex-col">
                  <div className="flex items-start gap-2">
                    <span className="min-w-0 flex-1 truncate text-base font-semibold text-ink" dir="auto">{p.name}</span>
                    <Badge tone={p.isActive ? 'success' : 'neutral'}>{t(p.isActive ? 'pl.active' : 'pl.paused')}</Badge>
                    <RowMenu label={t('tr.actionsFor', { name: p.name })} actions={[
                      { label: t('tr.edit'), icon: <Pencil />, onClick: () => setForm({ plan: p }) },
                      { label: t(p.isActive ? 'pl.pause' : 'pl.resume'), icon: p.isActive ? <Pause /> : <Play />, onClick: () => toggle.mutate(p) },
                      { label: t('pl.delete'), icon: <Trash2 />, tone: 'danger', onClick: () => setDeleting(p) },
                    ]} />
                  </div>
                  <p className="mt-3 text-3xl font-bold tabular-nums text-ink" dir="ltr">{f.money(p.price)}<span className="text-sm font-normal text-ink-4"> / {t('pl.month')}</span></p>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-ink-2"><Clock className="size-4 text-ink-3" aria-hidden />{t('pl.hours', { count: p.monthlyHours })}</p>
                  {p.description && <p className="mt-3 line-clamp-3 text-sm text-ink-3" dir="auto">{p.description}</p>}
                </Panel>
              </li>
            ))}
          </ul>
        )}

      <Dialog open={!!form} onClose={() => setForm(null)} title={t((form ?? lastForm.current)?.plan ? 'pl.editTitle' : 'pl.newTitle')} closeLabel={t('tr.cancel')}
        footer={<><Button variant="ghost" onClick={() => setForm(null)}>{t('tr.cancel')}</Button><Button type="submit" form="plan-form" loading={save.isPending}>{t('tr.save')}</Button></>}>
        <form id="plan-form" onSubmit={submit} noValidate className="space-y-4">
          <Field label={t('pl.name')} required>{(c) => <TextInput {...c} value={d.name} onChange={set('name')} maxLength={100} dir="auto" />}</Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('pl.hoursLabel')} required>{(c) => <TextInput {...c} type="number" min={1} max={1000} value={d.monthlyHours} onChange={set('monthlyHours')} />}</Field>
            <Field label={t('pl.price')} required>{(c) => <TextInput {...c} type="number" min={0} step="0.01" value={d.price} onChange={set('price')} dir="ltr" />}</Field>
          </div>
          <Field label={t('pl.description')}>{(c) => <TextArea {...c} rows={3} value={d.description} onChange={set('description')} maxLength={500} dir="auto" />}</Field>
          <label className="flex items-start gap-3 text-sm text-ink">
            <input type="checkbox" checked={d.isActive} onChange={(e) => setD((x) => ({ ...x, isActive: e.target.checked }))} className="mt-0.5 size-4 accent-[#0f1f33]" />
            <span><span className="block font-medium">{t('pl.offer')}</span><span className="block text-xs text-ink-4">{t('pl.offerHint')}</span></span>
          </label>
          {error && <p role="alert" className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
        </form>
      </Dialog>
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} tone="danger" title={t('pl.deleteTitle', { name: (deleting ?? lastDel.current)?.name ?? '' })} message={t('pl.deleteText')} confirmLabel={t('pl.delete')} cancelLabel={t('tr.cancel')} loading={remove.isPending}
        onConfirm={() => remove.mutate(deleting!, { onSettled: () => setDeleting(null) })} />
    </div>
  );
}
