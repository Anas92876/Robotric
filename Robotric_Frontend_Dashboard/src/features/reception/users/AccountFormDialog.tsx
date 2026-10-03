import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { Button, Dialog, Field, SelectInput, TextInput } from '../../../ui';
import { readApiError } from '../../../app/apiError';
import type { Account, AccountInput } from './api';
import { assignableRoles } from './roles';

interface AccountFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** The account being edited; none = create a new one. */
  account?: Account | null;
  viewerRole?: string;
  onSubmit: (input: AccountInput) => Promise<unknown>;
}

type Errors = Partial<Record<'name' | 'email' | 'password' | 'phone' | 'form', string>>;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Create or edit an account: name, email, phone, role and (new or changed) password. */
export function AccountFormDialog({ open, onClose, account, viewerRole, onSubmit }: AccountFormDialogProps) {
  const { t } = useTranslation(['dashboardReception', 'dashboardNav']);
  const editing = !!account;
  const [values, setValues] = useState({ name: '', email: '', phone: '', role: 'student', password: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValues({ name: account?.name ?? '', email: account?.email ?? '', phone: account?.profile?.phone ?? '', role: account?.role ?? 'student', password: '' });
    setErrors({});
    setShowPassword(false);
  }, [open, account]);

  // Keep the account's current role in the list even if this viewer could not assign it
  const roles = assignableRoles(viewerRole);
  const roleOptions = account && !roles.includes(account.role as (typeof roles)[number]) ? [account.role, ...roles] : roles;

  const set = (k: keyof typeof values) => (e: { target: { value: string } }) => {
    setValues((v) => ({ ...v, [k]: e.target.value }));
    if (errors[k as keyof Errors]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const validate = (): Errors => {
    const e: Errors = {};
    if (values.name.trim().length < 2) e.name = t('users.form.nameError');
    if (!EMAIL.test(values.email.trim())) e.email = t('users.form.emailError');
    if (!editing && !values.password) e.password = t('users.form.passwordRequired');
    else if (values.password && values.password.length < 6) e.password = t('users.form.passwordShort');
    if (values.phone && !/^[0-9+\-\s()]{7,}$/.test(values.phone.trim())) e.phone = t('users.form.phoneError');
    return e;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    const input: AccountInput = { name: values.name.trim(), email: values.email.trim(), role: values.role, phone: values.phone.trim() || undefined };
    if (values.password) input.password = values.password;
    setSaving(true);
    try {
      await onSubmit(input);
      onClose();
    } catch (err) {
      const { status, code, message } = readApiError(err);
      if (status === 409) setErrors({ email: t('users.errors.emailTaken') });
      else if (code === 'PRIVILEGED_ROLE') setErrors({ form: t('users.errors.privileged') });
      else setErrors({ form: message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? () => {} : onClose}
      title={editing ? t('users.form.editTitle') : t('users.form.createTitle')}
      description={editing ? account?.email : t('users.form.createNote')}
      closeLabel={t('users.form.cancel')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {t('users.form.cancel')}
          </Button>
          <Button type="submit" form="account-form" loading={saving}>
            {editing ? t('users.form.save') : t('users.form.create')}
          </Button>
        </>
      }
    >
      <form id="account-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        {errors.form && (
          <p role="alert" className="rounded-input bg-danger-soft px-3.5 py-2.5 text-sm text-danger sm:col-span-2">
            {errors.form}
          </p>
        )}
        <Field label={t('users.form.name')} required error={errors.name} className="sm:col-span-2">
          {(p) => <TextInput {...p} value={values.name} onChange={set('name')} autoComplete="off" />}
        </Field>
        <Field label={t('users.form.email')} required error={errors.email}>
          {(p) => <TextInput {...p} type="email" dir="ltr" value={values.email} onChange={set('email')} autoComplete="off" />}
        </Field>
        <Field label={t('users.form.phone')} error={errors.phone}>
          {(p) => <TextInput {...p} type="tel" dir="ltr" value={values.phone} onChange={set('phone')} placeholder="09xx xxx xxx" />}
        </Field>
        <Field label={t('users.form.role')} required>
          {(p) => (
            <SelectInput {...p} value={values.role} onChange={set('role')}>
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {t(`dashboardNav:role.${r}`)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Field label={t('users.form.password')} required={!editing} error={errors.password} hint={editing ? t('users.form.passwordKeep') : t('users.form.passwordHint')}>
          {(p) => (
            <div className="relative">
              <TextInput {...p} type={showPassword ? 'text' : 'password'} dir="ltr" value={values.password} onChange={set('password')} autoComplete="new-password" className="pe-11" />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? t('users.form.hidePassword') : t('users.form.showPassword')}
                className="absolute end-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-ink-3 hover:bg-rail hover:text-ink"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          )}
        </Field>
      </form>
    </Dialog>
  );
}
