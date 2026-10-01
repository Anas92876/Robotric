import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Ban, BellRing, Clock, Eye, GraduationCap, MessageSquarePlus, Pencil, Phone, Shuffle, Sparkles, Trash2, UserPlus, Users } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { LeadForm } from '../../../components/reception/LeadForm';
import { StatusChangeModal } from '../../../components/reception/StatusChangeModal';
import { LeadDetailsModal } from '../../../components/reception/LeadDetailsModal';
import { ConvertToStudentModal } from '../../../components/reception/ConvertToStudentModal';
import { ConvertChoiceModal } from '../../../components/reception/ConvertChoiceModal';
import { SetWaitingModal } from '../../../components/reception/SetWaitingModal';
import { ContactHistoryModal } from '../../../components/reception/ContactHistoryModal';
import { cn } from '../../../lib/utils';
import { useFormat } from '../../../app/format';
import { readApiError } from '../../../app/apiError';
import { Badge, Button, ConfirmDialog, DataTable, EmptyState, PageHeader, Pagination, Panel, RowMenu, SearchInput, SelectInput, StatTile, type BadgeTone, type Column } from '../../../ui';
import { PAGE_SIZE, useInterests, useLeadMutations, useLeadStats, useLeads, type Lead, type LeadFilters } from './api';

const EMPTY: LeadFilters = { search: '', status: '', interest: '', sort: 'leadDate:desc', page: 1 };
const STATUS_TONE: Record<Lead['status'], BadgeTone> = { interest: 'info', waiting: 'warning', student: 'success', blacklist: 'danger' };
const SORTS: LeadFilters['sort'][] = ['leadDate:desc', 'leadDate:asc', 'createdAt:desc', 'createdAt:asc', 'fullName:asc', 'fullName:desc'];

