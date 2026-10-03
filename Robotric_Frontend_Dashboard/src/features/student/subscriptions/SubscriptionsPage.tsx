import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Ban, CalendarPlus, Clock, CreditCard, Hourglass, Sparkles } from 'lucide-react';
import { cancelSessionRequest, createSessionRequest, getMySessionRequests, getMySubscription, type SessionRequest } from '../../../services/subscription.service';
import { useToast } from '../../../components/ui/Toast';
import { useFormat } from '../../../app/format';
import { readApiError } from '../../../app/apiError';
import { Badge, Button, ConfirmDialog, DataTable, Dialog, EmptyState, Field, PageHeader, Panel, PanelTitle, RowMenu, SelectInput, TextArea, TextInput, type BadgeTone, type Column } from '../../../ui';

const OPEN = 11;
const CLOSE = 19;
const TONE: Record<SessionRequest['status'], BadgeTone> = { pending: 'warning', approved: 'success', completed: 'neutral', declined: 'danger', canceled: 'neutral', no_show: 'danger' };
const pad = (n: number) => String(n).padStart(2, '0');
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
/** Start times every 30 minutes inside opening hours. */
const SLOTS = Array.from({ length: (CLOSE - OPEN) * 2 }, (_, i) => `${pad(OPEN + Math.floor(i / 2))}:${i % 2 ? '30' : '00'}`);

function RequestDialog({ open, onClose, hoursLeft }: { open: boolean; onClose: () => void; hoursLeft: number }) {
  const { t } = useTranslation('dashboardStudent');
  const toast = useToast();
  const qc = useQueryClient();
  const [date, setDate] = useState('');
  const [start, setStart] = useState('14:00');
  const [hours, setHours] = useState(1);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setDate(''); setStart('14:00'); setHours(1); setNote(''); setError(''); } }, [open]);

  const [h, m] = start.split(':').map(Number);
  const maxHours = Math.max(0, Math.min(hoursLeft, Math.floor(CLOSE - h - m / 60)));
  const send = useMutation({
    mutationFn: () => createSessionRequest({ date, startTime: start, durationHours: hours, description: note.trim() || undefined }),
    onSuccess: () => { toast.success(t('sub.toast.sent')); void qc.invalidateQueries({ queryKey: ['student', 'subscription'] }); onClose(); },
    onError: (err) => setError(readApiError(err).message),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!date) return setError(t('sub.errDate'));
    if (date < today()) return setError(t('sub.errPast'));
    if (hours > maxHours) return setError(t('sub.errLate', { close: `${CLOSE}:00` }));
    setError('');
    send.mutate();
  };
  const end = `${pad(h + hours + Math.floor(m / 60))}:${pad(m % 60)}`;

  return (
    <Dialog open={open} onClose={onClose} title={t('sub.requestTitle')} description={t('sub.requestHint', { open: `${OPEN}:00`, close: `${CLOSE}:00` })} closeLabel={t('qz.done')}
      footer={<><Button variant="ghost" onClick={onClose}>{t('sub.cancelForm')}</Button><Button type="submit" form="req-form" loading={send.isPending}>{t('sub.send')}</Button></>}>
      <form id="req-form" onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t('sub.date')} required>{(c) => <TextInput {...c} type="date" min={today()} value={date} onChange={(e) => setDate(e.target.value)} />}</Field>
          <Field label={t('sub.start')} required>
            {(c) => <SelectInput {...c} value={start} onChange={(e) => setStart(e.target.value)} dir="ltr">{SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}</SelectInput>}
          </Field>
          <Field label={t('sub.length')} required>
            {(c) => (
              <SelectInput {...c} value={hours} onChange={(e) => setHours(Number(e.target.value))}>
                {Array.from({ length: Math.max(1, Math.min(hoursLeft, CLOSE - OPEN)) }, (_, i) => i + 1).map((n) => <option key={n} value={n} disabled={n > maxHours}>{t('sub.hours', { count: n })}</option>)}
              </SelectInput>
            )}
          </Field>
        </div>
        <p className="text-sm text-ink-3">{t('sub.endsAt')} <bdi dir="ltr" className="font-medium tabular-nums text-ink">{end}</bdi> · {t('sub.uses', { count: hours, left: hoursLeft })}</p>
        <Field label={t('sub.note')}>{(c) => <TextArea {...c} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('sub.notePlaceholder')} />}</Field>
        {error && <p role="alert" className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      </form>
    </Dialog>
  );
}

