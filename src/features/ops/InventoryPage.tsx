import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowDownUp, Boxes, PackageX, Pencil, Plus, Trash2 } from 'lucide-react';
import { useFormat } from '../../app/format';
import { readApiError } from '../../app/apiError';
import { useToast } from '../../components/ui/Toast';
import { cn } from '../../lib/utils';
import { Button, ConfirmDialog, DataTable, Dialog, EmptyState, Field, PageHeader, Panel, PanelTitle, RowMenu, SearchInput, SelectInput, StatTile, TextArea, TextInput, type Column } from '../../ui';
import { useCrud, useIsAdmin, useMovements, useParts, useStockStats, type Part } from './api';

const REASONS = ['purchase', 'return', 'adjustment', 'used', 'damaged', 'other'] as const;
const LOW = 10;

/** Add or edit a part in the catalogue. */
function PartDialog({ open, onClose, part }: { open: boolean; onClose: () => void; part: Part | null }) {
  const { t } = useTranslation('dashboardCommon');
  const toast = useToast();
  const { save } = useCrud<Record<string, string>>('/parts');
  const [d, setD] = useState({ name: '', sku: '', category: '', group: '', partNumber: '', description: '' });
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setD({ name: part?.name ?? '', sku: part?.sku ?? '', category: part?.category ?? '', group: part?.group ?? '', partNumber: part?.partNumber ?? '', description: part?.description ?? '' }); setError(''); } }, [open, part]);
  const set = (k: keyof typeof d) => (e: { target: { value: string } }) => setD((x) => ({ ...x, [k]: e.target.value }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!d.name.trim()) return setError(t('inv.errName'));
    if (d.group.trim().toLowerCase() === 'lego' && !d.partNumber.trim()) return setError(t('inv.errLego'));
    setError('');
    const body = Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v.trim()]));
    save.mutate({ id: part?._id, d: body }, { onSuccess: () => { toast.success(t(part ? 'inv.toast.saved' : 'inv.toast.created')); onClose(); }, onError: (err) => setError(readApiError(err).message) });
  };
  return (
    <Dialog open={open} onClose={onClose} title={t(part ? 'inv.editTitle' : 'inv.newTitle')} closeLabel={t('cto.cancel')}
      footer={<><Button variant="ghost" onClick={onClose}>{t('cto.cancel')}</Button><Button type="submit" form="part-form" loading={save.isPending}>{t('work.save')}</Button></>}>
      <form id="part-form" onSubmit={submit} noValidate className="space-y-4">
        <Field label={t('inv.name')} required>{(c) => <TextInput {...c} value={d.name} onChange={set('name')} dir="auto" />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('inv.sku')}>{(c) => <TextInput {...c} value={d.sku} onChange={set('sku')} dir="ltr" />}</Field>
          <Field label={t('inv.category')}>{(c) => <TextInput {...c} value={d.category} onChange={set('category')} dir="auto" />}</Field>
          <Field label={t('inv.group')} hint={t('inv.groupHint')}>{(c) => <TextInput {...c} value={d.group} onChange={set('group')} dir="auto" />}</Field>
          <Field label={t('inv.partNumber')}>{(c) => <TextInput {...c} value={d.partNumber} onChange={set('partNumber')} dir="ltr" />}</Field>
        </div>
        <Field label={t('inv.description')}>{(c) => <TextArea {...c} rows={2} value={d.description} onChange={set('description')} dir="auto" />}</Field>
        {error && <p role="alert" className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      </form>
    </Dialog>
  );
}

