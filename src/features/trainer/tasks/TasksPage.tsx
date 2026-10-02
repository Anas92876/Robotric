import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ClipboardCheck, ClipboardList, FilePen, Hourglass, Pencil, Plus, Send, Trash2 } from 'lucide-react';
import { useFormat } from '../../../app/format';
import { readApiError } from '../../../app/apiError';
import { useToast } from '../../../components/ui/Toast';
import { Badge, Button, ConfirmDialog, DataTable, EmptyState, PageHeader, Panel, RowMenu, SearchInput, SelectInput, StatTile, type BadgeTone, type Column } from '../../../ui';
import { useTrainerGroupOptions } from '../sessions/api';
import { useGroupTasks, useTaskMutations, type TrainerTask } from './api';

type State = 'open' | 'past' | 'draft';
const stateOf = (x: TrainerTask): State => (x.status === 'draft' ? 'draft' : x.status === 'closed' || new Date(x.deadline).getTime() < Date.now() ? 'past' : 'open');
export const TASK_TONE: Record<State, BadgeTone> = { open: 'success', past: 'neutral', draft: 'warning' };

/** Homework of one group: drafts, open tasks and those past their deadline. */
export default function TasksPage() {
  const { t, i18n } = useTranslation('dashboardTrainer');
  const f = useFormat();
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const groups = useTrainerGroupOptions();
  const options = (groups.data ?? []).filter((g) => g.status === 'active' || g._id === params.get('group'));
  const groupId = params.get('group') ?? '';
  useEffect(() => {
    if (!groupId && options.length) setParams({ group: options[0]._id }, { replace: true });
  }, [groupId, options, setParams]);
  const q = useGroupTasks(groupId);
  const { publish, remove } = useTaskMutations();
  const [view, setView] = useState<State | ''>('');
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<TrainerTask | null>(null);
  const [publishing, setPublishing] = useState<TrainerTask | null>(null);
  const ar = i18n.language === 'ar';
  const name = (x: TrainerTask) => (ar && x.titleAr) || x.title;
  const all = q.data ?? [];
  const sq = search.trim().toLowerCase();
  const rows = all
    .filter((x) => !view || stateOf(x) === view)
    .filter((x) => !sq || `${x.title} ${x.titleAr ?? ''}`.toLowerCase().includes(sq))
    .sort((a, b) => new Date(b.deadline).getTime() - new Date(a.deadline).getTime());

  const columns: Column<TrainerTask>[] = useMemo(
    () => [
      { key: 'title', header: t('tk.col.task'), cell: (x) => <Link to={`/trainer/tasks/${x._id}/submissions`} className="block max-w-sm rounded-md focus-visible:focus-ring"><span className="block truncate font-medium text-ink underline-offset-2 hover:underline" dir="auto">{name(x)}</span><span className="block truncate text-xs text-ink-4">{x.questions.length ? t('tk.questions', { count: x.questions.length }) : t('tk.noQuestions')}</span></Link> },
      { key: 'deadline', header: t('tk.col.deadline'), cell: (x) => <span className="whitespace-nowrap tabular-nums text-ink-2">{f.custom(x.deadline, { weekday: 'short', day: 'numeric', month: 'short' })} · <bdi dir="ltr">{f.time(x.deadline)}</bdi></span> },
      { key: 'score', header: t('tk.col.score'), align: 'end', hideOnMobile: true, cell: (x) => <span className="tabular-nums text-ink-2">{x.maxScore}</span> },
      { key: 'status', header: t('tk.col.status'), cell: (x) => <Badge tone={TASK_TONE[stateOf(x)]}>{t(`tk.state.${stateOf(x)}`)}</Badge> },
      {
        key: 'menu', header: <span className="sr-only">{t('tk.col.actions')}</span>, align: 'end',
        cell: (x) => (
          <RowMenu label={t('tk.actionsFor', { name: name(x) })} actions={[
            { label: t('tk.submissions'), icon: <ClipboardCheck />, onClick: () => navigate(`/trainer/tasks/${x._id}/submissions`), hidden: x.status === 'draft' },
            { label: t('tk.publish'), icon: <Send />, onClick: () => setPublishing(x), hidden: x.status !== 'draft' },
            { label: t('sp.edit'), icon: <Pencil />, onClick: () => navigate(`/trainer/tasks/${x._id}/edit`) },
            { label: t('tk.delete'), icon: <Trash2 />, tone: 'danger', onClick: () => setDeleting(x) },
          ]} />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, f, ar],
  );
  const tile = (v: State) => ({ onClick: () => setView(view === v ? '' : v), active: view === v });
  const count = (s: State) => all.filter((x) => stateOf(x) === s).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('tk.title')}
        description={t('tk.subtitle')}
        actions={<Link to={`/trainer/tasks/new${groupId ? `?group=${groupId}` : ''}`} className="inline-flex h-11 items-center gap-2 rounded-pill bg-ink px-5 text-sm font-medium text-white hover:bg-ink-deep focus-visible:focus-ring"><Plus className="size-[18px]" aria-hidden />{t('tk.new')}</Link>}
      />
      <div className="grid grid-cols-3 gap-3">
        <StatTile icon={<ClipboardList />} tint="bg-tint-leaf" label={t('tk.state.open')} value={count('open')} loading={q.isLoading} {...tile('open')} />
        <StatTile icon={<Hourglass />} tint="bg-tint-straw" label={t('tk.state.past')} value={count('past')} loading={q.isLoading} {...tile('past')} />
        <StatTile icon={<FilePen />} tint="bg-tint-sand" label={t('tk.state.draft')} value={count('draft')} loading={q.isLoading} {...tile('draft')} />
      </div>
      <Panel className="p-0 sm:p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <SelectInput aria-label={t('tk.group')} value={groupId} onChange={(e) => { setParams({ group: e.target.value }); setView(''); }} className="w-full sm:w-auto sm:min-w-52">
            {!options.length && <option value="">{t('tk.noGroups')}</option>}
            {options.map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}
          </SelectInput>
          <div className="w-full flex-1 sm:w-auto sm:min-w-56"><SearchInput value={search} onChange={setSearch} placeholder={t('tk.search')} /></div>
        </div>
        {q.isError ? <EmptyState icon={<ClipboardList />} title={readApiError(q.error).message} action={<Button variant="secondary" onClick={() => void q.refetch()}>{t('grp.retry')}</Button>} /> : (
          <DataTable label={t('tk.title')} columns={columns} rows={rows} rowKey={(x) => x._id} loading={q.isLoading || groups.isLoading} empty={<EmptyState icon={<ClipboardList />} title={t('tk.none')} description={t('tk.noneHint')} />} />
        )}
      </Panel>
      <ConfirmDialog
        open={!!publishing} onClose={() => setPublishing(null)} title={t('tk.publishTitle')} message={t('tk.publishText', { name: publishing ? name(publishing) : '' })} confirmLabel={t('tk.publish')} cancelLabel={t('sf.cancel')} loading={publish.isPending}
        onConfirm={() => publish.mutate(publishing!._id, { onSuccess: () => toast.success(t('tk.toast.published')), onError: (e) => toast.error(t('sp.actionError'), readApiError(e).message), onSettled: () => setPublishing(null) })}
      />
      <ConfirmDialog
        open={!!deleting} onClose={() => setDeleting(null)} tone="danger" title={t('tk.deleteTitle')} message={t('tk.deleteText', { name: deleting ? name(deleting) : '' })} confirmLabel={t('tk.delete')} cancelLabel={t('sf.cancel')} loading={remove.isPending}
        onConfirm={() => remove.mutate(deleting!._id, { onSuccess: () => toast.success(t('tk.toast.deleted')), onError: (e) => toast.error(t('sp.actionError'), readApiError(e).message), onSettled: () => setDeleting(null) })}
      />
    </div>
  );
}
