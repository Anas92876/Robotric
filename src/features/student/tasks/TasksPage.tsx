import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ClipboardCheck, Hourglass, ListTodo } from 'lucide-react';
import { useFormat } from '../../../app/format';
import { cn } from '../../../lib/utils';
import { Badge, Button, DataTable, EmptyState, PageHeader, Panel, SearchInput, SelectInput, StatTile, type BadgeTone, type Column } from '../../../ui';
import { stateOf, useStudentTasks, type StudentTask, type TaskState } from './api';

export const STATE_TONE: Record<TaskState, BadgeTone> = { todo: 'warning', late: 'danger', review: 'info', graded: 'success', closed: 'neutral', missed: 'neutral' };
type View = '' | 'todo' | 'review' | 'graded';
const ORDER: Record<TaskState, number> = { late: 0, todo: 1, review: 2, graded: 3, missed: 4, closed: 5 };

/** Homework from the trainers: what to hand in first, what is waiting for review, and grades. */
export default function TasksPage() {
  const { t, i18n } = useTranslation('dashboardStudent');
  const f = useFormat();
  const q = useStudentTasks();
  const [view, setView] = useState<View>('');
  const [search, setSearch] = useState('');
  const [course, setCourse] = useState('');
  const ar = i18n.language === 'ar';
  const titleOf = (x: StudentTask) => (ar && x.titleAr) || x.title;

  const all = q.data ?? [];
  const courses = [...new Map(all.filter((x) => x.courseId).map((x) => [x.courseId!._id, x.courseId!.title])).entries()];
  const s = search.trim().toLowerCase();
  const rows = all
    .filter((x) => !view || (view === 'todo' ? ['todo', 'late'].includes(stateOf(x)) : stateOf(x) === view))
    .filter((x) => !course || x.courseId?._id === course)
    .filter((x) => !s || titleOf(x).toLowerCase().includes(s))
    .sort((a, b) => ORDER[stateOf(a)] - ORDER[stateOf(b)] || +new Date(a.deadline) - +new Date(b.deadline));

  const columns: Column<StudentTask>[] = useMemo(
    () => [
      {
        key: 'task',
        header: t('tk.col.task'),
        cell: (x) => (
          <Link to={`/student/tasks/${x._id}`} className="block max-w-md rounded-md focus-visible:focus-ring">
            <span className="block truncate font-medium text-ink underline-offset-2 hover:underline" dir="auto">{titleOf(x)}</span>
            <span className="block truncate text-xs text-ink-4" dir="auto">{[x.courseId?.title, x.sessionId?.title].filter(Boolean).join(' · ')}</span>
          </Link>
        ),
      },
      {
        key: 'deadline',
        header: t('tk.col.deadline'),
        cell: (x) => {
          const st = stateOf(x);
          return <span className={cn('whitespace-nowrap tabular-nums', st === 'late' ? 'font-medium text-danger' : 'text-ink-2')}>{f.custom(x.deadline, { day: 'numeric', month: 'short' })} · <bdi dir="ltr">{f.time(x.deadline)}</bdi></span>;
        },
      },
      {
        key: 'score',
        header: t('tk.col.score'),
        hideOnMobile: true,
        cell: (x) => (x.submission?.score != null && stateOf(x) === 'graded' ? <span className="font-semibold tabular-nums text-ink">{x.submission.score} <span className="text-xs font-normal text-ink-4">/ {x.maxScore}</span></span> : <span className="text-ink-4">—</span>),
      },
      { key: 'state', header: t('tk.col.state'), cell: (x) => <Badge tone={STATE_TONE[stateOf(x)]}>{t(`tk.state.${stateOf(x)}`)}</Badge> },
    ],
    [t, f, ar], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const tile = (v: View) => ({ onClick: () => setView(view === v ? '' : v), active: view === v });
  const filtered = !!(view || s || course);

  return (
    <div className="space-y-5">
      <PageHeader title={t('tk.title')} description={t('tk.subtitle')} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile icon={<ListTodo />} tint="bg-tint-leaf" label={t('tk.all')} value={all.length} loading={q.isLoading} {...tile('')} />
        <StatTile icon={<Hourglass />} tint="bg-tint-straw" label={t('tk.toHandIn')} value={all.filter((x) => ['todo', 'late'].includes(stateOf(x))).length} loading={q.isLoading} {...tile('todo')} />
        <StatTile icon={<ClipboardCheck />} tint="bg-tint-sand" label={t('tk.state.review')} value={all.filter((x) => stateOf(x) === 'review').length} loading={q.isLoading} {...tile('review')} />
        <StatTile icon={<CheckCircle2 />} tint="bg-tint-sage" label={t('tk.state.graded')} value={all.filter((x) => stateOf(x) === 'graded').length} loading={q.isLoading} {...tile('graded')} />
      </div>
      <Panel className="p-0 sm:p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <div className="min-w-56 flex-1"><SearchInput value={search} onChange={setSearch} placeholder={t('tk.search')} /></div>
          {courses.length > 1 && (
            <SelectInput aria-label={t('tk.course')} value={course} onChange={(e) => setCourse(e.target.value)} className="w-auto min-w-44">
              <option value="">{t('courses.all')}</option>
              {courses.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
            </SelectInput>
          )}
        </div>
        {q.isError ? (
          <EmptyState icon={<ListTodo />} title={t('tk.loadError')} action={<Button variant="secondary" onClick={() => void q.refetch()}>{t('courses.retry')}</Button>} />
        ) : (
          <DataTable label={t('tk.title')} columns={columns} rows={rows} rowKey={(x) => x._id} loading={q.isLoading} empty={<EmptyState icon={<ListTodo />} title={t(filtered ? 'tk.noMatch' : 'tk.none')} description={filtered ? undefined : t('tk.noneHint')} />} />
        )}
      </Panel>
    </div>
  );
}
