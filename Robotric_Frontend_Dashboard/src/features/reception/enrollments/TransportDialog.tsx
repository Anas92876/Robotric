import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Dialog, Field, SelectInput, TextArea, TextInput } from '../../../ui';
import { useFormat } from '../../../app/format';
import { readApiError } from '../../../app/apiError';
import type { Enrollment, TransportationInput } from './api';
import { PAYMENT_METHODS } from './PaymentDialog';

interface TransportDialogProps {
  enrollment: Enrollment | null;
  onClose: () => void;
  onAdd: (t: TransportationInput) => Promise<unknown>;
  onPay: (body: { amount: number; paymentMethod: string; notes?: string }) => Promise<unknown>;
}

type Row = { amount: string; dueDate: string };

/**
 * Transportation (priced in Syrian pounds): adds it to an enrollment that has none —
 * with an optional first payment and installments for the rest — or records a
 * payment on existing transportation.
 */
export function TransportDialog({ enrollment, onClose, onAdd, onPay }: TransportDialogProps) {
  const { t } = useTranslation('dashboardReception');
  const f = useFormat();
  const existing = !!enrollment?.transportation?.enabled;
  const [total, setTotal] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTotal('');
    setAmount('');
    setMethod('cash');
    setNotes('');
    setRows([]);
    setError('');
  }, [enrollment]);

  const sp = (n: number) => `${Math.round(n).toLocaleString(f.locale)} ${t('enrollments.sp')}`;
  const tr = enrollment?.transportation;
  const totalN = parseFloat(total) || 0;
  const paidN = parseFloat(amount) || 0;
  const rest = Math.max(0, totalN - paidN);
  const rowsSum = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (existing) {
      if (!(paidN > 0)) return setError(t('enrollments.pay.amountError'));
      if (tr && paidN > tr.remainingAmount) return setError(t('enrollments.pay.tooMuch', { remaining: sp(tr.remainingAmount) }));
    } else {
      if (!(totalN > 0)) return setError(t('enrollments.transport.totalError'));
      if (paidN < 0 || paidN > totalN) return setError(t('enrollments.transport.paidError'));
      if (rest > 0) {
        if (rows.length === 0 || rows.some((r) => !r.amount || !r.dueDate)) return setError(t('enrollments.transport.installmentsRequired', { rest: sp(rest) }));
        if (Math.round(rowsSum) !== Math.round(rest)) return setError(t('enrollments.transport.installmentsMismatch', { rest: sp(rest), sum: sp(rowsSum) }));
      }
    }
    setSaving(true);
    try {
      if (existing) await onPay({ amount: paidN, paymentMethod: method, notes: notes.trim() || undefined });
      else
        await onAdd({
          enabled: true,
          totalAmount: totalN,
          ...(paidN > 0 ? { paidNow: paidN, paymentMethod: method, notes: notes.trim() || undefined } : {}),
          ...(rest > 0 ? { installments: rows.map((r) => ({ amount: parseFloat(r.amount), dueDate: new Date(r.dueDate).toISOString() })) } : {}),
        });
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
      title={existing ? t('enrollments.transport.payTitle') : t('enrollments.transport.addTitle')}
      description={enrollment ? `${enrollment.student?.name ?? '—'} · ${enrollment.course?.title ?? '—'}` : undefined}
      closeLabel={t('enrollments.cancel')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {t('enrollments.cancel')}
          </Button>
          <Button type="submit" form="transport-form" loading={saving}>
            {existing ? t('enrollments.pay.submit') : t('enrollments.transport.add')}
          </Button>
        </>
      }
    >
      <form id="transport-form" onSubmit={submit} noValidate className="space-y-4">
        {existing && tr && (
          <div className="grid grid-cols-3 gap-2 rounded-card bg-rail p-3 text-center">
            <div>
              <p className="text-xs text-ink-3">{t('enrollments.total')}</p>
              <p className="font-semibold tabular-nums text-ink">{sp(tr.totalAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-ink-3">{t('enrollments.paid')}</p>
              <p className="font-semibold tabular-nums text-success">{sp(tr.paidAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-ink-3">{t('enrollments.remaining')}</p>
              <p className="font-semibold tabular-nums text-ink">{sp(tr.remainingAmount)}</p>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {!existing && (
            <Field label={t('enrollments.transport.total')} required hint={t('enrollments.inSP')}>
              {(p) => <TextInput {...p} type="number" min="0" step="1" dir="ltr" value={total} onChange={(e) => { setTotal(e.target.value); setError(''); }} />}
            </Field>
          )}
          <Field label={existing ? t('enrollments.pay.amount') : t('enrollments.transport.paidNow')} required={existing} hint={t('enrollments.inSP')}>
            {(p) => <TextInput {...p} type="number" min="0" step="1" dir="ltr" value={amount} onChange={(e) => { setAmount(e.target.value); setError(''); }} />}
          </Field>
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
          <Field label={t('enrollments.pay.notes')} className={existing ? '' : 'sm:col-span-2'}>
            {(p) => <TextArea {...p} value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-11" rows={1} />}
          </Field>
        </div>

        {!existing && rest > 0 && (
          <fieldset className="rounded-card border border-line p-4">
            <legend className="px-1 text-sm font-medium text-ink">{t('enrollments.transport.installments', { rest: sp(rest) })}</legend>
            <div className="space-y-2">
              {rows.map((r, i) => (
                <div key={i} className="flex items-end gap-2">
                  <Field label={t('enrollments.transport.amount')} className="flex-1">
                    {(p) => <TextInput {...p} type="number" min="0" dir="ltr" value={r.amount} onChange={(e) => setRows((x) => x.map((y, j) => (j === i ? { ...y, amount: e.target.value } : y)))} />}
                  </Field>
                  <Field label={t('enrollments.transport.dueDate')} className="flex-1">
                    {(p) => <TextInput {...p} type="date" value={r.dueDate} onChange={(e) => setRows((x) => x.map((y, j) => (j === i ? { ...y, dueDate: e.target.value } : y)))} />}
                  </Field>
                  <Button variant="ghost" iconOnly icon={<Trash2 />} aria-label={t('enrollments.transport.removeRow')} onClick={() => setRows((x) => x.filter((_, j) => j !== i))} />
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <Button variant="secondary" size="sm" icon={<Plus />} onClick={() => setRows((x) => [...x, { amount: '', dueDate: '' }])}>
                {t('enrollments.transport.addRow')}
              </Button>
              <span className="text-xs tabular-nums text-ink-3">{t('enrollments.transport.sum', { sum: sp(rowsSum), rest: sp(rest) })}</span>
            </div>
          </fieldset>
        )}
        {error && (
          <p role="alert" className="rounded-input bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
            {error}
          </p>
        )}
      </form>
    </Dialog>
  );
}
