import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlarmClock, Banknote, Bus, CheckCircle2, FileDown, Info, Receipt, Wallet } from 'lucide-react';
import { api } from '../../../lib/api';
import { useStudentCourses } from '../../../hooks';
import { useFormat } from '../../../app/format';
import { readApiError } from '../../../app/apiError';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/utils';
import { Badge, Button, DataTable, EmptyState, PageHeader, Panel, PanelTitle, StatTile, type Column } from '../../../ui';

interface Payment {
  _id: string;
  amount: number;
  paymentMethod: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paidAt?: string;
  createdAt: string;
  receipt?: { receiptNumber?: string } | null;
  type?: 'course' | 'transportation';
  course?: { _id: string; title: string } | null;
}
interface Due { amount: number; dueDate: string; isOverdue: boolean }
interface Summary {
  totalAmount: number; paidAmount: number; remainingAmount: number; overduePayments: number; nextPaymentDue?: Due | null;
  transportationTotal?: number; transportationPaid?: number; transportationRemaining?: number; transportationNextPaymentDue?: Due | null;
}

/** Saves the PDF receipt the backend renders for a payment. */
async function downloadReceipt(id: string, name: string) {
  const res = await api.get(`/student/payments/${id}/receipt`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = res.headers['content-disposition']?.match(/filename="?([^";]+)"?/)?.[1] ?? `${name}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** What the student's courses cost, what was paid (payments are taken at the centre), and receipts. */
export default function PaymentsPage() {
  const { courseId } = useParams();
  const { t } = useTranslation('dashboardStudent');
  const f = useFormat();
  const toast = useToast();
  const { courses } = useStudentCourses();
  const payments = useQuery({ queryKey: ['student', 'payments', courseId ?? 'all'], queryFn: async () => ((await api.get(courseId ? `/student/payments/courses/${courseId}` : '/student/payments')).data.data ?? []) as Payment[] });
  const summary = useQuery({ queryKey: ['student', 'payments', 'summary'], queryFn: async () => (await api.get('/student/payments/summary')).data.data as Summary });
  const [busy, setBusy] = useState<string | null>(null);
  const s = summary.data;
  const course = courseId ? courses.find((c) => c.course._id === courseId) : null;
  const balances = (courses ?? []).filter((c) => c.enrollmentSource !== 'bundle' && c.payment && (!courseId || c.course._id === courseId));
  const hasTransport = (s?.transportationTotal ?? 0) > 0;

  // One course page shows that course's money; the main page shows everything
  const total = courseId ? course?.payment.totalAmount ?? 0 : s?.totalAmount ?? 0;
  const paid = courseId ? course?.payment.paidAmount ?? 0 : s?.paidAmount ?? 0;
  const left = courseId ? course?.payment.remainingAmount ?? 0 : s?.remainingAmount ?? 0;

  const receipt = async (p: Payment) => {
    setBusy(p._id);
    try {
      await downloadReceipt(p._id, p.receipt?.receiptNumber ?? 'receipt');
    } catch (err) {
      toast.error(t('pay.receiptError'), readApiError(err).message);
    } finally {
      setBusy(null);
    }
  };

  const columns: Column<Payment>[] = useMemo(
    () => [
      { key: 'date', header: t('pay.col.date'), cell: (p) => <span className="whitespace-nowrap tabular-nums text-ink-2">{f.date(p.paidAt ?? p.createdAt)}</span> },
      {
        key: 'for',
        header: t('pay.col.for'),
        cell: (p) => (
          <span className="inline-flex min-w-0 items-center gap-2">
            {p.type === 'transportation' ? <Bus className="size-4 shrink-0 text-ink-3" aria-hidden /> : <Wallet className="size-4 shrink-0 text-ink-3" aria-hidden />}
            <span className="truncate text-ink" dir="auto">{p.type === 'transportation' ? t('pay.transport') : p.course?.title ?? t('pay.course')}</span>
          </span>
        ),
      },
      { key: 'method', header: t('pay.col.method'), hideOnMobile: true, cell: (p) => <span className="text-ink-3">{t(`pay.method.${p.paymentMethod}`, { defaultValue: p.paymentMethod })}</span> },
      { key: 'amount', header: t('pay.col.amount'), align: 'end', cell: (p) => <span className="font-semibold tabular-nums text-ink">{f.money(p.amount)}</span> },
      { key: 'status', header: t('pay.col.status'), cell: (p) => <Badge tone={p.status === 'completed' ? 'success' : p.status === 'pending' ? 'warning' : 'danger'}>{t(`pay.status.${p.status}`)}</Badge> },
      {
        key: 'receipt',
        header: <span className="sr-only">{t('pay.receipt')}</span>,
        align: 'end',
        cell: (p) => p.status === 'completed' && <Button size="sm" variant="ghost" icon={<FileDown />} loading={busy === p._id} onClick={() => void receipt(p)}>{t('pay.receipt')}</Button>,
      },
    ],
    [t, f, busy], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const next = !courseId ? s?.nextPaymentDue : null;

  return (
    <div className="space-y-5">
      <PageHeader
        back={courseId ? { to: `/student/courses/${courseId}`, label: course?.course.title ?? t('courses.title') } : undefined}
        title={courseId && course ? t('pay.titleFor', { course: course.course.title }) : t('pay.title')}
        description={t('pay.subtitle')}
      />

      <div className="grid grid-cols-3 gap-3">
        <StatTile icon={<Banknote />} tint="bg-tint-leaf" label={t('pay.total')} value={f.money(total)} loading={summary.isLoading} />
        <StatTile icon={<CheckCircle2 />} tint="bg-tint-sage" label={t('pay.paid')} value={f.money(paid)} loading={summary.isLoading} />
        <StatTile icon={<Wallet />} tint="bg-tint-straw" label={t('pay.left')} value={f.money(left)} loading={summary.isLoading} />
      </div>

      {(next || (s?.overduePayments ?? 0) > 0) && (
        <section className={cn('flex flex-wrap items-center gap-4 rounded-panel p-5', next?.isOverdue || (s?.overduePayments ?? 0) > 0 ? 'bg-danger-soft' : 'bg-ink text-white')}>
          <span className={cn('grid size-12 shrink-0 place-items-center rounded-input', next?.isOverdue ? 'bg-danger text-white' : 'bg-white/10 text-glow')}><AlarmClock className="size-6" aria-hidden /></span>
          <div className="min-w-0 flex-1">
            <p className={cn('font-semibold', next?.isOverdue ? 'text-danger' : '')}>{next?.isOverdue || !next ? t('pay.overdue', { count: s?.overduePayments ?? 1 }) : t('pay.nextDue')}</p>
            {next && <p className={cn('text-sm', next.isOverdue ? 'text-danger/80' : 'text-frost/75')}>{t('pay.dueLine', { amount: f.money(next.amount), date: f.date(next.dueDate) })}</p>}
          </div>
          <p className={cn('flex basis-full items-center gap-2 text-xs sm:basis-auto', next?.isOverdue ? 'text-danger/80' : 'text-frost/75')}><Info className="size-4 shrink-0" aria-hidden />{t('pay.atCentre')}</p>
        </section>
      )}

      <div className={cn('grid gap-5', !courseId && 'xl:grid-cols-[minmax(0,1fr)_360px]')}>
        <Panel className="min-w-0 p-0 sm:p-0">
          <div className="px-5 pt-5"><PanelTitle title={t('pay.history')} /></div>
          {payments.isError ? (
            <EmptyState icon={<Receipt />} title={t('pay.loadError')} action={<Button variant="secondary" onClick={() => void payments.refetch()}>{t('courses.retry')}</Button>} />
          ) : (
            <DataTable label={t('pay.history')} columns={columns} rows={payments.data ?? []} rowKey={(p) => p._id} loading={payments.isLoading} empty={<EmptyState icon={<Receipt />} title={t('pay.none')} />} />
          )}
        </Panel>

        {!courseId && (
          <div className="min-w-0 space-y-5">
            <Panel>
              <PanelTitle title={t('pay.byCourse')} />
              {balances.length === 0 ? (
                <p className="py-3 text-center text-sm text-ink-4">{t('ov.noCourses')}</p>
              ) : (
                <ul className="space-y-3">
                  {balances.map((c) => {
                    const pct = c.payment.totalAmount ? Math.round((c.payment.paidAmount / c.payment.totalAmount) * 100) : 100;
                    return (
                      <li key={c._id}>
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="truncate font-medium text-ink" dir="auto">{c.course.title}</span>
                          {c.payment.remainingAmount > 0 ? <span className="shrink-0 font-semibold tabular-nums text-warning">{t('courses.toPay', { amount: f.money(c.payment.remainingAmount) })}</span> : <Badge tone="success">{t('pay.fullyPaid')}</Badge>}
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-pill bg-rail"><span className="block h-full bg-glow" style={{ width: `${pct}%` }} /></div>
                        <p className="mt-1 text-xs tabular-nums text-ink-4">{t('pay.ofTotal', { paid: f.money(c.payment.paidAmount), total: f.money(c.payment.totalAmount) })}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
            {hasTransport && (
              <Panel>
                <PanelTitle title={t('pay.transport')} />
                <p className="text-2xl font-bold tabular-nums text-ink">{f.money(s?.transportationRemaining ?? 0)} <span className="text-sm font-normal text-ink-4">{t('pay.leftShort')}</span></p>
                <p className="mt-1 text-xs text-ink-4">{t('pay.ofTotal', { paid: f.money(s?.transportationPaid ?? 0), total: f.money(s?.transportationTotal ?? 0) })}</p>
                {s?.transportationNextPaymentDue && <p className={cn('mt-3 text-sm', s.transportationNextPaymentDue.isOverdue ? 'text-danger' : 'text-ink-2')}>{t('pay.dueLine', { amount: f.money(s.transportationNextPaymentDue.amount), date: f.date(s.transportationNextPaymentDue.dueDate) })}</p>}
              </Panel>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
