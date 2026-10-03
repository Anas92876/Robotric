import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Bus, CheckCircle2, ChevronLeft, ChevronRight, Coins, MessageSquare, Pencil, Plus, Star, TrendingUp, Users, X } from 'lucide-react';
import { api } from '../../lib/api';
import { useFormat } from '../../app/format';
import { readApiError } from '../../app/apiError';
import { useToast } from '../../components/ui/Toast';
import { cn } from '../../lib/utils';
import { Badge, Button, ConfirmDialog, DataTable, Dialog, EmptyState, Field, PageHeader, Pagination, Panel, PanelTitle, SelectInput, StatTile, TextArea, TextInput, type Column } from '../../ui';

type Tab = 'pricing' | 'earnings' | 'feedback';
interface Tier { minStudents: number; maxStudents: number | null; ratePerKm: number }
interface Pricing { _id: string; name: string; studentRatePerKm: number; driverRatePerKm: number; driverRateTiers: Tier[]; legMultiplier: number; currency: 'SYP' | 'USD'; isActive: boolean; effectiveFrom: string; notes?: string | null }
interface Earnings { drivers: { driverId: string; driverName: string; vehiclePlate: string; trips: number; students: number; earnings: number }[] }
interface Overview { totalTrips: number; activeStudents: number; totalStudentRevenue: number; totalDriverCost: number; netProfit: number }
interface Feedback { _id: string; rating: number; comment: string; categories: string[]; createdAt: string; student: { name: string } | null; driver: { _id: string; name: string } | null; trip: { date: string; direction: string } | null }
interface FeedbackStats { overall: { avgRating: number | null; count: number }; byDriver: { driverId: string; driverName: string; avgRating: number; count: number; lowCount: number }[]; byCategory: { category: string; count: number }[] }
const KEY = ['cto', 'transport'];
const B = '/management/transport';
const num = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

function Stars({ value }: { value: number }) {
  return <span className="inline-flex" role="img" aria-label={`${value} / 5`}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={cn('size-3.5', n <= Math.round(value) ? 'fill-glow text-glow-deep' : 'text-line-strong')} aria-hidden />)}</span>;
}

