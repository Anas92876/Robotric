import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Ban, Check, CheckCircle2, ClipboardList, Hourglass, PackageCheck, Pencil, Plus, ShoppingCart, Trash2, X } from 'lucide-react';
import { useFormat } from '../../app/format';
import { readApiError } from '../../app/apiError';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../providers/AuthProvider';
import { Badge, Button, ConfirmDialog, DataTable, Dialog, EmptyState, Field, PageHeader, Panel, RowMenu, SelectInput, StatTile, TextArea, TextInput, type BadgeTone, type Column } from '../../ui';
import { partOf, useCrud, useIsAdmin, useOpsProjects, useOrders, useParts, type OpsProject, type Order, type OrderStatus, type Part } from './api';

const TONE: Record<OrderStatus, BadgeTone> = { pending: 'warning', approved: 'info', fulfilled: 'success', rejected: 'danger', cancelled: 'neutral' };
type Line = { partId: string; qty: string };

/** Pick parts and quantities (used by orders and projects). */
function PartLines({ lines, onChange, parts, showStock }: { lines: Line[]; onChange: (l: Line[]) => void; parts: Part[]; showStock: boolean }) {
  const { t } = useTranslation('dashboardCommon');
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-ink">{t('ord.parts')}</legend>
      <div className="space-y-2">
        {lines.map((l, i) => {
          const p = parts.find((x) => x._id === l.partId);
          return (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <SelectInput aria-label={t('ord.partN', { n: i + 1 })} value={l.partId} onChange={(e) => onChange(lines.map((x, j) => (j === i ? { ...x, partId: e.target.value } : x)))} className="h-10 min-w-48 flex-1">
                <option value="">{t('ord.pickPart')}</option>
                {parts.map((x) => <option key={x._id} value={x._id}>{x.name}{showStock ? ` (${x.availableQty})` : ''}</option>)}
              </SelectInput>
              <TextInput type="number" min={1} aria-label={t('ord.qtyN', { n: i + 1 })} value={l.qty} onChange={(e) => onChange(lines.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))} className="h-10 w-24" />
              <Button size="sm" variant="ghost" iconOnly icon={<X />} aria-label={t('ord.removeN', { n: i + 1 })} onClick={() => onChange(lines.filter((_, j) => j !== i))} />
              {showStock && p && Number(l.qty) > p.availableQty && <span className="w-full text-xs text-danger">{t('ord.notEnough', { n: p.availableQty })}</span>}
            </div>
          );
        })}
        <Button size="sm" variant="ghost" icon={<Plus />} onClick={() => onChange([...lines, { partId: '', qty: '1' }])}>{t('ord.addPart')}</Button>
      </div>
    </fieldset>
  );
}
const cleanLines = (l: Line[]) => l.filter((x) => x.partId && Number(x.qty) >= 1).map((x) => ({ partId: x.partId, qty: Number.parseInt(x.qty, 10) }));

