'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Icon } from '@/lib/icons';

// Search box: navigates to /[lang]/verify/NUMBER, where the certificate is checked on the server
export default function VerifyForm({ lang, label, placeholder, button, initial = '' }: { lang: string; label: string; placeholder: string; button: string; initial?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const num = value.trim().toUpperCase();
    if (!num) return;
    setBusy(true);
    router.push(`/${lang}/verify/${encodeURIComponent(num)}`);
  };
  return (
    <form className="card form" onSubmit={onSubmit} data-no-reveal>
      <label className="label" htmlFor="cert">{label}</label>
      <div className="verify">
        <input className="input" id="cert" name="cert" required placeholder={placeholder} autoComplete="off" spellCheck={false} value={value} onChange={(e) => { setValue(e.target.value); setBusy(false); }} />
        <button className="btn btn--primary btn--lg" type="submit" disabled={busy}><Icon name="search" /> {button}</button>
      </div>
    </form>
  );
}