/** The student's monthly hour package and their private session requests. */
export default function SubscriptionsPage() {
  const { t } = useTranslation('dashboardStudent');
  const f = useFormat();
  const toast = useToast();
  const qc = useQueryClient();
  const sub = useQuery({ queryKey: ['student', 'subscription', 'me'], queryFn: getMySubscription });
  const requests = useQuery({ queryKey: ['student', 'subscription', 'requests'], queryFn: getMySessionRequests });
  const cancel = useMutation({
    mutationFn: (id: string) => cancelSessionRequest(id),
    onSuccess: () => { toast.success(t('sub.toast.canceled')); void qc.invalidateQueries({ queryKey: ['student', 'subscription'] }); },
    onError: (err) => toast.error(t('sub.cancelError'), readApiError(err).message),
  });
  const [asking, setAsking] = useState(false);
  const [canceling, setCanceling] = useState<SessionRequest | null>(null);
  const lastCanceling = useRef<SessionRequest | null>(null);
  if (canceling) lastCanceling.current = canceling;

  const s = sub.data?.subscription;
  // /subscriptions/me names it 'plan'; the staff lists use 'planId'
  const raw = s as (typeof s & { plan?: { name: string; monthlyHours: number } | null }) | null | undefined;
  const plan = raw?.plan ?? (s && typeof s.planId === 'object' ? s.planId : null);
  const total = plan?.monthlyHours ?? s?.remainingHours ?? 0;
  const left = s?.remainingHours ?? 0;
  const canAsk = !!sub.data?.hasActiveSubscription && left > 0;

  const columns: Column<SessionRequest>[] = useMemo(
    () => [
      { key: 'when', header: t('sub.col.when'), cell: (r) => <span className="whitespace-nowrap tabular-nums text-ink">{f.custom(r.date, { weekday: 'short', day: 'numeric', month: 'short' })} · <bdi dir="ltr">{r.startTime}</bdi></span> },
      { key: 'length', header: t('sub.col.length'), cell: (r) => <span className="text-ink-2">{t('sub.hours', { count: r.durationHours })}</span> },
      { key: 'note', header: t('sub.col.note'), hideOnMobile: true, cell: (r) => <span className="line-clamp-1 max-w-64 text-ink-3" dir="auto">{r.status === 'declined' && r.declineReason ? t('sub.reason', { reason: r.declineReason }) : r.description || '—'}</span> },
      { key: 'status', header: t('sub.col.status'), cell: (r) => <Badge tone={TONE[r.status]}>{t(`sub.status.${r.status}`)}</Badge> },
      {
        key: 'actions',
        header: <span className="sr-only">{t('sub.col.actions')}</span>,
        align: 'end',
        cell: (r) => (r.status === 'pending' ? <RowMenu label={t('sub.actionsFor')} actions={[{ label: t('sub.cancelRequest'), icon: <Ban />, tone: 'danger', onClick: () => setCanceling(r) }]} /> : null),
      },
    ],
    [t, f],
  );

  return (
    <div className="space-y-5">
      <PageHeader title={t('sub.title')} description={t('sub.subtitle')} actions={canAsk ? <Button icon={<CalendarPlus />} onClick={() => setAsking(true)}>{t('sub.request')}</Button> : undefined} />

      {sub.isLoading ? (
        <div className="h-40 animate-pulse rounded-panel bg-rail" />
      ) : s && sub.data?.hasActiveSubscription ? (
        <section className="grid gap-5 rounded-panel bg-ink p-6 text-white md:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <p className="flex items-center gap-2 text-sm text-glow"><Sparkles className="size-4" aria-hidden />{t('sub.active')}</p>
            <h2 className="mt-1 text-2xl font-bold" dir="auto">{plan?.name ?? t('sub.plan')}</h2>
            <p className="mt-1 text-sm text-frost/75">{t('sub.period', { from: f.date(s.startsAt), to: f.date(s.endsAt) })}</p>
            <div className="mt-4 h-2.5 max-w-md overflow-hidden rounded-pill bg-white/15"><span className="block h-full rounded-pill bg-glow" style={{ width: `${total ? Math.min(100, (left / total) * 100) : 0}%` }} /></div>
          </div>
          <div className="text-start md:text-end">
            <p className="text-5xl font-bold tabular-nums text-glow">{left}</p>
            <p className="text-sm text-frost/75">{t('sub.hoursLeft', { total })}</p>
          </div>
        </section>
      ) : (
        <Panel><EmptyState icon={<CreditCard />} title={t('sub.none')} description={t('sub.noneHint')} /></Panel>
      )}

      <Panel className="p-0 sm:p-0">
        <div className="flex items-center justify-between gap-3 px-5 pt-5">
          <PanelTitle title={t('sub.requests')} />
        </div>
        {requests.isError ? (
          <EmptyState icon={<Hourglass />} title={t('sub.loadError')} action={<Button variant="secondary" onClick={() => void requests.refetch()}>{t('courses.retry')}</Button>} />
        ) : (
          <DataTable label={t('sub.requests')} columns={columns} rows={[...(requests.data ?? [])].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))} rowKey={(r) => r._id} loading={requests.isLoading}
            empty={<EmptyState icon={<Clock />} title={t('sub.noRequests')} description={canAsk ? t('sub.noRequestsHint') : undefined} action={canAsk ? <Button icon={<CalendarPlus />} onClick={() => setAsking(true)}>{t('sub.request')}</Button> : undefined} />} />
        )}
      </Panel>

      <RequestDialog open={asking} onClose={() => setAsking(false)} hoursLeft={left} />
      <ConfirmDialog
        open={!!canceling}
        onClose={() => setCanceling(null)}
        tone="danger"
        loading={cancel.isPending}
        title={t('sub.cancelTitle')}
        message={(canceling ?? lastCanceling.current) ? t('sub.cancelText', { date: f.date((canceling ?? lastCanceling.current)!.date), time: (canceling ?? lastCanceling.current)!.startTime }) : ''}
        confirmLabel={t('sub.cancelRequest')}
        cancelLabel={t('sub.keep')}
        onConfirm={() => cancel.mutate(canceling!._id, { onSettled: () => setCanceling(null) })}
      />
    </div>
  );
}
