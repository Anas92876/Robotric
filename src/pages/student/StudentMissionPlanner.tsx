import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Compass, Lock, Save, FilePlus, Trash2, Info, ImagePlus, X, Ruler, Code2, Blocks, Map as MapIcon } from 'lucide-react';
import { useWroAccess } from '../../hooks/student/useWroAccess';
import { useMissionPlanner, FIELD_PRESETS } from '../../hooks/student/useMissionPlanner';
import {
  computeSteps,
  generateStepByStepBlocks,
  generatePurePursuitBlocks,
} from '../../utils/missionPlanner';
import { FieldCanvas } from '../../components/student/missionPlanner/FieldCanvas';
import { WaypointList } from '../../components/student/missionPlanner/WaypointList';
import { CodeOutput } from '../../components/student/missionPlanner/CodeOutput';

const TEXT_PRIMARY = '#003300';
const TEXT_TERTIARY = '#00330080';
const ACCENT = '#7C3AED';

export default function StudentMissionPlanner() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const { wroAccess, isLoading: wroLoading } = useWroAccess(true);

  const {
    fieldWidth,
    fieldHeight,
    setFieldWidth,
    setFieldHeight,
    start,
    updateStart,
    waypoints,
    addWaypoint,
    updateWaypoint,
    removeWaypoint,
    reorderWaypoint,
    backgroundImage,
    setBackgroundImage,
    savedMissions,
    currentMissionName,
    newMission,
    saveMission,
    loadMission,
    deleteMission,
  } = useMissionPlanner();

  const [missionNameInput, setMissionNameInput] = useState('');
  const [presetIndex, setPresetIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'measurements' | 'code' | 'blocks' | 'map'>('map');

  const steps = useMemo(() => computeSteps(start, waypoints), [start, waypoints]);
  const stepBlocks = useMemo(() => generateStepByStepBlocks(start, steps), [start, steps]);
  const pursuitBlocks = useMemo(() => generatePurePursuitBlocks(start, waypoints), [start, waypoints]);

  const handlePresetChange = (index: number) => {
    setPresetIndex(index);
    const preset = FIELD_PRESETS[index];
    if (preset.width > 0 && preset.height > 0) {
      setFieldWidth(preset.width);
      setFieldHeight(preset.height);
    }
  };

  const handleSave = () => {
    const name = missionNameInput.trim() || currentMissionName;
    if (!name) return;
    saveMission(name);
    setMissionNameInput('');
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBackgroundImage(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  if (!wroLoading && !wroAccess) {
    return (
      <div className="space-y-4 sm:space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center py-20 bg-white rounded-2xl border border-[#003300]/8">
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'rgba(0,51,0,0.06)' }}
          >
            <Lock className="w-8 h-8" style={{ color: TEXT_TERTIARY }} />
          </div>
          <p className="font-semibold text-base mb-2" style={{ color: TEXT_PRIMARY }}>
            {isRTL ? 'غير متاح لدورتك' : 'Not available for your course'}
          </p>
          <p className="text-sm max-w-xs mx-auto" style={{ color: TEXT_TERTIARY }}>
            {isRTL
              ? 'مخطط المهام متاح فقط للطلاب المسجّلين في دورة WRO.'
              : 'Mission Planner is only available for students enrolled in a WRO course.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div>
        <div className={`flex items-center gap-2 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${ACCENT}1A` }}
          >
            <Compass className="w-4 h-4" style={{ color: ACCENT }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: TEXT_PRIMARY }}>
            {isRTL ? 'مخطط المهام' : 'Mission Planner'}
          </h1>
        </div>
        <p className="text-sm" style={{ color: TEXT_TERTIARY }}>
          {isRTL
            ? 'خطط لمسار الروبوت بصرياً واحصل على الكود الجاهز بدلاً من التخمين.'
            : 'Plan your robot\'s path visually and get ready-to-use code instead of guessing distances and angles.'}
        </p>
      </div>

      {/* Coordinate convention info */}
      <div className={`flex items-start gap-2 p-3 rounded-2xl bg-violet-50 border border-violet-100 text-xs ${isRTL ? 'flex-row-reverse text-right' : ''}`} style={{ color: '#5B21B6' }}>
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>
          {isRTL
            ? 'نقطة الأصل (0,0) في أسفل يسار الملعب. الاتجاه 0° يعني للأمام (+Y)، والزوايا الموجبة تدور باتجاه عقارب الساعة — تماماً كما في OdomIni(x, y, theta).'
            : 'Origin (0,0) is the bottom-left of the field. Heading 0° = facing "up" (+Y), positive angles = clockwise — same as OdomIni(x, y, theta).'}
        </p>
      </div>

      {/* Tabs (locked to Field Map only) */}
      <div className={`flex flex-wrap gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        {(
          [
            { id: 'measurements', icon: Ruler, label: isRTL ? 'القياسات' : 'Measurements' },
            { id: 'code', icon: Code2, label: isRTL ? 'الكود' : 'Code' },
            { id: 'blocks', icon: Blocks, label: isRTL ? 'القطع' : 'Blocks' },
            { id: 'map', icon: MapIcon, label: isRTL ? 'خريطة الملعب' : 'Field Map' },
          ] as const
        ).map((tabItem) => {
          const isLocked = tabItem.id !== 'map';
          return (
            <button
              key={tabItem.id}
              onClick={() => !isLocked && setActiveTab(tabItem.id)}
              disabled={isLocked}
              title={isLocked ? (isRTL ? 'غير متاح حالياً' : 'Currently unavailable') : undefined}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${isRTL ? 'flex-row-reverse' : ''} ${isLocked ? 'opacity-40 cursor-not-allowed' : ''}`}
              style={
                activeTab === tabItem.id
                  ? { backgroundColor: TEXT_PRIMARY, color: '#fff' }
                  : { backgroundColor: 'rgba(0,51,0,0.06)', color: TEXT_PRIMARY }
              }
            >
              {isLocked ? <Lock className="w-3.5 h-3.5" /> : <tabItem.icon className="w-3.5 h-3.5" />}
              {tabItem.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'map' && (
        <div className="fixed inset-0 z-50 bg-black">
          <iframe
            src="/odom-map/OdomMap.html"
            title="OdomMap"
            className="w-full h-full border-0"
          />
        </div>
      )}

      {(activeTab === 'code' || activeTab === 'blocks') && (
        <CodeOutput
          start={start}
          steps={steps}
          waypoints={waypoints}
          stepBlocks={stepBlocks}
          pursuitBlocks={pursuitBlocks}
          view={activeTab}
          isRTL={isRTL}
        />
      )}

      {activeTab === 'measurements' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Field canvas + config */}
        <div className="lg:col-span-2 space-y-4">
          {/* Field & start config */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-[#003300]/10 p-4"
          >
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-semibold mb-1" style={{ color: TEXT_TERTIARY }}>
                  {isRTL ? 'حجم الملعب' : 'Field Size'}
                </label>
                <select
                  value={presetIndex}
                  onChange={(e) => handlePresetChange(Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded-lg border border-[#003300]/15 text-xs"
                >
                  {FIELD_PRESETS.map((p, i) => (
                    <option key={p.label} value={i}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: TEXT_TERTIARY }}>
                  {isRTL ? 'العرض (مم)' : 'Width (mm)'}
                </label>
                <input
                  type="number"
                  value={fieldWidth}
                  onChange={(e) => setFieldWidth(Number(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 rounded-lg border border-[#003300]/15 text-xs text-center"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: TEXT_TERTIARY }}>
                  {isRTL ? 'الطول (مم)' : 'Height (mm)'}
                </label>
                <input
                  type="number"
                  value={fieldHeight}
                  onChange={(e) => setFieldHeight(Number(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 rounded-lg border border-[#003300]/15 text-xs text-center"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: TEXT_TERTIARY }}>
                  {isRTL ? 'بداية X' : 'Start X'}
                </label>
                <input
                  type="number"
                  value={start.x}
                  onChange={(e) => updateStart({ x: Number(e.target.value) || 0 })}
                  className="w-full px-2 py-1.5 rounded-lg border border-[#003300]/15 text-xs text-center"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: TEXT_TERTIARY }}>
                  {isRTL ? 'بداية Y' : 'Start Y'}
                </label>
                <input
                  type="number"
                  value={start.y}
                  onChange={(e) => updateStart({ y: Number(e.target.value) || 0 })}
                  className="w-full px-2 py-1.5 rounded-lg border border-[#003300]/15 text-xs text-center"
                />
              </div>
            </div>
            <div className={`flex flex-wrap items-end gap-3 mb-3`}>
              <div className="w-full sm:w-40">
                <label className="block text-xs font-semibold mb-1" style={{ color: TEXT_TERTIARY }}>
                  {isRTL ? 'اتجاه البداية θ (درجة)' : 'Start Heading θ (deg)'}
                </label>
                <input
                  type="number"
                  value={start.theta}
                  onChange={(e) => updateStart({ theta: Number(e.target.value) || 0 })}
                  className="w-full px-2 py-1.5 rounded-lg border border-[#003300]/15 text-xs text-center"
                />
              </div>

              <div className="flex items-center gap-2">
                <label
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#003300]/15 hover:bg-[#003300]/4 cursor-pointer"
                  style={{ color: TEXT_PRIMARY }}
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  {isRTL ? 'تحميل صورة الملعب' : 'Upload Field Image'}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
                {backgroundImage && (
                  <button
                    onClick={() => setBackgroundImage(null)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-500 hover:bg-red-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    {isRTL ? 'إزالة' : 'Remove'}
                  </button>
                )}
              </div>
            </div>

            <FieldCanvas
              fieldWidth={fieldWidth}
              fieldHeight={fieldHeight}
              start={start}
              waypoints={waypoints}
              backgroundImage={backgroundImage}
              onAddWaypoint={addWaypoint}
              onMoveWaypoint={updateWaypoint}
              onMoveStart={(p) => updateStart(p)}
              isRTL={isRTL}
            />
          </motion.div>
        </div>

        {/* Right: waypoints + saved missions */}
        <div className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <WaypointList
              waypoints={waypoints}
              steps={steps}
              onUpdate={updateWaypoint}
              onRemove={removeWaypoint}
              onReorder={reorderWaypoint}
              onAdd={addWaypoint}
              isRTL={isRTL}
            />
          </motion.div>

          {/* Saved missions */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-[#003300]/10 p-4"
          >
            <h3 className="font-bold text-sm mb-3" style={{ color: TEXT_PRIMARY }}>
              {isRTL ? 'المهام المحفوظة' : 'Saved Missions'}
            </h3>

            <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <input
                type="text"
                placeholder={isRTL ? 'اسم المهمة' : 'Mission name'}
                value={missionNameInput}
                onChange={(e) => setMissionNameInput(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg border border-[#003300]/15 text-xs"
              />
              <button
                onClick={handleSave}
                disabled={!missionNameInput.trim() && !currentMissionName}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white whitespace-nowrap disabled:opacity-40"
                style={{ backgroundColor: TEXT_PRIMARY }}
              >
                <Save className="w-3.5 h-3.5" />
                {isRTL ? 'حفظ' : 'Save'}
              </button>
            </div>

            <button
              onClick={newMission}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold border border-[#003300]/15 hover:bg-[#003300]/4 mb-3"
              style={{ color: TEXT_PRIMARY }}
            >
              <FilePlus className="w-3.5 h-3.5" />
              {isRTL ? 'مهمة جديدة' : 'New Mission'}
            </button>

            {savedMissions.length === 0 ? (
              <p className="text-xs text-center py-2" style={{ color: TEXT_TERTIARY }}>
                {isRTL ? 'لا توجد مهام محفوظة بعد.' : 'No saved missions yet.'}
              </p>
            ) : (
              <div className="space-y-1.5">
                {savedMissions.map((m) => (
                  <div
                    key={m.name}
                    className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-xs ${isRTL ? 'flex-row-reverse' : ''}`}
                    style={{
                      borderColor: m.name === currentMissionName ? ACCENT : 'rgba(0,51,0,0.1)',
                      backgroundColor: m.name === currentMissionName ? `${ACCENT}0D` : 'transparent',
                    }}
                  >
                    <button
                      onClick={() => loadMission(m.name)}
                      className="flex-1 text-left truncate font-semibold"
                      style={{ color: TEXT_PRIMARY, textAlign: isRTL ? 'right' : 'left' }}
                    >
                      {m.name}
                    </button>
                    <button
                      onClick={() => deleteMission(m.name)}
                      className="p-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 flex-shrink-0"
                      title={isRTL ? 'حذف' : 'Delete'}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
      )}
    </div>
  );
}
