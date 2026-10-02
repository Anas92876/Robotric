import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Archive, BookOpen, FilePen, Package, Plus, Users, UsersRound } from 'lucide-react';
import { api } from '../../../lib/api';
import { readApiError } from '../../../app/apiError';
import { cn } from '../../../lib/utils';
import { Badge, Button, EmptyState, PageHeader, Panel, SearchInput, StatTile, type BadgeTone } from '../../../ui';
import { CourseDialog, type Course } from './CourseDialog';

export const COURSE_TONE: Record<Course['status'], BadgeTone> = { draft: 'warning', published: 'success', archived: 'neutral' };
type View = 'published' | 'draft' | 'archived';

/** The course catalogue: single courses and bundles, by status. */
export default function CoursesPage() {
  const { t } = useTranslation('dashboardCLO');
  const navigate = useNavigate();
  const q = useQuery({ queryKey: ['clo', 'courses', 'list'], queryFn: async () => ((await api.get('/clo/courses')).data.data ?? []) as Course[] });
  const [view, setView] = useState<View>('published');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const all = q.data ?? [];
  const sq = search.trim().toLowerCase();
  const rows = all.filter((c) => c.status === view).filter((c) => !sq || `${c.title} ${c.category}`.toLowerCase().includes(sq));
  const tile = (v: View) => ({ onClick: () => setView(v), active: view === v });
  const count = (v: View) => all.filter((c) => c.status === v).length;

  return (
    <div className="space-y-5">
      <PageHeader title={t('crs.listTitle')} description={t('crs.subtitle')} actions={<Button icon={<Plus />} onClick={() => setCreating(true)}>{t('crs.new')}</Button>} />
      <div className="grid grid-cols-3 gap-3">
        <StatTile icon={<BookOpen />} tint="bg-tint-leaf" label={t('ov.status.published')} value={count('published')} loading={q.isLoading} {...tile('published')} />
        <StatTile icon={<FilePen />} tint="bg-tint-straw" label={t('ov.status.draft')} value={count('draft')} loading={q.isLoading} {...tile('draft')} />
        <StatTile icon={<Archive />} tint="bg-tint-sand" label={t('ov.status.archived')} value={count('archived')} loading={q.isLoading} {...tile('archived')} />
      </div>
      <div className="max-w-md"><SearchInput value={search} onChange={setSearch} placeholder={t('crs.search')} /></div>
      {q.isError ? <Panel><EmptyState icon={<BookOpen />} title={readApiError(q.error).message} action={<Button variant="secondary" onClick={() => void q.refetch()}>{t('tr.retry')}</Button>} /></Panel>
        : q.isLoading ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-48 animate-pulse rounded-panel bg-rail" />)}</div>
        : rows.length === 0 ? <Panel><EmptyState icon={<BookOpen />} title={t('crs.none')} action={view === 'draft' || !all.length ? <Button icon={<Plus />} onClick={() => setCreating(true)}>{t('crs.new')}</Button> : undefined} /></Panel>
        : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((c) => (
              <li key={c._id}>
                <Link to={`/clo/courses/${c._id}`} className="group flex h-full flex-col rounded-panel border border-line bg-paper p-5 transition-colors hover:border-ink focus-visible:focus-ring">
                  <div className="flex items-start gap-3">
                    <span className={cn('grid size-11 shrink-0 place-items-center rounded-card text-ink', c.type === 'bundle' ? 'bg-tint-sage' : 'bg-tint-leaf')}>{c.type === 'bundle' ? <Package className="size-5" aria-hidden /> : <BookOpen className="size-5" aria-hidden />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 block font-semibold text-ink group-hover:underline" dir="auto">{c.title}</span>
                      <span className="block truncate text-xs text-ink-4" dir="auto">{[c.category, t(`crs.levels.${c.level.toLowerCase()}`, { defaultValue: c.level })].join(' · ')}</span>
                    </span>
                    {c.type === 'bundle' && <Badge tone="info">{t('crs.type.bundle')}</Badge>}
                  </div>
                  <p className="mt-3 line-clamp-2 flex-1 text-sm text-ink-3" dir="auto">{c.description}</p>
                  <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-3">
                    <span className="inline-flex items-center gap-1"><UsersRound className="size-3.5" aria-hidden />{t('crs.groupsN', { count: c.stats?.activeGroups ?? 0 })}</span>
                    <span className="inline-flex items-center gap-1"><Users className="size-3.5" aria-hidden />{t('crs.studentsN', { count: c.stats?.activeEnrollments ?? 0 })}</span>
                    {c.type === 'bundle' && <span className="inline-flex items-center gap-1"><Package className="size-3.5" aria-hidden />{t('crs.coursesN', { count: c.stats?.subCourseCount ?? 0 })}</span>}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      <CourseDialog open={creating} onClose={() => setCreating(false)} course={null} onSaved={(c) => navigate(`/clo/courses/${c._id}`)} />
    </div>
  );
}
