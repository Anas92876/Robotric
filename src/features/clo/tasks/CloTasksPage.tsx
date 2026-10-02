import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BarChart3, ClipboardList, Copy, Pencil, Plus, Send, Trash2 } from 'lucide-react';
import { api } from '../../../lib/api';
import { useFormat } from '../../../app/format';
import { readApiError } from '../../../app/apiError';
import { useToast } from '../../../components/ui/Toast';
import { Badge, Button, ConfirmDialog, DataTable, EmptyState, PageHeader, Pagination, Panel, RowMenu, SelectInput, type Column } from '../../../ui';
import { TASK_TONE } from '../../trainer/tasks/TasksPage';
import { useTaskMutations, type TrainerTask } from '../../trainer/tasks/api';
import { useCloCourseOptions, useCloGroups } from '../api';

type State = 'open' | 'past' | 'draft';
const stateOf = (x: TrainerTask): State => (x.status === 'draft' ? 'draft' : x.status === 'closed' || new Date(x.deadline).getTime() < Date.now() ? 'past' : 'open');
const PAGE = 20;

/** Every task given to students, written by the CLO or by trainers. */
export default function CloTasksPage() {
  const { t, i18n } = useTranslation('dashboardTrainer');
  const { t: tc } = useTranslation('dashboardCLO');
  const f = useFormat();
  const toast = useToast();
  const navigate = useNavigate();
  const [course, setCourse] = useState('');
  const [group, setGroup] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const courses = useCloCourseOptions();
  const groups = useCloGroups();
  const q = useQuery({
    queryKey: ['clo', 'tasks', 'list', course, group, status, page],
    queryFn: async () => (await api.get('/clo/tasks', { params: { ...(course ? { courseId: course } : {}), ...(group ? { groupId: group } : {}), ...(status ? { status } : {}), page, limit: PAGE } })).data as { data: TrainerTask[]; pagination: { total: number; totalPages: number } },
    placeholderData: (p) => p,
  });
  const m = useTaskMutations();
  const [confirm, setConfirm] = useState<{ kind: 'publish' | 'delete'; task: TrainerTask } | null>(null);
  const last = useRef(confirm);
  if (confirm) last.current = confirm;
  const ar = i18n.language === 'ar';
  const name = (x: TrainerTask) => (ar && x.titleAr) || x.title;
  const fail = (e: unknown) => toast.error(t('sp.actionError'), readApiError(e).message);
  const filterSet = (fn: (v: string) => void) => (e: { target: { value: string } }) => { fn(e.target.value); setPage(1); };

  const columns: Column<TrainerTask>[] = useMemo(
    () => [
      { key: 'title', header: t('tk.col.task'), cell: (x) => <Link to={`/clo/tasks/${x._id}/results`} className="block max-w-sm rounded-md focus-visible:focus-ring"><span className="block truncate font-medium text-ink underline-offset-2 hover:underline" dir="auto">{name(x)}</span><span className="block truncate text-xs text-ink-4" dir="auto">{(x.groupIds ?? []).map((g) => (typeof g === 'object' ? g.name : '')).filter(Boolean).join(' · ')}</span></Link> },
      { key: 'classes', header: tc('ctk.col.classes'), hideOnMobile: true, cell: (x) => <span className="text-xs text-ink-3">{(x.sessionIds ?? []).map((s) => (typeof s === 'object' ? tc('ctk.classN', { n: s.sessionNumber }) : '')).filter(Boolean).join(', ') || '—'}</span> },
      { key: 'deadline', header: t('tk.col.deadline'), cell: (x) => <span className="whitespace-nowrap tabular-nums text-ink-2">{f.custom(x.deadline, { day: 'numeric', month: 'short' })} · <bdi dir="ltr">{f.time(x.deadline)}</bdi></span> },
      { key: 'status', header: t('tk.col.status'), cell: (x) => <Badge tone={TASK_TONE[stateOf(x)]}>{t(`tk.state.${stateOf(x)}`)}</Badge> },
      {
        key: 'menu', header: <span className="sr-only">{t('tk.col.actions')}</span>, align: 'end',
        cell: (x) => <RowMenu label={t('tk.actionsFor', { name: name(x) })} actions={[
          { label: tc('ctk.results'), icon: <BarChart3 />, onClick: () => navigate(`/clo/tasks/${x._id}/results`), hidden: x.status === 'draft' },
          { label: t('tk.publish'), icon: <Send />, onClick: () => setConfirm({ kind: 'publish', task: x }), hidden: x.status !== 'draft' },
          { label: t('sp.edit'), icon: <Pencil />, onClick: () => navigate(`/clo/tasks/${x._id}/edit`) },
          { label: tc('ctk.duplicate'), icon: <Copy />, onClick: () => m.duplicate.mutate(x._id, { onSuccess: (d) => { toast.success(tc('ctk.toast.duplicated')); navigate(`/clo/tasks/${d._id}/edit`); }, onError: fail }) },
          { label: t('tk.delete'), icon: <Trash2 />, tone: 'danger', onClick: () => setConfirm({ kind: 'delete', task: x }) },
        ]} />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, tc, f, ar],
  );
  const c = confirm ?? last.current;
  const pages = q.data?.pagination.totalPages ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader title={t('tk.title')} description={tc('ctk.subtitle')} actions={<Link to="/clo/tasks/new" className="inline-flex h-11 items-center gap-2 rounded-pill bg-ink px-5 text-sm font-medium text-white hover:bg-ink-deep focus-visible:focus-ring"><Plus className="size-[18px]" aria-hidden />{t('tk.new')}</Link>} />
      <Panel className="p-0 sm:p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <SelectInput aria-label={tc('gr.course')} value={course} onChange={filterSet((v) => { setCourse(v); setGroup(''); })} className="w-full sm:w-auto sm:min-w-48"><option value="">{tc('gr.allCourses')}</option>{(courses.data ?? []).map((x) => <option key={x._id} value={x._id}>{x.title}</option>)}</SelectInput>
          <SelectInput aria-label={tc('gr.one')} value={group} onChange={filterSet(setGroup)} className="w-full sm:w-auto sm:min-w-44"><option value="">{tc('att.allGroups')}</option>{(groups.data ?? []).filter((g) => !course || g.courseId?._id === course).map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}</SelectInput>
          <SelectInput aria-label={t('tk.col.status')} value={status} onChange={filterSet(setStatus)} className="w-full sm:w-auto sm:min-w-36"><option value="">{tc('ctk.allStatuses')}</option><option value="open">{t('tk.state.open')}</option><option value="draft">{t('tk.state.draft')}</option><option value="closed">{tc('ctk.closed')}</option></SelectInput>
        </div>
        {q.isError ? <EmptyState icon={<ClipboardList />} title={readApiError(q.error).message} action={<Button variant="secondary" onClick={() => void q.refetch()}>{t('grp.retry')}</Button>} /> : (
          <DataTable label={t('tk.title')} columns={columns} rows={q.data?.data ?? []} rowKey={(x) => x._id} loading={q.isLoading} empty={<EmptyState icon={<ClipboardList />} title={t('tk.none')} description={t('tk.noneHint')} />} />
        )}
        {pages > 1 && <div className="border-t border-line p-4"><Pagination page={page} pages={pages} total={q.data!.pagination.total} pageSize={PAGE} onPage={setPage} summary={(a, b, n) => tc('att.range', { from: a, to: b, total: n })} labels={{ previous: tc('att.prev'), next: tc('att.next') }} /></div>}
      </Panel>
      <ConfirmDialog
        open={!!confirm} onClose={() => setConfirm(null)} tone={c?.kind === 'delete' ? 'danger' : 'default'} loading={c?.kind === 'delete' ? m.remove.isPending : m.publish.isPending}
        title={t(c?.kind === 'delete' ? 'tk.deleteTitle' : 'tk.publishTitle')} message={t(c?.kind === 'delete' ? 'tk.deleteText' : 'tk.publishText', { name: c ? name(c.task) : '' })}
        confirmLabel={t(c?.kind === 'delete' ? 'tk.delete' : 'tk.publish')} cancelLabel={t('sf.cancel')}
        onConfirm={() => (confirm!.kind === 'delete' ? m.remove : m.publish).mutate(confirm!.task._id, { onSuccess: () => toast.success(t(confirm!.kind === 'delete' ? 'tk.toast.deleted' : 'tk.toast.published')), onError: fail, onSettled: () => setConfirm(null) })}
      />
    </div>
  );
}