/** Create or edit a per-km price list. */
function PricingDialog({ open, onClose, pricing }: { open: boolean; onClose: () => void; pricing: Pricing | null }) {
  const { t } = useTranslation('dashboardCommon');
  const toast = useToast();
  const qc = useQueryClient();
  const [d, setD] = useState({ name: '', student: '', driver: '', leg: '2', currency: 'SYP', notes: '' });
  const [tiers, setTiers] = useState<{ min: string; max: string; rate: string }[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    setD({ name: pricing?.name ?? '', student: pricing ? String(pricing.studentRatePerKm) : '', driver: pricing ? String(pricing.driverRatePerKm) : '', leg: String(pricing?.legMultiplier ?? 2), currency: pricing?.currency ?? 'SYP', notes: pricing?.notes ?? '' });
    setTiers((pricing?.driverRateTiers ?? []).map((x) => ({ min: String(x.minStudents), max: x.maxStudents == null ? '' : String(x.maxStudents), rate: String(x.ratePerKm) })));
    setError('');
  }, [open, pricing]);
  const save = useMutation({
    mutationFn: () => {
      const body = { name: d.name.trim(), studentRatePerKm: Number(d.student), driverRatePerKm: Number(d.driver), legMultiplier: Number(d.leg) || 2, currency: d.currency, notes: d.notes.trim(), driverRateTiers: tiers.map((x) => ({ minStudents: Number(x.min), maxStudents: x.max === '' ? null : Number(x.max), ratePerKm: Number(x.rate) })) };
      return pricing ? api.patch(`${B}/pricing/${pricing._id}`, body) : api.post(`${B}/pricing`, body);
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: KEY }); toast.success(t(pricing ? 'tp.toast.saved' : 'tp.toast.created')); onClose(); },
    onError: (e) => setError(readApiError(e).message),
  });
  const set = (k: keyof typeof d) => (e: { target: { value: string } }) => setD((x) => ({ ...x, [k]: e.target.value }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!d.name.trim()) return setError(t('tp.errName'));
    if (!(Number(d.student) >= 0) || d.student === '' || !(Number(d.driver) >= 0) || d.driver === '') return setError(t('tp.errRates'));
    if (tiers.some((x) => !(Number(x.min) >= 1) || x.rate === '' || (x.max !== '' && Number(x.max) < Number(x.min)))) return setError(t('tp.errTier'));
    setError('');
    save.mutate();
  };
  return (
    <Dialog open={open} onClose={onClose} size="lg" title={t(pricing ? 'tp.editTitle' : 'tp.newTitle')} description={pricing ? undefined : t('tp.newText')} closeLabel={t('cto.cancel')}
      footer={<><Button variant="ghost" onClick={onClose}>{t('cto.cancel')}</Button><Button type="submit" form="pricing-form" loading={save.isPending}>{t('work.save')}</Button></>}>
      <form id="pricing-form" onSubmit={submit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
          <Field label={t('tp.name')} required>{(c) => <TextInput {...c} value={d.name} onChange={set('name')} dir="auto" />}</Field>
          <Field label={t('tp.currency')}>{(c) => <SelectInput {...c} value={d.currency} onChange={set('currency')}><option value="SYP">SYP</option><option value="USD">USD</option></SelectInput>}</Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t('tp.studentRate')} required hint={t('tp.perKm')}>{(c) => <TextInput {...c} type="number" min={0} step="any" value={d.student} onChange={set('student')} dir="ltr" />}</Field>
          <Field label={t('tp.driverRate')} required hint={t('tp.perKm')}>{(c) => <TextInput {...c} type="number" min={0} step="any" value={d.driver} onChange={set('driver')} dir="ltr" />}</Field>
          <Field label={t('tp.leg')} hint={t('tp.legHint')}>{(c) => <TextInput {...c} type="number" min={1} step="any" value={d.leg} onChange={set('leg')} dir="ltr" />}</Field>
        </div>
        <fieldset>
          <legend className="mb-1 text-sm font-medium text-ink">{t('tp.tiers')}</legend>
          <p className="mb-2 text-xs text-ink-4">{t('tp.tiersHint')}</p>
          <div className="space-y-2">
            {tiers.map((x, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <TextInput type="number" min={1} aria-label={t('tp.tierMin', { n: i + 1 })} placeholder={t('tp.min')} value={x.min} onChange={(e) => setTiers((l) => l.map((y, j) => (j === i ? { ...y, min: e.target.value } : y)))} className="h-10 w-24" dir="ltr" />
                <span className="text-ink-4">–</span>
                <TextInput type="number" min={1} aria-label={t('tp.tierMax', { n: i + 1 })} placeholder={t('tp.max')} value={x.max} onChange={(e) => setTiers((l) => l.map((y, j) => (j === i ? { ...y, max: e.target.value } : y)))} className="h-10 w-24" dir="ltr" />
                <span className="text-sm text-ink-3">{t('tp.students')}</span>
                <TextInput type="number" min={0} step="any" aria-label={t('tp.tierRate', { n: i + 1 })} placeholder={t('tp.rate')} value={x.rate} onChange={(e) => setTiers((l) => l.map((y, j) => (j === i ? { ...y, rate: e.target.value } : y)))} className="h-10 w-28" dir="ltr" />
                <Button size="sm" variant="ghost" iconOnly icon={<X />} aria-label={t('tp.removeTier', { n: i + 1 })} onClick={() => setTiers((l) => l.filter((_, j) => j !== i))} />
              </div>
            ))}
            <Button size="sm" variant="ghost" icon={<Plus />} onClick={() => setTiers((l) => [...l, { min: String((Number(l[l.length - 1]?.max) || 0) + 1), max: '', rate: d.driver }])}>{t('tp.addTier')}</Button>
          </div>
        </fieldset>
        <Field label={t('tp.notes')}>{(c) => <TextArea {...c} rows={2} value={d.notes} onChange={set('notes')} dir="auto" />}</Field>
        {error && <p role="alert" className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      </form>
    </Dialog>
  );
}