/** Orders of parts from the store: placing them and (for admins) approving and handing them out. */
export default function OrdersPage() {
  const { t } = useTranslation('dashboardCommon');
  const f = useFormat();
  const toast = useToast();
  const admin = useIsAdmin();
  const { user } = useAuth();
  const orders = useOrders();
  const parts = useParts();
  const projects = useOpsProjects();
  const { save, post } = useCrud<{ projectId?: string; items: { partId: string; qty: number }[] }>('/orders');
  const [view, setView] = useState<OrderStatus | ''>('pending');
  const [creating, setCreating] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [project, setProject] = useState('');
  const [error, setError] = useState('');
  const [acting, setActing] = useState<{ o: Order; a: 'approve' | 'reject' | 'fulfill' | 'cancel' } | null>(null);
  const last = useRef(acting);
  if (acting) last.current = acting;
  useEffect(() => { if (creating) { setLines([{ partId: '', qty: '1' }]); setProject(''); setError(''); } }, [creating]);
  const all = orders.data ?? [];
  const rows = all.filter((o) => !view || o.status === view).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const count = (s: OrderStatus) => all.filter((o) => o.status === s).length;
  const partsList = parts.data ?? [];

  const columns: Column<Order>[] = useMemo(() => [
    { key: 'id', header: t('ord.order'), cell: (o) => <span className="block"><span className="block font-medium tabular-nums text-ink" dir="ltr">#{o._id.slice(-6).toUpperCase()}</span><span className="block text-xs text-ink-4">{f.date(o.createdAt)}{o.studentId === (user?._id || user?.id) ? ` · ${t('ord.mine')}` : ''}</span></span> },
    { key: 'items', header: t('ord.parts'), cell: (o) => <span className="block max-w-md text-sm text-ink-2">{o.items.map((i, k) => <span key={k} className="me-2 inline-block"><span dir="auto">{partOf(i.partId, partsList)?.name ?? '?'}</span> <span className="tabular-nums text-ink-4">×{i.qty}</span></span>)}</span> },
    { key: 'status', header: t('work.status'), cell: (o) => <Badge tone={TONE[o.status]}>{t(`ord.status.${o.status}`)}</Badge> },
    { key: 'menu', header: <span className="sr-only">{t('work.actions')}</span>, align: 'end', cell: (o) => <RowMenu label={t('work.actionsFor', { name: `#${o._id.slice(-6).toUpperCase()}` })} actions={[
      { label: t('ord.approve'), icon: <Check />, onClick: () => setActing({ o, a: 'approve' }), hidden: !admin || o.status !== 'pending' },
      { label: t('ord.fulfill'), icon: <PackageCheck />, onClick: () => setActing({ o, a: 'fulfill' }), hidden: !admin || !['pending', 'approved'].includes(o.status) },
      { label: t('ord.reject'), icon: <Ban />, tone: 'danger', onClick: () => setActing({ o, a: 'reject' }), hidden: !admin || !['pending', 'approved'].includes(o.status) },
      { label: t('ord.cancel'), icon: <X />, onClick: () => setActing({ o, a: 'cancel' }), hidden: !['pending', 'approved'].includes(o.status) || (!admin && o.studentId !== (user?._id || user?.id)) },
    ]} /> },
  ], [t, f, admin, partsList, user]);
  const tile = (v: OrderStatus | '') => ({ onClick: () => setView(v), active: view === v });
  const k = acting ?? last.current;

  const submit = () => {
    const items = cleanLines(lines);
    if (!items.length) return setError(t('ord.errEmpty'));
    setError('');
    save.mutate({ d: { items, ...(project ? { projectId: project } : {}) } }, { onSuccess: () => { toast.success(t('ord.toast.created')); setCreating(false); }, onError: (e) => setError(readApiError(e).message) });
  };

  return (
    <div className="space-y-5">
      <PageHeader title={t('ord.title')} description={t('ord.subtitle')} actions={<Button icon={<ShoppingCart />} onClick={() => setCreating(true)}>{t('ord.new')}</Button>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={<Hourglass />} tint="bg-tint-straw" label={t('ord.status.pending')} value={count('pending')} loading={orders.isLoading} {...tile('pending')} />
        <StatTile icon={<CheckCircle2 />} tint="bg-tint-sage" label={t('ord.status.approved')} value={count('approved')} loading={orders.isLoading} {...tile('approved')} />
        <StatTile icon={<PackageCheck />} tint="bg-tint-leaf" label={t('ord.status.fulfilled')} value={count('fulfilled')} loading={orders.isLoading} {...tile('fulfilled')} />
        <StatTile icon={<ClipboardList />} tint="bg-tint-sand" label={t('ord.all')} value={all.length} loading={orders.isLoading} {...tile('')} />
      </div>
      <Panel className="p-0 sm:p-0">
        {orders.isError ? <EmptyState icon={<ShoppingCart />} title={readApiError(orders.error).message} /> : <DataTable label={t('ord.title')} columns={columns} rows={rows} rowKey={(o) => o._id} loading={orders.isLoading} empty={<EmptyState icon={<ShoppingCart />} title={t('ord.none')} />} />}
      </Panel>
      <Dialog open={creating} onClose={() => setCreating(false)} size="lg" title={t('ord.newTitle')} description={t('ord.newText')} closeLabel={t('cto.cancel')}
        footer={<><Button variant="ghost" onClick={() => setCreating(false)}>{t('cto.cancel')}</Button><Button loading={save.isPending} onClick={submit}>{t('ord.place')}</Button></>}>
        <div className="space-y-4">
          {(projects.data?.length ?? 0) > 0 && <Field label={t('ord.forProject')}>{(c) => <SelectInput {...c} value={project} onChange={(e) => { setProject(e.target.value); const p = projects.data!.find((x) => x._id === e.target.value); if (p?.parts.length) setLines(p.parts.map((x) => ({ partId: x.partId, qty: String(x.qty) }))); }}><option value="">{t('ord.noProject')}</option>{projects.data!.map((p) => <option key={p._id} value={p._id}>{p.title}</option>)}</SelectInput>}</Field>}
          <PartLines lines={lines} onChange={setLines} parts={partsList} showStock />
          {error && <p role="alert" className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
        </div>
      </Dialog>
      <ConfirmDialog open={!!acting} onClose={() => setActing(null)} tone={k?.a === 'reject' || k?.a === 'cancel' ? 'danger' : 'default'} loading={post.isPending}
        title={t(`ord.${k?.a ?? 'approve'}Title`)} message={t(`ord.${k?.a ?? 'approve'}Text`)} confirmLabel={t(`ord.${k?.a ?? 'approve'}`)} cancelLabel={t('cto.cancel')}
        onConfirm={() => post.mutate({ url: `/orders/${acting!.o._id}/${acting!.a}` }, { onSuccess: () => toast.success(t(`ord.toast.${acting!.a}`)), onError: (e) => toast.error(t('cto.error'), readApiError(e).message), onSettled: () => setActing(null) })} />
    </div>
  );
}

/** Build projects and the parts each one needs (an order can start from a project). */
export function OpsProjectsPage() {
  const { t } = useTranslation('dashboardCommon');
  const toast = useToast();
  const projects = useOpsProjects();
  const parts = useParts();
  const { save, remove, put } = useCrud<{ title: string; description: string; parts?: { partId: string; qty: number }[] }>('/projects');
  const [form, setForm] = useState<{ p: OpsProject | null } | null>(null);
  const lastForm = useRef(form);
  if (form) lastForm.current = form;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<OpsProject | null>(null);
  useEffect(() => { if (form) { setTitle(form.p?.title ?? ''); setDescription(form.p?.description ?? ''); setLines(form.p?.parts.map((x) => ({ partId: x.partId, qty: String(x.qty) })) ?? []); setError(''); } }, [form]);
  const partsList = parts.data ?? [];
  const busy = save.isPending || put.isPending;
  const submit = async () => {
    if (!title.trim()) return setError(t('ops.errTitle'));
    setError('');
    try {
      const items = cleanLines(lines);
      if (form?.p) {
        await save.mutateAsync({ id: form.p._id, d: { title: title.trim(), description: description.trim() } });
        await put.mutateAsync({ url: `/projects/${form.p._id}/parts`, d: { parts: items } });
      } else {
        await save.mutateAsync({ d: { title: title.trim(), description: description.trim(), parts: items } });
      }
      toast.success(t(form?.p ? 'ops.toast.saved' : 'ops.toast.created'));
      setForm(null);
    } catch (e) { setError(readApiError(e).message); }
  };
  const list = projects.data ?? [];
  return (
    <div className="space-y-5">
      <PageHeader title={t('ops.title')} description={t('ops.subtitle')} actions={<Button icon={<Plus />} onClick={() => setForm({ p: null })}>{t('ops.new')}</Button>} />
      {projects.isError ? <Panel><EmptyState icon={<ClipboardList />} title={readApiError(projects.error).message} /></Panel> : projects.isLoading ? <div className="h-40 animate-pulse rounded-panel bg-rail" /> : list.length === 0 ? <Panel><EmptyState icon={<ClipboardList />} title={t('ops.none')} action={<Button icon={<Plus />} onClick={() => setForm({ p: null })}>{t('ops.new')}</Button>} /></Panel> : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => (
            <li key={p._id}>
              <Panel className="h-full">
                <div className="flex items-start gap-2">
                  <span className="min-w-0 flex-1 font-semibold text-ink" dir="auto">{p.title}</span>
                  <RowMenu label={t('work.actionsFor', { name: p.title })} actions={[{ label: t('work.edit'), icon: <Pencil />, onClick: () => setForm({ p }) }, { label: t('ops.delete'), icon: <Trash2 />, tone: 'danger', onClick: () => setDeleting(p) }]} />
                </div>
                {p.description && <p className="mt-1 line-clamp-2 text-sm text-ink-3" dir="auto">{p.description}</p>}
                <ul className="mt-3 space-y-1 text-sm">
                  {p.parts.length === 0 ? <li className="text-ink-4">{t('ops.noParts')}</li> : p.parts.map((x) => <li key={x.partId} className="flex justify-between gap-2"><span className="truncate text-ink-2" dir="auto">{partOf(x.partId, partsList)?.name ?? '?'}</span><span className="tabular-nums text-ink-4">×{x.qty}</span></li>)}
                </ul>
              </Panel>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={!!form} onClose={() => setForm(null)} size="lg" title={t((form ?? lastForm.current)?.p ? 'ops.editTitle' : 'ops.newTitle')} closeLabel={t('cto.cancel')}
        footer={<><Button variant="ghost" onClick={() => setForm(null)}>{t('cto.cancel')}</Button><Button loading={busy} onClick={() => void submit()}>{t('work.save')}</Button></>}>
        <div className="space-y-4">
          <Field label={t('ops.name')} required>{(c) => <TextInput {...c} value={title} onChange={(e) => setTitle(e.target.value)} dir="auto" />}</Field>
          <Field label={t('work.description')}>{(c) => <TextArea {...c} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} dir="auto" />}</Field>
          <PartLines lines={lines} onChange={setLines} parts={partsList} showStock={false} />
          {error && <p role="alert" className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
        </div>
      </Dialog>
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} tone="danger" title={t('ops.deleteTitle', { name: deleting?.title ?? '' })} message={t('ops.deleteText')} confirmLabel={t('ops.delete')} cancelLabel={t('cto.cancel')} loading={remove.isPending}
        onConfirm={() => remove.mutate(deleting!._id, { onSuccess: () => toast.success(t('ops.toast.deleted')), onError: (e) => toast.error(t('cto.error'), readApiError(e).message), onSettled: () => setDeleting(null) })} />
    </div>
  );
}
