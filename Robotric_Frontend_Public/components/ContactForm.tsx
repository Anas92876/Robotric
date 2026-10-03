'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { Icon } from '@/lib/icons';

type Labels = {
  form: { nameLabel: string; namePlaceholder: string; phoneLabel: string; phonePlaceholder: string; subjectLabel: string;
    subjectOptions: { inquiry: string; partnership: string; general: string; consultation: string; other: string };
    customSubjectPlaceholder: string; messageLabel: string; messagePlaceholder: string; submit: string; submitting: string; orConnect: string; whatsapp: string };
  validation: { nameRequired: string; nameMinLength: string; phoneRequired: string; phoneInvalid: string; formError: string; success: string; successMessage: string };
};

const KEYS = ['inquiry', 'partnership', 'general', 'consultation', 'other'] as const;
type Key = (typeof KEYS)[number];

// Posts to {apiBase}/contact exactly like robotrick.net: { name, phone, subject (visible label or custom text), message? }
export default function ContactForm({ labels, apiBase, waNumber, waHello, heading, submitLabel, defaultSubject = 'inquiry', idPrefix = 'c' }: {
  labels: Labels; apiBase: string; waNumber: string; waHello: string; heading?: string; submitLabel?: string; defaultSubject?: Key; idPrefix?: string;
}) {
  const { form: f, validation: v } = labels;
  const params = useSearchParams();
  const [subject, setSubject] = useState<Key>(defaultSubject);
  const [values, setValues] = useState({ name: '', phone: '', custom: '', message: '' });
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [status, setStatus] = useState<{ ok: boolean; text: string; wa?: string } | null>(null);
  const [sending, setSending] = useState(false);

  // ?subject=inquiry|partnership|general|consultation preselects an option
  useEffect(() => {
    const q = params.get('subject');
    if (q && (KEYS as readonly string[]).includes(q)) setSubject(q as Key);
  }, [params]);

  const validate = () => {
    const name = values.name.trim(), phone = values.phone.trim();
    const e = {
      name: !name ? v.nameRequired : name.length < 2 ? v.nameMinLength : undefined,
      phone: !phone ? v.phoneRequired : !/^[0-9+\-\s()]{8,}$/.test(phone) ? v.phoneInvalid : undefined,
    };
    setErrors(e);
    return !e.name && !e.phone;
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) { setStatus({ ok: false, text: v.formError }); return; }
    const subjectText = subject === 'other' ? values.custom.trim() : f.subjectOptions[subject];
    const payload: Record<string, string> = { name: values.name.trim(), phone: values.phone.trim(), subject: subjectText };
    if (values.message.trim()) payload.message = values.message.trim();
    setSending(true);
    try {
      const res = await fetch(`${apiBase}/contact`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || v.formError);
      window.gtag?.('event', 'generate_lead', { subject: subjectText, page: location.pathname });
      setValues({ name: '', phone: '', custom: '', message: '' });
      setStatus({ ok: true, text: `${v.success} ${v.successMessage}` });
    } catch (err) {
      const text = `${payload.name} — ${payload.subject}${payload.message ? `\n${payload.message}` : ''}`;
      setStatus({ ok: false, text: (err as Error).message || v.formError, wa: `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}` });
    } finally { setSending(false); }
  }

  const id = (k: string) => `${idPrefix}-${k}`;
  const set = (k: keyof typeof values) => (e: { target: { value: string } }) => setValues((s) => ({ ...s, [k]: e.target.value }));

  return (
    <form className="card form" onSubmit={onSubmit} noValidate data-no-reveal>
      {heading ? <h2 className="form__title">{heading}</h2> : null}
      <div className="form__row">
        <div className={`field${errors.name ? ' has-error' : ''}`}>
          <label htmlFor={id('name')}>{f.nameLabel}</label>
          <input id={id('name')} name="name" autoComplete="name" placeholder={f.namePlaceholder} value={values.name} onChange={set('name')} onBlur={() => values.name && validate()} />
          {errors.name ? <small className="field__error">{errors.name}</small> : null}
        </div>
        <div className={`field${errors.phone ? ' has-error' : ''}`}>
          <label htmlFor={id('phone')}>{f.phoneLabel}</label>
          <input id={id('phone')} name="phone" type="tel" autoComplete="tel" placeholder={f.phonePlaceholder} value={values.phone} onChange={set('phone')} onBlur={() => values.phone && validate()} />
          {errors.phone ? <small className="field__error">{errors.phone}</small> : null}
        </div>
      </div>
      <div className="field">
        <label htmlFor={id('subject')}>{f.subjectLabel}</label>
        <select id={id('subject')} value={subject} onChange={(e) => setSubject(e.target.value as Key)}>
          {KEYS.map((k) => <option key={k} value={k}>{f.subjectOptions[k]}</option>)}
        </select>
      </div>
      {subject === 'other' ? (
        <div className="field">
          <label className="sr-only" htmlFor={id('other')}>{f.subjectOptions.other}</label>
          <input id={id('other')} placeholder={f.customSubjectPlaceholder} value={values.custom} onChange={set('custom')} />
        </div>
      ) : null}
      <div className="field">
        <label htmlFor={id('msg')}>{f.messageLabel}</label>
        <textarea id={id('msg')} placeholder={f.messagePlaceholder} value={values.message} onChange={set('message')} />
      </div>
      <button className="btn btn--primary btn--lg" type="submit" disabled={sending}>{sending ? f.submitting : submitLabel || f.submit}</button>
      <div className={`form__status${status ? (status.ok ? ' is-ok' : ' is-err') : ''}`} role="status" aria-live="polite">
        {status ? <>{status.text}{status.wa ? <> <a href={status.wa} target="_blank" rel="noopener" className="link-arrow"><Icon name="whatsapp" /> WhatsApp</a></> : null}</> : null}
      </div>
      <div className="or">{f.orConnect}</div>
      <a className="btn btn--outline btn--lg" href={`https://wa.me/${waNumber}?text=${encodeURIComponent(waHello)}`} target="_blank" rel="noopener" data-track="whatsapp_click" data-track-label="form_instant">
        <Icon name="whatsapp" /> {f.whatsapp}
      </a>
    </form>
  );
}
