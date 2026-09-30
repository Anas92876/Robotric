'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';

/**
 * Lori in the home hero, alive: rises in and waves hello, floats, blinks, his
 * green glow breathes; hover → he waves, click → he hops. His artwork and colours
 * are never changed: the picture is split into two layers (body, and forearm +
 * claw) so the forearm can turn around the elbow, and the blink is two small
 * eyelids in his own screen navy on top. Styles: .lori* in app/globals.css.
 */

// Measured on the artwork, in % of the image
const EYES = [
  { left: 54.2, top: 13.7, width: 9.6, height: 7.7 },
  { left: 64.2, top: 13.2, width: 10.1, height: 8 },
];

export default function Lori() {
  const [hop, setHop] = useState(0);
  const [wave, setWave] = useState(0);
  const doHop = useCallback(() => setHop((n) => n + 1), []);
  const doWave = useCallback(() => setWave((n) => n + 1), []);

  // Say hello once he has risen into place (the rise ends ~2.5 s after load)
  useEffect(() => {
    const hello = setTimeout(doWave, 2600);
    return () => clearTimeout(hello);
  }, [doWave]);

  return (
    <div className="lori" aria-hidden="true" onMouseEnter={doWave} onClick={doHop}>
      <div className="lori__float">
        <div key={hop} className={hop > 0 ? 'lori__hop is-hopping' : 'lori__hop'}>
          <div className="lori__art">
            <div className="lori__glow">
              <Image src="/images/lori-body.webp" alt="" width={467} height={600} quality={80} loading="eager" fetchPriority="high" draggable={false} />
              <Image
                key={wave}
                src="/images/lori-forearm.webp"
                alt=""
                width={467}
                height={600}
                quality={80}
                loading="eager"
                draggable={false}
                className={wave > 0 ? 'lori__forearm is-waving' : 'lori__forearm'}
              />
            </div>
            {EYES.map((e, i) => (
              <span key={i} className="lori__lid" style={{ left: `${e.left}%`, top: `${e.top}%`, width: `${e.width}%`, height: `${e.height}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
