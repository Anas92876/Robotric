import { useCallback, useEffect, useState } from 'react';
import { cn } from '../../lib/utils';

/**
 * Lori, the Robotrick robot, alive: rises in and waves hello, floats, blinks, his
 * green glow breathes; hover → he waves, click → he hops. His artwork and colours
 * are never changed: the picture is only split into two layers (body, and forearm
 * + claw) so the forearm can rotate around the elbow, and the blink is two small
 * eyelids in his own screen navy on top.
 *
 * Size and position come from `className` (e.g. "absolute bottom-0 end-8 h-[128%]").
 */
interface LoriProps {
  className?: string;
  /** Hop now and then to draw attention (e.g. there are leads to follow up). */
  attention?: boolean;
}

// Measured on the 467×600 artwork, in % of the image
const ELBOW = { x: 14.35, y: 49.83 }; // pivot of the waving forearm
const EYES = [
  { left: 54.2, top: 13.7, width: 9.6, height: 7.7 },
  { left: 64.2, top: 13.2, width: 10.1, height: 8 },
];
const SCREEN_NAVY = '#0f1a2d'; // sampled from Lori's screen
const EYE_GREEN = '#3cf23c'; // Lori's own eye green, for the closed-eye line

export function Lori({ className, attention = false }: LoriProps) {
  const [hop, setHop] = useState(0);
  const [wave, setWave] = useState(0);
  const doHop = useCallback(() => setHop((n) => n + 1), []);
  const doWave = useCallback(() => setWave((n) => n + 1), []);

  // Say hello once he has risen into place
  useEffect(() => {
    const hello = setTimeout(doWave, 1100);
    return () => clearTimeout(hello);
  }, [doWave]);

  // When something needs attention: a hop now and then
  useEffect(() => {
    if (!attention) return;
    const first = setTimeout(doHop, 2600);
    const every = setInterval(doHop, 15000);
    return () => {
      clearTimeout(first);
      clearInterval(every);
    };
  }, [attention, doHop]);

  return (
    <div className={cn('select-none', className)} onMouseEnter={doWave} onClick={doHop} aria-hidden>
      <div className="h-full motion-safe:animate-lori-in">
        <div className="h-full motion-safe:animate-lori">
          <div key={hop} className={cn('h-full origin-bottom', hop > 0 && 'motion-safe:animate-lori-hop')}>
            <div className="relative h-full w-fit rtl:-scale-x-100">
              {/* The two layers share one glow, so it looks like a single picture */}
              <div className="relative h-full motion-safe:animate-lori-glow motion-reduce:drop-shadow-[0_18px_24px_rgb(8_20_36/0.35)]">
                <img src="/dash-assets/images/lori-body.webp" alt="" width={467} height={600} draggable={false} className="h-full w-auto" />
                <img
                  key={wave}
                  src="/dash-assets/images/lori-forearm.webp"
                  alt=""
                  width={467}
                  height={600}
                  draggable={false}
                  className={cn('absolute inset-0 h-full w-full', wave > 0 && 'motion-safe:animate-lori-wave')}
                  style={{ transformOrigin: `${ELBOW.x}% ${ELBOW.y}%` }}
                />
              </div>
              {EYES.map((e, i) => (
                <span
                  key={i}
                  className="absolute origin-top rounded-b-full [scale:1_0] motion-safe:animate-lori-blink"
                  style={{
                    left: `${e.left}%`,
                    top: `${e.top}%`,
                    width: `${e.width}%`,
                    height: `${e.height}%`,
                    background: SCREEN_NAVY,
                    borderBottom: `2px solid ${EYE_GREEN}`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
