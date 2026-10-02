import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Eye, FolderKanban, Hammer, Inbox, Pencil, Plus, Trash2 } from 'lucide-react';
import { readApiError } from '../../../app/apiError';
import { useToast } from '../../../components/ui/Toast';
import { Badge, Button, ConfirmDialog, DataTable, EmptyState, PageHeader, Panel, RowMenu, SearchInput, SelectInput, StatTile, type BadgeTone, type Column } from '../../../ui';
import { useTrainerGroupOptions } from '../sessions/api';
import { useGroupProjects, useProjectMutations, type ProjectStatus, type TrainerProject } from './api';

export const PROJECT_TONE: Record<ProjectStatus, BadgeTone> = { in_progress: 'warning', submitted: 'info', completed: 'success' };
export const ownerOf = (p: TrainerProject) => (typeof p.studentId === 'object' ? p.studentId : { _id: p.studentId, name: '', email: '' });

/** Student projects of one group: who builds what, and where each one stands. */
export default function ProjectsPage() {
  const { t, i18n } = useTranslation('dashboardTrainer');
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const groups = useTrainerGroupOptions();
  const options = (groups.data ?? []).filter((g) => g.status === 'active' || g._id === params.get('group'));
  const groupId = params.get('group') ?? '';
  useEffect(() => {
    if (!groupId && options.length) setParams({ group: options[0]._id }, { replace: true });
  }, [groupId, options, setParams]);
  const q = useGroupProjects(groupId);
  const { remove } = useProjectMutations();
  const [view, setView] = useState<ProjectStatus | ''>('');
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<TrainerProject | null>(null);
  const ar = i18n.language === 'ar';
  const name = (p: TrainerProject) => (ar && p.titleAr) || p.title;
  const all = q.data ?? [];
  const sq = search.trim().toLowerCase();
  const rows = all.filter((p) => !view || p.status === view).filter((p) => !sq || `${p.title} ${p.titleAr ?? ''} ${ownerOf(p).name}`.toLowerCase().includes(sq));

  const columns: Column<TrainerProject>[] = useMemo(
    () => [
      {
        key: 'project', header: t('pjt.col.project'),
        cell: (p) => {
          const img = p.images.find((i) => i.cloudinaryUrl);
          return (
            <Link to={`/trainer/projects/${p._id}`} className="flex max-w-md items-center gap-3 rounded-md focus-visible:focus-ring">
              {img ? <img src={img.cloudinaryUrl!} alt="" className="size-11 shrink-0 rounded-input object-cover" loading="lazy" /> : <span className="grid size-11 shrink-0 place-items-center rounded-input bg-tint-sage text-ink-3"><FolderKanban className="size-5" aria-hidden /></span>}
              <span className="min-w-0"><span className="block truncate font-medium text-ink underline-offset-2 hover:underline" dir="auto">{name(p)}</span><span className="block truncate text-xs text-ink-4" dir="auto">{ownerOf(p).name}</span></span>
            </Link>
          );
        },
      },
      { key: 'status', header: t('tk.col.status'), cell: (p) => <Badge tone={PROJECT_TONE[p.status]}>{t(`pjt.status.${p.status}`)}</Badge> },
      { key: 'grade', header: t('pjt.col.grade'), align: 'end', cell: (p) => <span className="tabular-nums text-ink-2">{p.grade ?? '—'}</span> },
      {
        key: 'menu', header: <span className="sr-only">{t('tk.col.actions')}</span>, align: 'end',
        cell: (p) => <RowMenu label={t('tk.actionsFor', { name: name(p) })} actions={[
          { label: t('pjt.open'), icon: <Eye />, onClick: () => navigate(`/trainer/projects/${p._id}`) },
          { label: t('sp.edit'), icon: <Pencil />, onClick: () => navigate(`/trainer/projects/${p._id}/edit`) },
          { label: t('pjt.delete'), icon: <Trash2 />, tone: 'danger', onClick: () => setDeleting(p) },
        ]} />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, ar],
  );
  const tile = (v: ProjectStatus) => ({ onClick: () => setView(view === v ? '' : v), active: view === v });

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('pjt.title')}
        description={t('pjt.subtitle')}
        actions={<Link to={`/trainer/projects/new${groupId ? `?group=${groupId}` : ''}`} className="inline-flex h-11 items-center gap-2 rounded-pill bg-ink px-5 text-sm font-medium text-white hover:bg-ink-deep focus-visible:focus-ring"><Plus className="size-[18px]" aria-hidden />{t('pjt.new')}</Link>}
      />
      <div className="grid grid-cols-3 gap-3">
        <StatTile icon={<Hammer />} tint="bg-tint-straw" label={t('pjt.status.in_progress')} value={all.filter((p) => p.status === 'in_progress').length} loading={q.isLoading} {...tile('in_progress')} />
        <StatTile icon={<Inbox />} tint="bg-tint-leaf" label={t('pjt.status.submitted')} value={all.filter((p) => p.status === 'submitted').length} loading={q.isLoading} {...tile('submitted')} />
        <StatTile icon={<CheckCircle2 />} tint="bg-tint-sage" label={t('pjt.status.completed')} value={all.filter((p) => p.status === 'completed').length} loading={q.isLoading} {...tile('completed')} />
      </div>
      <Panel className="p-0 sm:p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <SelectInput aria-label={t('tk.group')} value={groupId} onChange={(e) => { setParams({ group: e.target.value }); setView(''); }} className="w-auto min-w-52">
            {!options.length && <option value="">{t('tk.noGroups')}</option>}
            {options.map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}
          </SelectInput>
          <div className="min-w-56 flex-1"><SearchInput value={search} onChange={setSearch} placeholder={t('pjt.search')} /></div>
        </div>
        {q.isError ? <EmptyState icon={<FolderKanban />} title={readApiError(q.error).message} action={<Button variant="secondary" onClick={() => void q.refetch()}>{t('grp.retry')}</Button>} /> : (
          <DataTable label={t('pjt.title')} columns={columns} rows={rows} rowKey={(p) => p._id} loading={q.isLoading || groups.isLoading} empty={<EmptyState icon={<FolderKanban />} title={t('pjt.none')} description={t('pjt.noneHint')} />} />
        )}
      </Panel>
      <ConfirmDialog
        open={!!deleting} onClose={() => setDeleting(null)} tone="danger" title={t('pjt.deleteTitle')} message={t('pjt.deleteText', { name: deleting ? name(deleting) : '' })} confirmLabel={t('pjt.delete')} cancelLabel={t('sf.cancel')} loading={remove.isPending}
        onConfirm={() => remove.mutate(deleting!._id, { onSuccess: () => toast.success(t('pjt.toast.deleted')), onError: (e) => toast.error(t('sp.actionError'), readApiError(e).message), onSettled: () => setDeleting(null) })}
      />
    </div>
  );
}