function PricingTab() {
  const { t } = useTranslation('dashboardCommon');
  const f = useFormat();
  const toast = useToast();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: [...KEY, 'pricing'], queryFn: async () => ((await api.get(`${B}/pricing`)).data.data ?? []) as Pricing[] });
  const [form, setForm] = useState<{ p: Pricing | null } | null>(null);
  const last = useRef(form);
  if (form) last.current = form;
  const [activating, setActivating] = useState<Pricing | null>(null);
  const activate = useMutation({ mutationFn: (p: Pricing) => api.patch(`${B}/pricing/${p._id}/activate`), onSuccess: () => { void qc.invalidateQueries({ queryKey: KEY }); toast.success(t('tp.toast.activated')); }, onError: (e) => toast.error(t('cto.error'), readApiError(e).message) });
  const list = [...(q.data ?? [])].sort((a, b) => Number(b.isActive) - Number(a.isActive) || b.effectiveFrom.localeCompare(a.effectiveFrom));
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button icon={<Plus />} onClick={() => setForm({ p: null })}>{t('tp.new')}</Button></div>
      {q.isError ? <Panel><EmptyState icon={<Coins />} title={readApiError(q.error).message} /></Panel> : q.isLoading ? <div className="h-40 animate-pulse rounded-panel bg-rail" /> : list.length === 0 ? <Panel><EmptyState icon={<Coins />} title={t('tp.none')} /></Panel> : (
        <ul className="grid gap-4 md:grid-cols-2">
          {list.map((p) => (
            <li key={p._id}>
              <Panel className={cn('h-full', p.isActive && 'border-ink')}>
                <div className="flex items-start gap-2">
                  <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-ink" dir="auto">{p.name}</span><span className="block text-xs text-ink-4">{t('tp.since', { date: f.date(p.effectiveFrom) })}</span></span>
                  {p.isActive ? <Badge tone="success" icon={<CheckCircle2 />}>{t('tp.active')}</Badge> : <Button size="sm" variant="secondary" onClick={() => setActivating(p)}>{t('tp.use')}</Button>}
                  <Button size="sm" variant="ghost" iconOnly icon={<Pencil />} aria-label={t('work.edit')} onClick={() => setForm({ p })} />
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div><dt className="text-xs text-ink-4">{t('tp.studentRate')}</dt><dd className="font-semibold tabular-nums text-ink" dir="ltr">{num.format(p.studentRatePerKm)} {p.currency}</dd></div>
                  <div><dt className="text-xs text-ink-4">{t('tp.driverRate')}</dt><dd className="font-semibold tabular-nums text-ink" dir="ltr">{num.format(p.driverRatePerKm)} {p.currency}</dd></div>
                  <div><dt className="text-xs text-ink-4">{t('tp.leg')}</dt><dd className="font-semibold tabular-nums text-ink" dir="ltr">×{p.legMultiplier}</dd></div>
                </dl>
                {p.driverRateTiers.length > 0 && (
                  <ul className="mt-3 space-y-1 text-xs text-ink-3">
                    {p.driverRateTiers.map((x, i) => <li key={i}>{t('tp.tierLine', { from: x.minStudents, to: x.maxStudents ?? '+', rate: `${num.format(x.ratePerKm)} ${p.currency}` })}</li>)}
                  </ul>
                )}
                {p.notes && <p className="mt-3 text-xs text-ink-4" dir="auto">{p.notes}</p>}
              </Panel>
            </li>
          ))}
        </ul>
      )}
      <PricingDialog open={!!form} onClose={() => setForm(null)} pricing={(form ?? last.current)?.p ?? null} />
      <ConfirmDialog open={!!activating} onClose={() => setActivating(null)} title={t('tp.useTitle', { name: activating?.name ?? '' })} message={t('tp.useText')} confirmLabel={t('tp.use')} cancelLabel={t('cto.cancel')} loading={activate.isPending}
        onConfirm={() => activate.mutate(activating!, { onSettled: () => setActivating(null) })} />
    </div>
  );
}

