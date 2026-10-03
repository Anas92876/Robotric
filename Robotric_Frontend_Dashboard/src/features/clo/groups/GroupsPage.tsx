import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Archive, ArchiveRestore, CheckCircle2, ClipboardList, Eye, Pencil, Plus, Trash2, UsersRound } from 'lucide-react';
import { api } from '../../../lib/api';
import { readApiError } from '../../../app/apiError';
import { useToast } from '../../../components/ui/Toast';
import { Badge, Button, ConfirmDialog, DataTable, EmptyState, PageHeader, Panel, RowMenu, SearchInput, SelectInput, StatTile, type BadgeTone, type Column } from '../../../ui';
import { useDayName } from '../../trainer/groups/GroupsPage';
import { useCloGroups, type CloGroup } from '../api';
import { GroupDialog } from './GroupDialog';

export const GROUP_TONE: Record<CloGroup['status'], BadgeTone> = { active: 'success', completed: 'info', archived: 'neutral', cancelled: 'danger' };
type View = 'active' | 'closed' | '';

/** Group actions shared by the list and the group page: board on/off, close/reopen, delete. */
export function useGroupActions() {
  const { t } = useTranslation('dashboardCLO');
  const toast = useToast();
  const qc = useQueryClient();
  const refresh = () => void qc.invalidateQueries({ queryKey: ['clo', 'groups'] });
  const fail = (e: unknown) => toast.error(t('tr.actionError'), readApiError(e).message);
  return {
    board: useMutation({ mutationFn: (g: CloGroup) => api.patch(`/clo/groups/${g._id}/board`).then((r) => r.data.data.boardEnabled as boolean), onSuccess: (on) => { refresh(); toast.success(t(on ? 'gr.toast.boardOn' : 'gr.toast.boardOff')); }, onError: fail }),
    close: useMutation({ mutationFn: (g: CloGroup) => api.put(`/clo/groups/${g._id}/status`, { action: g.status === 'active' ? 'close' : 'reopen' }), onSuccess: (_r, g) => { refresh(); toast.success(t(g.status === 'active' ? 'gr.toast.closed' : 'gr.toast.reopened')); }, onError: fail }),
    remove: useMutation({ mutationFn: (g: CloGroup) => api.delete(`/clo/groups/${g._id}`), onSuccess: () => { refresh(); toast.success(t('gr.toast.deleted')); }, onError: fail }),
  };
}

