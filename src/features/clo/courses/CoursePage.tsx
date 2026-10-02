import { useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Archive, ArchiveRestore, BookOpen, ChevronRight, Clock, GraduationCap, Pencil, Plus, Send, ShieldCheck, Target, Trash2, Users, UsersRound, X } from 'lucide-react';
import { api } from '../../../lib/api';
import { useFormat } from '../../../app/format';
import { readApiError } from '../../../app/apiError';
import { useToast } from '../../../components/ui/Toast';
import { Badge, Button, ConfirmDialog, Dialog, EmptyState, PageHeader, Panel, PanelTitle, SelectInput, StatTile } from '../../../ui';
import { useDayName } from '../../trainer/groups/GroupsPage';
import { useCloCourseOptions } from '../api';
import { GroupDialog } from '../groups/GroupDialog';
import { GROUP_TONE } from '../groups/GroupsPage';
import { CourseDialog, type Course } from './CourseDialog';
import { COURSE_TONE } from './CoursesPage';

interface Details {
  course: Course;
  groups: { _id: string; name: string; trainerId: { name: string } | string | null; students: string[]; status: 'active' | 'completed' | 'archived' | 'cancelled'; schedule: { day: string; startTime: string; endTime: string }[] }[];
  trainers: { _id: string; name: string }[];
  stats: { totalGroups: number; activeGroups: number; totalEnrollments: number; activeEnrollments: number; completionRate: number; avgProgress: number; trainersCount: number };
}
interface Bundle { subCourses: { _id: string; title: string; price?: number | null; status: string }[]; pricing?: { individualTotal?: number; bundlePrice?: number; savings?: number; discountPercent?: number } }

/** Old links went to /clo/courses/:courseId/:groupId; groups have their own page now. */
export function CourseGroupRedirect() {
  const { groupId = '' } = useParams();
  return <Navigate to={`/clo/groups/${groupId}`} replace />;
}

