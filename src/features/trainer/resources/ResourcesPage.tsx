import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BookOpen, Eye, FileText, Users } from 'lucide-react';
import { api } from '../../../lib/api';
import { readApiError } from '../../../app/apiError';
import { PDFViewer } from '../../../components/ui/PDFViewer';
import { Button, EmptyState, PageHeader, Panel, SearchInput, SelectInput } from '../../../ui';

interface Resource {
  _id: string;
  title: string;
  description?: string | null;
  fileSize: number;
  originalName: string;
  courseId?: { _id: string; title: string } | string | null;
  assignedTo: { groupId: string; groupName: string; courseName: string; sessions: { sessionId: string; sessionNumber: number; title?: string }[] }[];
}

const mb = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** PDFs the learning team gave the trainer's groups, with the classes they belong to. */
export default function ResourcesPage() {
  const { t } = useTranslation('dashboardTrainer');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [group, setGroup] = useState('');
  const [pdf, setPdf] = useState<string | null>(null);
  useEffect(() => { const id = setTimeout(() => setDebounced(search.trim()), 300); return () => clearTimeout(id); }, [search]);

  const groups = useQuery({ queryKey: ['trainer', 'resources', 'groups'], queryFn: async () => ((await api.get('/trainer/resources/groups')).data.data ?? []) as { _id: string; name: string; courseId?: { title: string } | null }[], staleTime: 60_000 });
  const q = useQuery({
    queryKey: ['trainer', 'resources', group, debounced],
    queryFn: async () => ((await api.get(`/trainer/resources?${new URLSearchParams({ ...(group ? { groupId: group } : {}), ...(debounced ? { search: debounced } : {}) })}`)).data.data ?? []) as Resource[],
    placeholderData: (prev) => prev,
  });
  const list = q.data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title={t('res.title')} description={t('res.subtitle')} />
      <Panel className="p-0 sm:p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <div className="min-w-56 flex-1"><SearchInput value={search} onChange={setSearch} placeholder={t('res.search')} /></div>
          {(groups.data?.length ?? 0) > 1 && (
            <SelectInput aria-label={t('tk.group')} value={group} onChange={(e) => setGroup(e.target.value)} className="w-auto min-w-48">
              <option value="">{t('ses.allGroups')}</option>
              {groups.data!.map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}
            </SelectInput>
          )}
        </div>
        {q.isError ? <EmptyState icon={<FileText />} title={readApiError(q.error).message} action={<Button variant="secondary" onClick={() => void q.refetch()}>{t('grp.retry')}</Button>} />
          : q.isLoading ? <div className="space-y-3 p-4">{[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-card bg-rail" />)}</div>
          : list.length === 0 ? <EmptyState icon={<FileText />} title={t('res.none')} description={search || group ? t('res.noneFiltered') : t('res.noneHint')} />
          : (
            <ul className="divide-y divide-line">
              {list.map((r) => (
                <li key={r._id} className="flex flex-wrap items-start gap-4 p-4 sm:flex-nowrap">
                  <span className="grid size-11 shrink-0 place-items-center rounded-card bg-tint-straw text-ink"><FileText className="size-5" aria-hidden /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink" dir="auto">{r.title}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-4">
                      {r.courseId && typeof r.courseId === 'object' && <span className="inline-flex items-center gap-1"><BookOpen className="size-3.5" aria-hidden /><span dir="auto">{r.courseId.title}</span></span>}
                      <span dir="ltr">{mb(r.fileSize)}</span>
                      <span className="truncate" dir="auto">{r.originalName}</span>
                    </p>
                    {r.description && <p className="mt-1 line-clamp-2 text-sm text-ink-3" dir="auto">{r.description}</p>}
                    {r.assignedTo.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {r.assignedTo.map((g) => (
                          <li key={g.groupId} className="flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="inline-flex items-center gap-1 font-medium text-ink-2"><Users className="size-3.5" aria-hidden /><span dir="auto">{g.groupName}</span></span>
                            {g.sessions.length ? g.sessions.map((s) => (
                              <Link key={s.sessionId} to={`/trainer/sessions/${s.sessionId}`} className="rounded-pill bg-rail px-2 py-0.5 text-ink-2 hover:bg-tint-sage focus-visible:focus-ring">{t('res.classN', { n: s.sessionNumber })}</Link>
                            )) : <span className="text-ink-4">{t('res.wholeGroup')}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <Button size="sm" icon={<Eye />} onClick={() => setPdf(r._id)} aria-label={`${t('res.open')} — ${r.title}`}>{t('res.open')}</Button>
                </li>
              ))}
            </ul>
          )}
      </Panel>
      <PDFViewer resourceId={pdf} isOpen={!!pdf} onClose={() => setPdf(null)} viewerPathPrefix="student/resources" />
    </div>
  );
}