/** Add or remove stock of one part, with the reason. */
function AdjustDialog({ part, onClose }: { part: Part | null; onClose: () => void }) {
  const { t } = useTranslation('dashboardCommon');
  const toast = useToast();
  const { post } = useCrud('/stock');
  const last = useRef(part);
  if (part) last.current = part;
  const p = part ?? last.current;
  const [dir, setDir] = useState<'in' | 'out'>('in');
  const [qty, setQty] = useState('1');
  const [reason, setReason] = useState<(typeof REASONS)[number]>('purchase');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (part) { setDir('in'); setQty('1'); setReason('purchase'); setNotes(''); setError(''); } }, [part]);
  const submit = () => {
    const n = Number.parseInt(qty, 10);
    if (!(n > 0)) return setError(t('inv.errQty'));
    if (dir === 'out' && n > (p?.availableQty ?? 0)) return setError(t('inv.errTooMany', { n: p?.availableQty ?? 0 }));
    setError('');
    post.mutate({ url: '/stock/adjust', d: { partId: p!._id, qtyChange: dir === 'in' ? n : -n, reason, notes: notes.trim() || undefined } }, { onSuccess: () => { toast.success(t('inv.toast.adjusted')); onClose(); }, onError: (e) => setError(readApiError(e).message) });
  };
  return (
    <Dialog open={!!part} onClose={onClose} title={t('inv.adjustTitle')} description={p ? t('inv.adjustText', { name: p.name, n: p.availableQty }) : undefined} closeLabel={t('cto.cancel')}
      footer={<><Button variant="ghost" onClick={onClose}>{t('cto.cancel')}</Button><Button loading={post.isPending} onClick={submit}>{t('inv.adjust')}</Button></>}>
      <div className="space-y-4">
        <div role="radiogroup" className="grid grid-cols-2 gap-2">
          {(['in', 'out'] as const).map((x) => (
            <label key={x} className={cn('flex cursor-pointer items-center justify-center rounded-card border p-3 text-sm font-medium has-[:focus-visible]:focus-ring', dir === x ? 'border-ink bg-ink text-white' : 'border-line-strong text-ink-2 hover:border-ink')}>
              <input type="radio" className="sr-only" checked={dir === x} onChange={() => { setDir(x); setReason(x === 'in' ? 'purchase' : 'used'); }} />{t(`inv.dir.${x}`)}
            </label>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('inv.qty')}>{(c) => <TextInput {...c} type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />}</Field>
          <Field label={t('inv.reason')}>{(c) => <SelectInput {...c} value={reason} onChange={(e) => setReason(e.target.value as (typeof REASONS)[number])}>{REASONS.filter((r) => (dir === 'in' ? ['purchase', 'return', 'adjustment', 'other'] : ['used', 'damaged', 'adjustment', 'other']).includes(r)).map((r) => <option key={r} value={r}>{t(`inv.reasons.${r}`)}</option>)}</SelectInput>}</Field>
        </div>
        <Field label={t('inv.notes')}>{(c) => <TextInput {...c} value={notes} onChange={(e) => setNotes(e.target.value)} dir="auto" />}</Field>
        {error && <p role="alert" className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      </div>
    </Dialog>
  );
}

/** The parts store: what is in stock, what is running low, and every stock change. */
export default function InventoryPage() {
  const { t } = useTranslation('dashboardCommon');
  const f = useFormat();
  const toast = useToast();
  const admin = useIsAdmin();
  const parts = useParts();
  const stats = useStockStats();
  const moves = useMovements();
  const { remove } = useCrud('/parts');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [low, setLow] = useState(false);
  const [form, setForm] = useState<{ p: Part | null } | null>(null);
  const lastForm = useRef(form);
  if (form) lastForm.current = form;
  const [adjusting, setAdjusting] = useState<Part | null>(null);
  const [deleting, setDeleting] = useState<Part | null>(null);
  const all = parts.data ?? [];
  const categories = [...new Set(all.map((p) => p.category).filter(Boolean))] as string[];
  const sq = search.trim().toLowerCase();
  const rows = all.filter((p) => (!category || p.category === category) && (!low || p.availableQty < LOW)).filter((p) => !sq || `${p.name} ${p.sku ?? ''} ${p.partNumber ?? ''}`.toLowerCase().includes(sq)).sort((a, b) => a.name.localeCompare(b.name));

  const columns: Column<Part>[] = useMemo(() => [
    { key: 'name', header: t('inv.part'), cell: (p) => (
      <span className="flex max-w-sm items-center gap-3">
        {p.imageUrl ? <img src={p.imageUrl} alt="" className="size-10 shrink-0 rounded-input object-cover" loading="lazy" /> : <span className="grid size-10 shrink-0 place-items-center rounded-input bg-rail text-ink-3"><Boxes className="size-4" aria-hidden /></span>}
        <span className="min-w-0"><span className="block truncate font-medium text-ink" dir="auto">{p.name}</span><span className="block truncate text-xs text-ink-4" dir="ltr">{[p.sku, p.partNumber].filter(Boolean).join(' · ')}</span></span>
      </span>
    ) },
    { key: 'cat', header: t('inv.category'), hideOnMobile: true, cell: (p) => <span className="text-ink-2" dir="auto">{[p.category, p.group].filter(Boolean).join(' · ') || '—'}</span> },
    { key: 'res', header: t('inv.reserved'), align: 'end', hideOnMobile: true, cell: (p) => <span className="tabular-nums text-ink-3">{p.reservedQty}</span> },
    { key: 'qty', header: t('inv.available'), align: 'end', cell: (p) => <span className={cn('font-semibold tabular-nums', p.availableQty <= 0 ? 'text-danger' : p.availableQty < LOW ? 'text-warning' : 'text-ink')}>{p.availableQty}</span> },
    ...(admin ? [{ key: 'menu', header: <span className="sr-only">{t('work.actions')}</span>, align: 'end' as const, cell: (p: Part) => <RowMenu label={t('work.actionsFor', { name: p.name })} actions={[
      { label: t('inv.adjust'), icon: <ArrowDownUp />, onClick: () => setAdjusting(p) },
      { label: t('work.edit'), icon: <Pencil />, onClick: () => setForm({ p }) },
      { label: t('inv.delete'), icon: <Trash2 />, tone: 'danger', onClick: () => setDeleting(p) },
    ]} /> }] : []),
  ], [t, admin]);

  return (
    <div className="space-y-5">
      <PageHeader title={t('inv.title')} description={t('inv.subtitle')} actions={admin ? <Button icon={<Plus />} onClick={() => setForm({ p: null })}>{t('inv.new')}</Button> : undefined} />
      <div className="grid grid-cols-3 gap-3">
        <StatTile icon={<Boxes />} tint="bg-tint-leaf" label={t('inv.parts')} value={stats.data?.totalParts ?? all.length} loading={stats.isLoading} onClick={() => setLow(false)} active={!low} />
        <StatTile icon={<AlertTriangle />} tint="bg-tint-straw" label={t('inv.low', { n: LOW })} value={stats.data?.lowStock} loading={stats.isLoading} onClick={() => setLow(true)} active={low} />
        <StatTile icon={<PackageX />} tint="bg-tint-sand" label={t('inv.out')} value={stats.data?.outOfStock} loading={stats.isLoading} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel className="min-w-0 p-0 sm:p-0">
          <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
            <div className="min-w-56 flex-1"><SearchInput value={search} onChange={setSearch} placeholder={t('inv.search')} /></div>
            {categories.length > 1 && <SelectInput aria-label={t('inv.category')} value={category} onChange={(e) => setCategory(e.target.value)} className="w-auto min-w-40"><option value="">{t('inv.allCategories')}</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</SelectInput>}
          </div>
          {parts.isError ? <EmptyState icon={<Boxes />} title={readApiError(parts.error).message} /> : <DataTable label={t('inv.title')} columns={columns} rows={rows} rowKey={(p) => p._id} loading={parts.isLoading} empty={<EmptyState icon={<Boxes />} title={t('inv.none')} />} />}
        </Panel>
        <Panel>
          <PanelTitle title={t('inv.moves')} />
          {moves.isLoading ? <div className="h-32 animate-pulse rounded-card bg-rail" /> : !moves.data?.length ? <p className="text-sm text-ink-4">{t('inv.noMoves')}</p> : (
            <ul className="divide-y divide-line">
              {moves.data.map((m) => (
                <li key={m._id} className="flex items-center gap-3 py-2">
                  <span className={cn('w-12 shrink-0 text-end text-sm font-semibold tabular-nums', m.qtyChange > 0 ? 'text-success' : 'text-danger')} dir="ltr">{m.qtyChange > 0 ? `+${m.qtyChange}` : m.qtyChange}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm text-ink" dir="auto">{m.partName}</span><span className="block truncate text-xs text-ink-4">{t(`inv.reasons.${m.reason}`, { defaultValue: m.reason })} · {f.dayMonth(m.createdAt)}{m.createdBy ? ` · ${m.createdBy.name}` : ''}</span></span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      <PartDialog open={!!form} onClose={() => setForm(null)} part={(form ?? lastForm.current)?.p ?? null} />
      <AdjustDialog part={adjusting} onClose={() => setAdjusting(null)} />
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} tone="danger" title={t('inv.deleteTitle', { name: deleting?.name ?? '' })} message={t('inv.deleteText')} confirmLabel={t('inv.delete')} cancelLabel={t('cto.cancel')} loading={remove.isPending}
        onConfirm={() => remove.mutate(deleting!._id, { onSuccess: () => toast.success(t('inv.toast.deleted')), onError: (e) => toast.error(t('cto.error'), readApiError(e).message), onSettled: () => setDeleting(null) })} />
    </div>
  );
}
