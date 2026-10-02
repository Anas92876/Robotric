import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, BookOpen, Bus, CheckCircle2, CircleDollarSign, Clock, Eye, FileDown, Layers, Plus, Power, Receipt, Settings2, SlidersHorizontal, Trash2, Wallet, XCircle } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { EnrollmentForm } from '../../../components/reception/EnrollmentForm';
import BundleEnrollmentModal from '../../../components/reception/BundleEnrollmentModal';
import { EnrollmentDetailsModal } from '../../../components/reception/EnrollmentDetailsModal';
import { WaitingListPanel } from '../../../components/reception/WaitingListPanel';
import { ExchangeRateModal } from '../../../components/reception/ExchangeRateModal';
import { useExchangeRate } from '../../../hooks';
import type { CreateEnrollmentRequest } from '../../../hooks/reception/useReceptionEnrollments';
import { api } from '../../../lib/api';
import { cn } from '../../../lib/utils';
import { useFormat } from '../../../app/format';
import { readApiError } from '../../../app/apiError';
import { Badge, Button, ConfirmDialog, DataTable, EmptyState, PageHeader, Pagination, Panel, RowMenu, SearchInput, SelectInput, StatTile, type Column } from '../../../ui';
import {
  PAGE_SIZE,
  downloadReceipt,
  latestReceipt,
  useCourseOptions,
  useEnrollmentMutations,
  useEnrollmentSummary,
  useEnrollments,
  useTransportAssignments,
  type Enrollment,
  type EnrollmentFilters,
} from './api';
import { PaymentDialog } from './PaymentDialog';
import { StatusDialog } from './StatusDialog';
import { TransportDialog } from './TransportDialog';

const EMPTY: EnrollmentFilters = { search: '', course: '', status: '', payment: '', discount: '', transport: '', page: 1 };
const paymentState = (e: Enrollment) => (e.payment.remainingAmount <= 0 ? 'paid' : e.payment.paidAmount > 0 ? 'partial' : 'unpaid');

