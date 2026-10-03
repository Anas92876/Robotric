import { useState } from 'react';
import { ArrowUp, ArrowDown, Trash2, Plus } from 'lucide-react';
import type { MissionStep, Point } from '../../../utils/missionPlanner';

const TEXT_PRIMARY = '#0f1f33';
const TEXT_TERTIARY = '#0f1f3380';
const ACCENT = '#7C3AED';

interface WaypointListProps {
  waypoints: Point[];
  steps: MissionStep[];
  onUpdate: (index: number, p: Point) => void;
  onRemove: (index: number) => void;
  onReorder: (index: number, direction: -1 | 1) => void;
  onAdd: (p: Point) => void;
  isRTL: boolean;
}

export function WaypointList({ waypoints, steps, onUpdate, onRemove, onReorder, onAdd, isRTL }: WaypointListProps) {
  const [newX, setNewX] = useState('');
  const [newY, setNewY] = useState('');

  const handleAdd = () => {
    const x = parseFloat(newX);
    const y = parseFloat(newY);
    if (Number.isNaN(x) || Number.isNaN(y)) return;
    onAdd({ x, y });
    setNewX('');
    setNewY('');
  };

  return (
    <div className="bg-white rounded-2xl border border-ink/10 overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="p-4">
        <h3 className="font-bold text-sm mb-3" style={{ color: TEXT_PRIMARY }}>
          {isRTL ? 'نقاط المسار' : 'Waypoints'}
        </h3>

        {waypoints.length === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: TEXT_TERTIARY }}>
            {isRTL ? 'لا توجد نقاط بعد. انقر على الملعب لإضافة نقطة.' : 'No waypoints yet. Click the field to add one.'}
          </p>
        ) : (
          <div className="space-y-2 mb-3">
            {steps.map((step, i) => {
              const wp = waypoints[i];
              return (
                <div key={i} className="rounded-xl border border-ink/8 p-2.5 text-xs">
                  <div className={`flex items-center justify-between gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span
                      className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold flex-shrink-0"
                      style={{ backgroundColor: `${ACCENT}26`, color: ACCENT }}
                    >
                      {i + 1}
                    </span>
                    <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <input
                        type="number"
                        value={wp.x}
                        onChange={(e) => onUpdate(i, { ...wp, x: parseFloat(e.target.value) || 0 })}
                        className="w-16 px-1.5 py-1 rounded-lg border border-ink/15 text-center"
                        title="X (mm)"
                      />
                      <span style={{ color: TEXT_TERTIARY }}>X</span>
                      <input
                        type="number"
                        value={wp.y}
                        onChange={(e) => onUpdate(i, { ...wp, y: parseFloat(e.target.value) || 0 })}
                        className="w-16 px-1.5 py-1 rounded-lg border border-ink/15 text-center"
                        title="Y (mm)"
                      />
                      <span style={{ color: TEXT_TERTIARY }}>Y</span>
                    </div>
                    <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <button
                        onClick={() => onReorder(i, -1)}
                        disabled={i === 0}
                        className="p-1 rounded-lg border border-ink/10 disabled:opacity-30 hover:bg-ink/5"
                        title={isRTL ? 'تحريك لأعلى' : 'Move up'}
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => onReorder(i, 1)}
                        disabled={i === waypoints.length - 1}
                        className="p-1 rounded-lg border border-ink/10 disabled:opacity-30 hover:bg-ink/5"
                        title={isRTL ? 'تحريك لأسفل' : 'Move down'}
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => onRemove(i)}
                        className="p-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                        title={isRTL ? 'حذف' : 'Delete'}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`} style={{ color: TEXT_TERTIARY }}>
                    <span>
                      {isRTL ? 'الدوران: ' : 'Turn: '}
                      <strong style={{ color: TEXT_PRIMARY }}>{step.turnAngle.toFixed(1)}°</strong>
                    </span>
                    <span>
                      {isRTL ? 'المسافة: ' : 'Distance: '}
                      <strong style={{ color: TEXT_PRIMARY }}>{step.distance.toFixed(0)} mm</strong>
                    </span>
                    <span>
                      {isRTL ? 'الاتجاه: ' : 'Heading: '}
                      <strong style={{ color: TEXT_PRIMARY }}>{step.headingAfter.toFixed(1)}°</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add via inputs */}
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <input
            type="number"
            placeholder="X"
            value={newX}
            onChange={(e) => setNewX(e.target.value)}
            className="w-full px-2 py-1.5 rounded-lg border border-ink/15 text-xs text-center"
          />
          <input
            type="number"
            placeholder="Y"
            value={newY}
            onChange={(e) => setNewY(e.target.value)}
            className="w-full px-2 py-1.5 rounded-lg border border-ink/15 text-xs text-center"
          />
          <button
            onClick={handleAdd}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white whitespace-nowrap"
            style={{ backgroundColor: TEXT_PRIMARY }}
          >
            <Plus className="w-3.5 h-3.5" />
            {isRTL ? 'إضافة' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}
