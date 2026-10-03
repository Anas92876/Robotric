import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { Button, Dialog, Field, SelectInput, TextArea, TextInput } from '../../../ui';
import { cn } from '../../../lib/utils';
import { useFormat } from '../../../app/format';
import { readApiError } from '../../../app/apiError';
import type { Enrollment, PaymentInput } from './api';

export const PAYMENT_METHODS = ['cash', 'card', 'bank_transfer', 'check'] as const;

interface PaymentDialogProps {
  enrollment: Enrollment | null;
  onClose: () => void;
  exchangeRate: number;
  onPay: (body: PaymentInput) => Promise<unknown>;
}

/** Record a course payment: pick installments or type an amount, in USD or Syrian pounds. */
export function PaymentDialog({ enrollment, onClose, exchangeRate, onPay }: PaymentDialogProps) {
  const { t } = useTranslation('dashboardReception');
  const f = useFormat();
  const [currency, setCurrency] = useState<'usd' | 'sp'>('usd');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<string>('cash');
  const [notes, setNotes] = useState('');
  const [picked, setPicked] = useState<number[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!enrollment) return;
    setCurrency('usd');
    setAmount('');
    setMethod('cash');
    setNotes('');
    setPicked([]);
    setError('');
  }, [enrollment]);

  const remaining = enrollment?.payment?.remainingAmount ?? 0;
  const installments = (enrollment?.payment?.installments ?? []).map((i, index) => ({ ...i, index })).filter((i) => i.status !== 'paid');
  const toShown = (usd: number) => (currency === 'usd' ? usd : Math.round(usd * exchangeRate));
  const sp = (usd: number) => `${Math.round(usd * exchangeRate).toLocaleString(f.locale)} ${t('enrollments.sp')}`;

  const pick = (index: number) => {
    const next = picked.includes(index) ? picked.filter((i) => i !== index) : [...picked, index];
    setPicked(next);
    const usd = next.reduce((s, i) => s + (enrollment?.payment.installments[i]?.amount ?? 0), 0);
    setAmount(usd > 0 ? String(toShown(usd)) : '');
    setError('');
  };

  const switchCurrency = (c: 'usd' | 'sp') => {
    if (c === currency) return;
    const n = parseFloat(amount);
    if (!isNaN(n)) setAmount(String(c === 'sp' ? Math.round(n * exchangeRate) : Math.round((n / exchangeRate) * 100) / 100));
    setCurrency(c);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const typed = parseFloat(amount);
    const usd = currency === 'sp' ? typed / exchangeRate : typed;
    if (isNaN(typed) || typed <= 0) return setError(t('enrollments.pay.amountError'));
    if (usd > remaining + 0.005) return setError(t('enrollments.pay.tooMuch', { remaining: currency === 'usd' ? f.money(remaining) : sp(remaining) }));
    setSaving(true);
    try {
      await onPay({ amount: Math.round(usd * 100) / 100, paymentMethod: method, notes: notes.trim() || undefined, ...(currency === 'sp' ? { paymentCurrency: 'sp' as const, amountInSP: typed } : {}) });
      onClose();
    } catch (err) {
      setError(readApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={!!enrollment}
      onClose={saving ? () => {} : onClose}
      size="lg"
      title={t('enrollments.pay.title')}
      description={enrollment ? `${enrollment.student?.name ?? '—'} · ${enrollment.course?.title ?? '—'}` : undefined}
      closeLabel={t('enrollments.cancel')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {t('enrollments.cancel')}
          </Button>
          <Button type="submit" form="payment-form" loading={saving}>
            {t('enrollments.pay.submit')}
          </Button>
        </>
      }
    >
      <form id="payment-form" onSubmit={submit} noValidate className="space-y-4">
        <div className="grid grid-cols-3 gap-2 rounded-card bg-rail p-3 text-center">
          <div>
            <p className="text-xs text-ink-3">{t('enrollments.total')}</p>
            <p className="font-semibold tabular-nums text-ink">{f.money(enrollment?.payment.totalAmount ?? 0)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-3">{t('enrollments.paid')}</p>
            <p className="font-semibold tabular-nums text-success">{f.money(enrollment?.payment.paidAmount ?? 0)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-3">{t('enrollments.remaining')}</p>
            <p className="font-semibold tabular-nums text-ink">{f.money(remaining)}</p>
            <p className="text-[11px] tabular-nums text-ink-4">{sp(remaining)}</p>
          </div>
        </div>

        {installments.length > 0 && (
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-ink">{t('enrollments.pay.pickInstallments')}</legend>
            <div className="max-h-48 space-y-1.5 overflow-y-auto">
              {installments.map((i) => {
                const on = picked.includes(i.index);
                return (
                  <button
                    key={i.index}
                    type="button"
                    aria-pressed={on}
                    onClick={() => pick(i.index)}
                    className={cn('flex w-full items-center gap-3 rounded-input border px-3 py-2.5 text-start text-sm transition-colors focus-visible:focus-ring', on ? 'border-ink bg-tint-leaf' : 'border-line hover:border-line-strong')}
                  >
                    <span className={cn('grid size-5 shrink-0 place-items-center rounded-md border', on ? 'border-ink bg-ink text-white' : 'border-line-strong')}>{on && <Check className="size-3.5" />}</span>
                    <span className="flex-1 text-ink">
                      {t('enrollments.pay.installment', { n: i.index + 1 })}
                      <span className="ms-2 text-xs text-ink-4">{t('enrollments.pay.due', { date: f.date(i.dueDate) })}</span>
                      {i.status === 'overdue' && <span className="ms-2 rounded-pill bg-danger-soft px-2 py-0.5 text-[11px] font-medium text-danger">{t('enrollments.overdue')}</span>}
                    </span>
                    <span className="font-semibold tabular-nums text-ink">{f.money(i.amount)}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Field label={t('enrollments.pay.amount')} required error={error || undefined}>
            {(p) => (
              <TextInput
                {...p}
                type="number"
                inputMode="decimal"
                min="0"
                step={currency === 'usd' ? '0.01' : '1'}
                dir="ltr"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setPicked([]);
                  setError('');
                }}
              />
            )}
          </Field>
          <div className="grid gap-1.5">
            <span className="text-sm font-medium text-ink">{t('enrollments.pay.currency')}</span>
            <div role="group" className="flex h-11 items-center gap-0.5 rounded-pill border border-line bg-rail p-1">
              {(['usd', 'sp'] as const).map((c) => (
                <button key={c} type="button" aria-pressed={currency === c} onClick={() => switchCurrency(c)} className={cn('h-full rounded-pill px-4 text-sm font-medium', currency === c ? 'bg-ink text-white' : 'text-ink-3 hover:text-ink')}>
                  {c === 'usd' ? 'USD $' : t('enrollments.sp')}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="-mt-2 text-xs text-ink-4">
          {t('enrollments.pay.rate', { rate: exchangeRate.toLocaleString(f.locale) })}
          <button type="button" className="ms-2 font-medium text-ink underline underline-offset-2" onClick={() => { setAmount(String(toShown(remaining))); setPicked([]); setError(''); }}>
            {t('enrollments.pay.payAll')}
          </button>
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('enrollments.pay.method')}>
            {(p) => (
              <SelectInput {...p} value={method} onChange={(e) => setMethod(e.target.value)}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {t(`enrollments.methods.${m}`)}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
          <Field label={t('enrollments.pay.notes')}>
            {(p) => <TextArea {...p} value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-11" rows={1} />}
          </Field>
        </div>
      </form>
    </Dialog>
  );
}