/** Every group of the centre: course, trainer, times, size and progress. */
export default function GroupsPage() {
  const { t } = useTranslation('dashboardCLO');
  const dayName = useDayName();
  const navigate = useNavigate();
  const q = useCloGroups();
  const actions = useGroupActions();
  const [view, setView] = useState<View>('active');
  const [course, setCourse] = useState('');
  const [trainer, setTrainer] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<{ group: CloGroup | null } | null>(null);
  const lastForm = useRef(form);
  if (form) lastForm.current = form;
  const [confirm, setConfirm] = useState<{ kind: 'close' | 'delete'; group: CloGroup } | null>(null);
  const lastConfirm = useRef(confirm);
  if (confirm) lastConfirm.current = confirm;

  const all = q.data ?? [];
  const courses = [...new Map(all.filter((g) => g.courseId).map((g) => [g.courseId!._id, g.courseId!.title])).entries()];
  const trainers = [...new Map(all.filter((g) => g.trainerId).map((g) => [g.trainerId!._id, g.trainerId!.name])).entries()];
  const sq = search.trim().toLowerCase();
  const rows = all
    .filter((g) => (view === 'active' ? g.status === 'active' : view === 'closed' ? g.status !== 'active' : true))
    .filter((g) => (!course || g.courseId?._id === course) && (!trainer || g.trainerId?._id === trainer))
    .filter((g) => !sq || g.name.toLowerCase().includes(sq));

  const columns: Column<CloGroup>[] = useMemo(
    () => [
      { key: 'name', header: t('gr.col.group'), cell: (g) => <Link to={`/clo/groups/${g._id}`} className="block max-w-xs rounded-md focus-visible:focus-ring"><span className="block truncate font-medium text-ink underline-offset-2 hover:underline" dir="auto">{g.name}</span><span className="block truncate text-xs text-ink-4" dir="auto">{g.courseId?.title}</span></Link> },
      { key: 'trainer', header: t('gr.trainer'), cell: (g) => <span className="text-ink-2" dir="auto">{g.trainerId?.name ?? '—'}</span> },
      { key: 'when', header: t('gr.col.when'), hideOnMobile: true, cell: (g) => <span className="block max-w-[220px] text-xs text-ink-3">{g.schedule.map((s) => <span key={s.day + s.startTime} className="block whitespace-nowrap">{dayName(s.day)} · <bdi dir="ltr">{s.startTime}–{s.endTime}</bdi></span>)}</span> },
      { key: 'size', header: t('gr.col.students'), align: 'end', cell: (g) => <span className="tabular-nums text-ink-2">{g.enrolledCount}<span className="text-ink-4"> / {g.maxStudents}</span></span> },
      { key: 'progress', header: t('gr.col.progress'), hideOnMobile: true, cell: (g) => (
        <span className="flex min-w-28 items-center gap-2">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-rail"><span className="block h-full rounded-full bg-success" style={{ width: `${g.progress.percentageComplete}%` }} /></span>
          <span className="text-xs tabular-nums text-ink-3" dir="ltr">{g.progress.completedSessions}/{g.progress.totalSessions}</span>
        </span>
      ) },
      { key: 'status', header: t('tr.col.status'), cell: (g) => <Badge tone={GROUP_TONE[g.status]}>{t(`ov.status.${g.status}`)}</Badge> },
      {
        key: 'menu', header: <span className="sr-only">{t('tr.col.actions')}</span>, align: 'end',
        cell: (g) => <RowMenu label={t('tr.actionsFor', { name: g.name })} actions={[
          { label: t('gr.open'), icon: <Eye />, onClick: () => navigate(`/clo/groups/${g._id}`) },
          { label: t('tr.edit'), icon: <Pencil />, onClick: () => setForm({ group: g }) },
          { label: t(g.boardEnabled ? 'gr.boardOff' : 'gr.boardOn'), icon: <ClipboardList />, onClick: () => actions.board.mutate(g) },
          { label: t(g.status === 'active' ? 'gr.close' : 'gr.reopen'), icon: g.status === 'active' ? <Archive /> : <ArchiveRestore />, onClick: () => setConfirm({ kind: 'close', group: g }) },
          { label: t('gr.delete'), icon: <Trash2 />, tone: 'danger', onClick: () => setConfirm({ kind: 'delete', group: g }) },
        ]} />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, dayName],
  );
  const tile = (v: View) => ({ onClick: () => setView(v), active: view === v });
  const c = confirm ?? lastConfirm.current;
  const closing = c?.kind === 'close';
  const busy = closing ? actions.close.isPending : actions.remove.isPending;

  return (
    <div className="space-y-5">
      <PageHeader title={t('gr.title')} description={t('gr.subtitle')} actions={<Button icon={<Plus />} onClick={() => setForm({ group: null })}>{t('gr.new')}</Button>} />
      <div className="grid grid-cols-3 gap-3">
        <StatTile icon={<UsersRound />} tint="bg-tint-leaf" label={t('ov.status.active')} value={all.filter((g) => g.status === 'active').length} loading={q.isLoading} {...tile('active')} />
        <StatTile icon={<CheckCircle2 />} tint="bg-tint-straw" label={t('gr.closed')} value={all.filter((g) => g.status !== 'active').length} loading={q.isLoading} {...tile('closed')} />
        <StatTile icon={<UsersRound />} tint="bg-tint-sage" label={t('gr.all')} value={all.length} loading={q.isLoading} {...tile('')} />
      </div>
      <Panel className="p-0 sm:p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <div className="w-full flex-1 sm:w-auto sm:min-w-56"><SearchInput value={search} onChange={setSearch} placeholder={t('gr.search')} /></div>
          {courses.length > 1 && <SelectInput aria-label={t('gr.course')} value={course} onChange={(e) => setCourse(e.target.value)} className="w-full sm:w-auto sm:min-w-44"><option value="">{t('gr.allCourses')}</option>{courses.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</SelectInput>}
          {trainers.length > 1 && <SelectInput aria-label={t('gr.trainer')} value={trainer} onChange={(e) => setTrainer(e.target.value)} className="w-full sm:w-auto sm:min-w-44"><option value="">{t('gr.allTrainers')}</option>{trainers.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</SelectInput>}
        </div>
        {q.isError ? <EmptyState icon={<UsersRound />} title={readApiError(q.error).message} action={<Button variant="secondary" onClick={() => void q.refetch()}>{t('tr.retry')}</Button>} /> : (
          <DataTable label={t('gr.title')} columns={columns} rows={rows} rowKey={(g) => g._id} loading={q.isLoading} empty={<EmptyState icon={<UsersRound />} title={t('gr.none')} />} />
        )}
      </Panel>
      <GroupDialog open={!!form} onClose={() => setForm(null)} group={(form ?? lastForm.current)?.group ?? null} />
      <ConfirmDialog
        open={!!confirm} onClose={() => setConfirm(null)} tone={closing && c?.group.status !== 'active' ? 'default' : 'danger'} loading={busy}
        title={t(closing ? (c?.group.status === 'active' ? 'gr.closeTitle' : 'gr.reopenTitle') : 'gr.deleteTitle', { name: c?.group.name ?? '' })}
        message={t(closing ? (c?.group.status === 'active' ? 'gr.closeText' : 'gr.reopenText') : 'gr.deleteText')}
        confirmLabel={t(closing ? (c?.group.status === 'active' ? 'gr.close' : 'gr.reopen') : 'gr.delete')} cancelLabel={t('tr.cancel')}
        onConfirm={() => (closing ? actions.close : actions.remove).mutate(confirm!.group, { onSettled: () => setConfirm(null) })}
      />
    </div>
  );
}
