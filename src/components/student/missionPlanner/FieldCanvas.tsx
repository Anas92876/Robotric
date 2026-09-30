import { useRef, useState } from 'react';
import type { MouseEvent, PointerEvent } from 'react';
import type { Point, Pose } from '../../../utils/missionPlanner';

const TEXT_PRIMARY = '#0f1f33';
const ACCENT = '#7C3AED';

interface FieldCanvasProps {
  fieldWidth: number;
  fieldHeight: number;
  start: Pose;
  waypoints: Point[];
  backgroundImage?: string | null;
  onAddWaypoint: (p: Point) => void;
  onMoveWaypoint: (index: number, p: Point) => void;
  onMoveStart: (p: Point) => void;
  isRTL: boolean;
}

type DragTarget = { type: 'start' } | { type: 'waypoint'; index: number };

export function FieldCanvas({
  fieldWidth,
  fieldHeight,
  start,
  waypoints,
  backgroundImage,
  onAddWaypoint,
  onMoveWaypoint,
  onMoveStart,
  isRTL,
}: FieldCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<DragTarget | null>(null);
  const [dragMoved, setDragMoved] = useState(false);

  const toMm = (clientX: number, clientY: number): Point | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const scaleX = fieldWidth / rect.width;
    const scaleY = fieldHeight / rect.height;
    const mmX = (clientX - rect.left) * scaleX;
    const mmY = fieldHeight - (clientY - rect.top) * scaleY;
    return {
      x: Math.round(Math.min(Math.max(mmX, 0), fieldWidth)),
      y: Math.round(Math.min(Math.max(mmY, 0), fieldHeight)),
    };
  };

  const handleBackgroundClick = (e: MouseEvent<SVGSVGElement>) => {
    if (dragMoved) {
      setDragMoved(false);
      return;
    }
    const p = toMm(e.clientX, e.clientY);
    if (p) onAddWaypoint(p);
  };

  const handlePointerDown = (target: DragTarget) => (e: PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDragging(target);
    setDragMoved(false);
  };

  const handlePointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!dragging) return;
    const p = toMm(e.clientX, e.clientY);
    if (!p) return;
    setDragMoved(true);
    if (dragging.type === 'start') {
      onMoveStart(p);
    } else {
      onMoveWaypoint(dragging.index, p);
    }
  };

  const handlePointerUp = () => {
    setDragging(null);
  };

  // Convert mm coordinates -> SVG coordinates (Y axis flipped: mm Y increases up, SVG Y increases down)
  const toSvg = (p: Point) => ({ x: p.x, y: fieldHeight - p.y });

  // Grid lines every 200mm
  const gridStep = 200;
  const vLines: number[] = [];
  for (let x = 0; x <= fieldWidth; x += gridStep) vLines.push(x);
  const hLines: number[] = [];
  for (let y = 0; y <= fieldHeight; y += gridStep) hLines.push(y);

  const startSvg = toSvg(start);
  const robotSize = Math.max(fieldWidth, fieldHeight) * 0.045;
  const pointRadius = Math.max(fieldWidth, fieldHeight) * 0.012;

  const pathPoints = [start, ...waypoints].map(toSvg);
  const pathD = pathPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  return (
    <div className="w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${fieldWidth} ${fieldHeight}`}
        className="w-full h-auto rounded-xl border border-ink/10 bg-[#faf8f0] touch-none select-none cursor-crosshair"
        onClick={handleBackgroundClick}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Field background image (e.g. WRO mat for this season) */}
        {backgroundImage && (
          <image
            href={backgroundImage}
            x={0}
            y={0}
            width={fieldWidth}
            height={fieldHeight}
            preserveAspectRatio="none"
          />
        )}

        {/* Grid */}
        {vLines.map((x) => (
          <line key={`v-${x}`} x1={x} y1={0} x2={x} y2={fieldHeight} stroke="#0f1f33" strokeOpacity={backgroundImage ? 0.12 : 0.06} strokeWidth={fieldWidth * 0.0015} />
        ))}
        {hLines.map((y) => (
          <line key={`h-${y}`} x1={0} y1={y} x2={fieldWidth} y2={y} stroke="#0f1f33" strokeOpacity={backgroundImage ? 0.12 : 0.06} strokeWidth={fieldWidth * 0.0015} />
        ))}

        {/* Border */}
        <rect x={0} y={0} width={fieldWidth} height={fieldHeight} fill="none" stroke="#0f1f33" strokeOpacity={0.15} strokeWidth={fieldWidth * 0.003} />

        {/* Path */}
        {waypoints.length > 0 && (
          <path d={pathD} fill="none" stroke={ACCENT} strokeOpacity={0.5} strokeWidth={fieldWidth * 0.003} strokeDasharray={`${fieldWidth * 0.006} ${fieldWidth * 0.004}`} />
        )}

        {/* Waypoints */}
        {waypoints.map((wp, i) => {
          const p = toSvg(wp);
          return (
            <g
              key={i}
              onPointerDown={handlePointerDown({ type: 'waypoint', index: i })}
              className="cursor-grab active:cursor-grabbing"
            >
              <circle cx={p.x} cy={p.y} r={pointRadius} fill={ACCENT} fillOpacity={0.15} stroke={ACCENT} strokeWidth={fieldWidth * 0.0025} />
              <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize={pointRadius * 1.1} fontWeight={700} fill={ACCENT}>
                {i + 1}
              </text>
            </g>
          );
        })}

        {/* Robot start marker (arrow showing heading) */}
        <g
          transform={`translate(${startSvg.x}, ${startSvg.y}) rotate(${start.theta})`}
          onPointerDown={handlePointerDown({ type: 'start' })}
          className="cursor-grab active:cursor-grabbing"
        >
          <polygon
            points={`0,${-robotSize} ${robotSize * 0.7},${robotSize * 0.6} 0,${robotSize * 0.25} ${-robotSize * 0.7},${robotSize * 0.6}`}
            fill={TEXT_PRIMARY}
            fillOpacity={0.85}
            stroke={TEXT_PRIMARY}
            strokeWidth={fieldWidth * 0.002}
          />
        </g>
      </svg>
      <p className={`text-xs mt-2 ${isRTL ? 'text-right' : 'text-left'}`} style={{ color: '#0f1f3380' }}>
        {isRTL
          ? 'انقر على الملعب لإضافة نقطة هدف. اسحب الروبوت أو النقاط لتعديل مواضعها.'
          : 'Click the field to add a waypoint. Drag the robot or points to fine-tune their positions.'}
      </p>
    </div>
  );
}
