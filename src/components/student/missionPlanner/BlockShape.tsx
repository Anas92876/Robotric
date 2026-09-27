import type { ReactNode } from 'react';

// Renders an authentic Scratch/Blockly-style "puzzle" block: a rounded body
// with a notch cut into the top edge and a matching tab protruding from the
// bottom edge, so consecutive blocks visually plug into each other.
//
// Geometry is defined in a 100-wide viewBox with preserveAspectRatio="none",
// so the X axis stretches to the container width while the Y axis stays in
// real pixels (the SVG height is fixed in px, matching the viewBox height).

const W = 100;
const BODY_H = 40;
const TAB = 8;
const R = 4;
const NX1 = 14;
const NX2 = 30;
const SLANT = 4;

export type BlockShapeKind = 'hat' | 'stack' | 'cap';

function buildPath(kind: BlockShapeKind): string {
  const hasNotch = kind !== 'hat';
  const hasTab = kind !== 'cap';
  const segments: string[] = [];

  segments.push(`M ${R},0`);

  if (hasNotch) {
    segments.push(`L ${NX1},0`);
    segments.push(`L ${NX1 + SLANT},${TAB}`);
    segments.push(`L ${NX2 - SLANT},${TAB}`);
    segments.push(`L ${NX2},0`);
  }

  segments.push(`L ${W - R},0`);
  segments.push(`A ${R} ${R} 0 0 1 ${W} ${R}`);
  segments.push(`L ${W},${BODY_H - R}`);
  segments.push(`A ${R} ${R} 0 0 1 ${W - R},${BODY_H}`);

  if (hasTab) {
    segments.push(`L ${NX2},${BODY_H}`);
    segments.push(`L ${NX2 - SLANT},${BODY_H + TAB}`);
    segments.push(`L ${NX1 + SLANT},${BODY_H + TAB}`);
    segments.push(`L ${NX1},${BODY_H}`);
  }

  segments.push(`L ${R},${BODY_H}`);
  segments.push(`A ${R} ${R} 0 0 1 0,${BODY_H - R}`);
  segments.push(`L 0,${R}`);
  segments.push(`A ${R} ${R} 0 0 1 ${R},0`);
  segments.push('Z');

  return segments.join(' ');
}

interface BlockShapeProps {
  color: string;
  kind?: BlockShapeKind;
  isRTL: boolean;
  children: ReactNode;
}

export function BlockShape({ color, kind = 'stack', isRTL, children }: BlockShapeProps) {
  const hasTab = kind !== 'cap';
  const viewBoxH = BODY_H + (hasTab ? TAB : 0);

  return (
    <div className="relative" style={{ height: BODY_H, marginBottom: hasTab ? TAB : 0 }}>
      <svg
        viewBox={`0 0 ${W} ${viewBoxH}`}
        preserveAspectRatio="none"
        width="100%"
        height={viewBoxH}
        className="absolute top-0 left-0 pointer-events-none"
        style={{ transform: isRTL ? 'scaleX(-1)' : undefined }}
      >
        <path d={buildPath(kind)} fill={color} />
      </svg>
      <div className="relative h-full flex items-center px-3">{children}</div>
    </div>
  );
}
