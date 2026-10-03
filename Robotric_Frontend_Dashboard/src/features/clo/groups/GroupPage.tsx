import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Archive, ArchiveRestore, CalendarClock, ClipboardList, Pencil, Trash2, UserCheck, Users, UsersRound } from 'lucide-react';
import { api } from '../../../lib/api';
import { useFormat } from '../../../app/format';
import { readApiError } from '../../../app/apiError';
import { Badge, Button, ConfirmDialog, DataTable, EmptyState, PageHeader, Panel, PanelTitle, StatTile, type Column } from '../../../ui';
import { useDayName } from '../../trainer/groups/GroupsPage';
import type { CloGroup } from '../api';
import { GroupDialog } from './GroupDialog';
import { GROUP_TONE, useGroupActions } from './GroupsPage';

interface Student { _id: string; name: string; email: string; attendance: { rate: number; total: number }; enrollment: { status: string; progress?: number } | null }
interface Details extends CloGroup { stats: { studentsCount: number; avgAttendance: number } }

/** One group: who is in it, when it meets, how it attends, and its settings. */
export default function GroupPage() {
  const { groupId = '' } = useParams();
  const { t } = useTranslation('dashboardCLO');
  const f = useFormat();
  const dayName = useDayName();
  const navigate = useNavigate();
  const actions = useGroupActions();
  const q = useQuery({ queryKey: ['clo', 'groups', groupId], queryFn: async () => (await api.get(`/clo/groups/${groupId}`)).data.data as Details });
  const students = useQuery({ queryKey: ['clo', 'groups', groupId, 'students'], queryFn: async () => ((await api.get(`/clo/groups/${groupId}/students`)).data.data ?? []) as Student[] });
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<'close' | 'delete' | null>(null);
  const lastConfirm = useRef(confirm);
  if (confirm) lastConfirm.current = confirm;
  const back = { to: '/clo/groups', label: t('gr.title') };
  const g = q.data;

  if (q.isError) return <div className="space-y-5"><PageHeader back={back} title={t('gr.one')} /><Panel><EmptyState icon={<AlertCircle />} title={readApiError(q.error).message} /></Panel></div>;
  if (!g) return <div className="space-y-4"><div className="h-10 w-72 max-w-full animate-pulse rounded-md bg-rail" /><div className="h-72 animate-pulse rounded-panel bg-rail" /></div>;

  const columns: Column<Student>[] = [
    { key: 'name', header: t('gr.col.student'), cell: (s) => <span className="block max-w-xs"><span className="block truncate font-medium text-ink" dir="auto">{s.name}</span><span className="block truncate text-xs text-ink-4" dir="ltr">{s.email}</span></span> },
    { key: 'att', header: t('tr.col.attendance'), align: 'end', cell: (s) => <span className="tabular-nums text-ink-2" dir="ltr">{s.attendance.total ? `${Math.round(s.attendance.rate)}%` : '—'}</span> },
    { key: 'enr', header: t('gr.col.enrollment'), cell: (s) => s.enrollment ? <Badge tone={s.enrollment.status === 'active' ? 'success' : 'neutral'}>{t(`gr.enr.${s.enrollment.status}`, { defaultValue: s.enrollment.status })}</Badge> : <span className="text-ink-4">—</span> },
  ];
  const c = confirm ?? lastConfirm.current;
  const active = g.status === 'active';

  return (
    <div className="space-y-5">
      <PageHeader
        back={back}
        title={g.name}
        description={[g.courseId?.title, g.trainerId?.name].filter(Boolean).join(' · ')}
        actions={<>
          <Badge tone={GROUP_TONE[g.status]}>{t(`ov.status.${g.status}`)}</Badge>
          <Button variant="secondary" icon={<Pencil />} onClick={() => setEditing(true)}>{t('tr.edit')}</Button>
        </>}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={<Users />} tint="bg-tint-leaf" label={t('gr.col.students')} value={`${g.enrolledCount} / ${g.maxStudents}`} />
        <StatTile icon={<UserCheck />} tint="bg-tint-sage" label={t('tr.col.attendance')} value={`${Math.round(g.stats.avgAttendance ?? 0)}%`} />
        <StatTile icon={<CalendarClock />} tint="bg-tint-straw" label={t('gr.classesDone')} value={`${g.progress.completedSessions} / ${g.progress.totalSessions}`} to={`/clo/sessions?group=${g._id}`} />
        <StatTile icon={<UsersRound />} tint="bg-tint-sand" label={t('gr.seats')} value={Math.max(0, g.maxStudents - g.enrolledCount)} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel className="min-w-0 p-0 sm:p-0">
          <div className="p-4 pb-0 sm:p-5 sm:pb-0"><PanelTitle title={t('gr.students')} /></div>
          {students.isError ? <EmptyState icon={<Users />} title={readApiError(students.error).message} /> : (
            <DataTable label={t('gr.students')} columns={columns} rows={students.data ?? []} rowKey={(s) => s._id} loading={students.isLoading} empty={<EmptyState icon={<Users />} title={t('gr.noStudents')} description={t('gr.noStudentsHint')} />} />
          )}
        </Panel>
        <div className="space-y-5">
          <Panel>
            <PanelTitle title={t('gr.weekly')} />
            <ul className="space-y-2">
              {g.schedule.map((s) => (
                <li key={s.day + s.startTime} className="flex items-center gap-3 rounded-card border border-line p-3">
                  <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-ink">{dayName(s.day)}</span>{s.location && <span className="block truncate text-xs text-ink-4" dir="auto">{s.location}</span>}</span>
                  <bdi dir="ltr" className="text-sm tabular-nums text-ink-2">{s.startTime}–{s.endTime}</bdi>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-ink-4">{f.date(g.startDate)} – {f.date(g.endDate)}</p>
          </Panel>
          <Panel>
            <PanelTitle title={t('gr.settings')} />
            <div className="space-y-2">
              <div className="flex items-center gap-3 rounded-card border border-line p-3">
                <ClipboardList className="size-5 text-ink-3" aria-hidden />
                <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-ink">{t('gr.board')}</span><span className="block text-xs text-ink-4">{t(g.boardEnabled ? 'gr.boardOnHint' : 'gr.boardOffHint')}</span></span>
                <button type="button" role="switch" aria-checked={g.boardEnabled} aria-label={t('gr.board')} disabled={actions.board.isPending} onClick={() => actions.board.mutate(g)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:focus-ring ${g.boardEnabled ? 'bg-success' : 'bg-line-strong'}`}>
                  <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-[inset-inline-start] ${g.boardEnabled ? 'start-[22px]' : 'start-0.5'}`} />
                </button>
              </div>
              <Button variant="secondary" className="w-full" icon={active ? <Archive /> : <ArchiveRestore />} onClick={() => setConfirm('close')}>{t(active ? 'gr.close' : 'gr.reopen')}</Button>
              <Button variant="ghost" className="w-full text-danger" icon={<Trash2 />} onClick={() => setConfirm('delete')}>{t('gr.delete')}</Button>
            </div>
          </Panel>
          {g.courseId && <p className="text-xs text-ink-4"><Link to={`/clo/courses/${g.courseId._id}`} className="underline underline-offset-2 hover:text-ink">{t('gr.openCourse', { course: g.courseId.title })}</Link></p>}
        </div>
      </div>
      <GroupDialog open={editing} onClose={() => setEditing(false)} group={g} />
      <ConfirmDialog
        open={!!confirm} onClose={() => setConfirm(null)} tone={c === 'close' && !active ? 'default' : 'danger'} loading={c === 'close' ? actions.close.isPending : actions.remove.isPending}
        title={t(c === 'close' ? (active ? 'gr.closeTitle' : 'gr.reopenTitle') : 'gr.deleteTitle', { name: g.name })}
        message={t(c === 'close' ? (active ? 'gr.closeText' : 'gr.reopenText') : 'gr.deleteText')}
        confirmLabel={t(c === 'close' ? (active ? 'gr.close' : 'gr.reopen') : 'gr.delete')} cancelLabel={t('tr.cancel')}
        onConfirm={() => c === 'close'
          ? actions.close.mutate(g, { onSettled: () => setConfirm(null) })
          : actions.remove.mutate(g, { onSuccess: () => navigate('/clo/groups'), onSettled: () => setConfirm(null) })}
      />
    </div>
  );
}
