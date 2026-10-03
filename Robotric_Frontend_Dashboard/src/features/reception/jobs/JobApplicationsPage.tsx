import { useEffect, useMemo, useRef, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Briefcase, CalendarClock, CheckCircle2, Eye, FileDown, Inbox, Link2, MessageCircle, Phone, Search, Trash2, UserCheck, XCircle } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { deleteJobApplication, downloadJobApplicationCv, getAllJobApplications, updateJobApplication, type JobApplication } from '../../../services/job.application.service';
import { cn } from '../../../lib/utils';
import { useFormat } from '../../../app/format';
import { readApiError } from '../../../app/apiError';
import { Badge, Button, ConfirmDialog, DataTable, Dialog, EmptyState, Field, PageHeader, Pagination, Panel, RowMenu, SearchInput, SelectInput, StatTile, TextArea, type BadgeTone, type Column } from '../../../ui';

type Status = JobApplication['status'];
interface Filters {
  search: string;
  status: '' | Status;
  position: string;
  page: number;
}
const PAGE_SIZE = 20;
const ROOT = ['reception', 'job-applications'] as const;
const STATUSES: Status[] = ['new', 'reviewed', 'interview', 'accepted', 'rejected'];
const TONE: Record<Status, BadgeTone> = { new: 'info', reviewed: 'neutral', interview: 'warning', accepted: 'success', rejected: 'danger' };
const whatsapp = (phone: string) => `https://wa.me/${phone.replace(/[^0-9]/g, '').replace(/^0/, '963')}`;

