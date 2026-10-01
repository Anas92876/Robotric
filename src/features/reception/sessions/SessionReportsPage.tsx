import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ClipboardList, Eye, FileDown, FilePenLine, UserX } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import SessionReportModal from '../../../components/reception/SessionReportModal';
import { cn } from '../../../lib/utils';
import { useFormat } from '../../../app/format';
import { readApiError } from '../../../app/apiError';
import { Badge, Button, DataTable, Dialog, EmptyState, PageHeader, Panel, SearchInput, type Column } from '../../../ui';
import { endOf, startOf, studentOf, useSessionMutations, useSessionReports, useSessionRequests, type SessionReport, type SessionRequest } from './api';

/** Reception: write the report of each approved session (deducts the hours) and read past reports. */
export default function SessionReportsPage() {
  const { t } = useTranslation('dashboardReception');
  const f = useFormat();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const requests = useSessionRequests();
  const reports = useSessionReports();
  const m = useSessionMutations();
  const [tab, setTab] = useState<'todo' | 'done'>('todo');
  const [search, setSearch] = useState('');
  const [writing, setWriting] = useState<SessionRequest | null>(null);
  const [viewing, setViewing] = useState<SessionReport | null>(null);
  const lastViewing = useRef<SessionReport | null>(null);
  if (viewing) lastViewing.current = viewing;
  const shownReport = viewing ?? lastViewing.current;

  const q = search.trim().toLowerCase();
  const todo = (requests.data ?? [])
    .filter((r) => r.status === 'approved')
    .filter((r) => !q || studentOf(r)?.name.toLowerCase().includes(q) || studentOf(r)?.email.toLowerCase().includes(q))
    .sort((a, b) => +startOf(a) - +startOf(b));
  const done = (reports.data ?? [])
    .filter((r) => !q || r.sessionRequest?.userId?.name.toLowerCase().includes(q) || r.notes.toLowerCase().includes(q))
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  // "Write report" from the Session Requests page lands here with ?write=<sessionId>
  useEffect(() => {
    const id = params.get('write');
    if (!id || !requests.data) return;
    const session = requests.data.find((r) => r._id === id);
    if (session) setWriting(session);
    setParams({}, { replace: true });
  }, [params, requests.data, setParams]);

  const todoColumns: Column<SessionRequest>[] = useMemo(
    () => [
      { key: 'student', header: t('sessions.col.student'), cell: (r) => <span className="font-medium text-ink">{studentOf(r)?.name ?? t('enrollments.unknownStudent')}</span> },
      {
        key: 'when',
        header: t('sessions.col.when'),
        cell: (r) => (
          <span className={cn('tabular-nums', endOf(r) < new Date() ? 'text-ink' : 'text-ink-3')}>
            {f.custom(startOf(r), { weekday: 'short', day: 'numeric', month: 'short' })} · {f.time(startOf(r))}–{f.time(endOf(r))}
          </span>
        ),
      },
      { key: 'hours', header: t('sessions.col.hours'), cell: (r) => <span className="tabular-nums">{t('sessions.hours', { count: r.durationHours })}</span> },
      {
        key: 'action',
        header: <span className="sr-only">{t('sessions.col.actions')}</span>,
        align: 'end',
        cell: (r) => (
          <Button size="sm" icon={<FilePenLine />} onClick={() => setWriting(r)}>
            {t('sessions.writeReport')}
          </Button>
        ),
      },
    ],
    [t, f],
  );

  const doneColumns: Column<SessionReport>[] = useMemo(
    () => [
      { key: 'student', header: t('sessions.col.student'), cell: (r) => <span className="font-medium text-ink">{r.sessionRequest?.userId?.name ?? t('enrollments.unknownStudent')}</span> },
      { key: 'session', header: t('sessions.col.session'), cell: (r) => (r.sessionRequest ? <span className="tabular-nums">{f.date(r.sessionRequest.date)} · {r.sessionRequest.startTime}</span> : '—') },
      {
        key: 'attendance',
        header: t('sessions.col.attendance'),
        cell: (r) => (r.attendance ? <Badge tone="success" icon={<CheckCircle2 />}>{t('sessions.attended')}</Badge> : <Badge tone="danger" icon={<UserX />}>{t('sessions.absent')}</Badge>),
      },
      { key: 'by', header: t('sessions.col.writtenBy'), hideOnMobile: true, cell: (r) => <span className="text-ink-2">{r.createdBy?.name ?? '—'} · {f.date(r.createdAt)}</span> },
      {
        key: 'view',
        header: <span className="sr-only">{t('sessions.col.actions')}</span>,
        align: 'end',
        cell: (r) => (
          <Button size="sm" variant="secondary" icon={<Eye />} onClick={() => setViewing(r)}>
            {t('sessions.view')}
          </Button>
        ),
      },
    ],
    [t, f],
  );

  const loading = tab === 'todo' ? requests.isLoading : reports.isLoading;

  return (
    <div className="space-y-5">
      <PageHeader title={t('sessions.reportsTitle')} description={t('sessions.reportsSubtitle')} />

      <div role="tablist" className="flex w-fit items-center gap-0.5 rounded-pill border border-line bg-rail p-1">
        {(['todo', 'done'] as const).map((k) => (
          <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)} className={cn('h-9 rounded-pill px-4 text-sm font-medium transition-colors focus-visible:focus-ring', tab === k ? 'bg-ink text-white' : 'text-ink-3 hover:text-ink')}>
            {k === 'todo' ? t('sessions.tabTodo', { count: (requests.data ?? []).filter((r) => r.status === 'approved').length }) : t('sessions.tabDone', { count: (reports.data ?? []).length })}
          </button>
        ))}
      </div>

      <Panel className="p-0 sm:p-0">
        <div className="border-b border-line p-4">
          <SearchInput value={search} onChange={setSearch} placeholder={t('sessions.searchReports')} />
        </div>
        {tab === 'todo' ? (
          <DataTable label={t('sessions.reportsTitle')} columns={todoColumns} rows={todo} rowKey={(r) => r._id} loading={loading} empty={<EmptyState icon={<CheckCircle2 />} title={t('sessions.nothingToReport')} />} />
        ) : (
          <DataTable label={t('sessions.reportsTitle')} columns={doneColumns} rows={done} rowKey={(r) => r._id} loading={loading} empty={<EmptyState icon={<ClipboardList />} title={t('sessions.noReports')} />} />
        )}
      </Panel>

      {writing && (
        <SessionReportModal
          isOpen
          session={writing}
          isSubmitting={m.report.isPending}
          onClose={() => setWriting(null)}
          onSubmit={async (data) => {
            try {
              await m.report.mutateAsync({ id: writing._id, data });
              toast.success(t('sessions.toast.reported'));
              setWriting(null);
            } catch (err) {
              toast.error(t('enrollments.errorTitle'), readApiError(err).message);
              throw err;
            }
          }}
        />
      )}

      <Dialog
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={t('sessions.reportOf', { name: shownReport?.sessionRequest?.userId?.name ?? '' })}
        description={shownReport?.sessionRequest ? `${f.date(shownReport.sessionRequest.date)} · ${shownReport.sessionRequest.startTime} · ${t('sessions.hours', { count: shownReport.sessionRequest.durationHours })}` : undefined}
        closeLabel={t('enrollments.cancel')}
      >
        {shownReport && (
          <div className="space-y-4">
            {shownReport.attendance ? <Badge tone="success" icon={<CheckCircle2 />}>{t('sessions.attended')}</Badge> : <Badge tone="danger" icon={<UserX />}>{t('sessions.absent')}</Badge>}
            <p className="whitespace-pre-wrap rounded-card border border-line p-4 text-sm leading-relaxed text-ink-2">{shownReport.notes || '—'}</p>
            {shownReport.pdfUrl && (
              <a href={shownReport.pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-pill border border-line-strong px-4 text-sm font-medium text-ink hover:border-ink">
                <FileDown className="size-4" aria-hidden />
                {t('sessions.openPdf')}
              </a>
            )}
            <p className="text-xs text-ink-4">{t('sessions.writtenBy', { name: shownReport.createdBy?.name ?? '—', date: f.date(shownReport.createdAt) })}</p>
          </div>
        )}
      </Dialog>
    </div>
  );
}
