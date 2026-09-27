import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Save,
  AlertCircle,
  Plus,
  X,
  Paperclip,
  Youtube,
} from "lucide-react";
import { useCLOGroups } from "../../hooks/clo/useCLOGroups";
import { useCLOSessions } from "../../hooks/clo/useCLOSessions";
import { SessionResourcePicker } from "../../components/clo/SessionResourcePicker";
import { api } from "../../lib/api";
import { useTranslation } from 'react-i18next';
import {
  Button,
  Input,
  LoadingState,
  Alert,
} from "../../components/ui";

// ─── Light-theme card wrapper ─────────────────────────────────────────────────
function FormCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#003300]/10 overflow-hidden">
      <div className="px-6 py-4 border-b border-[#003300]/8">
        <h2 className="text-base font-bold text-[#003300]">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export default function CLOCreateSession() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSelectedGroupId = searchParams.get("groupId");
  const preSelectedCourseId = searchParams.get("courseId");

  const { groups, isLoading: isLoadingGroups, fetchGroups } = useCLOGroups();
  const { createSession } = useCLOSessions();
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardTrainer']);
  const isRTL = i18n.language === 'ar';

  const [isSaving, setIsSaving]             = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup]   = useState<any>(null);
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);
  const [hasVideo, setHasVideo]             = useState(false);
  const [youtubeId, setYoutubeId]           = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    groupId: preSelectedGroupId || "",
    overrideSchedule: false,
  });

  const [customDate, setCustomDate]           = useState<string>("");
  const [customStartTime, setCustomStartTime] = useState<string>("");
  const [customEndTime, setCustomEndTime]     = useState<string>("");
  const [objectives, setObjectives]           = useState<string[]>([""]);
  const [materialsNeeded, setMaterialsNeeded] = useState<string[]>([""]);

  // Back URL — go to drill-down if we have context, else /clo/sessions
  const backUrl = preSelectedCourseId && preSelectedGroupId
    ? `/clo/courses/${preSelectedCourseId}/${preSelectedGroupId}`
    : "/clo/sessions";

  useEffect(() => { fetchGroups({ status: "active" }); }, []);

  useEffect(() => {
    if (formData.groupId) setSelectedGroup(groups.find(g => g._id === formData.groupId) || null);
    else setSelectedGroup(null);
  }, [formData.groupId, groups]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const addObjective    = () => setObjectives([...objectives, ""]);
  const removeObjective = (i: number) => setObjectives(objectives.filter((_, idx) => idx !== i));
  const updateObjective = (i: number, v: string) => { const u = [...objectives]; u[i] = v; setObjectives(u); };

  const addMaterial    = () => setMaterialsNeeded([...materialsNeeded, ""]);
  const removeMaterial = (i: number) => setMaterialsNeeded(materialsNeeded.filter((_, idx) => idx !== i));
  const updateMaterial = (i: number, v: string) => { const u = [...materialsNeeded]; u[i] = v; setMaterialsNeeded(u); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim()) { setError(t('dashboardTrainer:validationSessionTitle')); return; }
    if (!formData.groupId)      { setError(t('dashboardTrainer:validationSelectGroup')); return; }
    if (formData.overrideSchedule && (!customDate || !customStartTime || !customEndTime)) {
      setError(t('dashboardTrainer:validationCustomSchedule')); return;
    }

    try {
      setIsSaving(true);

      const sessionData: any = {
        ...formData,
        lessonPlan: {
          objectives: objectives.filter(o => o.trim()),
          materialsNeeded: materialsNeeded.filter(m => m.trim()),
        },
        video: { hasVideo, youtubeId: youtubeId.trim() },
      };
      if (formData.overrideSchedule) {
        sessionData.scheduledDate = customDate;
        sessionData.startTime = customStartTime;
        sessionData.endTime = customEndTime;
      }

      const newSession = await createSession(sessionData);
      if (!newSession) { setError(t('dashboardTrainer:failedCreateSession')); return; }

      // Assign selected resources to the new session
      if (selectedResourceIds.length > 0 && newSession._id) {
        await Promise.allSettled(
          selectedResourceIds.map(resourceId =>
            api.post(`/clo/resources/${resourceId}/assign`, {
              assignments: [{ groupId: formData.groupId, sessionIds: [newSession._id] }],
            })
          )
        );
      }

      navigate(backUrl);
    } catch (err: any) {
      setError(err.message || t('dashboardTrainer:failedCreateSession'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingGroups) return <LoadingState type="skeleton" text={t('dashboardTrainer:failedLoadGroups')} />;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate(backUrl)}>
          {t('dashboardTrainer:backToSessions')}
        </Button>
        <div className="mt-4">
          <h1 className="text-2xl font-bold text-[#003300]">{t('dashboardTrainer:createNewSession')}</h1>
          <p className="mt-1 text-sm text-[#003300]/50">{t('dashboardTrainer:createSessionSubtitle')}</p>
        </div>
      </div>

      {error && (
        <Alert variant="error">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-5">

          {/* ── Basic Info ── */}
          <FormCard title={t('dashboardTrainer:basicInfo')}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#003300] mb-1.5">
                  {t('dashboardTrainer:sessionTitle')} <span className="text-red-500">*</span>
                </label>
                <Input value={formData.title} onChange={e => handleChange("title", e.target.value)} placeholder={t('dashboardTrainer:sessionTitlePlaceholder')} required />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#003300] mb-1.5">{t('dashboardCommon:description')}</label>
                <textarea
                  value={formData.description} onChange={e => handleChange("description", e.target.value)}
                  placeholder={t('dashboardTrainer:descriptionPlaceholder')} rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#003300]/15 bg-white text-[#003300] placeholder-[#003300]/35 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#003300] mb-1.5">
                  {t('dashboardTrainer:groupName')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.groupId} onChange={e => handleChange("groupId", e.target.value)} required
                  className="w-full px-4 py-2.5 rounded-xl border border-[#003300]/15 bg-white text-[#003300] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                >
                  <option value="">{t('dashboardTrainer:selectGroupDots')}</option>
                  {groups.map(g => (
                    <option key={g._id} value={g._id}>{g.name} ({g.students.length} {t('dashboardTrainer:students')})</option>
                  ))}
                </select>
              </div>

              {/* Schedule mode */}
              <div>
                <label className="block text-sm font-medium text-[#003300] mb-1.5">{t('dashboardTrainer:scheduleMode')}</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: false, title: t('dashboardTrainer:useGroupSchedule'), desc: t('dashboardTrainer:useGroupScheduleDesc') },
                    { value: true,  title: t('dashboardTrainer:setCustomSchedule'), desc: t('dashboardTrainer:setCustomScheduleDesc') },
                  ].map(opt => (
                    <button
                      key={String(opt.value)} type="button"
                      onClick={() => setFormData(prev => ({ ...prev, overrideSchedule: opt.value }))}
                      className={`p-3 rounded-xl border text-left text-sm transition-all ${
                        formData.overrideSchedule === opt.value
                          ? 'border-primary bg-primary/8 text-[#003300]'
                          : 'border-[#003300]/12 bg-white text-[#003300]/60 hover:border-[#003300]/25'
                      }`}
                    >
                      <span className="block font-semibold text-xs mb-0.5">{opt.title}</span>
                      <span className="block text-xs opacity-70">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Group schedule info */}
              {!formData.overrideSchedule && selectedGroup?.schedule?.length > 0 && (
                <div className="p-3 bg-primary/5 rounded-xl border border-primary/15 text-sm">
                  <p className="font-semibold text-[#003300] mb-2">📅 {t('dashboardTrainer:autoSchedulingEnabled')}</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedGroup.schedule.map((s: any, i: number) => (
                      <span key={i} className="px-2 py-1 rounded-lg bg-white border border-[#003300]/10 text-xs text-[#003300]">
                        <span className="font-medium">{s.day}</span> {s.startTime}–{s.endTime}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom schedule */}
              {formData.overrideSchedule && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#003300]/70 mb-1">{t('dashboardTrainer:sessionDate')} *</label>
                    <Input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#003300]/70 mb-1">{t('dashboardTrainer:startTime')} *</label>
                    <Input type="time" value={customStartTime} onChange={e => setCustomStartTime(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#003300]/70 mb-1">{t('dashboardTrainer:endTime')} *</label>
                    <Input type="time" value={customEndTime} onChange={e => setCustomEndTime(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          </FormCard>

          {/* ── Lesson Plan ── */}
          <FormCard title={`${t('dashboardTrainer:lessonPlanOptional')}`}>
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-[#003300]">{t('dashboardTrainer:learningObjectives')}</label>
                  <button type="button" onClick={addObjective} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> {t('dashboardCommon:add')}
                  </button>
                </div>
                <div className="space-y-2">
                  {objectives.map((obj, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input value={obj} onChange={e => updateObjective(i, e.target.value)} placeholder={t('dashboardTrainer:objectivePlaceholder', { number: i + 1 })} />
                      {objectives.length > 1 && <button type="button" onClick={() => removeObjective(i)} className="text-[#003300]/30 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-[#003300]">{t('dashboardTrainer:materialsNeeded')}</label>
                  <button type="button" onClick={addMaterial} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> {t('dashboardCommon:add')}
                  </button>
                </div>
                <div className="space-y-2">
                  {materialsNeeded.map((mat, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input value={mat} onChange={e => updateMaterial(i, e.target.value)} placeholder={t('dashboardTrainer:materialPlaceholder', { number: i + 1 })} />
                      {materialsNeeded.length > 1 && <button type="button" onClick={() => removeMaterial(i)} className="text-[#003300]/30 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FormCard>

          {/* ── Session Video ── */}
          <FormCard title="Session Video (Optional)">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-red-50">
                    <Youtube className="w-4 h-4 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#003300]">Attach a video to this session</p>
                    <p className="text-xs text-[#003300]/50">Students will see an embedded player — no YouTube link is exposed</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setHasVideo(v => !v); if (hasVideo) setYoutubeId(""); }}
                  className={`relative w-11 h-6 rounded-full transition-colors ${hasVideo ? 'bg-primary' : 'bg-[#003300]/15'}`}
                  aria-label="Toggle video"
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${hasVideo ? 'translate-x-5' : ''}`} />
                </button>
              </div>

              {hasVideo && (
                <div>
                  <label className="block text-xs font-medium text-[#003300]/70 mb-1">
                    YouTube Video ID <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={youtubeId}
                    onChange={e => setYoutubeId(e.target.value.trim())}
                    placeholder="e.g. dQw4w9WgXcQ"
                  />
                  <p className="mt-1 text-xs text-[#003300]/40">
                    The ID is the part after <code className="bg-[#003300]/6 px-1 rounded">youtube.com/watch?v=</code>
                  </p>
                </div>
              )}
            </div>
          </FormCard>

          {/* ── Session Resources ── */}
          {preSelectedCourseId && (
            <FormCard title="Session Resources">
              <div className="mb-3">
                <p className="text-sm text-[#003300]/55">
                  Select files from this course to attach to the session. Students will be able to access them.
                </p>
              </div>
              <SessionResourcePicker
                courseId={preSelectedCourseId}
                selectedIds={selectedResourceIds}
                onChange={setSelectedResourceIds}
              />
            </FormCard>
          )}

          {/* ── Actions ── */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => navigate(backUrl)} disabled={isSaving}>
              {t('dashboardCommon:cancel')}
            </Button>
            <Button type="submit" variant="primary" leftIcon={<Save className="w-4 h-4" />} disabled={isSaving}>
              {isSaving ? t('dashboardTrainer:creating') : t('dashboardTrainer:createSession')}
            </Button>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