/** One course: what it teaches, its groups, and (for a bundle) the courses inside it. */
export default function CoursePage() {
  const { courseId = '' } = useParams();
  const { t } = useTranslation('dashboardCLO');
  const f = useFormat();
  const dayName = useDayName();
  const toast = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['clo', 'courses', courseId], queryFn: async () => (await api.get(`/clo/courses/${courseId}`)).data.data as Details });
  const c = q.data?.course;
  const bundle = useQuery({ queryKey: ['clo', 'courses', courseId, 'bundle'], queryFn: async () => (await api.get(`/clo/courses/${courseId}/sub-courses`)).data.data as Bundle, enabled: c?.type === 'bundle' });
  const options = useCloCourseOptions();
  const [editing, setEditing] = useState(false);
  const [newGroup, setNewGroup] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addId, setAddId] = useState('');
  const [confirm, setConfirm] = useState<'publish' | 'archive' | 'delete' | null>(null);
  const lastConfirm = useRef(confirm);
  if (confirm) lastConfirm.current = confirm;
  const refresh = () => void qc.invalidateQueries({ queryKey: ['clo', 'courses'] });
  const fail = (e: unknown) => toast.error(t('tr.actionError'), readApiError(e).message);
  const act = useMutation({
    mutationFn: (kind: 'publish' | 'archive' | 'delete') =>
      kind === 'publish' ? api.put(`/clo/courses/${courseId}`, { status: 'published' })
        : kind === 'archive' ? api.put(`/clo/courses/${courseId}/archive`, { action: c?.status === 'archived' ? 'unarchive' : 'archive' })
        : api.delete(`/clo/courses/${courseId}`),
    onSuccess: (_r, kind) => {
      refresh();
      toast.success(t(kind === 'archive' ? (c?.status === 'archived' ? 'crs.toast.unarchived' : 'crs.toast.archived') : `crs.toast.${kind}`));
      if (kind === 'delete') navigate('/clo/courses');
    },
    onError: fail,
  });
  const sub = useMutation({
    mutationFn: ({ id, remove }: { id: string; remove?: boolean }) => (remove ? api.delete(`/clo/courses/${courseId}/sub-courses/${id}`) : api.post(`/clo/courses/${courseId}/sub-courses`, { courseId: id })),
    onSuccess: (_r, v) => { refresh(); toast.success(t(v.remove ? 'crs.toast.subRemoved' : 'crs.toast.subAdded')); setAdding(false); },
    onError: fail,
  });
  const back = { to: '/clo/courses', label: t('crs.listTitle') };

  if (q.isError) return <div className="space-y-5"><PageHeader back={back} title={t('crs.one')} /><Panel><EmptyState icon={<AlertCircle />} title={readApiError(q.error).message} /></Panel></div>;
  if (!c || !q.data) return <div className="space-y-4"><div className="h-10 w-72 animate-pulse rounded-md bg-rail" /><div className="h-72 animate-pulse rounded-panel bg-rail" /></div>;

  const s = q.data.stats;
  const groups = q.data.groups;
  const inBundle = new Set(bundle.data?.subCourses.map((x) => x._id) ?? []);
  const addable = (options.data ?? []).filter((x) => x._id !== courseId && !inBundle.has(x._id) && x.type !== 'bundle' && x.status !== 'archived');
  const k = confirm ?? lastConfirm.current;
  const list = (items: string[] | undefined, title: string, icon: React.ReactNode) => items?.length ? (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-ink">{icon}{title}</p>
      <ul className="space-y-1.5">{items.map((x, i) => <li key={i} className="flex gap-2 text-sm text-ink-2" dir="auto"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-glow-deep" aria-hidden />{x}</li>)}</ul>
    </div>
  ) : null;

  return (
    <div className="space-y-5">
      <PageHeader
        back={back}
        title={c.title}
        description={[c.category, t(`crs.levels.${c.level.toLowerCase()}`, { defaultValue: c.level }), c.type === 'bundle' ? t('crs.type.bundle') : null].filter(Boolean).join(' · ')}
        actions={<>
          <Badge tone={COURSE_TONE[c.status]}>{t(`ov.status.${c.status}`)}</Badge>
          {c.status === 'draft' && <Button icon={<Send />} onClick={() => setConfirm('publish')}>{t('crs.publish')}</Button>}
          <Button variant="secondary" icon={<Pencil />} onClick={() => setEditing(true)}>{t('tr.edit')}</Button>
        </>}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={<UsersRound />} tint="bg-tint-leaf" label={t('ov.groups')} value={s.activeGroups} />
        <StatTile icon={<Users />} tint="bg-tint-sand" label={t('crs.activeStudents')} value={s.activeEnrollments} />
        <StatTile icon={<GraduationCap />} tint="bg-tint-sage" label={t('tr.title')} value={s.trainersCount} />
        <StatTile icon={<Target />} tint="bg-tint-straw" label={t('ov.completion')} value={`${Math.round(s.completionRate)}%`} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <Panel>
            <PanelTitle title={t('gr.title')} actions={<Button size="sm" icon={<Plus />} onClick={() => setNewGroup(true)} disabled={c.status === 'archived'}>{t('gr.new')}</Button>} />
            {groups.length === 0 ? <EmptyState icon={<UsersRound />} title={t('crs.noGroups')} description={t('crs.noGroupsHint')} /> : (
              <ul className="divide-y divide-line">
                {groups.map((g) => (
                  <li key={g._id}>
                    <Link to={`/clo/groups/${g._id}`} className="flex items-center gap-3 py-3 hover:bg-rail focus-visible:bg-rail focus-visible:outline-none">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-ink" dir="auto">{g.name}</span>
                        <span className="block truncate text-xs text-ink-4"><span dir="auto">{typeof g.trainerId === 'object' && g.trainerId ? g.trainerId.name : ''}</span>{g.schedule.length > 0 && <> · {g.schedule.map((x) => `${dayName(x.day)} `).join('· ')}</>}</span>
                      </span>
                      <span className="text-xs tabular-nums text-ink-3">{t('crs.studentsN', { count: g.students.length })}</span>
                      <Badge tone={GROUP_TONE[g.status]}>{t(`ov.status.${g.status}`)}</Badge>
                      <ChevronRight className="size-4 shrink-0 text-ink-4 rtl:rotate-180" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          {c.type === 'bundle' && (
            <Panel>
              <PanelTitle title={t('crs.inBundle')} actions={<Button size="sm" variant="secondary" icon={<Plus />} onClick={() => { setAddId(''); setAdding(true); }}>{t('crs.addCourse')}</Button>} />
              {bundle.isLoading ? <div className="h-16 animate-pulse rounded-card bg-rail" /> : !bundle.data?.subCourses.length ? <p className="py-3 text-center text-sm text-ink-4">{t('crs.emptyBundle')}</p> : (
                <ul className="space-y-2">
                  {bundle.data.subCourses.map((x) => (
                    <li key={x._id} className="flex items-center gap-3 rounded-card border border-line p-3">
                      <BookOpen className="size-4 text-ink-3" aria-hidden />
                      <Link to={`/clo/courses/${x._id}`} className="min-w-0 flex-1 truncate text-sm font-medium text-ink hover:underline" dir="auto">{x.title}</Link>
                      {x.price != null && <span className="text-xs tabular-nums text-ink-3" dir="ltr">{f.money(x.price)}</span>}
                      <Button size="sm" variant="ghost" iconOnly icon={<X />} aria-label={t('crs.removeCourse', { name: x.title })} onClick={() => sub.mutate({ id: x._id, remove: true })} />
                    </li>
                  ))}
                </ul>
              )}
              {bundle.data?.pricing?.individualTotal != null && (
                <p className="mt-3 text-sm text-ink-3">{t('crs.pricing', { total: f.money(bundle.data.pricing.individualTotal), bundle: f.money(c.bundlePrice ?? 0) })}</p>
              )}
            </Panel>
          )}
          <Panel>
            <PanelTitle title={t('crs.about')} />
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-2" dir="auto">{c.description}</p>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              {list(c.objectives, t('crs.objectives'), <Target className="size-4 text-ink-3" aria-hidden />)}
              {list(c.prerequisites, t('crs.prerequisites'), <BookOpen className="size-4 text-ink-3" aria-hidden />)}
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-ink-3">{t('crs.price')}</dt><dd className="font-semibold tabular-nums text-ink" dir="ltr">{f.money((c.type === 'bundle' ? c.bundlePrice : c.price) ?? 0)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="inline-flex items-center gap-1.5 text-ink-3"><Clock className="size-4" aria-hidden />{t('crs.hours')}</dt><dd className="tabular-nums text-ink">{c.totalHours || c.duration || '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="inline-flex items-center gap-1.5 text-ink-3"><ShieldCheck className="size-4" aria-hidden />{t('crs.wroShort')}</dt><dd className="text-ink">{t(c.wroDocumentsRequired ? 'ev.yes' : 'ev.no')}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-ink-3">{t('crs.created')}</dt><dd className="text-ink">{f.date(c.createdAt)}</dd></div>
            </dl>
          </Panel>
          <div className="space-y-2">
            {c.status !== 'draft' && <Button variant="secondary" className="w-full" icon={c.status === 'archived' ? <ArchiveRestore /> : <Archive />} onClick={() => setConfirm('archive')}>{t(c.status === 'archived' ? 'crs.unarchive' : 'crs.archive')}</Button>}
            {c.status === 'draft' && <Button variant="ghost" className="w-full text-danger" icon={<Trash2 />} onClick={() => setConfirm('delete')}>{t('crs.delete')}</Button>}
          </div>
        </div>
      </div>

      <CourseDialog open={editing} onClose={() => setEditing(false)} course={c} />
      <GroupDialog open={newGroup} onClose={() => setNewGroup(false)} group={null} courseId={courseId} />
      <Dialog open={adding} onClose={() => setAdding(false)} title={t('crs.addCourseTitle')} closeLabel={t('tr.cancel')}
        footer={<><Button variant="ghost" onClick={() => setAdding(false)}>{t('tr.cancel')}</Button><Button disabled={!addId} loading={sub.isPending} onClick={() => sub.mutate({ id: addId })}>{t('crs.addCourse')}</Button></>}>
        {addable.length === 0 ? <p className="text-sm text-ink-4">{t('crs.nothingToAdd')}</p> : (
          <SelectInput aria-label={t('gr.course')} value={addId} onChange={(e) => setAddId(e.target.value)}><option value="">{t('gr.pickCourse')}</option>{addable.map((x) => <option key={x._id} value={x._id}>{x.title}</option>)}</SelectInput>
        )}
      </Dialog>
      <ConfirmDialog
        open={!!confirm} onClose={() => setConfirm(null)} tone={k === 'delete' ? 'danger' : 'default'} loading={act.isPending}
        title={t(k === 'publish' ? 'crs.publishTitle' : k === 'delete' ? 'crs.deleteTitle' : c.status === 'archived' ? 'crs.unarchiveTitle' : 'crs.archiveTitle', { name: c.title })}
        message={t(k === 'publish' ? 'crs.publishText' : k === 'delete' ? 'crs.deleteText' : c.status === 'archived' ? 'crs.unarchiveText' : 'crs.archiveText')}
        confirmLabel={t(k === 'publish' ? 'crs.publish' : k === 'delete' ? 'crs.delete' : c.status === 'archived' ? 'crs.unarchive' : 'crs.archive')} cancelLabel={t('tr.cancel')}
        onConfirm={() => act.mutate(confirm!, { onSettled: () => setConfirm(null) })}
      />
    </div>
  );
}
