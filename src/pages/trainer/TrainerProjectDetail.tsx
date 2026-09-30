import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Save,
  Upload,
  Trash2,
  Award,
  Calendar,
  Code,
  FileText,
  Image as ImageIcon,
  Edit,
  X,
} from "lucide-react";
import { useTrainerProjects } from "../../hooks";
import { useTrainerGroups } from "../../hooks/trainer/useTrainerGroups";
import { ProjectImageUpload } from "../../components/projects/ProjectImageUpload";
import { ProjectStatusBadge } from "../../components/projects/ProjectStatusBadge";
import { useTranslation } from 'react-i18next';
import { formatDate } from "../../utils/dateTime";
import {
  CardComponent,
  CardBody,
  Button,
  Badge,
  LoadingState,
  Alert,
  Input,
  Select,
  Modal,
} from "../../components/ui";

export default function TrainerProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const isEditing = !!projectId && projectId !== "new";

  const {
    projectDetails,
    isLoading,
    error,
    getProjectDetails,
    createProject,
    updateProject,
    uploadProjectImages,
    deleteProjectImage,
    changeProjectStatus,
    gradeProject,
  } = useTrainerProjects();
  const { groups } = useTrainerGroups({});
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardTrainer']);
  const isRTL = i18n.language === 'ar';

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [grade, setGrade] = useState<number>(0);
  const [feedback, setFeedback] = useState("");
  const [isGrading, setIsGrading] = useState(false);

  // Form state (for create/edit)
  const [title, setTitle] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");
  const [studentId, setStudentId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [components, setComponents] = useState<string[]>([]);
  const [technologies, setTechnologies] = useState<string[]>([]);
  const [newComponent, setNewComponent] = useState("");
  const [newTechnology, setNewTechnology] = useState("");
  const [uploadImages, setUploadImages] = useState<File[]>([]);

  useEffect(() => {
    if (isEditing && projectId) {
      getProjectDetails(projectId);
    }
  }, [isEditing, projectId, getProjectDetails]);

  useEffect(() => {
    if (projectDetails && isEditing) {
      setTitle(projectDetails.title);
      setTitleAr(projectDetails.titleAr || "");
      setDescription(projectDetails.description || "");
      setDescriptionAr(projectDetails.descriptionAr || "");
      setComponents(projectDetails.components || []);
      setTechnologies(projectDetails.technologies || []);
    }
  }, [projectDetails, isEditing]);

  const selectedGroup = groups.find((g) => g._id === groupId);
  const students = selectedGroup?.students || [];

  const handleSave = async () => {
    setSaveError(null);

    // Validate required fields
    if (!studentId || !studentId.trim() || !groupId || !groupId.trim()) {
      setSaveError(t('dashboardTrainer:validationSelectStudentGroup'));
      return;
    }

    if (!title || !title.trim()) {
      setSaveError(t('dashboardTrainer:validationProjectTitle'));
      return;
    }

    try {
      setIsSaving(true);

      if (isEditing && projectId) {
        await updateProject(projectId, {
          title,
          titleAr: titleAr || undefined,
          description: description || undefined,
          descriptionAr: descriptionAr || undefined,
          components,
          technologies,
        });
      } else {
        // Ensure ownerId is set to studentId (required by backend)
        const projectData = {
          studentId: studentId.trim(),
          groupId: groupId.trim(),
          ownerId: studentId.trim(), // ownerId must be the student the project is assigned to
          title: title.trim(),
          titleAr: titleAr?.trim() || undefined,
          description: description?.trim() || undefined,
          descriptionAr: descriptionAr?.trim() || undefined,
          courseId: courseId?.trim() || undefined,
          components: components.length > 0 ? components : undefined,
          technologies: technologies.length > 0 ? technologies : undefined,
        };

        console.log('[TrainerProjectDetail] Creating project with data:', projectData);
        await createProject(projectData);
      }

      if (uploadImages.length > 0 && (isEditing ? projectId : true)) {
        const projectIdToUse = isEditing ? projectId! : (await getProjectDetails(projectId!));
        await uploadProjectImages(projectId!, uploadImages);
      }

      navigate("/trainer/projects");
    } catch (err: any) {
      setSaveError(err.message || t('dashboardTrainer:failedSaveProject'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleGrade = async () => {
    if (!projectId) return;

    try {
      setIsGrading(true);
      await gradeProject(projectId, grade, feedback || undefined);
      setShowGradeModal(false);
      setGrade(0);
      setFeedback("");
      await getProjectDetails(projectId);
    } catch (err: any) {
      console.error("Failed to grade project:", err);
    } finally {
      setIsGrading(false);
    }
  };

  const handleDeleteImage = async (imageIndex: number) => {
    if (!projectId) return;

    try {
      await deleteProjectImage(projectId, imageIndex);
      await getProjectDetails(projectId);
    } catch (err: any) {
      console.error("Failed to delete image:", err);
    }
  };

  const addComponent = () => {
    if (newComponent.trim()) {
      setComponents([...components, newComponent.trim()]);
      setNewComponent("");
    }
  };

  const removeComponent = (index: number) => {
    setComponents(components.filter((_, i) => i !== index));
  };

  const addTechnology = () => {
    if (newTechnology.trim()) {
      setTechnologies([...technologies, newTechnology.trim()]);
      setNewTechnology("");
    }
  };

  const removeTechnology = (index: number) => {
    setTechnologies(technologies.filter((_, i) => i !== index));
  };

  if (isLoading && !projectDetails && isEditing) {
    return <LoadingState type="skeleton" text={t('dashboardTrainer:loadingProjects')} />;
  }

  if (error && !projectDetails && isEditing) {
    return (
      <div className="space-y-8">
        <Alert variant="error">
          <p className="text-sm">{error}</p>
        </Alert>
      </div>
    );
  }

  const isCreateMode = !isEditing;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate("/trainer/projects")}
        >
          {t('dashboardCommon:back')}
        </Button>
        <div>
          <h1 className="text-3xl font-bold inline-block group-hover:scale-105 transition-transform duration-300" style={{
            color: '#0f1f33',
            backgroundClip: 'text'
          }}>
            {isCreateMode ? t('dashboardTrainer:createProject') : projectDetails?.title || t('dashboardTrainer:projectDetails')}
          </h1>
          <p className="mt-1 transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>
            {isCreateMode
              ? t('dashboardTrainer:createProjectSubtitle')
              : t('dashboardTrainer:manageProjectSubtitle')}
          </p>
        </div>
      </div>

      {saveError && (
        <Alert variant="error">
          <p className="text-sm">{saveError}</p>
        </Alert>
      )}

      {/* Create/Edit Form */}
      {isCreateMode ? (
        <CardComponent variant="glass">
          <CardBody>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    {t('dashboardTrainer:groupName')} *
                  </label>
                  <Select
                    value={groupId}
                    onChange={(value) => {
                      setGroupId(value);
                      setStudentId("");
                    }}
                    options={[
                      { value: "", label: t('dashboardTrainer:selectGroup') },
                      ...(groups || []).map((group) => ({
                        value: group._id,
                        label: group.name,
                      })),
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    {t('dashboardTrainer:student')} *
                  </label>
                  <Select
                    value={studentId}
                    onChange={(value) => setStudentId(value)}
                    options={[
                      { value: "", label: t('dashboardTrainer:selectStudent') },
                      ...(students || []).map((student) => ({
                        value: student._id,
                        label: student.name,
                      })),
                    ]}
                    disabled={!groupId}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  {t('dashboardCommon:title')} *
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('dashboardTrainer:projectTitlePlaceholder')}
                  required
                  className="bg-white/5 border-white/20 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  {t('dashboardCommon:description')}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('dashboardTrainer:projectDescriptionPlaceholder')}
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  {t('dashboardTrainer:components')}
                </label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newComponent}
                    onChange={(e) => setNewComponent(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addComponent()}
                    placeholder={t('dashboardTrainer:addComponent')}
                    className="bg-white/5 border-white/20 text-white flex-1"
                  />
                  <Button variant="outline" onClick={addComponent}>
                    {t('dashboardCommon:add')}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {components.map((comp, index) => (
                    <Badge key={index} variant="secondary" size="sm">
                      {comp}
                      <button
                        onClick={() => removeComponent(index)}
                        className={`${isRTL ? 'mr-2' : 'ml-2'} hover:text-red-600`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  {t('dashboardTrainer:technologies')}
                </label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newTechnology}
                    onChange={(e) => setNewTechnology(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addTechnology()}
                    placeholder={t('dashboardTrainer:addTechnology')}
                    className="bg-white/5 border-white/20 text-white flex-1"
                  />
                  <Button variant="outline" onClick={addTechnology}>
                    {t('dashboardCommon:add')}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {technologies.map((tech, index) => (
                    <Badge key={index} variant="secondary" size="sm">
                      {tech}
                      <button
                        onClick={() => removeTechnology(index)}
                        className={`${isRTL ? 'mr-2' : 'ml-2'} hover:text-red-600`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className={`flex justify-end gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Button
                  variant="outline"
                  onClick={() => navigate("/trainer/projects")}
                  disabled={isSaving}
                >
                  {t('dashboardCommon:cancel')}
                </Button>
                <Button
                  variant="primary"
                  leftIcon={<Save className="w-5 h-5" />}
                  onClick={handleSave}
                  disabled={isSaving}
                  isLoading={isSaving}
                >
                  {t('dashboardTrainer:createProject')}
                </Button>
              </div>
            </div>
          </CardBody>
        </CardComponent>
      ) : projectDetails ? (
        <>
          {/* Project Info */}
          <CardComponent variant="glass">
            <CardBody>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-2">{projectDetails.title}</h2>
                  {projectDetails.courseId && (
                    <p className="text-white/60 mb-2">{projectDetails.courseId.title}</p>
                  )}
                  {projectDetails.description && (
                    <p className="text-white/80">{projectDetails.description}</p>
                  )}
                </div>
                <ProjectStatusBadge status={projectDetails.status} size="lg" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/10">
                {projectDetails.grade !== undefined && (
                  <div>
                    <p className="text-xs text-white/60 mb-1">{t('dashboardTrainer:grade')}</p>
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-green-400" />
                      <p className="text-lg font-bold text-green-400">{projectDetails.grade}</p>
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-xs text-white/60 mb-1">{t('dashboardTrainer:createdLabel')}</p>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-white/60" />
                    <p className="text-sm font-medium text-white">
                      {formatDate(projectDetails.createdAt)}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-white/60 mb-1">{t('dashboardTrainer:imagesLabel')}</p>
                  <div className="flex items-center gap-1">
                    <ImageIcon className="w-4 h-4 text-white/60" />
                    <p className="text-sm font-medium text-white">
                      {projectDetails.images.length}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-white/60 mb-1">{t('dashboardCommon:status')}</p>
                  <Select
                    value={projectDetails.status}
                    onChange={(value) =>
                      projectId &&
                      changeProjectStatus(projectId, value as any)
                    }
                    options={[
                      { value: "in_progress", label: t('dashboardTrainer:inProgress') },
                      { value: "completed", label: t('dashboardTrainer:completed') },
                      { value: "submitted", label: t('dashboardTrainer:submitted') },
                    ]}
                  />
                </div>
              </div>

              {projectDetails.feedback && (
                <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
                  <p className="text-sm font-medium text-white mb-2">{t('dashboardTrainer:feedbackLabel')}:</p>
                  <p className="text-sm text-white/80">{projectDetails.feedback}</p>
                </div>
              )}
            </CardBody>
          </CardComponent>

          {/* Technologies & Components */}
          {(projectDetails.technologies && projectDetails.technologies.length > 0) ||
          (projectDetails.components && projectDetails.components.length > 0) ? (
            <CardComponent variant="glass">
              <CardBody>
                <h3 className="text-lg font-semibold text-white mb-4">{t('dashboardTrainer:projectDetails')}</h3>
                <div className="space-y-4">
                  {projectDetails.technologies && projectDetails.technologies.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Code className="w-5 h-5 text-white/60" />
                        <h4 className="font-medium text-white">{t('dashboardTrainer:technologies')}</h4>
                      </div>
                      <div className="flex flex-wrap gap-2">
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
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-5 h-5 text-white/60" />
                        <h4 className="font-medium text-white">{t('dashboardTrainer:components')}</h4>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-white/80">
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

          {/* Image Management */}
          <CardComponent variant="glass">
            <CardBody>
              <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <h3 className="text-lg font-semibold text-white">{t('dashboardTrainer:projectImages')}</h3>
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Upload className="w-4 h-4" />}
                    onClick={() => {
                      // Trigger file input
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "image/*";
                      input.multiple = true;
                      input.onchange = async (e) => {
                        const files = Array.from((e.target as HTMLInputElement).files || []);
                        if (files.length > 0 && projectId) {
                          try {
                            await uploadProjectImages(projectId, files);
                            await getProjectDetails(projectId);
                          } catch (err) {
                            console.error("Failed to upload images:", err);
                          }
                        }
                      };
                      input.click();
                    }}
                  >
                    {t('dashboardTrainer:uploadImage')}
                  </Button>
                  {projectDetails.grade === undefined && (
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Award className="w-4 h-4" />}
                      onClick={() => {
                        setGrade(projectDetails.grade || 0);
                        setFeedback(projectDetails.feedback || "");
                        setShowGradeModal(true);
                      }}
                    >
                      {t('dashboardTrainer:gradeProject')}
                    </Button>
                  )}
                </div>
              </div>

              {projectDetails.images.length === 0 ? (
                <div className="text-center py-8 text-white/60">
                  <ImageIcon className="w-12 h-12 mx-auto mb-3 text-white/20" />
                  <p>{t('dashboardTrainer:noImagesYet')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {projectDetails.images.map((image, index) => (
                    <div key={index} className="relative group">
                      <div className="relative w-full h-48 rounded-lg overflow-hidden border border-white/10">
                        <img
                          src={image.cloudinaryUrl}
                          alt={`Project image ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => handleDeleteImage(index)}
                          className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </CardComponent>
        </>
      ) : null}

      {/* Grade Modal */}
      <Modal
        isOpen={showGradeModal}
        onClose={() => {
          setShowGradeModal(false);
          setGrade(0);
          setFeedback("");
        }}
        title={t('dashboardTrainer:gradeProject')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              {t('dashboardTrainer:grade')}
            </label>
            <Input
              type="number"
              value={grade}
              onChange={(e) => setGrade(parseInt(e.target.value) || 0)}
              min="0"
              max="100"
              className="bg-white/5 border-white/20 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              {t('dashboardTrainer:feedback')}
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              placeholder={t('dashboardTrainer:feedbackPlaceholder')}
              className="w-full px-4 py-3 rounded-lg border border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
            />
          </div>
          <div className={`flex justify-end gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button
              variant="outline"
              onClick={() => {
                setShowGradeModal(false);
                setGrade(0);
                setFeedback("");
              }}
              disabled={isGrading}
            >
              {t('dashboardCommon:cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleGrade}
              disabled={isGrading}
              isLoading={isGrading}
            >
              {t('dashboardTrainer:saveGrade')}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
