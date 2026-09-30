import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Save,
  AlertCircle,
  Plus,
  X,
} from "lucide-react";
import { useTrainerGroups } from "../../hooks/trainer/useTrainerGroups";
import { useTrainerSessions } from "../../hooks/trainer/useTrainerSessions";
import { useTranslation } from 'react-i18next';
import {
  CardComponent,
  CardBody,
  Button,
  Input,
  LoadingState,
  Alert,
} from "../../components/ui";

export default function TrainerCreateSession() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSelectedGroupId = searchParams.get("groupId");

  const { groups, isLoading: isLoadingGroups } = useTrainerGroups({ status: "active" });
  const { createSession } = useTrainerSessions();
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardTrainer']);
  const isRTL = i18n.language === 'ar';

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    groupId: preSelectedGroupId || "",
    overrideSchedule: false,
  });

  // Custom schedule state (used when overrideSchedule is true)
  const [customDate, setCustomDate] = useState<string>("");
  const [customStartTime, setCustomStartTime] = useState<string>("");
  const [customEndTime, setCustomEndTime] = useState<string>("");

  // Update selected group when groupId changes
  useEffect(() => {
    if (formData.groupId) {
      const group = groups.find(g => g._id === formData.groupId);
      setSelectedGroup(group || null);
    } else {
      setSelectedGroup(null);
    }
  }, [formData.groupId, groups]);

  const [objectives, setObjectives] = useState<string[]>([""]);
  const [materialsNeeded, setMaterialsNeeded] = useState<string[]>([""]);

  // Handle form input changes
  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  // Add objective
  const addObjective = () => {
    setObjectives([...objectives, ""]);
  };

  // Remove objective
  const removeObjective = (index: number) => {
    setObjectives(objectives.filter((_, i) => i !== index));
  };

  // Update objective
  const updateObjective = (index: number, value: string) => {
    const updated = [...objectives];
    updated[index] = value;
    setObjectives(updated);
  };

  // Add material
  const addMaterial = () => {
    setMaterialsNeeded([...materialsNeeded, ""]);
  };

  // Remove material
  const removeMaterial = (index: number) => {
    setMaterialsNeeded(materialsNeeded.filter((_, i) => i !== index));
  };

  // Update material
  const updateMaterial = (index: number, value: string) => {
    const updated = [...materialsNeeded];
    updated[index] = value;
    setMaterialsNeeded(updated);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.title.trim()) {
      setError(t('dashboardTrainer:validationSessionTitle'));
      return;
    }

    if (!formData.groupId) {
      setError(t('dashboardTrainer:validationSelectGroup'));
      return;
    }

    // When using custom schedule, validate date & time
    if (formData.overrideSchedule) {
      if (!customDate || !customStartTime || !customEndTime) {
        setError(t('dashboardTrainer:validationCustomSchedule'));
        return;
      }
    }

    try {
      setIsSaving(true);

      const sessionData: any = {
        ...formData,
        lessonPlan: {
          objectives: objectives.filter((o) => o.trim()),
          materialsNeeded: materialsNeeded.filter((m) => m.trim()),
        },
      };

      // Attach custom schedule fields only when overrideSchedule is enabled
      if (formData.overrideSchedule) {
        sessionData.scheduledDate = customDate;
        sessionData.startTime = customStartTime;
        sessionData.endTime = customEndTime;
      }

      const newSession = await createSession(sessionData);

      if (newSession) {
        // Navigate to sessions list
        navigate("/trainer/sessions");
      } else {
        setError(t('dashboardTrainer:failedCreateSession'));
      }
    } catch (err: any) {
      setError(err.message || t('dashboardTrainer:failedCreateSession'));
      console.error("Error creating session:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Show loading state
  if (isLoadingGroups) {
    return <LoadingState type="skeleton" text={t('dashboardTrainer:failedLoadGroups')} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate("/trainer/sessions")}
        >
          {t('dashboardTrainer:backToSessions')}
        </Button>

        <div className="mt-4">
          <h1 className="text-3xl font-bold inline-block group-hover:scale-105 transition-transform duration-300" style={{
            color: '#0f1f33',
            backgroundClip: 'text'
          }}>{t('dashboardTrainer:createNewSession')}</h1>
          <p className="mt-2 transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>
            {t('dashboardTrainer:createSessionSubtitle')}
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="error">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Basic Information */}
          <CardComponent variant="glass">
            <CardBody>
              <h2 className="text-xl font-semibold mb-6">{t('dashboardTrainer:basicInfo')}</h2>

              <div className="space-y-4">
                {/* Session Title */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('dashboardTrainer:sessionTitle')} <span className="text-red-400">*</span>
                  </label>
                  <Input
                    value={formData.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                    placeholder={t('dashboardTrainer:sessionTitlePlaceholder')}
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('dashboardCommon:description')}
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                    placeholder={t('dashboardTrainer:descriptionPlaceholder')}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                    rows={3}
                  />
                </div>

                {/* Group Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('dashboardTrainer:groupName')} <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formData.groupId}
                    onChange={(e) => handleChange("groupId", e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    required
                  >
                    <option value="" className="bg-zinc-900">
                      {t('dashboardTrainer:selectGroupDots')}
                    </option>
                    {groups.map((group) => (
                      <option
                        key={group._id}
                        value={group._id}
                        className="bg-zinc-900"
                      >
                        {group.name} ({group.students.length} {t('dashboardTrainer:students')})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Schedule Mode */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium mb-1">
                    {t('dashboardTrainer:scheduleMode')}
                  </label>
                  <div className={`flex flex-col sm:flex-row gap-3 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, overrideSchedule: false }));
                      }}
                      className={`flex-1 px-4 py-3 rounded-xl border text-sm ${isRTL ? 'text-right' : 'text-left'} transition-all ${
                        !formData.overrideSchedule
                          ? "border-primary bg-primary/10 text-white"
                          : "border-white/10 bg-white/5 text-white/80"
                      }`}
                    >
                      <span className="block font-semibold">{t('dashboardTrainer:useGroupSchedule')}</span>
                      <span className="block text-xs text-white/60 mt-1">
                        {t('dashboardTrainer:useGroupScheduleDesc')}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, overrideSchedule: true }));
                      }}
                      className={`flex-1 px-4 py-3 rounded-xl border text-sm ${isRTL ? 'text-right' : 'text-left'} transition-all ${
                        formData.overrideSchedule
                          ? "border-primary bg-primary/10 text-white"
                          : "border-white/10 bg-white/5 text-white/80"
                      }`}
                    >
                      <span className="block font-semibold">{t('dashboardTrainer:setCustomSchedule')}</span>
                      <span className="block text-xs text-white/60 mt-1">
                        {t('dashboardTrainer:setCustomScheduleDesc')}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Auto-Schedule Info (only when using auto schedule) */}
                {!formData.overrideSchedule &&
                  selectedGroup &&
                  selectedGroup.schedule &&
                  selectedGroup.schedule.length > 0 && (
                    <Alert variant="info">
                      <div className="space-y-2">
                        <p className="font-medium">📅 {t('dashboardTrainer:autoSchedulingEnabled')}</p>
                        <p className="text-sm text-white/70">
                          {t('dashboardTrainer:autoSchedulingDesc')}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedGroup.schedule.map((sched: any, idx: number) => (
                            <div
                              key={idx}
                              className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs"
                            >
                              <span className="font-medium">{sched.day}</span>
                              <span className={`text-white/60 ${isRTL ? 'mr-1' : 'ml-1'}`}>
                                {sched.startTime} - {sched.endTime}
                              </span>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-white/50 mt-2">
                          {t('dashboardTrainer:autoSchedulingNote')}
                        </p>
                      </div>
                    </Alert>
                  )}

                {/* Custom schedule fields */}
                {formData.overrideSchedule && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        {t('dashboardTrainer:sessionDate')} <span className="text-red-400">*</span>
                      </label>
                      <Input
                        type="date"
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        {t('dashboardTrainer:startTime')} <span className="text-red-400">*</span>
                      </label>
                      <Input
                        type="time"
                        value={customStartTime}
                        onChange={(e) => setCustomStartTime(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        {t('dashboardTrainer:endTime')} <span className="text-red-400">*</span>
                      </label>
                      <Input
                        type="time"
                        value={customEndTime}
                        onChange={(e) => setCustomEndTime(e.target.value)}
                      />
                    </div>
                  </div>
                )}

              </div>
            </CardBody>
          </CardComponent>

          {/* Lesson Plan (Optional) */}
          <CardComponent variant="glass">
            <CardBody>
              <h2 className="text-xl font-semibold mb-6">
                {t('dashboardTrainer:lessonPlanOptional')}
              </h2>

              <div className="space-y-6">
                {/* Learning Objectives */}
                <div>
                  <div className={`flex items-center justify-between mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <label className="text-sm font-medium">{t('dashboardTrainer:learningObjectives')}</label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      leftIcon={<Plus className="w-4 h-4" />}
                      onClick={addObjective}
                    >
                      {t('dashboardCommon:add')}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {objectives.map((objective, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={objective}
                          onChange={(e) => updateObjective(index, e.target.value)}
                          placeholder={t('dashboardTrainer:objectivePlaceholder', { number: index + 1 })}
                        />
                        {objectives.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeObjective(index)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Materials Needed */}
                <div>
                  <div className={`flex items-center justify-between mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <label className="text-sm font-medium">{t('dashboardTrainer:materialsNeeded')}</label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      leftIcon={<Plus className="w-4 h-4" />}
                      onClick={addMaterial}
                    >
                      {t('dashboardCommon:add')}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {materialsNeeded.map((material, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={material}
                          onChange={(e) => updateMaterial(index, e.target.value)}
                          placeholder={t('dashboardTrainer:materialPlaceholder', { number: index + 1 })}
                        />
                        {materialsNeeded.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMaterial(index)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardBody>
          </CardComponent>

          {/* Action Buttons */}
          <div className={`flex justify-end gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/trainer/sessions")}
              disabled={isSaving}
            >
              {t('dashboardCommon:cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              leftIcon={<Save className="w-5 h-5" />}
              disabled={isSaving}
            >
              {isSaving ? t('dashboardTrainer:creating') : t('dashboardTrainer:createSession')}
            </Button>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