function EarningsTab() {
  const { t } = useTranslation('dashboardCommon');
  const f = useFormat();
  const [month, setMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() + 1 }; });
  const params = { year: month.y, month: month.m };
  const e = useQuery({ queryKey: [...KEY, 'earnings', month], queryFn: async () => (await api.get(`${B}/earnings/monthly`, { params })).data.data as Earnings });
  const o = useQuery({ queryKey: [...KEY, 'overview', month], queryFn: async () => (await api.get(`${B}/overview`, { params })).data.data as Overview });
  const step = (n: number) => setMonth(({ y, m }) => { const d = new Date(y, m - 1 + n, 1); return { y: d.getFullYear(), m: d.getMonth() + 1 }; });
  const now = new Date();
  const isNow = month.y === now.getFullYear() && month.m === now.getMonth() + 1;
  const columns: Column<Earnings['drivers'][number]>[] = useMemo(() => [
    { key: 'd', header: t('tp.driver'), cell: (x) => <span className="block"><span className="block font-medium text-ink" dir="auto">{x.driverName}</span>{x.vehiclePlate && <span className="block text-xs text-ink-4" dir="ltr">{x.vehiclePlate}</span>}</span> },
    { key: 'trips', header: t('tp.trips'), align: 'end', cell: (x) => <span className="tabular-nums">{x.trips}</span> },
    { key: 'st', header: t('tp.riders'), align: 'end', cell: (x) => <span className="tabular-nums">{x.students}</span> },
    { key: 'e', header: t('tp.earned'), align: 'end', cell: (x) => <span className="font-semibold tabular-nums text-ink" dir="ltr">{num.format(x.earnings)}</span> },
  ], [t]);
  const ov = o.data;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" iconOnly icon={<ChevronLeft className="rtl:rotate-180" />} aria-label={t('tp.prevMonth')} onClick={() => step(-1)} />
        <h2 className="min-w-40 text-center text-base font-semibold text-ink">{f.custom(new Date(month.y, month.m - 1, 1), { month: 'long', year: 'numeric' })}</h2>
        <Button size="sm" variant="ghost" iconOnly icon={<ChevronRight className="rtl:rotate-180" />} aria-label={t('tp.nextMonth')} onClick={() => step(1)} disabled={isNow} />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={<Bus />} tint="bg-tint-leaf" label={t('tp.trips')} value={ov?.totalTrips} loading={o.isLoading} />
        <StatTile icon={<Users />} tint="bg-tint-sage" label={t('tp.activeRiders')} value={ov?.activeStudents} loading={o.isLoading} />
        <StatTile icon={<Coins />} tint="bg-tint-straw" label={t('tp.revenue')} value={ov ? num.format(ov.totalStudentRevenue) : undefined} loading={o.isLoading} />
        <StatTile icon={<TrendingUp />} tint="bg-tint-sand" label={t('tp.net')} value={ov ? num.format(ov.netProfit) : undefined} loading={o.isLoading} />
      </div>
      {ov && <p className="text-xs text-ink-4">{t('tp.costLine', { cost: num.format(ov.totalDriverCost) })}</p>}
      <Panel className="p-0 sm:p-0">
        {e.isError ? <EmptyState icon={<Coins />} title={readApiError(e.error).message} /> : <DataTable label={t('tp.earningsTitle')} columns={columns} rows={e.data?.drivers ?? []} rowKey={(x) => x.driverId} loading={e.isLoading} empty={<EmptyState icon={<Bus />} title={t('tp.noTrips')} />} />}
      </Panel>
    </div>
  );
}

