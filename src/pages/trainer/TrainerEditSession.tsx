import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Save,
  AlertCircle,
  Plus,
  X,
  Trash2,
} from "lucide-react";
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

export default function TrainerEditSession() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const { getSessionById, updateSession, deleteSession } = useTrainerSessions();
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardTrainer']);
  const isRTL = i18n.language === 'ar';

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });

  // Schedule state
  const [customDate, setCustomDate] = useState<string>("");
  const [customStartTime, setCustomStartTime] = useState<string>("");
  const [customEndTime, setCustomEndTime] = useState<string>("");

  const [objectives, setObjectives] = useState<string[]>([""]);
  const [materialsNeeded, setMaterialsNeeded] = useState<string[]>([""]);

  // Load session data
  useEffect(() => {
    const loadSession = async () => {
      if (!sessionId) return;

      try {
        setIsLoading(true);
        const session = await getSessionById(sessionId);

        setFormData({
          title: session.title || "",
          description: session.description || "",
        });

        // Pre-populate schedule fields
        const dateStr = session.scheduledDate
          ? new Date(session.scheduledDate).toISOString().split("T")[0]
          : "";
        setCustomDate(dateStr);
        setCustomStartTime(session.startTime || "");
        setCustomEndTime(session.endTime || "");

        setObjectives(
          session.lessonPlan?.objectives?.length > 0
            ? session.lessonPlan.objectives
            : [""]
        );
        setMaterialsNeeded(
          session.lessonPlan?.materialsNeeded?.length > 0
            ? session.lessonPlan.materialsNeeded
            : [""]
        );
      } catch (err: any) {
        setError(err.message || t('dashboardTrainer:failedLoadSession2'));
        console.error("Error loading session:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, [sessionId]);

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

    if (!sessionId) return;

    try {
      setIsSaving(true);

      const sessionData: any = {
        title: formData.title,
        description: formData.description,
        overrideSchedule: true,
        scheduledDate: customDate,
        startTime: customStartTime,
        endTime: customEndTime,
        lessonPlan: {
          objectives: objectives.filter((o) => o.trim()),
          materialsNeeded: materialsNeeded.filter((m) => m.trim()),
        },
      };

      const updated = await updateSession(sessionId, sessionData);

      if (updated) {
        navigate(`/trainer/sessions/${sessionId}`);
      } else {
        setError(t('dashboardTrainer:failedCreateSession'));
      }
    } catch (err: any) {
      setError(err.message || t('dashboardTrainer:failedCreateSession'));
      console.error("Error updating session:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!sessionId) return;
    if (!confirm(t('dashboardTrainer:deleteSessionConfirm'))) return;

    try {
      setIsDeleting(true);
      const success = await deleteSession(sessionId, true); // permanent delete
      if (success) {
        navigate("/trainer/sessions");
      }
    } catch (err: any) {
      setError(err.message || t('dashboardTrainer:failedLoadSession2'));
      console.error("Error deleting session:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return <LoadingState type="skeleton" text={t('dashboardTrainer:loadingSession')} />;
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
          onClick={() => navigate(`/trainer/sessions/${sessionId}`)}
        >
          {t('dashboardTrainer:backToSession')}
        </Button>

        <div className="mt-4">
          <h1 className="text-3xl font-bold inline-block group-hover:scale-105 transition-transform duration-300" style={{
            color: '#0f1f33',
            backgroundClip: 'text'
          }}>{t('dashboardTrainer:editSessionTitle')}</h1>
          <p className="mt-2 transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>
            {t('dashboardTrainer:editSessionSubtitle')}
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
              </div>
            </CardBody>
          </CardComponent>

          {/* Schedule */}
          <CardComponent variant="glass">
            <CardBody>
              <h2 className="text-xl font-semibold mb-6">{t('dashboardTrainer:schedule')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('dashboardTrainer:sessionDate')}
                  </label>
                  <Input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('dashboardTrainer:startTime')}
                  </label>
                  <Input
                    type="time"
                    value={customStartTime}
                    onChange={(e) => setCustomStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('dashboardTrainer:endTime')}
                  </label>
                  <Input
                    type="time"
                    value={customEndTime}
                    onChange={(e) => setCustomEndTime(e.target.value)}
                  />
                </div>
              </div>
            </CardBody>
          </CardComponent>

          {/* Lesson Plan */}
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
          <div className={`flex justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button
              type="button"
              variant="ghost"
              leftIcon={<Trash2 className="w-5 h-5" />}
              onClick={handleDelete}
              disabled={isSaving || isDeleting}
              className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
            >
              {isDeleting ? t('dashboardTrainer:deletingSession') : t('dashboardTrainer:deleteSessionBtn')}
            </Button>
            <div className={`flex gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/trainer/sessions/${sessionId}`)}
                disabled={isSaving || isDeleting}
              >
                {t('dashboardCommon:cancel')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                leftIcon={<Save className="w-5 h-5" />}
                disabled={isSaving || isDeleting}
              >
                {isSaving ? t('dashboardTrainer:saving') : t('dashboardTrainer:saveChangesBtn')}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
