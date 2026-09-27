'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Icon } from '@/lib/icons';

// Text for both forms (content/<lang>/site.json → auth)
export type AuthText = Record<string, string> & { strength?: string[] };
type T = Record<string, string>;

// Same storage keys and redirects as the existing Robotrick app, so the dashboard recognizes the session
const TOKEN_KEY = 'token';
const USER_KEY = 'user';
const REMEMBER_KEY = 'robotrick.rememberedEmail';
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const safe = <R,>(fn: () => R, fallback: R): R => { try { return fn(); } catch { return fallback; } };

async function post(apiBase: string, path: string, body: object, token?: string) {
  const res = await fetch(`${apiBase}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
    credentials: 'include',
  });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}
const serverMessage = (json: { message?: string; error?: { message?: string } }) => json?.error?.message || json?.message;

/* ---------- small building blocks ---------- */

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className={`field${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? <small className="field__error" id={`${id}-err`}>{error}</small> : hint ? <small className="field__hint">{hint}</small> : null}
    </div>
  );
}

function PasswordInput({ id, value, onChange, placeholder, show, hide, autoComplete, invalid }: {
  id: string; value: string; onChange: (v: string) => void; placeholder: string; show: string; hide: string; autoComplete: string; invalid?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="pw">
      <input id={id} type={visible ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        autoComplete={autoComplete} aria-invalid={invalid || undefined} aria-describedby={invalid ? `${id}-err` : undefined} />
      <button type="button" className="pw__toggle" onClick={() => setVisible((v) => !v)} aria-label={visible ? hide : show} aria-pressed={visible}>
        <Icon name={visible ? 'eyeOff' : 'eye'} />
      </button>
    </div>
  );
}

function Alert({ kind, children }: { kind: 'ok' | 'err'; children: ReactNode }) {
  return <div className={`form__status ${kind === 'ok' ? 'is-ok' : 'is-err'}`} role={kind === 'err' ? 'alert' : 'status'}>{children}</div>;
}

/* ---------- Sign in (+ forgot password flow) ---------- */

type Step = 'login' | 'forgot-email' | 'forgot-otp' | 'forgot-done';

export function LoginForm({ t, lang, apiBase, dashboardUrl }: { t: T; lang: string; apiBase: string; dashboardUrl: string }) {
  const params = useSearchParams();
  const [step, setStep] = useState<Step>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [welcome, setWelcome] = useState(false);
  // forgot-password state
  const [otp, setOtp] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');
  const [resent, setResent] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const remembered = safe(() => localStorage.getItem(REMEMBER_KEY), null);
    const fromSignup = params.get('email');
    if (fromSignup) setEmail(fromSignup);
    else if (remembered) { setEmail(remembered); setRemember(true); }
    setSignedIn(!!safe(() => localStorage.getItem(TOKEN_KEY), null));
  }, [params]);

  useEffect(() => { title.current?.focus(); }, [step]);

  const goToDashboard = (role?: string) => { window.location.href = `${dashboardUrl}${role === 'student' ? '/student' : '/dashboard'}`; };
  const storedRole = () => safe(() => JSON.parse(localStorage.getItem(USER_KEY) || '{}').role as string | undefined, undefined);

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    const errs = { email: isEmail(email.trim()) ? undefined : t.errEmail, password: password ? undefined : t.errPassword };
    setErrors(errs);
    if (errs.email || errs.password) return;
    setBusy(true);
    try {
      const { res, json } = await post(apiBase, '/auth/login', { email: email.trim(), password });
      if (!res.ok) {
        setErrors({ form: res.status === 400 || res.status === 401 ? t.errInvalid : res.status >= 500 ? t.errServer : serverMessage(json) || t.errGeneric });
        return;
      }
      const { token, ...user } = json.data ?? {};
      safe(() => {
        if (token) localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        if (remember) localStorage.setItem(REMEMBER_KEY, email.trim()); else localStorage.removeItem(REMEMBER_KEY);
      }, undefined);
      setWelcome(true);
      setTimeout(() => goToDashboard(user.role), 700);
    } catch {
      setErrors({ form: t.errNetwork });
    } finally { setBusy(false); }
  }

  async function signOut() {
    const token = safe(() => localStorage.getItem(TOKEN_KEY), null) ?? undefined;
    try { await post(apiBase, '/auth/logout', {}, token); } catch { /* sign out locally anyway */ }
    safe(() => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); }, undefined);
    setSignedIn(false);
  }

  async function requestCode(e?: FormEvent) {
    e?.preventDefault();
    if (!isEmail(email.trim())) { setErrors({ email: t.errEmail }); return; }
    setErrors({}); setBusy(true);
    // The backend never reveals whether an email exists, so we always move on
    try { await post(apiBase, '/auth/forgot-password/request', { email: email.trim() }); } catch { /* same as live site */ }
    setBusy(false);
    if (e) setStep('forgot-otp'); else setResent(true);
  }

  async function resetPassword(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) { setErrors({ form: t.errCode }); return; }
    if (newPw.length < 8) { setErrors({ form: t.errNewPw }); return; }
    if (newPw !== newPw2) { setErrors({ form: t.errMatch }); return; }
    setErrors({}); setBusy(true);
    try {
      const { res, json } = await post(apiBase, '/auth/forgot-password/confirm', { email: email.trim(), otp, newPassword: newPw });
      if (!res.ok) { setErrors({ form: serverMessage(json) || t.errOtp }); return; }
      setStep('forgot-done'); setPassword(''); setOtp(''); setNewPw(''); setNewPw2('');
    } catch { setErrors({ form: t.errNetwork }); } finally { setBusy(false); }
  }

  const back = () => { setStep('login'); setErrors({}); setResent(false); };

  if (step === 'forgot-email') return (
    <form className="auth-form" onSubmit={requestCode} noValidate>
      <div className="auth-form__head">
        <span className="auth-form__icon"><Icon name="lock" /></span>
        <h1 ref={title} tabIndex={-1}>{t.forgotTitle}</h1>
        <p>{t.forgotText}</p>
      </div>
      <Field id="fp-email" label={t.email} error={errors.email}>
        <input id="fp-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPh} aria-invalid={!!errors.email || undefined} />
      </Field>
      <button className="btn btn--primary btn--lg btn--block" type="submit" disabled={busy}>{busy ? t.sending : t.sendCode}</button>
      <p className="auth-form__switch">{t.rememberPw} <button type="button" className="text-link" onClick={back}>{t.signIn}</button></p>
    </form>
  );

  if (step === 'forgot-otp') return (
    <form className="auth-form" onSubmit={resetPassword} noValidate>
      <div className="auth-form__head">
        <span className="auth-form__icon"><Icon name="mail" /></span>
        <h1 ref={title} tabIndex={-1}>{t.checkEmail}</h1>
        <p>{t.checkEmailText} <strong className="ltr">{email}</strong></p>
      </div>
      {errors.form ? <Alert kind="err">{errors.form}</Alert> : null}
      {resent ? <Alert kind="ok">{t.checkEmailText}</Alert> : null}
      <Field id="fp-otp" label={t.code}>
        <input id="fp-otp" className="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="••••••" dir="ltr" />
      </Field>
      <Field id="fp-new" label={t.newPassword} hint={t.newPasswordHint}>
        <PasswordInput id="fp-new" value={newPw} onChange={setNewPw} placeholder={t.newPasswordHint} show={t.show} hide={t.hide} autoComplete="new-password" />
      </Field>
      <Field id="fp-new2" label={t.confirmNew}>
        <PasswordInput id="fp-new2" value={newPw2} onChange={setNewPw2} placeholder={t.confirmNewPh} show={t.show} hide={t.hide} autoComplete="new-password" />
      </Field>
      <button className="btn btn--primary btn--lg btn--block" type="submit" disabled={busy}>{busy ? t.resetting : t.resetPassword}</button>
      <div className="auth-form__row">
        <button type="button" className="text-link" onClick={() => { setStep('forgot-email'); setErrors({}); }}><Icon name="arrowLeft" className="arrow" /> {t.differentEmail}</button>
        <button type="button" className="text-link" onClick={() => requestCode()} disabled={busy}>{t.resend}</button>
      </div>
    </form>
  );

  if (step === 'forgot-done') return (
    <div className="auth-form">
      <div className="auth-form__head">
        <span className="auth-form__icon auth-form__icon--ok"><Icon name="check" /></span>
        <h1 ref={title} tabIndex={-1}>{t.resetDone}</h1>
        <p>{t.resetDoneText}</p>
      </div>
      <button className="btn btn--primary btn--lg btn--block" type="button" onClick={back}>{t.backToSignIn}</button>
    </div>
  );

  return (
    <form className="auth-form" onSubmit={onLogin} noValidate>
      <div className="auth-form__head">
        <h1 ref={title} tabIndex={-1}>{t.loginTitle}</h1>
        <p>{t.loginSubtitle}</p>
      </div>

      {params.get('registered') ? <Alert kind="ok">{t.created}</Alert> : null}
      {signedIn && !welcome ? (
        <div className="auth-note">
          <span>{t.alreadyIn}</span>
          <span className="auth-note__actions">
            <button type="button" className="btn btn--primary btn--sm" onClick={() => goToDashboard(storedRole())}>{t.goDashboard}</button>
            <button type="button" className="text-link" onClick={signOut}>{t.signOut}</button>
          </span>
        </div>
      ) : null}
      {welcome ? <Alert kind="ok">{t.welcome}</Alert> : null}
      {errors.form ? <Alert kind="err">{errors.form}</Alert> : null}

      <Field id="li-email" label={t.email} error={errors.email}>
        <div className="input-icon">
          <Icon name="mail" />
          <input id="li-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPh}
            aria-invalid={!!errors.email || undefined} aria-describedby={errors.email ? 'li-email-err' : undefined} />
        </div>
      </Field>
      <Field id="li-pw" label={t.password} error={errors.password}>
        <PasswordInput id="li-pw" value={password} onChange={setPassword} placeholder={t.passwordPh} show={t.show} hide={t.hide} autoComplete="current-password" invalid={!!errors.password} />
      </Field>

      <div className="auth-form__row">
        <label className="check"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> <span>{t.remember}</span></label>
        <button type="button" className="text-link" onClick={() => { setStep('forgot-email'); setErrors({}); }}>{t.forgot}</button>
      </div>

      <button className="btn btn--primary btn--lg btn--block" type="submit" disabled={busy || welcome}>{busy ? t.signingIn : t.signIn}</button>
      <p className="auth-form__terms">{t.signInTerms}</p>
    </form>
  );
}

