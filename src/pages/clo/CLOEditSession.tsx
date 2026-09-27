import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Save, AlertCircle, Plus, X, Trash2, Youtube,
} from "lucide-react";
import { useCLOSessions } from "../../hooks/clo/useCLOSessions";
import { SessionResourcePicker } from "../../components/clo/SessionResourcePicker";
import { api } from "../../lib/api";
import { useTranslation } from 'react-i18next';
import {
  Button, Input, LoadingState, Alert,
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

export default function CLOEditSession() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const { getSessionById, updateSession, deleteSession } = useCLOSessions();
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardTrainer']);
  const isRTL = i18n.language === 'ar';

  const [isSaving, setIsSaving]     = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading]   = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [sessionGroupId, setSessionGroupId] = useState<string>('');
  const [sessionCourseId, setSessionCourseId] = useState<string>('');

  const [formData, setFormData]     = useState({ title: "", description: "" });
  const [hasVideo, setHasVideo]     = useState(false);
  const [youtubeId, setYoutubeId]   = useState("");
  const [customDate, setCustomDate] = useState<string>("");
  const [customStartTime, setCustomStartTime] = useState<string>("");
  const [customEndTime, setCustomEndTime]     = useState<string>("");
  const [objectives, setObjectives]           = useState<string[]>([""]);
  const [materialsNeeded, setMaterialsNeeded] = useState<string[]>([""]);

  // Resource state
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);
  const [originalResourceIds, setOriginalResourceIds] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!sessionId) return;
      try {
        setIsLoading(true);
        const session = await getSessionById(sessionId);

        setFormData({ title: session.title || "", description: session.description || "" });
        setHasVideo(!!(session.video?.hasVideo));
        setYoutubeId(session.video?.youtubeId || "");
        setCustomDate(session.scheduledDate ? new Date(session.scheduledDate).toISOString().split("T")[0] : "");
        setCustomStartTime(session.startTime || "");
        setCustomEndTime(session.endTime || "");
        setObjectives(session.lessonPlan?.objectives?.length > 0 ? session.lessonPlan.objectives : [""]);
        setMaterialsNeeded(session.lessonPlan?.materialsNeeded?.length > 0 ? session.lessonPlan.materialsNeeded : [""]);

        // Extract groupId / courseId
        const gId = typeof session.groupId === 'object' ? session.groupId._id : session.groupId;
        const cId = typeof session.courseId === 'object' ? session.courseId._id : session.courseId;
        setSessionGroupId(gId || '');
        setSessionCourseId(cId || '');

        // Load existing resource assignments for this session
        if (cId) {
          try {
            const res = await api.get('/clo/resources', { params: { courseId: cId } });
            const raw = res.data.data;
            const all = Array.isArray(raw) ? raw : raw?.resources || [];
            // Find which resources are already assigned to this session
            const assignedIds = all
              .filter((r: any) => r?.assignments?.details?.some((d: any) =>
                d.sessions?.some((s: any) => s.sessionId === sessionId || s.sessionId?._id === sessionId)
              ))
              .map((r: any) => r._id);
            setSelectedResourceIds(assignedIds);
            setOriginalResourceIds(assignedIds);
          } catch {
            // Non-blocking
          }
        }
      } catch (err: any) {
        setError(err.message || t('dashboardTrainer:failedLoadSession2'));
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [sessionId]);

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
    if (!sessionId) return;

    try {
      setIsSaving(true);

      const updated = await updateSession(sessionId, {
        title: formData.title,
        description: formData.description,
        overrideSchedule: true,
        scheduledDate: customDate,
        startTime: customStartTime,
        endTime: customEndTime,
        lessonPlan: {
          objectives: objectives.filter(o => o.trim()),
          materialsNeeded: materialsNeeded.filter(m => m.trim()),
        },
        video: { hasVideo, youtubeId: youtubeId.trim() },
      } as any);

      if (!updated) { setError(t('dashboardTrainer:failedCreateSession')); return; }

      // Diff resource assignments — assign added, skip existing (API handles duplicates)
      if (sessionGroupId && sessionId) {
        const toAdd    = selectedResourceIds.filter(id => !originalResourceIds.includes(id));
        // Note: API doesn't have a remove-from-session endpoint in this implementation,
        // so we only add newly selected ones. The parent AssignmentModal handles full management.
        await Promise.allSettled(
          toAdd.map(resourceId =>
            api.post(`/clo/resources/${resourceId}/assign`, {
              assignments: [{ groupId: sessionGroupId, sessionIds: [sessionId] }],
            })
          )
        );
      }

      navigate(`/clo/sessions/${sessionId}`);
    } catch (err: any) {
      setError(err.message || t('dashboardTrainer:failedCreateSession'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!sessionId || !confirm(t('dashboardTrainer:deleteSessionConfirm'))) return;
    try {
      setIsDeleting(true);
      const ok = await deleteSession(sessionId, true);
      if (ok) navigate("/clo/sessions");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) return <LoadingState type="skeleton" text={t('dashboardTrainer:loadingSession')} />;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate(`/clo/sessions/${sessionId}`)}>
          {t('dashboardTrainer:backToSession')}
        </Button>
        <div className="mt-4">
          <h1 className="text-2xl font-bold text-[#003300]">{t('dashboardTrainer:editSessionTitle')}</h1>
          <p className="mt-1 text-sm text-[#003300]/50">{t('dashboardTrainer:editSessionSubtitle')}</p>
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
            </div>
          </FormCard>

          {/* ── Schedule ── */}
          <FormCard title={t('dashboardTrainer:schedule')}>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#003300]/70 mb-1">{t('dashboardTrainer:sessionDate')}</label>
                <Input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#003300]/70 mb-1">{t('dashboardTrainer:startTime')}</label>
                <Input type="time" value={customStartTime} onChange={e => setCustomStartTime(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#003300]/70 mb-1">{t('dashboardTrainer:endTime')}</label>
                <Input type="time" value={customEndTime} onChange={e => setCustomEndTime(e.target.value)} />
              </div>
            </div>
          </FormCard>

          {/* ── Lesson Plan ── */}
          <FormCard title={t('dashboardTrainer:lessonPlanOptional')}>
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
          {sessionCourseId && (
            <FormCard title="Session Resources">
              <p className="text-sm text-[#003300]/55 mb-4">
                Attach course files to this session. Newly selected files will be assigned on save.
              </p>
              <SessionResourcePicker
                courseId={sessionCourseId}
                selectedIds={selectedResourceIds}
                onChange={setSelectedResourceIds}
              />
            </FormCard>
          )}

          {/* ── Actions ── */}
          <div className="flex items-center justify-between gap-4">
            <Button type="button" variant="ghost" leftIcon={<Trash2 className="w-4 h-4" />} onClick={handleDelete} disabled={isSaving || isDeleting} className="text-red-500 hover:text-red-600 hover:bg-red-50">
              {isDeleting ? t('dashboardTrainer:deletingSession') : t('dashboardTrainer:deleteSessionBtn')}
            </Button>
            <div className="flex gap-3">
              <Button type="button" variant="ghost" onClick={() => navigate(`/clo/sessions/${sessionId}`)} disabled={isSaving || isDeleting}>
                {t('dashboardCommon:cancel')}
              </Button>
              <Button type="submit" variant="primary" leftIcon={<Save className="w-4 h-4" />} disabled={isSaving || isDeleting}>
                {isSaving ? t('dashboardTrainer:saving') : t('dashboardTrainer:saveChangesBtn')}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
