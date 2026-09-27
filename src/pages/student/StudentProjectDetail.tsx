import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Award,
  Calendar,
  Code,
  FileText,
  Image as ImageIcon,
  CheckCircle,
  Clock,
} from "lucide-react";
import { useStudentProjects } from "../../hooks";
import {
  CardComponent,
  CardBody,
  Button,
  Badge,
  LoadingState,
  Alert,
  Breadcrumb,
} from "../../components/ui";
import { ProjectStatusBadge } from "../../components/projects/ProjectStatusBadge";
import { useTranslation } from 'react-i18next';

export default function StudentProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardStudent']);
  const isRTL = i18n.language === 'ar';
  const { projectDetails, isLoading, error, getProjectDetails } = useStudentProjects();
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  useEffect(() => {
    if (projectId) {
      getProjectDetails(projectId);
    }
  }, [projectId, getProjectDetails]);

  if (isLoading && !projectDetails) {
    return <LoadingState type="skeleton" text={t('dashboardStudent:loadingProject')} />;
  }

  if (error && !projectDetails) {
    return (
      <div className="space-y-4 sm:space-y-6 md:space-y-8">
        <Alert variant="error">
          <p className="text-sm">{error}</p>
        </Alert>
      </div>
    );
  }

  if (!projectDetails) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Breadcrumbs */}
      <Breadcrumb
        showHome={false}
        items={[
          { label: t('dashboardStudent:myProjects'), path: '/student/projects' },
          { label: projectDetails.title || t('dashboardStudent:project') },
        ]}
      />
      {/* Header */}
      <div className={`flex items-center gap-4`}>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />}
          onClick={() => navigate("/student/projects")}
        >
          {t('dashboardStudent:backToProjects')}
        </Button>
      </div>

      {/* Project Info */}
      <CardComponent variant="glass">
        <CardBody>
          <div className={`flex items-start justify-between mb-4`}>
            <div className={`flex-1`}>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 transition-colors duration-300" style={{ color: '#003300' }}>{projectDetails.title}</h1>
              {projectDetails.courseId && (
                <p className="mb-2 transition-colors duration-300" style={{ color: '#003300' + 'CC' }}>{projectDetails.courseId.title}</p>
              )}
              {projectDetails.description && (
                <p dir="auto" className="transition-colors duration-300" style={{ color: '#003300' }}>{projectDetails.description}</p>
              )}
            </div>
            <ProjectStatusBadge status={projectDetails.status} size="lg" />
          </div>

          <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/10`}>
            {projectDetails.grade !== undefined && (
              <div>
                <p className="text-xs text-white/60 mb-1">{t('dashboardStudent:grade')}</p>
                <div className={`flex items-center gap-2`}>
                  <Award className="w-4 h-4 text-green-400" />
                  <p className="text-lg font-bold text-green-400">{projectDetails.grade}</p>
                </div>
              </div>
            )}
            <div>
              <p className="text-xs text-white/60 mb-1">{t('dashboardStudent:createdLabel')}</p>
              <div className={`flex items-center gap-1`}>
                <Calendar className="w-4 h-4 text-white/60" />
                <p className="text-sm font-medium text-white">
                  {new Date(projectDetails.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            {projectDetails.createdBy && (
              <div>
                <p className="text-xs text-white/60 mb-1">{t('dashboardStudent:createdBy')}</p>
                <p className="text-sm font-medium text-white">
                  {projectDetails.createdBy.name}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-white/60 mb-1">{t('dashboardStudent:imagesCount')}</p>
              <div className={`flex items-center gap-1`}>
                <ImageIcon className="w-4 h-4 text-white/60" />
                <p className="text-sm font-medium text-white">
                  {projectDetails.images.length}
                </p>
              </div>
            </div>
          </div>

          {projectDetails.feedback && (
            <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
              <p className={`text-sm font-medium text-white mb-2`}>{t('dashboardStudent:feedbackLabel')}</p>
              <p className={`text-sm text-white/80`}>{projectDetails.feedback}</p>
            </div>
          )}
        </CardBody>
      </CardComponent>

      {/* Technologies & Components */}
      {(projectDetails.technologies && projectDetails.technologies.length > 0) ||
      (projectDetails.components && projectDetails.components.length > 0) ? (
        <CardComponent variant="glass">
          <CardBody>
            <h2 className={`text-xl font-semibold text-white mb-4`}>{t('dashboardStudent:projectDetailsSection')}</h2>
            <div className="space-y-4">
              {projectDetails.technologies && projectDetails.technologies.length > 0 && (
                <div>
                  <div className={`flex items-center gap-2 mb-2`}>
                    <Code className="w-5 h-5 text-white/60" />
                    <h3 className="text-lg font-medium text-white">{t('dashboardStudent:technologies')}</h3>
                  </div>
                  <div className={`flex flex-wrap gap-2`}>
                    {projectDetails.technologies.map((tech, index) => (
                      <Badge key={index} variant="secondary" size="sm">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {projectDetails.components && projectDetails.components.length > 0 && (
                <div>
                  <div className={`flex items-center gap-2 mb-2`}>
                    <FileText className="w-5 h-5 text-white/60" />
                    <h3 className="text-lg font-medium text-white">{t('dashboardStudent:components')}</h3>
                  </div>
                  <ul className={`list-disc list-inside space-y-1 text-white/80`}>
                    {projectDetails.components.map((component, index) => (
                      <li key={index}>{component}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardBody>
        </CardComponent>
      ) : null}

      {/* Image Gallery */}
      {projectDetails.images && projectDetails.images.length > 0 && (
        <CardComponent variant="glass">
          <CardBody>
            <h2 className={`text-xl font-semibold text-white mb-4`}>{t('dashboardStudent:projectImages')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {projectDetails.images.map((image, index) => (
                <div
                  key={index}
                  className="relative cursor-pointer group"
                  onClick={() => setSelectedImageIndex(index)}
                >
                  <div className="relative w-full h-48 rounded-lg overflow-hidden border border-white/10 hover:border-primary/50 transition-all">
                    <img
                      src={image.cloudinaryUrl}
                      alt={`Project image ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </CardComponent>
      )}

      {/* Image Lightbox Modal */}
      {selectedImageIndex !== null && projectDetails.images[selectedImageIndex] && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImageIndex(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={projectDetails.images[selectedImageIndex].cloudinaryUrl}
              alt={`Project image ${selectedImageIndex + 1}`}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedImageIndex(null)}
              className="absolute top-4 right-4 bg-black/50 text-white hover:bg-black/70"
            >
              {t('dashboardCommon:close')}
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