function FeedbackTab() {
  const { t } = useTranslation('dashboardCommon');
  const f = useFormat();
  const [driver, setDriver] = useState('');
  const [rating, setRating] = useState('');
  const [page, setPage] = useState(1);
  const stats = useQuery({ queryKey: [...KEY, 'fbstats'], queryFn: async () => (await api.get(`${B}/feedback/stats`)).data.data as FeedbackStats });
  const list = useQuery({ queryKey: [...KEY, 'feedback', driver, rating, page], queryFn: async () => (await api.get(`${B}/feedback`, { params: { page, limit: 20, ...(driver ? { driverId: driver } : {}), ...(rating ? { minRating: rating, maxRating: rating } : {}) } })).data.data as { data: Feedback[]; total: number }, placeholderData: (p) => p });
  const s = stats.data;
  const pages = Math.ceil((list.data?.total ?? 0) / 20);
  return (
    <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
      <div className="space-y-5">
        <div className="rounded-panel bg-ink p-5 text-white">
          <p className="text-sm text-frost/75">{t('tp.avg')}</p>
          <p className="mt-1 text-4xl font-bold tabular-nums text-glow">{s?.overall.avgRating ?? '—'}<span className="text-lg text-frost/60"> / 5</span></p>
          <p className="mt-1 text-xs text-frost/70">{t('tp.ratingsN', { count: s?.overall.count ?? 0 })}</p>
        </div>
        <Panel>
          <PanelTitle title={t('tp.byDriver')} />
          {!s?.byDriver.length ? <p className="text-sm text-ink-4">{t('tp.noFeedback')}</p> : (
            <ul className="space-y-2">{s.byDriver.map((d) => (
              <li key={d.driverId}><button type="button" onClick={() => { setDriver(driver === d.driverId ? '' : d.driverId); setPage(1); }} aria-pressed={driver === d.driverId} className={cn('flex w-full items-center gap-2 rounded-card px-2 py-1.5 text-start text-sm focus-visible:focus-ring', driver === d.driverId ? 'bg-frost' : 'hover:bg-rail')}>
                <span className="min-w-0 flex-1 truncate text-ink" dir="auto">{d.driverName}</span><Stars value={d.avgRating} /><span className="w-8 text-end text-xs tabular-nums text-ink-3">{d.count}</span>
              </button></li>
            ))}</ul>
          )}
          {!!s?.byCategory.length && (
            <div className="mt-4 flex flex-wrap gap-1.5">{s.byCategory.map((c) => <span key={c.category} className="rounded-pill bg-rail px-2.5 py-1 text-xs text-ink-2">{t(`tp.cat.${c.category}`, { defaultValue: c.category })} · {c.count}</span>)}</div>
          )}
        </Panel>
      </div>
      <Panel className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <PanelTitle title={t('tp.latest')} />
          <SelectInput aria-label={t('tp.rating')} value={rating} onChange={(e) => { setRating(e.target.value); setPage(1); }} className="ms-auto h-10 w-auto"><option value="">{t('tp.anyRating')}</option>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{'★'.repeat(n)}</option>)}</SelectInput>
        </div>
        {list.isLoading ? <div className="h-40 animate-pulse rounded-card bg-rail" /> : !list.data?.data.length ? <EmptyState icon={<MessageSquare />} title={t('tp.noFeedback')} /> : (
          <ul className="divide-y divide-line">
            {list.data.data.map((x) => (
              <li key={x._id} className="py-3">
                <div className="flex flex-wrap items-center gap-2 text-sm"><Stars value={x.rating} /><span className="font-medium text-ink" dir="auto">{x.driver?.name}</span><span className="text-xs text-ink-4">· <span dir="auto">{x.student?.name}</span> · {f.date(x.trip?.date ?? x.createdAt)}</span></div>
                {x.comment && <p className="mt-1 text-sm text-ink-2" dir="auto">{x.comment}</p>}
                {x.categories.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1">{x.categories.map((c) => <span key={c} className="rounded-pill bg-rail px-2 py-0.5 text-xs text-ink-3">{t(`tp.cat.${c}`, { defaultValue: c })}</span>)}</div>}
              </li>
            ))}
          </ul>
        )}
        {pages > 1 && <div className="mt-3"><Pagination page={page} pages={pages} total={list.data!.total} pageSize={20} onPage={setPage} summary={(a, b, n) => t('tp.range', { from: a, to: b, total: n })} labels={{ previous: t('tp.prev'), next: t('tp.next') }} /></div>}
      </Panel>
    </div>
  );
}

/** Transport for the CTO: per-km prices, monthly money, and what riders say about drivers. */
export default function CtoTransportPage() {
  const { t } = useTranslation('dashboardCommon');
  const [tab, setTab] = useState<Tab>('pricing');
  return (
    <div className="space-y-5">
      <PageHeader title={t('tp.title')} description={t('tp.subtitle')} />
      <div role="tablist" aria-label={t('tp.title')} className="flex w-fit rounded-pill bg-rail p-1">
        {(['pricing', 'earnings', 'feedback'] as Tab[]).map((x) => (
          <button key={x} type="button" role="tab" aria-selected={tab === x} onClick={() => setTab(x)} className={cn('h-9 rounded-pill px-4 text-sm font-medium focus-visible:focus-ring', tab === x ? 'bg-ink text-white' : 'text-ink-3 hover:text-ink')}>{t(`tp.tab.${x}`)}</button>
        ))}
      </div>
      {tab === 'pricing' ? <PricingTab /> : tab === 'earnings' ? <EarningsTab /> : <FeedbackTab />}
    </div>
  );
}
