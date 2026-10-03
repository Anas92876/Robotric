'use client';

import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { Icon } from '@/lib/icons';

export type JobFormLabels = {
  title: string; personal: string; fullName: string; fullNamePh: string; phone: string; email: string; optional: string; age: string;
  gender: string; male: string; female: string; select: string; location: string; locationPh: string; experience: string; experienceLevel: string;
  levels: Record<string, string>; experienceDetails: string; experienceDetailsPh: string; skills: string; skillsPh: string; work: string;
  availability: string; availabilityOptions: Record<string, string>; portfolio: string; portfolioPh: string; cv: string; cvHint: string; cvTooBig: string;
  about: string; whyUs: string; whyUsPh: string; additional: string; submit: string; submitting: string; success: string; successLead: string;
  error: string; nameRequired: string; phoneInvalid: string; emailInvalid: string;
};

// Posts multipart data to {apiBase}/jobs/apply with the live site's field names; `position` is the job's English title
export default function JobApplyForm({ labels: f, apiBase, position }: { labels: JobFormLabels; apiBase: string; position: string }) {
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [sending, setSending] = useState(false);

  const addSkill = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' && e.key !== ',') return;
    e.preventDefault();
    const v = skillInput.trim().replace(/,$/, '');
    if (v && !skills.includes(v)) setSkills([...skills, v]);
    setSkillInput('');
  };

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const el = form.elements as unknown as Record<string, HTMLInputElement>;
    const errs: string[] = [];
    if (!el.fullName.value.trim()) errs.push(f.nameRequired);
    if (!/^[0-9+\-\s()]{8,}$/.test(el.phone.value.trim())) errs.push(f.phoneInvalid);
    if (el.email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.email.value.trim())) errs.push(f.emailInvalid);
    const cv = el.cv.files?.[0];
    if (cv && cv.size > 10 * 1024 * 1024) errs.push(f.cvTooBig);
    if (errs.length) { setStatus({ ok: false, text: errs.join(' · ') }); return; }

    const fd = new FormData();
    const add = (k: string, v?: string) => { if (v && v.trim()) fd.append(k, v.trim()); };
    ['fullName', 'phone', 'email', 'age', 'location', 'gender', 'experienceLevel', 'experienceDetails', 'portfolioLink', 'availability', 'whyUs', 'additionalInfo'].forEach((k) => add(k, el[k].value));
    fd.append('position', position);
    const all = skillInput.trim() && !skills.includes(skillInput.trim()) ? [...skills, skillInput.trim()] : skills;
    if (all.length) fd.append('skills', JSON.stringify(all));
    if (cv) fd.append('cv', cv);

    setSending(true);
    try {
      const res = await fetch(`${apiBase}/jobs/apply`, { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || f.error);
      window.gtag?.('event', 'job_application', { position });
      form.reset(); setSkills([]); setSkillInput('');
      setStatus({ ok: true, text: `${f.success} — ${f.successLead}` });
    } catch (err) {
      setStatus({ ok: false, text: (err as Error).message || f.error });
    } finally { setSending(false); }
  }

  return (
    <form className="card form job-form" id="apply" onSubmit={onSubmit} noValidate data-no-reveal>
      <h2 className="form__title">{f.title}</h2>
      <fieldset>
        <legend>{f.personal}</legend>
        <div className="form__row">
          <div className="field"><label htmlFor="j-name">{f.fullName} *</label><input id="j-name" name="fullName" autoComplete="name" placeholder={f.fullNamePh} /></div>
          <div className="field"><label htmlFor="j-phone">{f.phone} *</label><input id="j-phone" name="phone" type="tel" autoComplete="tel" placeholder="09xx xxx xxx" /></div>
        </div>
        <div className="form__row">
          <div className="field"><label htmlFor="j-email">{f.email} <small>({f.optional})</small></label><input id="j-email" name="email" type="email" autoComplete="email" /></div>
          <div className="field"><label htmlFor="j-age">{f.age}</label><input id="j-age" name="age" type="number" min={14} max={80} inputMode="numeric" /></div>
        </div>
        <div className="form__row">
          <div className="field"><label htmlFor="j-gender">{f.gender}</label>
            <select id="j-gender" name="gender" defaultValue=""><option value="">{f.select}</option><option value="male">{f.male}</option><option value="female">{f.female}</option></select></div>
          <div className="field"><label htmlFor="j-loc">{f.location}</label><input id="j-loc" name="location" placeholder={f.locationPh} /></div>
        </div>
      </fieldset>
      <fieldset>
        <legend>{f.experience}</legend>
        <div className="field"><label htmlFor="j-exp">{f.experienceLevel}</label>
          <select id="j-exp" name="experienceLevel" defaultValue=""><option value="">{f.select}</option>{Object.entries(f.levels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        <div className="field"><label htmlFor="j-expd">{f.experienceDetails}</label><textarea id="j-expd" name="experienceDetails" placeholder={f.experienceDetailsPh} /></div>
        <div className="field">
          <label htmlFor="j-skill">{f.skills}</label>
          <div className="tags-input">
            {skills.map((s) => <button type="button" className="chip" key={s} onClick={() => setSkills(skills.filter((x) => x !== s))}>{s} ×</button>)}
            <input id="j-skill" placeholder={f.skillsPh} autoComplete="off" value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={addSkill} />
          </div>
        </div>
      </fieldset>
      <fieldset>
        <legend>{f.work}</legend>
        <div className="form__row">
          <div className="field"><label htmlFor="j-avail">{f.availability}</label>
            <select id="j-avail" name="availability" defaultValue=""><option value="">{f.select}</option>{Object.entries(f.availabilityOptions).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          <div className="field"><label htmlFor="j-port">{f.portfolio} <small>({f.optional})</small></label><input id="j-port" name="portfolioLink" type="url" placeholder={f.portfolioPh} /></div>
        </div>
        <div className="field"><label htmlFor="j-cv">{f.cv} <small>{f.cvHint}</small></label><input id="j-cv" name="cv" type="file" accept="application/pdf" /></div>
      </fieldset>
      <fieldset>
        <legend>{f.about}</legend>
        <div className="field"><label htmlFor="j-why">{f.whyUs}</label><textarea id="j-why" name="whyUs" placeholder={f.whyUsPh} /></div>
        <div className="field"><label htmlFor="j-add">{f.additional}</label><textarea id="j-add" name="additionalInfo" rows={3} /></div>
      </fieldset>
      <button className="btn btn--primary btn--lg" type="submit" disabled={sending}><Icon name="arrowUpRight" /> {sending ? f.submitting : f.submit}</button>
      <div className={`form__status${status ? (status.ok ? ' is-ok' : ' is-err') : ''}`} role="status" aria-live="polite">{status?.text}</div>
    </form>
  );
}
