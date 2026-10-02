import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Archive, ArchiveRestore, Heart, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '../../../lib/api';
import { useFormat } from '../../../app/format';
import { readApiError } from '../../../app/apiError';
import { useToast } from '../../../components/ui/Toast';
import { Badge, Button, ConfirmDialog, DataTable, Dialog, EmptyState, Field, PageHeader, Panel, RowMenu, SearchInput, StatTile, TextArea, TextInput, type Column } from '../../../ui';

interface Interest { _id: string; name: string; description?: string | null; status: 'active' | 'archived'; createdAt: string }
const KEY = ['clo', 'interests'];

/** The interests people can pick when they leave their details (e.g. robotics, programming). */
export default function InterestsPage() {
  const { t } = useTranslation('dashboardCLO');
  const f = useFormat();
  const toast = useToast();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: KEY, queryFn: async () => ((await api.get('/clo/interests')).data.interests ?? []) as Interest[] });
  const [view, setView] = useState<'active' | 'archived'>('active');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<{ item: Interest | null } | null>(null);
  const lastForm = useRef(form);
  if (form) lastForm.current = form;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<Interest | null>(null);
  const lastDel = useRef(deleting);
  if (deleting) lastDel.current = deleting;
  useEffect(() => {
    if (!form) return;
    setName(form.item?.name ?? '');
    setDescription(form.item?.description ?? '');
    setError('');
  }, [form]);
  const refresh = () => void qc.invalidateQueries({ queryKey: KEY });
  const fail = (e: unknown) => toast.error(t('tr.actionError'), readApiError(e).message);
  const save = useMutation({
    mutationFn: () => (form?.item ? api.put(`/clo/interests/${form.item._id}`, { name: name.trim(), description: description.trim() }) : api.post('/clo/interests', { name: name.trim(), description: description.trim() })),
    onSuccess: () => { refresh(); toast.success(t(form?.item ? 'int.toast.saved' : 'int.toast.created')); setForm(null); },
    onError: (e) => setError(readApiError(e).message),
  });
  const setStatus = useMutation({ mutationFn: (i: Interest) => (i.status === 'active' ? api.put(`/clo/interests/${i._id}/archive`) : api.put(`/clo/interests/${i._id}`, { status: 'active' })), onSuccess: (_r, i) => { refresh(); toast.success(t(i.status === 'active' ? 'int.toast.archived' : 'int.toast.restored')); }, onError: fail });
  const remove = useMutation({ mutationFn: (i: Interest) => api.delete(`/clo/interests/${i._id}`), onSuccess: () => { refresh(); toast.success(t('int.toast.deleted')); }, onError: fail });

  const all = q.data ?? [];
  const sq = search.trim().toLowerCase();
  const rows = all.filter((i) => i.status === view).filter((i) => !sq || `${i.name} ${i.description ?? ''}`.toLowerCase().includes(sq));
  const columns: Column<Interest>[] = useMemo(
    () => [
      { key: 'name', header: t('int.name'), cell: (i) => <span className="font-medium text-ink" dir="auto">{i.name}</span> },
      { key: 'desc', header: t('int.description'), hideOnMobile: true, cell: (i) => <span className="line-clamp-1 max-w-md text-ink-3" dir="auto">{i.description || '—'}</span> },
      { key: 'added', header: t('int.added'), hideOnMobile: true, cell: (i) => <span className="whitespace-nowrap tabular-nums text-ink-3">{f.date(i.createdAt)}</span> },
      { key: 'status', header: t('tr.col.status'), cell: (i) => <Badge tone={i.status === 'active' ? 'success' : 'neutral'}>{t(`int.status.${i.status}`)}</Badge> },
      {
        key: 'menu', header: <span className="sr-only">{t('tr.col.actions')}</span>, align: 'end',
        cell: (i) => <RowMenu label={t('tr.actionsFor', { name: i.name })} actions={[
          { label: t('tr.edit'), icon: <Pencil />, onClick: () => setForm({ item: i }) },
          { label: t(i.status === 'active' ? 'int.archive' : 'int.restore'), icon: i.status === 'active' ? <Archive /> : <ArchiveRestore />, onClick: () => setStatus.mutate(i) },
          { label: t('int.delete'), icon: <Trash2 />, tone: 'danger', onClick: () => setDeleting(i) },
        ]} />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, f],
  );
  const submit = (e: FormEvent) => { e.preventDefault(); if (!name.trim()) return setError(t('int.errName')); setError(''); save.mutate(); };

  return (
    <div className="space-y-5">
      <PageHeader title={t('int.title')} description={t('int.subtitle')} actions={<Button icon={<Plus />} onClick={() => setForm({ item: null })}>{t('int.new')}</Button>} />
      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <StatTile icon={<Heart />} tint="bg-tint-leaf" label={t('int.status.active')} value={all.filter((i) => i.status === 'active').length} loading={q.isLoading} onClick={() => setView('active')} active={view === 'active'} />
        <StatTile icon={<Archive />} tint="bg-tint-sand" label={t('int.status.archived')} value={all.filter((i) => i.status === 'archived').length} loading={q.isLoading} onClick={() => setView('archived')} active={view === 'archived'} />
      </div>
      <Panel className="p-0 sm:p-0">
        <div className="border-b border-line p-4"><SearchInput value={search} onChange={setSearch} placeholder={t('int.search')} /></div>
        {q.isError ? <EmptyState icon={<Heart />} title={readApiError(q.error).message} action={<Button variant="secondary" onClick={() => void q.refetch()}>{t('tr.retry')}</Button>} /> : (
          <DataTable label={t('int.title')} columns={columns} rows={rows} rowKey={(i) => i._id} loading={q.isLoading} empty={<EmptyState icon={<Heart />} title={t('int.none')} />} />
        )}
      </Panel>
      <Dialog open={!!form} onClose={() => setForm(null)} title={t((form ?? lastForm.current)?.item ? 'int.editTitle' : 'int.newTitle')} closeLabel={t('tr.cancel')}
        footer={<><Button variant="ghost" onClick={() => setForm(null)}>{t('tr.cancel')}</Button><Button type="submit" form="interest-form" loading={save.isPending}>{t('tr.save')}</Button></>}>
        <form id="interest-form" onSubmit={submit} noValidate className="space-y-4">
          <Field label={t('int.name')} required hint={t('int.nameHint')}>{(c) => <TextInput {...c} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} dir="auto" />}</Field>
          <Field label={t('int.description')}>{(c) => <TextArea {...c} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} dir="auto" />}</Field>
          {error && <p role="alert" className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
        </form>
      </Dialog>
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} tone="danger" title={t('int.deleteTitle', { name: (deleting ?? lastDel.current)?.name ?? '' })} message={t('int.deleteText')} confirmLabel={t('int.delete')} cancelLabel={t('tr.cancel')} loading={remove.isPending}
        onConfirm={() => remove.mutate(deleting!, { onSettled: () => setDeleting(null) })} />
    </div>
  );
}