/** Reception: applications sent from the Join Us page — review, interview, accept or reject. */
export default function JobApplicationsPage() {
  const { t } = useTranslation('dashboardReception');
  const f = useFormat();
  const toast = useToast();
  const qc = useQueryClient();
  const [filters, setFilters] = useState<Filters>({ search: '', status: '', position: '', page: 1 });
  const patch = (p: Partial<Filters>) => setFilters((x) => ({ ...x, ...p, page: p.page ?? 1 }));

  const list = useQuery({
    queryKey: [...ROOT, filters],
    queryFn: () => getAllJobApplications({ page: filters.page, limit: PAGE_SIZE, search: filters.search || undefined, status: filters.status || undefined, position: filters.position || undefined }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
  const refresh = () => void qc.invalidateQueries({ queryKey: ROOT });
  const update = useMutation({ mutationFn: ({ id, body }: { id: string; body: { status?: string; notes?: string } }) => updateJobApplication(id, body), onSuccess: refresh });
  const remove = useMutation({ mutationFn: (id: string) => deleteJobApplication(id), onSuccess: refresh });

  const [open, setOpen] = useState<JobApplication | null>(null);
  const lastOpen = useRef<JobApplication | null>(null);
  if (open) lastOpen.current = open;
  const shown = open ?? lastOpen.current;
  const [notes, setNotes] = useState('');
  useEffect(() => setNotes(open?.notes ?? ''), [open?._id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [deleting, setDeleting] = useState<JobApplication | null>(null);
  const lastDeleting = useRef<JobApplication | null>(null);
  if (deleting) lastDeleting.current = deleting;
  const fail = (err: unknown) => toast.error(t('enrollments.errorTitle'), readApiError(err).message);

  const setStatus = async (a: JobApplication, status: Status) => {
    try {
      await update.mutateAsync({ id: a._id, body: { status } });
      if (open?._id === a._id) setOpen({ ...open, status });
      toast.success(t('jobs.toast.status', { status: t(`jobs.status.${status}`) }));
    } catch (err) {
      fail(err);
    }
  };
  const saveNotes = async () => {
    if (!open) return;
    try {
      await update.mutateAsync({ id: open._id, body: { notes } });
      setOpen({ ...open, notes });
      toast.success(t('jobs.toast.notes'));
    } catch (err) {
      fail(err);
    }
  };
  const downloadCv = async (a: JobApplication) => {
    try {
      const { signedUrl, filename } = await downloadJobApplicationCv(a._id);
      const link = Object.assign(document.createElement('a'), { href: signedUrl, download: filename, target: '_blank', rel: 'noopener noreferrer' });
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      fail(err);
    }
  };

  const columns: Column<JobApplication>[] = useMemo(
    () => [
      {
        key: 'applicant',
        header: t('jobs.col.applicant'),
        cell: (a) => (
          <button type="button" onClick={() => setOpen(a)} className="flex items-center gap-3 rounded-input text-start focus-visible:focus-ring">
            <span className={cn('grid size-10 shrink-0 place-items-center rounded-full font-semibold', a.status === 'new' ? 'bg-ink text-white' : 'bg-tint-sage text-ink')}>{a.fullName.charAt(0)}</span>
            <span className="min-w-0">
              <span className={cn('block truncate text-ink', a.status === 'new' ? 'font-semibold' : 'font-medium')}>{a.fullName}</span>
              <span className="block truncate text-xs text-ink-4" dir="ltr">
                {a.phone}
              </span>
            </span>
          </button>
        ),
      },
      { key: 'position', header: t('jobs.col.position'), cell: (a) => <span className="inline-flex items-center gap-1.5 text-ink-2"><Briefcase className="size-3.5 text-ink-4" aria-hidden />{a.position}</span> },
      { key: 'experience', header: t('jobs.col.experience'), hideOnMobile: true, cell: (a) => (a.experienceLevel ? t(`jobs.experience.${a.experienceLevel}`) : '—') },
      { key: 'date', header: t('jobs.col.received'), hideOnMobile: true, cell: (a) => <span className="tabular-nums">{f.date(a.createdAt)}</span> },
      { key: 'status', header: t('jobs.col.status'), cell: (a) => <Badge tone={TONE[a.status]}>{t(`jobs.status.${a.status}`)}</Badge> },
      {
        key: 'actions',
        header: <span className="sr-only">{t('jobs.col.actions')}</span>,
        align: 'end',
        cell: (a) => (
          <RowMenu
            label={t('jobs.actionsFor', { name: a.fullName })}
            actions={[
              { label: t('jobs.menu.open'), icon: <Eye />, onClick: () => setOpen(a) },
              { label: t('jobs.menu.interview'), icon: <CalendarClock />, onClick: () => void setStatus(a, 'interview'), hidden: a.status === 'interview' },
              { label: t('jobs.menu.accept'), icon: <CheckCircle2 />, onClick: () => void setStatus(a, 'accepted'), hidden: a.status === 'accepted' },
              { label: t('jobs.menu.reject'), icon: <XCircle />, onClick: () => void setStatus(a, 'rejected'), hidden: a.status === 'rejected' },
              { label: t('jobs.menu.cv'), icon: <FileDown />, onClick: () => void downloadCv(a), hidden: !a.cvUrl },
              { label: t('jobs.menu.delete'), icon: <Trash2 />, tone: 'danger', onClick: () => setDeleting(a) },
            ]}
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, f],
  );

  const s = list.data?.stats;
  const tile = (status: Filters['status']) => ({ onClick: () => patch({ status }), active: filters.status === status && !filters.search && !filters.position });
  const filtered = !!(filters.search || filters.status || filters.position);

  return (
    <div className="space-y-5">
      <PageHeader title={t('jobs.title')} description={t('jobs.subtitle')} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile icon={<Inbox />} tint="bg-tint-leaf" label={t('jobs.stats.total')} value={s?.total} loading={list.isLoading} {...tile('')} />
        <StatTile icon={<Search />} tint="bg-tint-straw" label={t('jobs.status.new')} value={s?.new} loading={list.isLoading} {...tile('new')} />
        <StatTile icon={<Eye />} tint="bg-tint-sand" label={t('jobs.status.reviewed')} value={s?.reviewed} loading={list.isLoading} {...tile('reviewed')} />
        <StatTile icon={<CalendarClock />} tint="bg-tint-khaki" label={t('jobs.status.interview')} value={s?.interview} loading={list.isLoading} {...tile('interview')} />
        <StatTile icon={<UserCheck />} tint="bg-tint-sage" label={t('jobs.status.accepted')} value={s?.accepted} loading={list.isLoading} {...tile('accepted')} />
        <StatTile icon={<XCircle />} tint="bg-tint-fern" label={t('jobs.status.rejected')} value={s?.rejected} loading={list.isLoading} {...tile('rejected')} />
      </div>

      <Panel className="p-0 sm:p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <div className="w-full flex-1 sm:w-auto sm:min-w-56">
            <SearchInput value={filters.search} onChange={(search) => patch({ search })} placeholder={t('jobs.search')} />
          </div>
          <SelectInput aria-label={t('jobs.col.position')} value={filters.position} onChange={(e) => patch({ position: e.target.value })} className="w-full sm:w-auto sm:min-w-48">
            <option value="">{t('jobs.allPositions')}</option>
            {(list.data?.positions ?? []).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </SelectInput>
        </div>
        {list.isError ? (
          <EmptyState icon={<Inbox />} title={t('jobs.loadError')} action={<Button variant="secondary" onClick={() => void list.refetch()}>{t('leads.retry')}</Button>} />
        ) : (
          <div className={cn('transition-opacity', list.isFetching && !list.isLoading && 'opacity-60')}>
            <DataTable
              label={t('jobs.title')}
              columns={columns}
              rows={list.data?.data ?? []}
              rowKey={(a) => a._id}
              loading={list.isLoading}
              empty={<EmptyState icon={<Briefcase />} title={filtered ? t('jobs.noMatch') : t('jobs.empty')} description={filtered ? undefined : t('jobs.emptyHint')} />}
            />
          </div>
        )}
        <Pagination
          page={filters.page}
          pages={list.data?.pagination?.pages ?? 1}
          total={list.data?.pagination?.total ?? 0}
          pageSize={PAGE_SIZE}
          onPage={(page) => patch({ page })}
          summary={(from, to, total) => t('users.pageSummary', { from, to, total })}
          labels={{ previous: t('users.previous'), next: t('users.next') }}
        />
      </Panel>

      <Dialog
        open={!!open}
        onClose={() => setOpen(null)}
        size="lg"
        title={shown?.fullName ?? ''}
        description={shown ? t('jobs.appliedFor', { position: shown.position, date: f.date(shown.createdAt) }) : undefined}
        closeLabel={t('enrollments.cancel')}
        footer={
          shown && (
            <>
              <Button variant="ghost" icon={<Trash2 />} className="me-auto text-danger" onClick={() => { setDeleting(shown); setOpen(null); }}>
                {t('jobs.menu.delete')}
              </Button>
              <Button variant="secondary" onClick={() => void saveNotes()} loading={update.isPending} disabled={notes === (shown.notes ?? '')}>
                {t('jobs.saveNotes')}
              </Button>
            </>
          )
        }
      >
        {shown && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <a href={`tel:${shown.phone}`} className="inline-flex h-10 items-center gap-2 rounded-pill border border-line-strong px-4 text-sm font-medium text-ink hover:border-ink">
                <Phone className="size-4" aria-hidden />
                <span dir="ltr">{shown.phone}</span>
              </a>
              <a href={whatsapp(shown.phone)} target="_blank" rel="noopener" className="inline-flex h-10 items-center gap-2 rounded-pill bg-success px-4 text-sm font-medium text-white hover:brightness-95">
                <MessageCircle className="size-4" aria-hidden />
                WhatsApp
              </a>
              {shown.cvUrl && (
                <Button variant="secondary" icon={<FileDown />} onClick={() => void downloadCv(shown)}>
                  {t('jobs.menu.cv')}
                </Button>
              )}
              {shown.portfolioLink && (
                <a href={shown.portfolioLink} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-pill border border-line-strong px-4 text-sm font-medium text-ink hover:border-ink">
                  <Link2 className="size-4" aria-hidden />
                  {t('jobs.portfolio')}
                </a>
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-ink">{t('jobs.col.status')}</p>
              <div role="group" aria-label={t('jobs.col.status')} className="flex flex-wrap gap-1.5">
                {STATUSES.map((st) => (
                  <button
                    key={st}
                    type="button"
                    aria-pressed={shown.status === st}
                    disabled={update.isPending}
                    onClick={() => void setStatus(shown, st)}
                    className={cn('h-9 rounded-pill border px-3.5 text-sm font-medium transition-colors focus-visible:focus-ring', shown.status === st ? 'border-ink bg-ink text-white' : 'border-line-strong text-ink-2 hover:border-ink')}
                  >
                    {t(`jobs.status.${st}`)}
                  </button>
                ))}
              </div>
            </div>

            <dl className="grid gap-x-6 gap-y-3 rounded-card bg-rail p-4 text-sm sm:grid-cols-2">
              {(
                [
                  ['email', shown.email && <span dir="ltr">{shown.email}</span>],
                  ['age', shown.age],
                  ['location', shown.location],
                  ['gender', shown.gender && t(`jobs.gender.${shown.gender}`)],
                  ['experience', shown.experienceLevel && t(`jobs.experience.${shown.experienceLevel}`)],
                  ['availability', shown.availability && t(`jobs.availability.${shown.availability}`)],
                ] as const
              )
                .filter(([, v]) => v !== undefined && v !== null && v !== '')
                .map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-ink-3">{t(`jobs.field.${k}`)}</dt>
                    <dd className="font-medium text-ink">{v}</dd>
                  </div>
                ))}
            </dl>

            {!!shown.skills?.length && (
              <div>
                <p className="mb-2 text-sm font-medium text-ink">{t('jobs.field.skills')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {shown.skills.map((sk) => (
                    <span key={sk} className="rounded-pill bg-tint-leaf px-2.5 py-1 text-xs text-ink">
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {(
              [
                ['experienceDetails', shown.experienceDetails],
                ['whyUs', shown.whyUs],
                ['additionalInfo', shown.additionalInfo],
              ] as const
            )
              .filter(([, v]) => !!v)
              .map(([k, v]) => (
                <div key={k}>
                  <p className="mb-1 text-sm font-medium text-ink">{t(`jobs.field.${k}`)}</p>
                  <p className="whitespace-pre-wrap rounded-card border border-line p-3 text-sm leading-relaxed text-ink-2">{v}</p>
                </div>
              ))}

            <Field label={t('jobs.notes')} hint={t('jobs.notesHint')}>
              {(p) => <TextArea {...p} value={notes} onChange={(e) => setNotes(e.target.value)} />}
            </Field>
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        tone="danger"
        loading={remove.isPending}
        title={t('jobs.deleteTitle')}
        message={t('jobs.deleteText', { name: (deleting ?? lastDeleting.current)?.fullName ?? '' })}
        confirmLabel={t('jobs.menu.delete')}
        cancelLabel={t('enrollments.cancel')}
        onConfirm={() =>
          void remove
            .mutateAsync(deleting!._id)
            .then(() => toast.success(t('jobs.toast.deleted')))
            .catch(fail)
            .finally(() => setDeleting(null))
        }
      />
    </div>
  );
}
