import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Award, ChevronLeft, ChevronRight, Cpu, FolderOpen, Hammer, ImageIcon, Send, Users, Wrench } from 'lucide-react';
import { api } from '../../../lib/api';
import { useAuth } from '../../../providers/AuthProvider';
import { useFormat } from '../../../app/format';
import { readApiError } from '../../../app/apiError';
import { Badge, Button, Dialog, EmptyState, PageHeader, Panel, PanelTitle, SearchInput, StatTile, type BadgeTone } from '../../../ui';

type Status = 'in_progress' | 'submitted' | 'completed';
interface Project {
  _id: string;
  title: string;
  titleAr?: string | null;
  description?: string | null;
  descriptionAr?: string | null;
  studentId: { _id: string; name: string } | string;
  groupId?: { _id: string; name: string } | null;
  courseId?: { _id: string; title: string } | null;
  images: { cloudinaryUrl: string | null; order: number }[];
  components?: string[];
  technologies?: string[];
  status: Status;
  grade?: number | null;
  feedback?: string | null;
  createdBy?: { _id: string; name: string } | null;
  createdAt: string;
}

const TONE: Record<Status, BadgeTone> = { in_progress: 'warning', submitted: 'info', completed: 'success' };
const ownerOf = (p: Project) => (typeof p.studentId === 'object' ? p.studentId : null);

function useText() {
  const { i18n } = useTranslation();
  const ar = i18n.language === 'ar';
  return { title: (p: Project) => (ar && p.titleAr) || p.title, desc: (p: Project) => (ar && p.descriptionAr) || p.description || '' };
}

