import { useState } from 'react';
import { Copy, Check, Download } from 'lucide-react';
import type { CodeBlock, MissionStep, Point, Pose } from '../../../utils/missionPlanner';
import { blocksToFile } from '../../../utils/missionPlanner';
import { MissionBlocks } from './MissionBlocks';

const TEXT_PRIMARY = '#003300';
const TEXT_TERTIARY = '#00330080';

interface CodeOutputProps {
  start: Pose;
  steps: MissionStep[];
  waypoints: Point[];
  stepBlocks: CodeBlock[];
  pursuitBlocks: CodeBlock[];
  view: 'blocks' | 'code';
  isRTL: boolean;
}

function CodeBlockCard({ block, isRTL }: { block: CodeBlock; isRTL: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(block.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="rounded-xl border border-[#003300]/8 overflow-hidden">
      <div className={`flex items-center justify-between gap-2 px-3 py-2 bg-[#003300]/4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <span className="text-xs font-bold" style={{ color: TEXT_PRIMARY }}>
          {isRTL ? block.titleAr : block.title}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border border-[#003300]/15 hover:bg-white"
          style={{ color: TEXT_PRIMARY }}
        >
          {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
          {copied ? (isRTL ? 'تم النسخ' : 'Copied') : (isRTL ? 'نسخ' : 'Copy')}
        </button>
      </div>
      <pre dir="ltr" className="p-3 text-[11px] leading-relaxed overflow-auto max-h-72 whitespace-pre" style={{ backgroundColor: '#0d1117', color: '#c9d1d9' }}>
        {block.code}
      </pre>
    </div>
  );
}

export function CodeOutput({ start, steps, waypoints, stepBlocks, pursuitBlocks, view, isRTL }: CodeOutputProps) {
  const [tab, setTab] = useState<'step' | 'pursuit'>('step');

  const blocks = tab === 'step' ? stepBlocks : pursuitBlocks;
  const fileName = tab === 'step' ? 'mission_step_by_step.py' : 'mission_pure_pursuit.py';

  const handleDownload = () => {
    const blob = new Blob([blocksToFile(blocks)], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-2xl border border-[#003300]/10 overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="p-4">
        <div className={`flex items-center justify-between gap-2 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <h3 className="font-bold text-sm" style={{ color: TEXT_PRIMARY }}>
            {isRTL ? 'الكود المُولّد' : 'Generated Code'}
          </h3>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-[#003300]/15 hover:bg-[#003300]/4"
            style={{ color: TEXT_PRIMARY }}
          >
            <Download className="w-3.5 h-3.5" />
            {isRTL ? 'تنزيل الملف الكامل' : 'Download Full File'}
          </button>
        </div>

        {/* Mode tabs */}
        <div className={`flex gap-2 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={() => setTab('step')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={
              tab === 'step'
                ? { backgroundColor: TEXT_PRIMARY, color: '#fff' }
                : { backgroundColor: 'rgba(0,51,0,0.06)', color: TEXT_PRIMARY }
            }
          >
            {isRTL ? 'خطوة بخطوة' : 'Step-by-Step'}
          </button>
          <button
            onClick={() => setTab('pursuit')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={
              tab === 'pursuit'
                ? { backgroundColor: TEXT_PRIMARY, color: '#fff' }
                : { backgroundColor: 'rgba(0,51,0,0.06)', color: TEXT_PRIMARY }
            }
          >
            {isRTL ? 'بيور برسوت' : 'Pure Pursuit'}
          </button>
        </div>

        {view === 'blocks' ? (
          <MissionBlocks start={start} steps={steps} waypoints={waypoints} mode={tab} isRTL={isRTL} />
        ) : (
          <div className="space-y-2">
            {blocks.map((block) => (
              <CodeBlockCard key={block.id} block={block} isRTL={isRTL} />
            ))}
          </div>
        )}

        <p className={`text-xs mt-3 ${isRTL ? 'text-right' : 'text-left'}`} style={{ color: TEXT_TERTIARY }}>
          {isRTL
            ? 'الصق هذه الأجزاء داخل my_mission() في برنامجك الذي يستخدم Hyperlib_v1_6.'
            : 'Paste these blocks into your Hyperlib_v1_6-based program.'}
        </p>
      </div>
    </div>
  );
}
