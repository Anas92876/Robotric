import { useCallback, useEffect, useState } from 'react';
import { cn } from '../../lib/utils';

/**
 * Lori, the Robotrick robot, alive: rises in, floats, blinks, his green glow
 * breathes, and he hops when you hover or click him. His artwork and colours are
 * never changed; the blink is two small eyelids in his own screen navy on top.
 *
 * Size and position come from `className` (e.g. "absolute bottom-0 end-8 h-[128%]").
 */
interface LoriProps {
  className?: string;
  /** Hop now and then to draw attention (e.g. there are leads to follow up). */
  attention?: boolean;
}

// Eye boxes in the 467×600 artwork, in % of the image (measured from lori.webp)
const EYES = [
  { left: 54.2, top: 13.7, width: 9.6, height: 7.7 },
  { left: 64.2, top: 13.2, width: 10.1, height: 8 },
];
const SCREEN_NAVY = '#0f1a2d'; // sampled from Lori's screen
const EYE_GREEN = '#3cf23c'; // Lori's own eye green, for the closed-eye line

export function Lori({ className, attention = false }: LoriProps) {
  const [hop, setHop] = useState(0);
  const react = useCallback(() => setHop((n) => n + 1), []);

  // When something needs attention: one hop after he arrives, then every 15 s
  useEffect(() => {
    if (!attention) return;
    const first = setTimeout(react, 1400);
    const every = setInterval(react, 15000);
    return () => {
      clearTimeout(first);
      clearInterval(every);
    };
  }, [attention, react]);

  return (
    <div className={cn('select-none', className)} onMouseEnter={react} onClick={react} aria-hidden>
      <div className="h-full motion-safe:animate-lori-in">
        <div className="h-full motion-safe:animate-lori">
          <div key={hop} className={cn('h-full origin-bottom', hop > 0 && 'motion-safe:animate-lori-hop')}>
            <div className="relative h-full w-fit rtl:-scale-x-100">
              <img src="/dash-assets/images/lori.webp" alt="" width={467} height={600} draggable={false} className="h-full w-auto motion-safe:animate-lori-glow motion-reduce:drop-shadow-[0_18px_24px_rgb(8_20_36/0.35)]" />
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
