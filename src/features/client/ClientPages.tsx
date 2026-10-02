import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CalendarClock, CheckCircle2, ChevronRight, CircleDot, FolderOpen, Hourglass, Inbox, Plus, Users } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { useFormat } from '../../app/format';
import { readApiError } from '../../app/apiError';
import MediaGrid from '../../components/media/MediaGrid';
import { Badge, Button, EmptyState, PageHeader, Panel, PanelTitle, SelectInput, StatTile, WelcomeBanner } from '../../ui';
import { NewRequestDialog } from './NewRequestDialog';
import { projectIdOf, REQUEST_TONE, useClientMedia, useClientProjects, useClientRequest, useClientRequests, type ClientRequest, type TaskStatus } from './api';

/** A list of requests with status, project and date; each opens its own page. */
function RequestList({ items, showProject }: { items: ClientRequest[]; showProject: boolean }) {
  const { t } = useTranslation('dashboardCommon');
  const f = useFormat();
  return (
    <ul className="divide-y divide-line">
      {items.map((r) => (
        <li key={r._id}>
          <Link to={`/client/tasks/${r._id}`} className="flex items-center gap-3 py-3 hover:bg-rail focus-visible:bg-rail focus-visible:outline-none">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-ink" dir="auto">{r.title}</span>
              <span className="block truncate text-xs text-ink-4">{showProject && typeof r.projectId === 'object' ? <><span dir="auto">{r.projectId.name}</span> · </> : null}{f.date(r.createdAt)}</span>
            </span>
            {r.clientUrgency && r.clientUrgency !== 'whenever' && <Badge tone={r.clientUrgency === 'urgent' ? 'danger' : 'warning'}>{t(`cl.urg.${r.clientUrgency}`)}</Badge>}
            <Badge tone={REQUEST_TONE[r.status]}>{t(`cl.status.${r.status}`)}</Badge>
            <ChevronRight className="size-4 shrink-0 text-ink-4 rtl:rotate-180" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** The client's home: their projects with progress, and their latest requests. */
export default function ClientOverviewPage() {
  const { t } = useTranslation('dashboardCommon');
  const { user } = useAuth();
  const projects = useClientProjects();
  const requests = useClientRequests();
  const [asking, setAsking] = useState<{ projectId?: string } | null>(null);
  const all = requests.data ?? [];
  const counts = useMemo(() => {
    const m = new Map<string, { total: number; done: number; open: number }>();
    for (const r of all) {
      const c = m.get(projectIdOf(r)) ?? { total: 0, done: 0, open: 0 };
      c.total += 1;
      if (r.status === 'done') c.done += 1;
      else if (r.status !== 'declined') c.open += 1;
      m.set(projectIdOf(r), c);
    }
    return m;
  }, [all]);
  const by = (s: TaskStatus) => all.filter((r) => r.status === s).length;
  const hasProjects = (projects.data?.length ?? 0) > 0;

  return (
    <div className="space-y-5">
      <WelcomeBanner greeting={t('cl.hello')} name={user?.name ?? ''} note={t('cl.note')} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={<FolderOpen />} tint="bg-tint-leaf" label={t('cl.projects')} value={projects.data?.length} loading={projects.isLoading} />
        <StatTile icon={<Hourglass />} tint="bg-tint-straw" label={t('cl.status.pending_review')} value={by('pending_review')} loading={requests.isLoading} to="/client/tasks?status=pending_review" />
        <StatTile icon={<CircleDot />} tint="bg-tint-sage" label={t('cl.status.in_progress')} value={by('in_progress') + by('todo')} loading={requests.isLoading} to="/client/tasks?status=in_progress" />
        <StatTile icon={<CheckCircle2 />} tint="bg-tint-sand" label={t('cl.status.done')} value={by('done')} loading={requests.isLoading} to="/client/tasks?status=done" />
      </div>
      {projects.isError ? <Panel><EmptyState icon={<AlertCircle />} title={readApiError(projects.error).message} /></Panel> : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Panel>
            <PanelTitle title={t('cl.myProjects')} />
            {projects.isLoading ? <div className="h-28 animate-pulse rounded-card bg-rail" /> : !hasProjects ? <EmptyState icon={<FolderOpen />} title={t('cl.noProjects')} description={t('cl.noProjectsHint')} /> : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {projects.data!.map((p) => {
                  const c = counts.get(p._id) ?? { total: 0, done: 0, open: 0 };
                  const pct = c.total ? Math.round((c.done / c.total) * 100) : 0;
                  return (
                    <li key={p._id} className="flex flex-col rounded-card border border-line p-4">
                      <Link to={`/client/projects/${p._id}`} className="truncate font-semibold text-ink hover:underline" dir="auto">{p.name}</Link>
                      <p className="mt-1 text-xs text-ink-4">{t('cl.counts', { open: c.open, done: c.done })}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-rail"><span className="block h-full rounded-full bg-success" style={{ width: `${pct}%` }} /></span>
                        <span className="text-xs tabular-nums text-ink-3" dir="ltr">{pct}%</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <Button size="sm" variant="ghost" icon={<Plus />} onClick={() => setAsking({ projectId: p._id })}>{t('cl.newShort')}</Button>
                        <Link to={`/client/projects/${p._id}`} className="text-sm font-medium text-ink underline-offset-2 hover:underline">{t('cl.open')}</Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
          <Panel>
            <PanelTitle title={t('cl.latest')} link={{ to: '/client/tasks', label: t('cl.allRequests') }} actions={hasProjects ? <Button size="sm" icon={<Plus />} onClick={() => setAsking({})}>{t('cl.newShort')}</Button> : undefined} />
            {requests.isLoading ? <div className="h-28 animate-pulse rounded-card bg-rail" /> : all.length === 0 ? <p className="py-4 text-center text-sm text-ink-4">{t('cl.noRequests')}</p> : <RequestList items={[...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6)} showProject />}
          </Panel>
        </div>
      )}
      <NewRequestDialog open={!!asking} onClose={() => setAsking(null)} projectId={asking?.projectId} />
    </div>
  );
}

/** Every request the client has sent, by status and project. */
export function ClientRequestsPage() {
  const { t } = useTranslation('dashboardCommon');
  const requests = useClientRequests();
  const projects = useClientProjects();
  const [params] = useSearchParams();
  const [status, setStatus] = useState(params.get('status') ?? '');
  const [project, setProject] = useState('');
  const [asking, setAsking] = useState(false);
  const rows = (requests.data ?? [])
    .filter((r) => !status || r.status === status || (status === 'in_progress' && r.status === 'todo'))
    .filter((r) => !project || projectIdOf(r) === project)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <div className="space-y-5">
      <PageHeader title={t('cl.requestsTitle')} description={t('cl.requestsText')} actions={(projects.data?.length ?? 0) > 0 ? <Button icon={<Plus />} onClick={() => setAsking(true)}>{t('cl.new')}</Button> : undefined} />
      <Panel>
        <div className="mb-3 flex flex-wrap gap-3">
          <SelectInput aria-label={t('cl.statusLabel')} value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto min-w-44">
            <option value="">{t('cl.allStatuses')}</option>
            {(['pending_review', 'in_progress', 'done', 'declined'] as const).map((s) => <option key={s} value={s}>{t(`cl.status.${s}`)}</option>)}
          </SelectInput>
          {(projects.data?.length ?? 0) > 1 && (
            <SelectInput aria-label={t('cl.project')} value={project} onChange={(e) => setProject(e.target.value)} className="w-auto min-w-44"><option value="">{t('cl.allProjects')}</option>{projects.data!.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}</SelectInput>
          )}
        </div>
        {requests.isError ? <EmptyState icon={<Inbox />} title={readApiError(requests.error).message} /> : requests.isLoading ? <div className="h-28 animate-pulse rounded-card bg-rail" /> : rows.length === 0 ? <EmptyState icon={<Inbox />} title={t('cl.noRequests')} /> : <RequestList items={rows} showProject={(projects.data?.length ?? 0) > 1} />}
      </Panel>
      <NewRequestDialog open={asking} onClose={() => setAsking(false)} />
    </div>
  );
}

/** One project of the client: its requests and who works on it. */
export function ClientProjectPage() {
  const { id = '' } = useParams();
  const { t } = useTranslation('dashboardCommon');
  const projects = useClientProjects();
  const requests = useClientRequests();
  const [asking, setAsking] = useState(false);
  const p = projects.data?.find((x) => x._id === id);
  const mine = (requests.data ?? []).filter((r) => projectIdOf(r) === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const back = { to: '/client/dashboard', label: t('cl.home') };
  if (projects.isLoading) return <div className="space-y-4"><div className="h-10 w-72 animate-pulse rounded-md bg-rail" /><div className="h-60 animate-pulse rounded-panel bg-rail" /></div>;
  if (!p) return <div className="space-y-5"><PageHeader back={back} title={t('cl.project')} /><Panel><EmptyState icon={<AlertCircle />} title={t('cl.notFound')} /></Panel></div>;
  return (
    <div className="space-y-5">
      <PageHeader back={back} title={p.name} description={p.description} actions={<Button icon={<Plus />} onClick={() => setAsking(true)}>{t('cl.new')}</Button>} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel>
          <PanelTitle title={t('cl.requestsTitle')} />
          {requests.isLoading ? <div className="h-28 animate-pulse rounded-card bg-rail" /> : mine.length === 0 ? <EmptyState icon={<Inbox />} title={t('cl.noRequestsHere')} action={<Button variant="secondary" icon={<Plus />} onClick={() => setAsking(true)}>{t('cl.new')}</Button>} /> : <RequestList items={mine} showProject={false} />}
        </Panel>
        {p.assignedEngineers?.length > 0 && (
          <Panel>
            <PanelTitle title={t('cl.team')} />
            <ul className="space-y-2">{p.assignedEngineers.map((e) => <li key={e._id} className="flex items-center gap-2 text-sm text-ink"><Users className="size-4 text-ink-3" aria-hidden /><span dir="auto">{e.name}</span></li>)}</ul>
          </Panel>
        )}
      </div>
      <NewRequestDialog open={asking} onClose={() => setAsking(false)} projectId={id} />
    </div>
  );
}

/** One request: what was asked, what the team decided, and the attachments. */
export function ClientRequestPage() {
  const { id = '' } = useParams();
  const { t, i18n } = useTranslation('dashboardCommon');
  const f = useFormat();
  const q = useClientRequest(id);
  const media = useClientMedia(id);
  const r = q.data;
  const back = { to: '/client/tasks', label: t('cl.requestsTitle') };
  if (q.isError) return <div className="space-y-5"><PageHeader back={back} title={t('cl.one')} /><Panel><EmptyState icon={<AlertCircle />} title={readApiError(q.error).message} /></Panel></div>;
  if (!r) return <div className="space-y-4"><div className="h-10 w-72 animate-pulse rounded-md bg-rail" /><div className="h-48 animate-pulse rounded-panel bg-rail" /></div>;
  const team = r.assignedTo?.map((a) => a.name).join(i18n.language === 'ar' ? '، ' : ', ') ?? '';
  return (
    <div className="space-y-5">
      <PageHeader back={back} title={r.title} description={[typeof r.projectId === 'object' ? r.projectId.name : '', t('cl.sentOn', { date: f.date(r.createdAt) })].filter(Boolean).join(' · ')}
        actions={<>{r.clientUrgency && <Badge tone={r.clientUrgency === 'urgent' ? 'danger' : r.clientUrgency === 'soon' ? 'warning' : 'neutral'}>{t(`cl.urg.${r.clientUrgency}`)}</Badge>}<Badge tone={REQUEST_TONE[r.status]}>{t(`cl.status.${r.status}`)}</Badge></>} />
      {r.status === 'declined' && <div role="status" className="rounded-card bg-danger-soft px-4 py-3 text-sm text-danger"><p className="font-medium">{t('cl.declined')}</p>{r.rejectedReason && <p className="mt-0.5" dir="auto">{r.rejectedReason}</p>}</div>}
      {r.status === 'pending_review' && <p className="rounded-card bg-warning-soft px-4 py-3 text-sm text-ink-2">{t('cl.pendingNote')}</p>}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          {r.description && <Panel><PanelTitle title={t('cl.details')} /><p className="whitespace-pre-wrap text-[15px] text-ink-2" dir="auto">{r.description}</p></Panel>}
          <Panel><PanelTitle title={t('cl.attachments')} />{media.isLoading ? <div className="h-24 animate-pulse rounded-card bg-rail" /> : <MediaGrid items={media.data ?? []} />}</Panel>
        </div>
        {r.status !== 'pending_review' && r.status !== 'declined' && (r.dueDate || team) && (
          <Panel>
            <PanelTitle title={t('cl.byTeam')} />
            <dl className="space-y-3 text-sm">
              {r.dueDate && <div className="flex items-center justify-between gap-3"><dt className="inline-flex items-center gap-1.5 text-ink-3"><CalendarClock className="size-4" aria-hidden />{t('cl.target')}</dt><dd className="text-ink">{f.date(r.dueDate)}</dd></div>}
              {team && <div><dt className="text-ink-3">{t('cl.workingOn')}</dt><dd className="mt-0.5 text-ink" dir="auto">{team}</dd></div>}
            </dl>
          </Panel>
        )}
      </div>
    </div>
  );
}