/** Projects built in class: the student's own and their group-mates'. */
export default function ProjectsPage() {
  const { t } = useTranslation('dashboardStudent');
  const { user } = useAuth();
  const me = user?._id || user?.id;
  const text = useText();
  const q = useQuery({ queryKey: ['student', 'projects'], queryFn: async () => ((await api.get('/student/projects?limit=100')).data.data ?? []) as Project[], staleTime: 60_000 });
  const [mine, setMine] = useState<boolean | null>(null);
  const [search, setSearch] = useState('');
  const all = q.data ?? [];
  const s = search.trim().toLowerCase();
  const rows = all
    .filter((p) => mine === null || (ownerOf(p)?._id === me) === mine)
    .filter((p) => !s || text.title(p).toLowerCase().includes(s) || (ownerOf(p)?.name ?? '').toLowerCase().includes(s));

  return (
    <div className="space-y-5">
      <PageHeader title={t('pj.title')} description={t('pj.subtitle')} />
      <div className="grid grid-cols-3 gap-3">
        <StatTile icon={<FolderOpen />} tint="bg-tint-leaf" label={t('pj.all')} value={all.length} loading={q.isLoading} onClick={() => setMine(null)} active={mine === null} />
        <StatTile icon={<Hammer />} tint="bg-tint-straw" label={t('pj.mine')} value={all.filter((p) => ownerOf(p)?._id === me).length} loading={q.isLoading} onClick={() => setMine(mine === true ? null : true)} active={mine === true} />
        <StatTile icon={<Users />} tint="bg-tint-sage" label={t('pj.group')} value={all.filter((p) => ownerOf(p)?._id !== me).length} loading={q.isLoading} onClick={() => setMine(mine === false ? null : false)} active={mine === false} />
      </div>
      {all.length > 6 && <SearchInput value={search} onChange={setSearch} placeholder={t('pj.search')} />}
      {q.isError ? (
        <Panel><EmptyState icon={<FolderOpen />} title={t('pj.loadError')} action={<Button variant="secondary" onClick={() => void q.refetch()}>{t('courses.retry')}</Button>} /></Panel>
      ) : q.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-72 animate-pulse rounded-card bg-rail" />)}</div>
      ) : rows.length === 0 ? (
        <Panel><EmptyState icon={<FolderOpen />} title={t(all.length ? 'pj.noMatch' : 'pj.none')} description={all.length ? undefined : t('pj.noneHint')} /></Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((p) => {
            const cover = [...p.images].sort((a, b) => a.order - b.order)[0]?.cloudinaryUrl;
            return (
              <Link key={p._id} to={`/student/projects/${p._id}`} className="flex flex-col overflow-hidden rounded-card border border-line bg-paper shadow-card transition-colors hover:border-ink focus-visible:focus-ring">
                <div className="relative aspect-[16/10] bg-rail">
                  {cover ? <img src={cover} alt="" className="size-full object-cover" loading="lazy" /> : <span className="grid size-full place-items-center bg-ink"><Wrench className="size-9 text-glow" aria-hidden /></span>}
                  <span className="absolute start-3 top-3"><Badge tone={TONE[p.status]}>{t(`pj.status.${p.status}`)}</Badge></span>
                  {p.images.length > 1 && <span className="absolute bottom-3 end-3 inline-flex items-center gap-1 rounded-pill bg-ink/80 px-2 py-0.5 text-xs text-white"><ImageIcon className="size-3.5" aria-hidden />{p.images.length}</span>}
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-4">
                  <h2 className="line-clamp-2 font-semibold text-ink" dir="auto">{text.title(p)}</h2>
                  <p className="text-xs text-ink-4">{ownerOf(p)?._id === me ? t('pj.byYou') : t('pj.by', { name: ownerOf(p)?.name ?? '' })}{p.groupId ? ` · ${p.groupId.name}` : ''}</p>
                  {p.grade != null && <p className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-success"><Award className="size-4" aria-hidden />{t('pj.grade', { grade: p.grade })}</p>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** One project: photos, what it is made of, and the trainer's grade. */
export function ProjectPage() {
  const { projectId = '' } = useParams();
  const { t } = useTranslation('dashboardStudent');
  const f = useFormat();
  const text = useText();
  const { user } = useAuth();
  const q = useQuery({ queryKey: ['student', 'project', projectId], queryFn: async () => (await api.get(`/student/projects/${projectId}`)).data.data as Project });
  const [zoom, setZoom] = useState<number | null>(null);
  const back = { to: '/student/projects', label: t('pj.title') };

  if (q.isError) return <div className="space-y-5"><PageHeader back={back} title={t('pj.one')} /><Panel><EmptyState icon={<AlertCircle />} title={readApiError(q.error).status === 404 ? t('pj.notFound') : t('pj.loadError')} /></Panel></div>;
  const p = q.data;
  if (!p) return <div className="space-y-4"><div className="h-10 w-72 animate-pulse rounded-md bg-rail" /><div className="h-72 animate-pulse rounded-panel bg-rail" /></div>;

  const imgs = [...p.images].sort((a, b) => a.order - b.order).filter((i) => i.cloudinaryUrl);
  const owner = ownerOf(p);
  const chips = (list: string[] | undefined, icon: React.ReactNode, title: string) =>
    list?.length ? (
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ink-3">{icon}{title}</p>
        <div className="flex flex-wrap gap-1.5">{list.map((x) => <span key={x} className="rounded-pill bg-rail px-3 py-1 text-sm text-ink" dir="auto">{x}</span>)}</div>
      </div>
    ) : null;

  return (
    <div className="space-y-5">
      <PageHeader back={back} title={text.title(p)} description={[owner?._id === (user?._id || user?.id) ? t('pj.byYou') : t('pj.by', { name: owner?.name ?? '' }), p.groupId?.name, p.courseId?.title].filter(Boolean).join(' · ')} actions={<Badge tone={TONE[p.status]}>{t(`pj.status.${p.status}`)}</Badge>} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          {imgs.length > 0 ? (
            <Panel className="p-3 sm:p-3">
              <button type="button" onClick={() => setZoom(0)} className="block w-full overflow-hidden rounded-card focus-visible:focus-ring"><img src={imgs[0].cloudinaryUrl!} alt={text.title(p)} className="aspect-[16/10] w-full object-cover" /></button>
              {imgs.length > 1 && (
                <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {imgs.slice(1).map((im, i) => <button key={i} type="button" onClick={() => setZoom(i + 1)} aria-label={t('pj.photo', { n: i + 2 })} className="overflow-hidden rounded-input focus-visible:focus-ring"><img src={im.cloudinaryUrl!} alt="" className="aspect-square w-full object-cover" loading="lazy" /></button>)}
                </div>
              )}
            </Panel>
          ) : (
            <Panel><EmptyState icon={<ImageIcon />} title={t('pj.noPhotos')} /></Panel>
          )}
          {text.desc(p) && <Panel><PanelTitle title={t('pj.about')} /><p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-2" dir="auto">{text.desc(p)}</p></Panel>}
        </div>

        <div className="space-y-5">
          {p.grade != null && (
            <div className="rounded-panel bg-ink p-5 text-white">
              <p className="text-sm text-frost/70">{t('pj.gradeTitle')}</p>
              <p className="text-4xl font-bold tabular-nums text-glow">{p.grade}</p>
              {p.feedback && <p className="mt-3 whitespace-pre-line rounded-card bg-white/10 p-3 text-sm text-frost/90" dir="auto">{p.feedback}</p>}
            </div>
          )}
          <Panel>
            <div className="space-y-4">
              {chips(p.components, <Cpu className="size-3.5" aria-hidden />, t('pj.components'))}
              {chips(p.technologies, <Send className="size-3.5" aria-hidden />, t('pj.technologies'))}
              <p className="text-xs text-ink-4">{t('pj.created', { date: f.date(p.createdAt), name: p.createdBy?.name ?? '' })}</p>
            </div>
          </Panel>
        </div>
      </div>

      <Dialog open={zoom !== null} onClose={() => setZoom(null)} size="lg" title={text.title(p)} closeLabel={t('qz.done')}>
        {zoom !== null && imgs[zoom] && (
          <div className="relative">
            <img src={imgs[zoom].cloudinaryUrl!} alt="" className="max-h-[70vh] w-full rounded-input object-contain" />
            {imgs.length > 1 && (
              <div className="mt-3 flex items-center justify-between">
                <Button variant="ghost" size="sm" icon={<ChevronLeft className="rtl:rotate-180" />} disabled={zoom === 0} onClick={() => setZoom(zoom - 1)}>{t('qz.prev')}</Button>
                <span className="text-sm tabular-nums text-ink-3">{zoom + 1} / {imgs.length}</span>
                <Button variant="ghost" size="sm" disabled={zoom === imgs.length - 1} onClick={() => setZoom(zoom + 1)}>{t('qz.next')} <ChevronRight className="size-4 rtl:rotate-180" aria-hidden /></Button>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}
