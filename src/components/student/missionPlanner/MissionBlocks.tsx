import type { ReactNode } from 'react';
import { Flag, RotateCw, ArrowUpRight, List, RefreshCw } from 'lucide-react';
import type { Pose, MissionStep, Point } from '../../../utils/missionPlanner';
import { BlockShape } from './BlockShape';

// Category colors match the Scratch/Blockly palette used by Pybricks' block
// editor and LEGO SPIKE Word Blocks:
//   Events/Start  -> #FFBF00 (yellow hat block)
//   Motion        -> #4C97FF (blue)
//   Variables/List-> #FF8C1A (orange)
//   Control/Loop  -> #FFAB19 (orange-yellow)
const COLORS = {
  start: '#FFBF00',
  motion: '#4C97FF',
  list: '#FF8C1A',
  control: '#FFAB19',
};

function fmt(n: number): string {
  return (Math.round(n * 10) / 10).toString();
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="px-1.5 py-0.5 rounded bg-black/15 font-semibold text-white">
      {children}
    </span>
  );
}

function BlockLabel({ icon, label, isRTL, children }: { icon: ReactNode; label: string; isRTL: boolean; children?: ReactNode }) {
  return (
    <div className={`flex items-center gap-2 w-full text-white ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
      <span className="flex-shrink-0 opacity-90">{icon}</span>
      <span className="text-xs font-bold whitespace-nowrap">{label}</span>
      <span className={`flex items-center gap-1.5 text-[11px] font-mono ${isRTL ? 'mr-auto' : 'ml-auto'}`} dir="ltr">
        {children}
      </span>
    </div>
  );
}

interface MissionBlocksProps {
  start: Pose;
  steps: MissionStep[];
  waypoints: Point[];
  mode: 'step' | 'pursuit';
  isRTL: boolean;
}

export function MissionBlocks({ start, steps, waypoints, mode, isRTL }: MissionBlocksProps) {
  const t = (en: string, ar: string) => (isRTL ? ar : en);

  const stepBlocks = steps.length === 0 ? null : steps.flatMap((step) => [
    <BlockShape key={`turn-${step.index}`} color={COLORS.motion} isRTL={isRTL}>
      <BlockLabel icon={<RotateCw className="w-3.5 h-3.5" />} label={t('Turn to Heading', 'الدوران إلى الاتجاه')} isRTL={isRTL}>
        <Chip>{fmt(step.headingAfter)}°</Chip>
        <span className="opacity-70 text-white">({fmt(step.turnAngle)}°)</span>
      </BlockLabel>
    </BlockShape>,
    <BlockShape key={`move-${step.index}`} color={COLORS.motion} isRTL={isRTL}>
      <BlockLabel icon={<ArrowUpRight className="w-3.5 h-3.5" />} label={t('Move Forward', 'التحرك للأمام')} isRTL={isRTL}>
        <Chip>{fmt(step.distance)} mm</Chip>
      </BlockLabel>
    </BlockShape>,
  ]);

  return (
    <div className="rounded-xl p-3 overflow-x-auto" style={{ backgroundColor: '#2b2730' }}>
      <div style={{ minWidth: 280 }}>
        <BlockShape color={COLORS.start} kind="hat" isRTL={isRTL}>
          <BlockLabel icon={<Flag className="w-3.5 h-3.5" />} label={t('When program starts', 'عند بدء البرنامج')} isRTL={isRTL} />
        </BlockShape>
        <BlockShape color={COLORS.list} kind="stack" isRTL={isRTL}>
          <BlockLabel icon={<Flag className="w-3.5 h-3.5" />} label={t('Set Start Position', 'ضبط موضع البداية')} isRTL={isRTL}>
            <Chip>x: {fmt(start.x)}</Chip>
            <Chip>y: {fmt(start.y)}</Chip>
            <Chip>θ: {fmt(start.theta)}°</Chip>
          </BlockLabel>
        </BlockShape>

        {mode === 'step' ? (
          stepBlocks ?? (
            <BlockShape color={COLORS.list} kind="stack" isRTL={isRTL}>
              <BlockLabel icon={<List className="w-3.5 h-3.5" />} label={t('Click the field to add waypoints', 'انقر على الملعب لإضافة نقاط')} isRTL={isRTL} />
            </BlockShape>
          )
        ) : (
          <>
            <BlockShape color={COLORS.list} kind="stack" isRTL={isRTL}>
              <BlockLabel icon={<List className="w-3.5 h-3.5" />} label={t('Set Path Points (PArray)', 'تحديد نقاط المسار')} isRTL={isRTL}>
                <Chip>{waypoints.length} {t('points', 'نقاط')}</Chip>
              </BlockLabel>
            </BlockShape>
            <BlockShape color={COLORS.motion} kind="stack" isRTL={isRTL}>
              <BlockLabel icon={<ArrowUpRight className="w-3.5 h-3.5" />} label={t('Follow Path (Pure Pursuit)', 'اتباع المسار (بيور برسوت)')} isRTL={isRTL}>
                {waypoints.length === 0 && <span className="opacity-70 text-white">{t('no points', 'لا توجد نقاط')}</span>}
              </BlockLabel>
            </BlockShape>
          </>
        )}

        <BlockShape color={COLORS.control} kind="cap" isRTL={isRTL}>
          <BlockLabel icon={<RefreshCw className="w-3.5 h-3.5" />} label={t('Run Odometry forever (background)', 'تشغيل الأودومتري إلى الأبد (في الخلفية)')} isRTL={isRTL} />
        </BlockShape>
      </div>
    </div>
  );
}