/* ---------- Sign up ---------- */

function strength(pw: string) {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

export function SignupForm({ t, labels, lang, apiBase }: { t: T; labels: string[]; lang: string; apiBase: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string; pw?: string; pw2?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const score = strength(pw);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = {
      name: name.trim().length >= 2 ? undefined : t.errName,
      email: isEmail(email.trim()) ? undefined : t.errEmail,
      pw: pw.length >= 6 ? undefined : t.errPw6,
      pw2: pw === pw2 ? undefined : t.errMatch,
    };
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    setBusy(true);
    try {
      const { res, json } = await post(apiBase, '/auth/register', { name: name.trim(), email: email.trim(), password: pw });
      if (!res.ok) { setErrors({ form: serverMessage(json) || t.errSignup }); return; }
      window.gtag?.('event', 'sign_up');
      router.push(`/${lang}/login?registered=1&email=${encodeURIComponent(email.trim())}`);
    } catch { setErrors({ form: t.errNetwork }); } finally { setBusy(false); }
  }

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <div className="auth-form__head">
        <h1 tabIndex={-1}>{t.signupTitle}</h1>
        <p>{t.signupSubtitle}</p>
      </div>
      {errors.form ? <Alert kind="err">{errors.form}</Alert> : null}

      <Field id="su-name" label={t.fullName} hint={t.fullNameHint} error={errors.name}>
        <div className="input-icon">
          <Icon name="users" />
          <input id="su-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.fullNamePh} aria-invalid={!!errors.name || undefined} />
        </div>
      </Field>
      <Field id="su-email" label={t.email} error={errors.email}>
        <div className="input-icon">
          <Icon name="mail" />
          <input id="su-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPh} aria-invalid={!!errors.email || undefined} />
        </div>
      </Field>
      <div className="form__row">
        <Field id="su-pw" label={t.password} error={errors.pw}>
          <PasswordInput id="su-pw" value={pw} onChange={setPw} placeholder={t.createPasswordPh} show={t.show} hide={t.hide} autoComplete="new-password" invalid={!!errors.pw} />
        </Field>
        <Field id="su-pw2" label={t.confirmPassword} error={errors.pw2}>
          <PasswordInput id="su-pw2" value={pw2} onChange={setPw2} placeholder={t.confirmPasswordPh} show={t.show} hide={t.hide} autoComplete="new-password" invalid={!!errors.pw2} />
        </Field>
      </div>
      <div className="strength" aria-live="polite">
        <div className="strength__bars" data-score={pw ? score : 0}>{[1, 2, 3, 4].map((i) => <span key={i} />)}</div>
        <small>{pw ? `${t.strengthLabel}: ${labels[Math.max(0, score - 1)]}` : t.passwordHint}</small>
      </div>

      <button className="btn btn--primary btn--lg btn--block" type="submit" disabled={busy}>{busy ? t.creating : t.createAccount}</button>
      <p className="auth-form__switch">{t.haveAccount} <Link className="text-link" href={`/${lang}/login`}>{t.signInHere}</Link></p>
      <p className="auth-form__terms">{t.signupTerms}</p>
    </form>
  );
}