/** Reception: people interested in the academy — follow up, move to the waiting list, convert to students. */
export default function LeadsPage() {
  const { t } = useTranslation('dashboardReception');
  const f = useFormat();
  const toast = useToast();
  const [filters, setFilters] = useState<LeadFilters>(EMPTY);
  const leads = useLeads(filters);
  const stats = useLeadStats();
  const interests = useInterests();
  const m = useLeadMutations();

  // Dialogs (kept from the previous page)
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [details, setDetails] = useState<Lead | null>(null);
  const [choice, setChoice] = useState<Lead | null>(null);
  const [statusLead, setStatusLead] = useState<{ lead: Lead; preset?: string } | null>(null);
  const [converting, setConverting] = useState<Lead | null>(null);
  const [waiting, setWaiting] = useState<Lead | null>(null);
  const [contactFor, setContactFor] = useState<Lead | null>(null);
  const [deleting, setDeleting] = useState<Lead | null>(null);
  const lastDeleting = useRef<Lead | null>(null);
  if (deleting) lastDeleting.current = deleting;

  const patch = (p: Partial<LeadFilters>) => setFilters((x) => ({ ...x, ...p, page: p.page ?? 1 }));
  const filtered = !!(filters.search || filters.status || filters.interest);
  const today = new Date(new Date().toDateString());

  const columns: Column<Lead>[] = useMemo(
    () => [
      {
        key: 'lead',
        header: t('leads.col.lead'),
        cell: (l) => (
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-tint-straw font-semibold text-ink">{l.fullName.charAt(0)}</span>
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">{l.fullName}</p>
              {l.englishName && <p className="truncate text-xs text-ink-4">{l.englishName}</p>}
            </div>
          </div>
        ),
      },
      {
        key: 'phone',
        header: t('leads.col.phone'),
        cell: (l) => (
          <a href={`tel:${l.mobileNumber}`} dir="ltr" className="inline-flex items-center gap-1.5 rounded-md text-ink-2 hover:text-ink focus-visible:focus-ring">
            <Phone className="size-3.5 text-ink-4" aria-hidden />
            {l.mobileNumber}
          </a>
        ),
      },
      { key: 'interest', header: t('leads.col.interest'), hideOnMobile: true, cell: (l) => (l.interestField ? <span className="rounded-pill bg-rail px-2.5 py-1 text-xs text-ink">{l.interestField}</span> : <span className="text-ink-4">—</span>) },
      { key: 'status', header: t('leads.col.status'), cell: (l) => <Badge tone={STATUS_TONE[l.status] ?? 'neutral'}>{t(`leads.status.${l.status}`)}</Badge> },
      {
        key: 'followUp',
        header: t('leads.col.followUp'),
        hideOnMobile: true,
        cell: (l) => {
          if (!l.nextFollowUpDate) return <span className="text-xs text-ink-4">{t('leads.added', { date: f.date(l.leadDate || l.createdAt) })}</span>;
          const due = new Date(l.nextFollowUpDate) <= today && l.status !== 'student';
          return (
            <span className={cn('inline-flex items-center gap-1.5 text-sm tabular-nums', due ? 'font-medium text-danger' : 'text-ink-2')}>
              <BellRing className="size-3.5" aria-hidden />
              {f.date(l.nextFollowUpDate)}
              {due && <span className="sr-only">{t('leads.due')}</span>}
            </span>
          );
        },
      },
      {
        key: 'actions',
        header: <span className="sr-only">{t('leads.col.actions')}</span>,
        align: 'end',
        cell: (l) => (
          <RowMenu
            label={t('leads.actionsFor', { name: l.fullName })}
            actions={[
              { label: t('leads.menu.view'), icon: <Eye />, onClick: () => setDetails(l) },
              { label: t('leads.menu.contact'), icon: <MessageSquarePlus />, onClick: () => setContactFor(l) },
              { label: t('leads.menu.edit'), icon: <Pencil />, onClick: () => { setEditing(l); setFormOpen(true); } },
              { label: t('leads.menu.move'), icon: <Shuffle />, onClick: () => setChoice(l), hidden: l.status === 'student' },
              { label: t('leads.menu.delete'), icon: <Trash2 />, tone: 'danger', onClick: () => setDeleting(l) },
            ]}
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, f],
  );

  const s = stats.data;
  const tile = (status: LeadFilters['status']) => ({ onClick: () => patch({ status }), active: filters.status === status && !filters.search && !filters.interest });
  const shownDelete = deleting ?? lastDeleting.current;

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('leads.title')}
        description={t('leads.subtitle')}
        actions={
          <Button icon={<UserPlus />} onClick={() => { setEditing(null); setFormOpen(true); }}>
            {t('leads.new')}
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile icon={<Users />} tint="bg-tint-leaf" label={t('leads.stats.total')} value={s?.total} loading={stats.isLoading} {...tile('')} />
        <StatTile icon={<Sparkles />} tint="bg-tint-straw" label={t('leads.stats.interest')} value={s?.interest} loading={stats.isLoading} {...tile('interest')} />
        <StatTile icon={<Clock />} tint="bg-tint-khaki" label={t('leads.stats.waiting')} value={s?.waiting} loading={stats.isLoading} {...tile('waiting')} />
        <StatTile icon={<GraduationCap />} tint="bg-tint-sage" label={t('leads.stats.student')} value={s?.student} loading={stats.isLoading} {...tile('student')} />
        <StatTile icon={<Ban />} tint="bg-tint-sand" label={t('leads.stats.blacklist')} value={s?.blacklist} loading={stats.isLoading} {...tile('blacklist')} />
        <StatTile icon={<BellRing />} tint="bg-tint-fern" label={t('leads.stats.followUp')} value={s?.needsFollowUp} loading={stats.isLoading} />
      </div>

      <Panel className="p-0 sm:p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <div className="min-w-56 flex-1">
            <SearchInput value={filters.search} onChange={(search) => patch({ search })} placeholder={t('leads.search')} />
          </div>
          <SelectInput aria-label={t('leads.col.status')} value={filters.status} onChange={(e) => patch({ status: e.target.value as LeadFilters['status'] })} className="w-auto min-w-40">
            <option value="">{t('leads.allStatuses')}</option>
            {(['interest', 'waiting', 'student', 'blacklist'] as const).map((st) => (
              <option key={st} value={st}>
                {t(`leads.status.${st}`)}
              </option>
            ))}
          </SelectInput>
          <SelectInput aria-label={t('leads.col.interest')} value={filters.interest} onChange={(e) => patch({ interest: e.target.value })} className="w-auto min-w-40">
            <option value="">{t('leads.allInterests')}</option>
            {(interests.data ?? []).map((i) => (
              <option key={i._id} value={i.name}>
                {i.name}
              </option>
            ))}
          </SelectInput>
          <SelectInput aria-label={t('leads.sortLabel')} value={filters.sort} onChange={(e) => patch({ sort: e.target.value as LeadFilters['sort'] })} className="w-auto min-w-44">
            {SORTS.map((o) => (
              <option key={o} value={o}>
                {t(`leads.sort.${o.replace(':', '_')}`)}
              </option>
            ))}
          </SelectInput>
        </div>

        {leads.isError ? (
          <EmptyState icon={<Users />} title={t('leads.loadError')} action={<Button variant="secondary" onClick={() => void leads.refetch()}>{t('leads.retry')}</Button>} />
        ) : (
          <div className={cn('transition-opacity', leads.isFetching && !leads.isLoading && 'opacity-60')}>
            <DataTable
              label={t('leads.title')}
              columns={columns}
              rows={leads.data?.rows ?? []}
              rowKey={(l) => l._id}
              loading={leads.isLoading}
              empty={
                <EmptyState
                  icon={<Users />}
                  title={filtered ? t('leads.noMatch') : t('leads.empty')}
                  description={filtered ? t('leads.noMatchHint') : undefined}
                  action={filtered ? <Button variant="secondary" onClick={() => setFilters(EMPTY)}>{t('leads.clearFilters')}</Button> : undefined}
                />
              }
            />
          </div>
        )}
        <Pagination
          page={filters.page}
          pages={leads.data?.pages ?? 1}
          total={leads.data?.total ?? 0}
          pageSize={PAGE_SIZE}
          onPage={(page) => patch({ page })}
          summary={(from, to, total) => t('users.pageSummary', { from, to, total })}
          labels={{ previous: t('users.previous'), next: t('users.next') }}
        />
      </Panel>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        tone="danger"
        loading={m.remove.isPending}
        title={t('leads.deleteTitle')}
        message={t('leads.deleteText', { name: shownDelete?.fullName ?? '' })}
        confirmLabel={t('leads.menu.delete')}
        cancelLabel={t('enrollments.cancel')}
        onConfirm={() =>
          void m.remove
            .mutateAsync(deleting!._id)
            .then(() => toast.success(t('leads.toast.deleted')))
            .catch((err) => toast.error(t('enrollments.errorTitle'), readApiError(err).message))
            .finally(() => setDeleting(null))
        }
      />

      {/* Kept from the previous page (restyled later) */}
      <LeadForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        mode={editing ? 'edit' : 'create'}
        initialData={editing}
        onSubmit={async (data) => {
          if (editing) await m.update.mutateAsync({ id: editing._id, body: data as unknown as Record<string, unknown> });
          else await m.create.mutateAsync(data as unknown as Record<string, unknown>);
          toast.success(t(editing ? 'leads.toast.saved' : 'leads.toast.created'));
          setFormOpen(false);
        }}
      />
      <LeadDetailsModal isOpen={!!details} onClose={() => setDetails(null)} lead={details} />
      <ConvertChoiceModal
        isOpen={!!choice}
        onClose={() => setChoice(null)}
        lead={choice}
        onSelectStudent={() => { setConverting(choice); setChoice(null); }}
        onSelectBlacklist={() => { setStatusLead(choice && { lead: choice, preset: 'blacklist' }); setChoice(null); }}
        onSelectInterest={() => { setStatusLead(choice && { lead: choice, preset: 'interest' }); setChoice(null); }}
        onSelectWaiting={() => { setWaiting(choice); setChoice(null); }}
      />
      <StatusChangeModal
        isOpen={!!statusLead}
        onClose={() => setStatusLead(null)}
        lead={statusLead?.lead ?? null}
        preselectedStatus={statusLead?.preset}
        onSubmit={async (body) => {
          await m.changeStatus.mutateAsync({ id: statusLead!.lead._id, body });
          toast.success(t('leads.toast.status'));
          setStatusLead(null);
        }}
      />
      <SetWaitingModal
        isOpen={!!waiting}
        onClose={() => setWaiting(null)}
        lead={waiting}
        onSubmit={async (id, body) => {
          const res = await m.setWaiting.mutateAsync({ id, body });
          toast.success(t('leads.toast.waiting'));
          return res.data;
        }}
      />
      <ConvertToStudentModal
        isOpen={!!converting}
        onClose={() => setConverting(null)}
        lead={converting}
        onSubmit={async ({ email, password }) => {
          await m.convert.mutateAsync({ id: converting!._id, email, password });
          toast.success(t('leads.toast.converted', { name: converting!.fullName }));
          setConverting(null);
        }}
      />
      {contactFor && (
        <ContactHistoryModal
          isOpen
          onClose={() => setContactFor(null)}
          leadId={contactFor._id}
          leadName={contactFor.fullName}
          onSubmit={async (body) => {
            await m.addContact.mutateAsync({ id: contactFor._id, body });
            toast.success(t('leads.toast.contact'));
            setContactFor(null);
          }}
        />
      )}
    </div>
  );
}
