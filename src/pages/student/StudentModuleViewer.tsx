import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  BookOpen,
  PlayCircle,
  FileText,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { api } from "../../lib/api";
import {
  CardComponent,
  CardBody,
  Button,
  Badge,
  LoadingState,
  Alert,
  useToast,
} from "../../components/ui";
import { PDFViewer } from "../../components/ui/PDFViewer";
import { useTranslation } from 'react-i18next';

interface ModuleData {
  _id: string;
  title: string;
  description?: string;
  type: "video" | "pdf" | "text" | "quiz" | "assignment";
  content: {
    videoUrl?: string;
    pdfUrl?: string;
    textContent?: string;
    duration?: number;
  };
  course: {
    _id: string;
    title: string;
  };
  order: number;
}

interface ModuleProgress {
  status: "not_started" | "in_progress" | "completed";
  timeSpent: number;
  videoProgress?: {
    currentTime: number;
    duration: number;
    completed: boolean;
  };
}

export default function StudentModuleViewer() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardStudent']);
  const isRTL = i18n.language === 'ar';

  const toast = useToast();
  const [module, setModule] = useState<ModuleData | null>(null);
  const [progress, setProgress] = useState<ModuleProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showViewer, setShowViewer] = useState(false);

  useEffect(() => {
    fetchModuleData();
  }, [moduleId]);

  const fetchModuleData = async () => {
    if (!moduleId) return;

    try {
      setIsLoading(true);
      setError(null);

      const [moduleRes, progressRes] = await Promise.all([
        api.get(`/student/modules/${moduleId}`),
        api.get(`/student/modules/${moduleId}/progress`),
      ]);

      setModule(moduleRes.data.data);
      setProgress(progressRes.data.data || null);

      // Mark as started if not started
      if (!progressRes.data.data || progressRes.data.data.status === "not_started") {
        await api.post(`/student/modules/${moduleId}/start`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t('dashboardStudent:failedLoadModule'));
      console.error("Error fetching module:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!moduleId || !module) return;

    try {
      setIsCompleting(true);
      await api.post(`/student/modules/${moduleId}/complete`);
      await fetchModuleData();
    } catch (err: any) {
      console.error("Error completing module:", err);
      toast.error(t('dashboardCommon:error'), err.response?.data?.message || t('dashboardCommon:errorMessage'));
    } finally {
      setIsCompleting(false);
    }
  };

  const handleNext = async () => {
    if (!moduleId) return;

    try {
      const response = await api.get(`/student/modules/${moduleId}/next`);
      const nextModule = response.data.data;
      if (nextModule) {
        navigate(`/student/modules/${nextModule._id}`);
      }
    } catch (err: any) {
      console.error("No next module:", err);
    }
  };

  const handlePrevious = async () => {
    if (!moduleId) return;

    try {
      const response = await api.get(`/student/modules/${moduleId}/previous`);
      const prevModule = response.data.data;
      if (prevModule) {
        navigate(`/student/modules/${prevModule._id}`);
      }
    } catch (err: any) {
      console.error("No previous module:", err);
    }
  };

  // Show loading state
  if (isLoading) {
    return <LoadingState type="skeleton" text={t('dashboardStudent:loadingModule')} />;
  }

  // Show error state
  if (error || !module) {
    return (
      <div className="space-y-4 sm:space-y-6 md:space-y-8">
        <Alert variant="error">
          <div className={`flex items-start gap-3`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold mb-1">{t('dashboardStudent:failedLoadModule')}</p>
              <p className="text-sm opacity-90">{error || t('dashboardStudent:moduleNotFound')}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={fetchModuleData}
            >
              {t('dashboardCommon:retry')}
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  const isCompleted = progress?.status === "completed";
  const timeSpentMinutes = Math.floor((progress?.timeSpent || 0) / 60);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className={`flex items-start justify-between gap-4`}>
        <div className="flex-1">
          <Link to={`/student/courses/${module.course._id}`}>
            <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />}>
              {t('dashboardStudent:backToCourse')}
            </Button>
          </Link>
          <h1 className={`text-xl sm:text-2xl md:text-3xl font-bold mt-4 mb-2 transition-colors duration-300`} style={{ color: '#0f1f33' }}>{module.title}</h1>
          {module.description && (
            <p dir="auto" className={`transition-colors duration-300`} style={{ color: '#0f1f33' + 'CC' }}>{module.description}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Badge variant={isCompleted ? "success" : "primary"} size="md">
            {isCompleted ? (
              <>
                <CheckCircle className={`w-4 h-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                {t('dashboardStudent:completed')}
              </>
            ) : (
              t('dashboardStudent:inProgress')
            )}
          </Badge>
          {module.content.duration && (
            <Badge variant="secondary" size="md">
              <Clock className={`w-4 h-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
              {module.content.duration} min
            </Badge>
          )}
        </div>
      </div>

      {/* Progress Info */}
      {timeSpentMinutes > 0 && (
        <Alert variant="info">
          <Clock className="w-4 h-4" />
          <span>{t('dashboardStudent:timeSpent', { minutes: timeSpentMinutes })}</span>
        </Alert>
      )}

      {/* Content Viewer */}
      <CardComponent variant="glass">
        <CardBody>
          {/* Video Content */}
          {module.type === "video" && module.content.videoUrl && (
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <video
                controls
                className="w-full h-full"
                src={module.content.videoUrl}
                onTimeUpdate={(e) => {
                  const video = e.target as HTMLVideoElement;
                  if (moduleId && video.currentTime > 0) {
                    api.patch(`/student/modules/${moduleId}/progress`, {
                      timeSpent: Math.floor(video.currentTime),
                      videoProgress: {
                        currentTime: video.currentTime,
                        duration: video.duration,
                        completed: video.currentTime >= video.duration * 0.9,
                      },
                    }).catch(console.error);
                  }
                }}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          )}

          {/* PDF Content */}
          {module.type === "pdf" && module.content.pdfUrl && (
            <div className="h-[600px] flex flex-col items-center justify-center bg-black/20 rounded-lg border border-white/10 overflow-hidden">
              <FileText className="w-16 h-16 text-white/20 mb-4" />
              <p className="text-white/60 mb-6 font-medium">{module.title}</p>
              <Button
                variant="primary"
                size="lg"
                leftIcon={<FileText className="w-5 h-5" />}
                onClick={() => setShowViewer(true)}
              >
                {t('dashboardStudent:viewPdfBtn')}
              </Button>

              <PDFViewer
                resourceId={null}
                initialUrl={module.content.pdfUrl}
                title={module.title}
                isOpen={showViewer}
                onClose={() => setShowViewer(false)}
              />
            </div>
          )}

          {/* Text Content */}
          {module.type === "text" && module.content.textContent && (
            <div className="prose prose-invert max-w-none">
              <div
                dangerouslySetInnerHTML={{ __html: module.content.textContent }}
                className={`text-white/80 leading-relaxed`}
              />
            </div>
          )}

          {/* Quiz/Assignment Links */}
          {module.type === "quiz" && (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-semibold mb-2">{t('dashboardStudent:quizModule')}</h3>
              <p className="text-white/60 mb-6">
                {t('dashboardStudent:completeQuizDesc')}
              </p>
              <Link to={`/student/quizzes/${moduleId}`}>
                <Button variant="primary" size="lg">
                  {t('dashboardStudent:startQuizBtn')}
                </Button>
              </Link>
            </div>
          )}

          {module.type === "assignment" && (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto mb-4 text-secondary" />
              <h3 className="text-xl font-semibold mb-2">{t('dashboardStudent:assignmentModule')}</h3>
              <p className="text-white/60 mb-6">
                {t('dashboardStudent:submitAssignmentDesc')}
              </p>
              <Link to={`/student/assignments/${moduleId}`}>
                <Button variant="secondary" size="lg">
                  {t('dashboardCommon:submit')}
                </Button>
              </Link>
            </div>
          )}
        </CardBody>
      </CardComponent>

      {/* Navigation */}
      <div className={`flex items-center justify-between`}>
        <Button
          variant="outline"
          size="md"
          leftIcon={<ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />}
          onClick={handlePrevious}
        >
          {t('dashboardStudent:previousModule')}
        </Button>

        <div className={`flex items-center gap-3`}>
          {!isCompleted && (
            <Button
              variant="success"
              size="md"
              leftIcon={<CheckCircle className="w-4 h-4" />}
              onClick={handleComplete}
              loading={isCompleting}
            >
              {t('dashboardStudent:markAsComplete')}
            </Button>
          )}

          <Button
            variant="primary"
            size="md"
            rightIcon={<ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />}
            onClick={handleNext}
          >
            {t('dashboardStudent:nextModule')}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
