import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Images } from 'lucide-react';
import { api } from '../../../lib/api';
import { readApiError } from '../../../app/apiError';
import { GalleryGrid } from '../../../components/gallery/GalleryGrid';
import type { GalleryImage } from '../../../hooks/student/useStudentGallery';
import { cn } from '../../../lib/utils';
import { Button, EmptyState, PageHeader, Pagination, Panel, SelectInput } from '../../../ui';
import { useCloCourseOptions, useCloGroups } from '../api';

type Type = '' | 'moment' | 'project';
const PAGE = 24;

/** Photos from every group (class moments and project photos), to browse by course, group and type. */
export default function GalleryPage() {
  const { t } = useTranslation('dashboardCLO');
  const [type, setType] = useState<Type>('');
  const [course, setCourse] = useState('');
  const [group, setGroup] = useState('');
  const [page, setPage] = useState(1);
  const courses = useCloCourseOptions();
  const groups = useCloGroups();
  const q = useQuery({
    queryKey: ['clo', 'gallery', type, course, group, page],
    queryFn: async () => (await api.get('/clo/gallery', { params: { ...(type ? { type } : {}), ...(course ? { courseId: course } : {}), ...(group ? { groupId: group } : {}), page, limit: PAGE } })).data as { data: GalleryImage[]; pagination: { total: number; totalPages: number } },
    placeholderData: (p) => p,
  });
  const reset = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1); };
  const images = q.data?.data ?? [];
  const pages = q.data?.pagination.totalPages ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader title={t('gal.title')} description={t('gal.subtitle')} />
      <Panel className="flex flex-wrap items-center gap-3 py-4 sm:py-4">
        <div role="tablist" aria-label={t('gal.type')} className="flex rounded-pill bg-rail p-1">
          {(['', 'moment', 'project'] as Type[]).map((v) => (
            <button key={v || 'all'} type="button" role="tab" aria-selected={type === v} onClick={() => reset(setType)(v)} className={cn('h-8 rounded-pill px-3.5 text-sm font-medium focus-visible:focus-ring', type === v ? 'bg-ink text-white' : 'text-ink-3 hover:text-ink')}>{t(`gal.types.${v || 'all'}`)}</button>
          ))}
        </div>
        <SelectInput aria-label={t('gr.course')} value={course} onChange={(e) => { reset(setCourse)(e.target.value); setGroup(''); }} className="w-auto min-w-44"><option value="">{t('gr.allCourses')}</option>{(courses.data ?? []).map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}</SelectInput>
        <SelectInput aria-label={t('gr.one')} value={group} onChange={(e) => reset(setGroup)(e.target.value)} className="w-auto min-w-44"><option value="">{t('att.allGroups')}</option>{(groups.data ?? []).filter((g) => !course || g.courseId?._id === course).map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}</SelectInput>
        {q.data && <span className="ms-auto text-sm text-ink-3">{t('gal.count', { count: q.data.pagination.total })}</span>}
      </Panel>
      {q.isError ? <Panel><EmptyState icon={<Images />} title={readApiError(q.error).message} action={<Button variant="secondary" onClick={() => void q.refetch()}>{t('tr.retry')}</Button>} /></Panel>
        : !q.isLoading && images.length === 0 ? <Panel><EmptyState icon={<Images />} title={t('gal.none')} description={t('gal.noneHint')} /></Panel>
        : <GalleryGrid images={images} isLoading={q.isLoading} />}
      {pages > 1 && <Pagination page={page} pages={pages} total={q.data!.pagination.total} pageSize={PAGE} onPage={setPage} summary={(a, b, n) => t('att.range', { from: a, to: b, total: n })} labels={{ previous: t('att.prev'), next: t('att.next') }} />}
    </div>
  );
}
