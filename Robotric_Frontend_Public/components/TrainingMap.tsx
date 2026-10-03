'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Icon, type IconName } from '@/lib/icons';

type Program = { title: string; age: string; description: string; whatYouLearn: string[]; available?: boolean; hours?: string; levels?: string; hoursPerLevel?: string; prerequisite?: string };
type Department = { name: string; tagline: string; description: string; programs: Program[] };
type Track = { id: string; emoji: string; title: string; subtitle: string; description: string; programs?: Program[]; departments?: Department[] };

export type TrainingMapProps = {
  isAr: boolean;
  waNumber: string;
  map: { title: string; titleHighlight: string; whatsappPrefix: string; whatsappSuffix: string; enrollCta: string; comingSoon: string; ageLabel: string; hoursLabel: string; levelsLabel: string };
  tracks: Track[];
  labels: { whatYouLearn: string; prerequisite: string; hoursPerLevel: string; program: string; programs: string };
  departmentImages: Record<string, string>;
};

const TRACK_ICONS: Record<string, IconName> = { summer: 'sun', winter: 'snow', yearRound: 'calendar', competitions: 'trophy' };
const DEPT_ICONS: IconName[] = ['robot', 'drone', 'ai', 'cube', 'vr', 'compass', 'code', 'chip'];
const DEPT_TINTS = ['leaf', 'sage', 'khaki', 'cream', 'sand', 'moss', 'straw', 'fern'];

export default function TrainingMap({ isAr, waNumber, map, tracks, labels, departmentImages }: TrainingMapProps) {
  const [active, setActive] = useState(tracks[0].id);
  const btns = useRef<(HTMLButtonElement | null)[]>([]);

  // #track-yearRound style links open the matching tab
  useEffect(() => {
    const fromHash = () => {
      const id = location.hash.replace('#track-', '');
      if (tracks.some((t) => t.id === id)) setActive(id);
    };
    fromHash();
    addEventListener('hashchange', fromHash);
    return () => removeEventListener('hashchange', fromHash);
  }, [tracks]);

  const onKey = (e: KeyboardEvent, i: number) => {
    const dir = ({ ArrowRight: isAr ? -1 : 1, ArrowLeft: isAr ? 1 : -1, ArrowDown: 1, ArrowUp: -1 } as Record<string, number>)[e.key];
    if (!dir) return;
    e.preventDefault();
    const next = (i + dir + tracks.length) % tracks.length;
    setActive(tracks[next].id);
    btns.current[next]?.focus();
  };

  const enrollHref = (title: string) => `https://wa.me/${waNumber}?text=${encodeURIComponent(`${map.whatsappPrefix} ${title}${map.whatsappSuffix}`)}`;
  const Enroll = ({ p }: { p: Program }) => p.available === false
    ? <span className="btn btn--sm btn--disabled" aria-disabled="true">{map.comingSoon}</span>
    : <a className="btn btn--primary btn--sm" href={enrollHref(p.title)} target="_blank" rel="noopener" data-track="program_inquiry" data-track-label={p.title}><Icon name="whatsapp" /> {map.enrollCta}</a>;

  const Learn = ({ items }: { items: string[] }) => (
    <div className="learn">
      <span className="label">{labels.whatYouLearn}</span>
      <ul className="checks kids is-in">{items.map((w) => <li key={w}><Icon name="check" className="checks__icon" /><span>{w}</span></li>)}</ul>
    </div>
  );

  const Card = ({ p, dept }: { p: Program; dept?: boolean }) => (
    <article className={`program-card${p.available === false ? ' is-soon' : ''}`}>
      <div className="program-card__top">
        <h4>{p.title}</h4>
        {p.available === false ? <span className="tag tag--soon">{map.comingSoon}</span> : null}
      </div>
      <dl className="facts">
        <div><dt>{map.ageLabel}</dt><dd>{p.age}</dd></div>
        {p.hours ? <div><dt>{map.hoursLabel}</dt><dd>{p.hours}</dd></div> : null}
        {dept ? <>
          <div><dt>{map.levelsLabel}</dt><dd>{p.levels}</dd></div>
          <div><dt>{labels.hoursPerLevel}</dt><dd>{p.hoursPerLevel}</dd></div>
          <div><dt>{labels.prerequisite}</dt><dd>{p.prerequisite}</dd></div>
        </> : null}
      </dl>
      <p>{p.description}</p>
      <Learn items={p.whatYouLearn} />
      <div className="program-card__foot"><Enroll p={p} /></div>
    </article>
  );

  return (
    <>
      <div className="track-tabs" role="tablist" aria-label={`${map.title} ${map.titleHighlight}`}>
        {tracks.map((tr, i) => (
          <button key={tr.id} ref={(el) => { btns.current[i] = el; }} className="track-tab" role="tab" id={`tab-${tr.id}`} type="button"
            aria-controls={`track-${tr.id}`} aria-selected={active === tr.id} tabIndex={active === tr.id ? 0 : -1}
            onClick={() => setActive(tr.id)} onKeyDown={(e) => onKey(e, i)}>
            <span className="track-tab__icon"><Icon name={TRACK_ICONS[tr.id]} /></span>
            <span className="track-tab__text"><strong>{tr.title}</strong><small>{tr.subtitle}</small></span>
          </button>
        ))}
      </div>

      <div className="track-panels is-tabbed">
        {tracks.map((tr) => (
          <section key={tr.id} className={`track-panel${active === tr.id ? ' is-active' : ''}`} id={`track-${tr.id}`} role="tabpanel" aria-labelledby={`tab-${tr.id}`} hidden={active !== tr.id}>
            <header className="track-panel__head">
              <span className="track-panel__icon"><Icon name={TRACK_ICONS[tr.id]} /></span>
              <div><h3>{tr.title}</h3><p>{tr.description}</p></div>
            </header>
            {tr.programs ? <div className="program-grid">{tr.programs.map((p) => <Card p={p} key={p.title} />)}</div> : null}
            {tr.departments ? (
              <div className="dept-list">
                {tr.departments.map((d, i) => (
                  <details className={`dept dept--${DEPT_TINTS[i]}`} key={d.name}>
                    <summary>
                      {departmentImages[i] ? <span className="dept__img" style={{ ['--img' as string]: `url(/${departmentImages[i]})` }} />
                        : <span className="dept__img dept__img--icon"><Icon name={DEPT_ICONS[i]} /></span>}
                      <span className="dept__head">
                        <span className="dept__name">{d.name}</span>
                        <span className="dept__tagline">{d.tagline}</span>
                      </span>
                      <span className="dept__count">{d.programs.length} {d.programs.length === 1 ? labels.program : labels.programs}</span>
                      <span className="dept__toggle" aria-hidden="true"><Icon name="plus" /></span>
                    </summary>
                    <div className="dept__body">
                      <p className="dept__desc">{d.description}</p>
                      <div className="dept__programs">{d.programs.map((p) => <Card p={p} dept key={p.title} />)}</div>
                    </div>
                  </details>
                ))}
              </div>
            ) : null}
          </section>
        ))}
      </div>
    </>
  );
}