/** Reception: every enrollment with its payments and transportation, plus the waiting list. */
export default function EnrollmentsPage() {
  const { t } = useTranslation('dashboardReception');
  const f = useFormat();
  const toast = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState<'enrollments' | 'waiting'>('enrollments');
  const [filters, setFilters] = useState<EnrollmentFilters>(EMPTY);
  const [moreFilters, setMoreFilters] = useState(false);
  const list = useEnrollments(filters);
  const summary = useEnrollmentSummary();
  const courses = useCourseOptions();
  const transport = useTransportAssignments(list.data?.rows);
  const m = useEnrollmentMutations();
  const { exchangeRate, updateExchangeRate } = useExchangeRate();

  // Dialogs
  const [paying, setPaying] = useState<Enrollment | null>(null);
  const [statusOf, setStatusOf] = useState<Enrollment | null>(null);
  const [transportOf, setTransportOf] = useState<Enrollment | null>(null);
  const [deleting, setDeleting] = useState<Enrollment | null>(null);
  const lastDeleting = useRef<Enrollment | null>(null);
  if (deleting) lastDeleting.current = deleting;
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [bundleOpen, setBundleOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const [savingRate, setSavingRate] = useState(false);

  // Lists the (old) new-enrollment form asks for
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const loadGroups = (courseId: string) => void api.get(`/reception/enrollments/available-groups/${courseId}`).then((r) => setGroups(r.data.data ?? []));
  const loadStudents = (courseId?: string) => void api.get(`/reception/enrollments/available-students${courseId ? `?courseId=${courseId}` : ''}`).then((r) => setStudents(r.data.data ?? []));

  const patch = (p: Partial<EnrollmentFilters>) => setFilters((x) => ({ ...x, ...p, page: p.page ?? 1 }));
  const filtered = JSON.stringify({ ...filters, page: 1 }) !== JSON.stringify(EMPTY);
  const sp = (n: number) => `${Math.round(n).toLocaleString(f.locale)} ${t('enrollments.sp')}`;
  const fail = (err: unknown) => toast.error(t('enrollments.errorTitle'), readApiError(err).message);

  const saveReceipt = async (receipt: { receiptId: string; receiptNumber: string } | null) => {
    if (!receipt) return;
    try {
      await downloadReceipt(receipt.receiptId, receipt.receiptNumber);
    } catch {
      toast.warning(t('enrollments.receiptLater'));
    }
  };

  const downloadLatest = async (e: Enrollment) => {
    try {
      const r = await latestReceipt(e._id);
      if (!r) return toast.warning(t('enrollments.noReceipt'));
      await downloadReceipt(r._id, r.receiptNumber);
    } catch (err) {
      fail(err);
    }
  };

  /** Same flow as before: create, then record the first payment (or a $0 one for a full scholarship) and download its receipt. */
  const create = async (data: CreateEnrollmentRequest & { paidNow?: number | string }) => {
    const { paidNow, ...body } = data;
    try {
      const created = await m.create.mutateAsync(body as unknown as Record<string, unknown>);
      const paid = paidNow ? parseFloat(String(paidNow)) : 0;
      const total = parseFloat(String(body.totalAmount ?? 0)) || 0;
      if (created?._id && (paid > 0 || total === 0)) {
        try {
          const receipt = await m.pay.mutateAsync({ id: created._id, body: { amount: paid, paymentMethod: 'cash', notes: total === 0 ? t('enrollments.scholarshipNote') : t('enrollments.firstPaymentNote') } });
          void saveReceipt(receipt); // close the dialog now; the receipt downloads in the background
        } catch (err) {
          toast.warning(t('enrollments.firstPaymentFailed'), readApiError(err).message);
        }
      }
      toast.success(t('enrollments.toast.created'));
      setCreateOpen(false);
    } catch (err) {
      fail(err);
      throw err;
    }
  };

  const columns: Column<Enrollment>[] = useMemo(
    () => [
      {
        key: 'student',
        header: t('enrollments.col.student'),
        cell: (e) => (
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-tint-leaf font-semibold text-ink">{(e.student?.name ?? '?').charAt(0).toUpperCase()}</span>
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">{e.student?.name ?? t('enrollments.unknownStudent')}</p>
              <p className="truncate text-xs text-ink-4" dir="ltr">
                {e.student?.email}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: 'course',
        header: t('enrollments.col.course'),
        cell: (e) => (
          <div className="min-w-0">
            <p className="truncate text-ink">{e.course?.title ?? '—'}</p>
            {e.course?.type === 'bundle' && (
              <span className="mt-0.5 inline-flex items-center gap-1 rounded-pill bg-tint-straw px-2 py-0.5 text-[11px] font-medium text-ink">
                <Layers className="size-3" aria-hidden />
                {t('enrollments.bundle')}
              </span>
            )}
          </div>
        ),
      },
      { key: 'date', header: t('enrollments.col.enrolled'), hideOnMobile: true, cell: (e) => <span className="tabular-nums">{f.date(e.enrolledAt)}</span> },
      {
        key: 'payment',
        header: t('enrollments.col.payment'),
        cell: (e) => {
          const state = paymentState(e);
          const pct = e.payment.totalAmount > 0 ? Math.min(100, (e.payment.paidAmount / e.payment.totalAmount) * 100) : 100;
          return (
            <div className="min-w-36">
              <div className="flex items-baseline justify-between gap-2 text-sm tabular-nums">
                <span className="font-semibold text-ink">{f.money(e.payment.paidAmount)}</span>
                <span className="text-xs text-ink-4">/ {f.money(e.payment.totalAmount)}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-pill bg-rail">
                <span className={cn('block h-full', state === 'paid' ? 'bg-success' : 'bg-glow')} style={{ width: `${pct}%` }} />
              </div>
              <p className={cn('mt-1 text-[11px] rtl:text-xs', state === 'paid' ? 'text-success' : state === 'partial' ? 'text-warning' : 'text-danger')}>{t(`enrollments.payState.${state}`)}</p>
            </div>
          );
        },
      },
      {
        key: 'transport',
        header: t('enrollments.col.transport'),
        hideOnMobile: true,
        cell: (e) => {
          const tr = e.transportation;
          if (!tr?.enabled) return <span className="text-xs text-ink-4">{t('enrollments.noTransport')}</span>;
          const assignment = transport.data?.[String(e.student?._id)];
          return (
            <div className="space-y-1">
              <p className={cn('flex items-center gap-1.5 text-xs font-medium', tr.remainingAmount > 0 ? 'text-warning' : 'text-success')}>
                <Bus className="size-3.5" aria-hidden />
                {tr.remainingAmount > 0 ? t('enrollments.transportOwes', { amount: sp(tr.remainingAmount) }) : t('enrollments.transportPaid')}
              </p>
              {assignment && !assignment.assigned && (
                <p className="flex items-center gap-1 text-[11px] text-danger rtl:text-xs">
                  <AlertTriangle className="size-3" aria-hidden />
                  {t('enrollments.noDriver')}
                </p>
              )}
            </div>
          );
        },
      },
      {
        key: 'status',
        header: t('enrollments.col.status'),
        cell: (e) => ((e.status as string) === 'inactive' ? <Badge tone="neutral">{t('enrollments.inactive')}</Badge> : <Badge tone="success">{t('enrollments.active')}</Badge>),
      },
      {
        key: 'actions',
        header: <span className="sr-only">{t('enrollments.col.actions')}</span>,
        align: 'end',
        cell: (e) => {
          const tr = e.transportation;
          const assignment = transport.data?.[String(e.student?._id)];
          const inactive = (e.status as string) === 'inactive';
          return (
            <RowMenu
              label={t('enrollments.actionsFor', { name: e.student?.name ?? '' })}
              actions={[
                { label: t('enrollments.menu.details'), icon: <Eye />, onClick: () => setDetailsId(e._id) },
                { label: t('enrollments.menu.pay'), icon: <Wallet />, onClick: () => setPaying(e), hidden: e.payment.remainingAmount <= 0 },
                { label: tr?.enabled ? t('enrollments.menu.payTransport') : t('enrollments.menu.addTransport'), icon: <Bus />, onClick: () => setTransportOf(e), hidden: !!tr?.enabled && tr.remainingAmount <= 0 },
                {
                  label: t('enrollments.menu.assignDriver'),
                  icon: <Bus />,
                  onClick: () => navigate(`/reception/transport?${new URLSearchParams({ tab: 'students', enrollStudentId: String(e.student?._id ?? ''), enrollStudentName: e.student?.name ?? '', enrollStudentEmail: e.student?.email ?? '' })}`),
                  hidden: !tr?.enabled || !assignment || assignment.assigned,
                },
                { label: t('enrollments.menu.receipt'), icon: <FileDown />, onClick: () => void downloadLatest(e), hidden: e.payment.paidAmount <= 0 && e.payment.totalAmount > 0 },
                { label: inactive ? t('enrollments.menu.activate') : t('enrollments.menu.deactivate'), icon: <Power />, onClick: () => setStatusOf(e) },
                // A fully paid enrollment is locked (as before), unless the student record is missing
                { label: t('enrollments.menu.delete'), icon: <Trash2 />, tone: 'danger', onClick: () => setDeleting(e), hidden: !!e.student?.name && e.payment.remainingAmount <= 0 },
              ]}
            />
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, f, transport.data],
  );

  const s = summary.data;
  const shownDelete = deleting ?? lastDeleting.current;

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('enrollments.title')}
        description={t('enrollments.subtitle')}
        actions={
          <>
            <Button variant="ghost" icon={<Settings2 />} onClick={() => setRateOpen(true)} title={t('enrollments.rateButton')}>
              <span className="tabular-nums">{t('enrollments.rateShort', { rate: exchangeRate.toLocaleString(f.locale) })}</span>
            </Button>
            <Button variant="secondary" icon={<Layers />} onClick={() => setBundleOpen(true)}>
              {t('enrollments.bundleButton')}
            </Button>
            <Button icon={<Plus />} onClick={() => { setCreateOpen(true); loadStudents(); }}>
              {t('enrollments.new')}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile icon={<BookOpen />} tint="bg-tint-leaf" label={t('enrollments.stats.total')} value={s?.total} loading={summary.isLoading} onClick={() => patch({ status: '' })} active={!filters.status && !filters.payment} />
        <StatTile icon={<CheckCircle2 />} tint="bg-tint-sage" label={t('enrollments.stats.active')} value={s?.active} loading={summary.isLoading} onClick={() => patch({ status: 'active' })} active={filters.status === 'active' && !filters.payment} />
        <StatTile icon={<XCircle />} tint="bg-tint-sand" label={t('enrollments.stats.inactive')} value={s?.inactive} loading={summary.isLoading} onClick={() => patch({ status: 'inactive' })} active={filters.status === 'inactive'} />
        <StatTile icon={<CircleDollarSign />} tint="bg-tint-straw" label={t('enrollments.stats.amount')} value={s ? f.money(s.amountTotal) : undefined} loading={summary.isLoading} />
        <StatTile icon={<Receipt />} tint="bg-tint-leaf" label={t('enrollments.stats.paid')} value={s ? f.money(s.amountPaid) : undefined} loading={summary.isLoading} onClick={() => { patch({ payment: 'paid' }); setMoreFilters(true); }} active={filters.payment === 'paid'} />
        <StatTile icon={<Clock />} tint="bg-tint-khaki" label={t('enrollments.stats.remaining')} value={s ? f.money(s.amountRemaining) : undefined} loading={summary.isLoading} onClick={() => { patch({ payment: 'unpaid' }); setMoreFilters(true); }} active={filters.payment === 'unpaid'} />
      </div>

      <div role="tablist" aria-label={t('enrollments.title')} className="flex w-fit items-center gap-0.5 rounded-pill border border-line bg-rail p-1">
        {(['enrollments', 'waiting'] as const).map((k) => (
          <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)} className={cn('h-9 rounded-pill px-4 text-sm font-medium transition-colors focus-visible:focus-ring', tab === k ? 'bg-ink text-white' : 'text-ink-3 hover:text-ink')}>
            {k === 'enrollments' ? t('enrollments.tabEnrollments') : t('enrollments.tabWaiting')}
          </button>
        ))}
      </div>

      {tab === 'waiting' ? (
        <WaitingListPanel />
      ) : (
        <Panel className="p-0 sm:p-0">
          <div className="space-y-3 border-b border-line p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-56 flex-1">
                <SearchInput value={filters.search} onChange={(search) => patch({ search })} placeholder={t('enrollments.search')} />
              </div>
              <SelectInput aria-label={t('enrollments.col.course')} value={filters.course} onChange={(e) => patch({ course: e.target.value })} className="w-auto min-w-48">
                <option value="">{t('enrollments.allCourses')}</option>
                {(courses.data ?? []).map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.title}
                  </option>
                ))}
              </SelectInput>
              <Button variant={moreFilters ? 'primary' : 'secondary'} icon={<SlidersHorizontal />} onClick={() => setMoreFilters((v) => !v)} aria-expanded={moreFilters}>
                {t('enrollments.moreFilters')}
              </Button>
              {filtered && (
                <Button variant="ghost" onClick={() => setFilters(EMPTY)}>
                  {t('enrollments.clearFilters')}
                </Button>
              )}
            </div>
            {moreFilters && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <SelectInput aria-label={t('enrollments.col.status')} value={filters.status} onChange={(e) => patch({ status: e.target.value as EnrollmentFilters['status'] })}>
                  <option value="">{t('enrollments.anyStatus')}</option>
                  <option value="active">{t('enrollments.active')}</option>
                  <option value="inactive">{t('enrollments.inactive')}</option>
                </SelectInput>
                <SelectInput aria-label={t('enrollments.col.payment')} value={filters.payment} onChange={(e) => patch({ payment: e.target.value as EnrollmentFilters['payment'] })}>
                  <option value="">{t('enrollments.anyPayment')}</option>
                  <option value="paid">{t('enrollments.payState.paid')}</option>
                  <option value="partial">{t('enrollments.payState.partial')}</option>
                  <option value="unpaid">{t('enrollments.payState.unpaid')}</option>
                </SelectInput>
                <SelectInput aria-label={t('enrollments.discount')} value={filters.discount} onChange={(e) => patch({ discount: e.target.value as EnrollmentFilters['discount'] })}>
                  <option value="">{t('enrollments.anyDiscount')}</option>
                  <option value="true">{t('enrollments.discounted')}</option>
                  <option value="false">{t('enrollments.fullPrice')}</option>
                </SelectInput>
                <SelectInput aria-label={t('enrollments.col.transport')} value={filters.transport} onChange={(e) => patch({ transport: e.target.value as EnrollmentFilters['transport'] })}>
                  <option value="">{t('enrollments.anyTransport')}</option>
                  <option value="enabled">{t('enrollments.withTransport')}</option>
                  <option value="disabled">{t('enrollments.withoutTransport')}</option>
                  <option value="paid">{t('enrollments.transportPaid')}</option>
                  <option value="pending">{t('enrollments.transportPending')}</option>
                </SelectInput>
              </div>
            )}
          </div>

          {list.isError ? (
            <EmptyState icon={<XCircle />} title={t('enrollments.loadError')} action={<Button variant="secondary" onClick={() => void list.refetch()}>{t('enrollments.retry')}</Button>} />
          ) : (
            <div className={cn('transition-opacity', list.isFetching && !list.isLoading && 'opacity-60')}>
              <DataTable
                label={t('enrollments.title')}
                columns={columns}
                rows={list.data?.rows ?? []}
                rowKey={(e) => e._id}
                loading={list.isLoading}
                empty={
                  <EmptyState
                    icon={<BookOpen />}
                    title={filtered ? t('enrollments.noMatch') : t('enrollments.empty')}
                    description={filtered ? t('enrollments.noMatchHint') : undefined}
                    action={filtered ? <Button variant="secondary" onClick={() => setFilters(EMPTY)}>{t('enrollments.clearFilters')}</Button> : <Button icon={<Plus />} onClick={() => { setCreateOpen(true); loadStudents(); }}>{t('enrollments.new')}</Button>}
                  />
                }
              />
            </div>
          )}
          <Pagination
            page={filters.page}
            pages={list.data?.pages ?? 1}
            total={list.data?.total ?? 0}
            pageSize={PAGE_SIZE}
            onPage={(page) => patch({ page })}
            summary={(from, to, total) => t('users.pageSummary', { from, to, total })}
            labels={{ previous: t('users.previous'), next: t('users.next') }}
          />
        </Panel>
      )}

      <PaymentDialog
        enrollment={paying}
        onClose={() => setPaying(null)}
        exchangeRate={exchangeRate}
        onPay={async (body) => {
          const receipt = await m.pay.mutateAsync({ id: paying!._id, body });
          toast.success(t('enrollments.toast.paid', { amount: f.money(body.amount) }));
          void saveReceipt(receipt); // close the dialog now; the receipt downloads in the background
        }}
      />
      <StatusDialog
        enrollment={statusOf}
        onClose={() => setStatusOf(null)}
        onSave={async (status, reason) => {
          await m.setStatus.mutateAsync({ id: statusOf!._id, status, reason });
          toast.success(t(status === 'inactive' ? 'enrollments.toast.deactivated' : 'enrollments.toast.activated'));
        }}
      />
      <TransportDialog
        enrollment={transportOf}
        onClose={() => setTransportOf(null)}
        onAdd={async (transportation) => {
          await m.addTransport.mutateAsync({ id: transportOf!._id, transportation });
          toast.success(t('enrollments.toast.transportAdded'));
        }}
        onPay={async (body) => {
          const receipt = await m.payTransport.mutateAsync({ id: transportOf!._id, body });
          toast.success(t('enrollments.toast.transportPaid', { amount: sp(body.amount) }));
          void saveReceipt(receipt); // close the dialog now; the receipt downloads in the background
        }}
      />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        tone="danger"
        loading={m.remove.isPending}
        title={t('enrollments.deleteTitle')}
        message={t('enrollments.deleteText', { name: shownDelete?.student?.name ?? t('enrollments.unknownStudent'), course: shownDelete?.course?.title ?? '' })}
        confirmLabel={t('enrollments.menu.delete')}
        cancelLabel={t('enrollments.cancel')}
        onConfirm={() =>
          void m.remove
            .mutateAsync(deleting!._id)
            .then(() => toast.success(t('enrollments.toast.deleted')))
            .catch(fail)
            .finally(() => setDeleting(null))
        }
      />

      {/* Kept from the previous page (restyled later) */}
      <EnrollmentForm
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={create}
        availableCourses={courses.data ?? []}
        availableGroups={groups}
        availableStudents={students}
        onCourseSelect={loadGroups}
        onStudentSearch={loadStudents}
        exchangeRate={exchangeRate}
      />
      <BundleEnrollmentModal isOpen={bundleOpen} onClose={() => setBundleOpen(false)} onSuccess={() => { setBundleOpen(false); m.refresh(); toast.success(t('enrollments.toast.bundle')); }} />
      <EnrollmentDetailsModal
        isOpen={!!detailsId}
        onClose={() => setDetailsId(null)}
        enrollmentId={detailsId}
        onDeleteTransportation={async (id: string) => {
          await m.removeTransport.mutateAsync(id);
        }}
      />
      <ExchangeRateModal
        isOpen={rateOpen}
        onClose={() => setRateOpen(false)}
        exchangeRate={exchangeRate}
        isSaving={savingRate}
        onSave={async (rate) => {
          setSavingRate(true);
          try {
            await updateExchangeRate(rate);
          } finally {
            setSavingRate(false);
          }
        }}
      />
    </div>
  );
}
