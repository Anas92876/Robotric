import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ImageIcon, Images, Wrench } from 'lucide-react';
import { api } from '../../../lib/api';
import { useStudentCourses } from '../../../hooks';
import { GalleryGrid } from '../../../components/gallery/GalleryGrid';
import type { GalleryImage } from '../../../hooks/student/useStudentGallery';
import { Button, EmptyState, PageHeader, Pagination, Panel, SelectInput } from '../../../ui';
import { cn } from '../../../lib/utils';

type Type = '' | 'moment' | 'project';
const LIMIT = 24;

/** Photos from the student's groups: class moments and finished projects. */
export default function GalleryPage() {
  const { t } = useTranslation('dashboardStudent');
  const { courses } = useStudentCourses();
  const [type, setType] = useState<Type>('');
  const [course, setCourse] = useState('');
  const [page, setPage] = useState(1);
  const q = useQuery({
    queryKey: ['student', 'gallery', type, course, page],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (type) p.set('type', type);
      if (course) p.set('courseId', course);
      const r = (await api.get(`/student/gallery?${p}`)).data;
      return { images: (r.data ?? []) as GalleryImage[], pages: (r.pagination?.totalPages ?? 1) as number, total: (r.pagination?.total ?? 0) as number };
    },
    placeholderData: keepPreviousData,
  });
  const list = (courses ?? []).filter((c) => c.enrollmentSource !== 'bundle');
  const tabs: { v: Type; icon: React.ReactNode; label: string }[] = [
    { v: '', icon: <Images className="size-4" aria-hidden />, label: t('gal.all') },
    { v: 'moment', icon: <ImageIcon className="size-4" aria-hidden />, label: t('gal.moments') },
    { v: 'project', icon: <Wrench className="size-4" aria-hidden />, label: t('gal.projects') },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title={t('gal.title')} description={t('gal.subtitle')} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label={t('gal.title')} className="flex w-fit items-center gap-0.5 rounded-pill border border-line bg-rail p-1">
          {tabs.map((x) => (
            <button key={x.v} role="tab" type="button" aria-selected={type === x.v} onClick={() => { setType(x.v); setPage(1); }} className={cn('inline-flex h-9 items-center gap-1.5 rounded-pill px-4 text-sm font-medium transition-colors focus-visible:focus-ring', type === x.v ? 'bg-ink text-white' : 'text-ink-3 hover:text-ink')}>
              {x.icon}{x.label}
            </button>
          ))}
        </div>
        {list.length > 1 && (
          <SelectInput aria-label={t('tk.course')} value={course} onChange={(e) => { setCourse(e.target.value); setPage(1); }} className="w-auto min-w-48">
            <option value="">{t('courses.all')}</option>
            {list.map((c) => <option key={c.course._id} value={c.course._id}>{c.course.title}</option>)}
          </SelectInput>
        )}
      </div>

      {q.isError ? (
        <Panel><EmptyState icon={<Images />} title={t('gal.loadError')} action={<Button variant="secondary" onClick={() => void q.refetch()}>{t('courses.retry')}</Button>} /></Panel>
      ) : !q.isLoading && !q.data?.images.length ? (
        <Panel><EmptyState icon={<Images />} title={t(type || course ? 'gal.noMatch' : 'gal.none')} description={type || course ? undefined : t('gal.noneHint')} /></Panel>
      ) : (
        <>
          <GalleryGrid images={q.data?.images ?? []} isLoading={q.isLoading} />
          <Pagination page={page} pages={q.data?.pages ?? 1} total={q.data?.total ?? 0} pageSize={LIMIT} onPage={setPage} summary={(from, to, total) => t('gal.pageSummary', { from, to, total })} labels={{ previous: t('qz.prev'), next: t('qz.next') }} />
        </>
      )}
    </div>
  );
}
