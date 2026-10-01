import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Ban, CalendarCheck2, CheckCircle2, Clock, FilePenLine, Inbox, XCircle } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/utils';
import { useFormat } from '../../../app/format';
import { readApiError } from '../../../app/apiError';
import { Badge, Button, ConfirmDialog, DataTable, Dialog, EmptyState, Field, PageHeader, Panel, RowMenu, SearchInput, StatTile, TextArea, type BadgeTone, type Column } from '../../../ui';
import { endOf, startOf, studentOf, useSessionMutations, useSessionRequests, type SessionRequest } from './api';

type Status = SessionRequest['status'];
const SESSION_TONE: Record<Status, BadgeTone> = { pending: 'warning', approved: 'info', completed: 'success', declined: 'danger', canceled: 'neutral', no_show: 'danger' };

/** Reception: private sessions students ask for — approve or decline, then report on them. */
export default function SessionRequestsPage() {
  const { t } = useTranslation('dashboardReception');
  const f = useFormat();
  const toast = useToast();
  const navigate = useNavigate();
  const requests = useSessionRequests();
  const m = useSessionMutations();
  const [status, setStatus] = useState<'' | Status>('pending');
  const [search, setSearch] = useState('');
  const [approving, setApproving] = useState<SessionRequest | null>(null);
  const [declining, setDeclining] = useState<SessionRequest | null>(null);
  const lastApproving = useRef<SessionRequest | null>(null);
  if (approving) lastApproving.current = approving;
  const [reason, setReason] = useState('');

  const all = requests.data ?? [];
  const count = (s: Status) => all.filter((r) => r.status === s).length;
  const rows = all
    .filter((r) => !status || r.status === status)
    .filter((r) => {
      const q = search.trim().toLowerCase();
      const s = studentOf(r);
      return !q || s?.name.toLowerCase().includes(q) || s?.email.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q);
    })
    .sort((a, b) => +startOf(b) - +startOf(a));
  const fail = (err: unknown) => toast.error(t('enrollments.errorTitle'), readApiError(err).message);

  const columns: Column<SessionRequest>[] = useMemo(
    () => [
      {
        key: 'student',
        header: t('sessions.col.student'),
        cell: (r) => {
          const s = studentOf(r);
          return (
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">{s?.name ?? t('enrollments.unknownStudent')}</p>
              <p className="truncate text-xs text-ink-4" dir="ltr">
                {s?.email}
              </p>
            </div>
          );
        },
      },
      {
        key: 'when',
        header: t('sessions.col.when'),
        cell: (r) => (
          <div className="tabular-nums">
            <p className="text-ink">{f.custom(startOf(r), { weekday: 'short', day: 'numeric', month: 'short' })}</p>
            <p className="text-xs text-ink-4">
              {f.time(startOf(r))} – {f.time(endOf(r))}
            </p>
          </div>
        ),
      },
      { key: 'hours', header: t('sessions.col.hours'), hideOnMobile: true, cell: (r) => <span className="tabular-nums">{t('sessions.hours', { count: r.durationHours })}</span> },
      {
        key: 'note',
        header: t('sessions.col.note'),
        hideOnMobile: true,
        cell: (r) => (
          <div className="max-w-64">
            {r.description ? <p className="line-clamp-2 text-ink-2">{r.description}</p> : <span className="text-ink-4">—</span>}
            {r.declineReason && <p className="mt-1 line-clamp-1 text-xs text-danger">{t('sessions.declinedBecause', { reason: r.declineReason })}</p>}
          </div>
        ),
      },
      { key: 'status', header: t('sessions.col.status'), cell: (r) => <Badge tone={SESSION_TONE[r.status]}>{t(`sessions.status.${r.status}`)}</Badge> },
      {
        key: 'actions',
        header: <span className="sr-only">{t('sessions.col.actions')}</span>,
        align: 'end',
        cell: (r) =>
          r.status === 'pending' ? (
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => { setReason(''); setDeclining(r); }}>
                {t('sessions.decline')}
              </Button>
              <Button size="sm" onClick={() => setApproving(r)}>
                {t('sessions.approve')}
              </Button>
            </div>
          ) : (
            <RowMenu
              label={t('sessions.actionsFor', { name: studentOf(r)?.name ?? '' })}
              actions={[{ label: t('sessions.writeReport'), icon: <FilePenLine />, onClick: () => navigate(`/reception/session-reports?write=${r._id}`), hidden: r.status !== 'approved' }]}
            />
          ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, f],
  );

  const tile = (s: '' | Status) => ({ onClick: () => setStatus(s), active: status === s });
  const shownApprove = approving ?? lastApproving.current;

  return (
    <div className="space-y-5">
      <PageHeader title={t('sessions.requestsTitle')} description={t('sessions.requestsSubtitle')} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatTile icon={<Clock />} tint="bg-tint-straw" label={t('sessions.status.pending')} value={count('pending')} loading={requests.isLoading} {...tile('pending')} />
        <StatTile icon={<CalendarCheck2 />} tint="bg-tint-leaf" label={t('sessions.status.approved')} value={count('approved')} loading={requests.isLoading} {...tile('approved')} />
        <StatTile icon={<CheckCircle2 />} tint="bg-tint-sage" label={t('sessions.status.completed')} value={count('completed')} loading={requests.isLoading} {...tile('completed')} />
        <StatTile icon={<XCircle />} tint="bg-tint-sand" label={t('sessions.status.declined')} value={count('declined')} loading={requests.isLoading} {...tile('declined')} />
        <StatTile icon={<Inbox />} tint="bg-tint-khaki" label={t('sessions.all')} value={all.length} loading={requests.isLoading} {...tile('')} />
      </div>

      <Panel className="p-0 sm:p-0">
        <div className="border-b border-line p-4">
          <SearchInput value={search} onChange={setSearch} placeholder={t('sessions.search')} />
        </div>
        {requests.isError ? (
          <EmptyState icon={<Inbox />} title={t('sessions.loadError')} action={<Button variant="secondary" onClick={() => void requests.refetch()}>{t('leads.retry')}</Button>} />
        ) : (
          <div className={cn('transition-opacity', requests.isFetching && !requests.isLoading && 'opacity-60')}>
            <DataTable
              label={t('sessions.requestsTitle')}
              columns={columns}
              rows={rows}
              rowKey={(r) => r._id}
              loading={requests.isLoading}
              empty={<EmptyState icon={status === 'pending' ? <CheckCircle2 /> : <Inbox />} title={status === 'pending' && !search ? t('sessions.noPending') : t('sessions.none')} />}
            />
          </div>
        )}
      </Panel>

      <ConfirmDialog
        open={!!approving}
        onClose={() => setApproving(null)}
        loading={m.approve.isPending}
        title={t('sessions.approveTitle')}
        message={shownApprove ? t('sessions.approveText', { name: studentOf(shownApprove)?.name ?? '', date: f.custom(startOf(shownApprove), { weekday: 'long', day: 'numeric', month: 'long' }), time: f.time(startOf(shownApprove)) }) : ''}
        confirmLabel={t('sessions.approve')}
        cancelLabel={t('enrollments.cancel')}
        onConfirm={() =>
          void m.approve
            .mutateAsync(approving!._id)
            .then(() => toast.success(t('sessions.toast.approved')))
            .catch(fail)
            .finally(() => setApproving(null))
        }
      />
      <Dialog
        open={!!declining}
        onClose={() => setDeclining(null)}
        size="sm"
        title={t('sessions.declineTitle')}
        description={declining ? studentOf(declining)?.name : undefined}
        closeLabel={t('enrollments.cancel')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeclining(null)}>
              {t('enrollments.cancel')}
            </Button>
            <Button
              variant="danger"
              icon={<Ban />}
              loading={m.decline.isPending}
              onClick={() =>
                void m.decline
                  .mutateAsync({ id: declining!._id, reason: reason.trim() || undefined })
                  .then(() => { toast.success(t('sessions.toast.declined')); setDeclining(null); })
                  .catch(fail)
              }
            >
              {t('sessions.decline')}
            </Button>
          </>
        }
      >
        <Field label={t('sessions.reason')} hint={t('sessions.reasonHint')}>
          {(p) => <TextArea {...p} value={reason} onChange={(e) => setReason(e.target.value)} />}
        </Field>
      </Dialog>
    </div>
  );
}
