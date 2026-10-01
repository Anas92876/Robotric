import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { readApiError } from '../../../app/apiError';
import { Button, Dialog, Field, TextInput } from '../../../ui';
import type { Driver, DriverInput } from './api';

interface Props {
  open: boolean;
  onClose: () => void;
  /** The driver being edited; null to add one. */
  driver: Driver | null;
  saving: boolean;
  onSave: (d: DriverInput) => Promise<void>;
}

const EMPTY = { name: '', email: '', password: '', phoneNumber: '', vehiclePlate: '', vehicleModel: '', vehicleColor: '', vehicleCapacity: '5' };

/** Add a driver (with a login for the driver app) or edit their car details. */
export function DriverDialog({ open, onClose, driver, saving, onSave }: Props) {
  const { t } = useTranslation('dashboardReception');
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    if (!open) return;
    const p = driver?.profile_data;
    setForm(
      driver
        ? { ...EMPTY, name: driver.name, phoneNumber: p?.phoneNumber ?? '', vehiclePlate: p?.vehiclePlate ?? '', vehicleModel: p?.vehicleModel ?? '', vehicleColor: p?.vehicleColor ?? '', vehicleCapacity: String(p?.vehicleCapacity ?? driver.capacity ?? 5) }
        : EMPTY,
    );
    setError('');
  }, [open, driver]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setError(t('transport.driver.errName'));
    if (!driver && (!form.email.trim() || form.password.length < 6)) return setError(t('transport.driver.errLogin'));
    setError('');
    const opt = (v: string) => v.trim() || undefined;
    try {
      await onSave({
        name: form.name.trim(),
        ...(driver ? {} : { email: form.email.trim(), password: form.password }),
        phoneNumber: opt(form.phoneNumber),
        vehiclePlate: opt(form.vehiclePlate),
        vehicleModel: opt(form.vehicleModel),
        vehicleColor: opt(form.vehicleColor),
        vehicleCapacity: parseInt(form.vehicleCapacity, 10) || 5,
      });
    } catch (err) {
      setError(readApiError(err).message);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={driver ? t('transport.driver.editTitle', { name: driver.name }) : t('transport.driver.newTitle')}
      closeLabel={t('enrollments.cancel')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('enrollments.cancel')}
          </Button>
          <Button type="submit" form="driver-form" loading={saving}>
            {t(driver ? 'cal.save' : 'transport.driver.create')}
          </Button>
        </>
      }
    >
      <form id="driver-form" onSubmit={submit} className="grid gap-3 sm:grid-cols-2" noValidate>
        <Field label={t('transport.driver.name')} required className="sm:col-span-2">
          {(c) => <TextInput {...c} value={form.name} onChange={set('name')} autoFocus />}
        </Field>
        {!driver && (
          <>
            <Field label={t('transport.driver.email')} required hint={t('transport.driver.loginHint')}>
              {(c) => <TextInput {...c} type="email" dir="ltr" autoComplete="off" value={form.email} onChange={set('email')} />}
            </Field>
            <Field label={t('transport.driver.password')} required hint={t('transport.driver.passwordHint')}>
              {(c) => <TextInput {...c} type="password" autoComplete="new-password" value={form.password} onChange={set('password')} />}
            </Field>
          </>
        )}
        <Field label={t('transport.driver.phone')}>{(c) => <TextInput {...c} type="tel" dir="ltr" value={form.phoneNumber} onChange={set('phoneNumber')} />}</Field>
        <Field label={t('transport.driver.capacity')} hint={t('transport.driver.capacityHint')}>
          {(c) => <TextInput {...c} type="number" min={1} max={60} inputMode="numeric" value={form.vehicleCapacity} onChange={set('vehicleCapacity')} />}
        </Field>
        <Field label={t('transport.driver.model')}>{(c) => <TextInput {...c} value={form.vehicleModel} onChange={set('vehicleModel')} />}</Field>
        <Field label={t('transport.driver.color')}>{(c) => <TextInput {...c} value={form.vehicleColor} onChange={set('vehicleColor')} />}</Field>
        <Field label={t('transport.driver.plate')}>{(c) => <TextInput {...c} dir="ltr" value={form.vehiclePlate} onChange={set('vehiclePlate')} />}</Field>
        {error && (
          <p role="alert" className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger sm:col-span-2">
            {error}
          </p>
        )}
      </form>
    </Dialog>
  );
}
