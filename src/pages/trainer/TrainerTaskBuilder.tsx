import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Save, FileText, AlertCircle } from "lucide-react";
import { useTrainerTasks, CreateTaskData } from "../../hooks";
import { useTrainerGroups } from "../../hooks/trainer/useTrainerGroups";
import { QuestionBuilder } from "../../components/tasks/QuestionBuilder";
import { Question } from "../../hooks/student/useTasks";
import { useTranslation } from 'react-i18next';
import {
  Button,
  Input,
  LoadingState,
  Alert,
  CardComponent,
  CardBody,
  Select,
} from "../../components/ui";

export default function TrainerTaskBuilder() {
  const navigate = useNavigate();
  const { taskId } = useParams<{ taskId: string }>();
  const isEditing = !!taskId;

  const { createTask, updateTask, getTaskDetails, isLoading: tasksLoading, error: tasksError, taskDetails } = useTrainerTasks();
  const [saveMode, setSaveMode] = useState<'draft' | 'publish'>('publish');
  const { groups } = useTrainerGroups({});

  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingTask, setIsLoadingTask] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");
  const [groupId, setGroupId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [maxScore, setMaxScore] = useState(100);
  const [allowLateSubmission, setAllowLateSubmission] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);

  // Get unique courses from groups
  const courses = Array.from(
    new Map(
      groups
        .filter((g) => g.courseId && g.courseId._id)
        .map((g) => [g.courseId._id, g.courseId])
    ).values()
  );

  const selectedGroup = groups.find((g) => g._id === groupId);

  // Load task data when editing
  useEffect(() => {
    const loadTaskData = async () => {
      if (isEditing && taskId) {
        try {
          setIsLoadingTask(true);
          setError(null);
          await getTaskDetails(taskId);
        } catch (err: any) {
          setError(err.message || 'Failed to load task data');
          console.error('Error loading task:', err);
        } finally {
          setIsLoadingTask(false);
        }
      }
    };

    loadTaskData();
  }, [taskId, isEditing, getTaskDetails]);

  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardTrainer']);
  const isRTL = i18n.language === 'ar';

  // Populate form when task details are loaded
  useEffect(() => {
    if (taskDetails?.task && isEditing) {
      const task = taskDetails.task;

      setTitle(task.title || "");
      setTitleAr(task.titleAr || "");
      setDescription(task.description || "");
      setDescriptionAr(task.descriptionAr || "");
      
      // Set group ID
      const taskGroupId = typeof task.groupId === 'object' ? task.groupId._id : task.groupId;
      setGroupId(taskGroupId || "");
      
      // Set course ID
      const taskCourseId = typeof task.courseId === 'object' ? task.courseId?._id : task.courseId;
      setCourseId(taskCourseId || "");
      
      // Set deadline - convert ISO string to datetime-local format
      if (task.deadline) {
        const deadlineDate = new Date(task.deadline);
        const year = deadlineDate.getFullYear();
        const month = String(deadlineDate.getMonth() + 1).padStart(2, '0');
        const day = String(deadlineDate.getDate()).padStart(2, '0');
        const hours = String(deadlineDate.getHours()).padStart(2, '0');
        const minutes = String(deadlineDate.getMinutes()).padStart(2, '0');
        setDeadline(`${year}-${month}-${day}T${hours}:${minutes}`);
      }
      
      setMaxScore(task.maxScore || 100);
      setAllowLateSubmission(task.allowLateSubmission || false);
      
      // Set questions
      if (task.questions && Array.isArray(task.questions)) {
        setQuestions(task.questions);
      }
    }
  }, [taskDetails, isEditing]);

  // Auto-populate course when group is selected (create mode only)
  useEffect(() => {
    if (isEditing) return;
    if (groupId && selectedGroup) {
      const groupCourseId =
        typeof selectedGroup.courseId === 'object'
          ? selectedGroup.courseId?._id
          : selectedGroup.courseId;
      setCourseId(groupCourseId || "");
    } else if (!groupId) {
      setCourseId("");
    }
  }, [groupId, selectedGroup, isEditing]);

  const handleSubmit = async (e: React.FormEvent, mode: 'draft' | 'publish' = saveMode) => {
    e.preventDefault();
    setError(null);

    if (!groupId) {
      setError(t('dashboardTrainer:validationSelectGroup'));
      return;
    }

    // Only require questions when publishing, not when saving as draft
    if (mode === 'publish' && questions.length === 0) {
      setError(t('dashboardTrainer:validationAddQuestion'));
      return;
    }

    // Validate questions
    for (const question of questions) {
      if (!question.questionText.trim()) {
        setError(t('dashboardTrainer:validationQuestionMissingText'));
        return;
      }

      if (question.answerType === "mcq") {
        if (!question.options || question.options.length < 2) {
          setError(t('dashboardTrainer:validationQuestionNeedsOptions'));
          return;
        }
      }
    }

    try {
      setIsSaving(true);
      setSaveMode(mode);

      // Clean questions: remove _id field for all questions (backend will assign IDs)
      const cleanedQuestions = questions.map(({ _id, ...question }) => question);

      const taskData: CreateTaskData = {
        groupId,
        courseId: courseId || undefined,
        title,
        titleAr: titleAr || undefined,
        description,
        descriptionAr: descriptionAr || undefined,
        deadline: new Date(deadline).toISOString(),
        maxScore,
        questions: cleanedQuestions,
        allowLateSubmission,
        status: mode === 'draft' ? 'draft' : 'open',
      };

      if (isEditing && taskId) {
        await updateTask(taskId, taskData);
      } else {
        await createTask(taskData);
      }

      navigate("/trainer/tasks");
    } catch (err: any) {
      setError(err.message || "Failed to save task");
    } finally {
      setIsSaving(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  // Show loading state when loading task data
  if (isLoadingTask && isEditing) {
    return <LoadingState type="skeleton" text={t('dashboardTrainer:loadingTaskData')} />;
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate("/trainer/tasks")}
        >
          {t('dashboardCommon:back')}
        </Button>
        <div>
          <h1 className="text-3xl font-bold inline-block group-hover:scale-105 transition-transform duration-300" style={{
            background: 'linear-gradient(135deg, #003300 0%, #004d00 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            {isEditing ? t('dashboardTrainer:editTask') : t('dashboardTrainer:createTask')}
          </h1>
          <p className="mt-1 transition-colors duration-300" style={{ color: '#003300' + 'CC' }}>
            {isEditing ? t('dashboardTrainer:editTaskSubtitle') : t('dashboardTrainer:createTaskSubtitle')}
          </p>
        </div>
      </motion.div>

      {/* Error Alert */}
      {(error || tasksError) && (
        <motion.div variants={itemVariants}>
          <Alert variant="error">
            <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold mb-1">{t('dashboardCommon:error')}</p>
                <p className="text-sm opacity-90">{error || tasksError}</p>
              </div>
            </div>
          </Alert>
        </motion.div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Basic Information */}
          <motion.div variants={itemVariants}>
            <CardComponent variant="glass">
              <CardBody>
                <h2 className="text-xl font-semibold text-white mb-4">{t('dashboardTrainer:basicInfo')}</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">
                        {t('dashboardCommon:group')} *
                      </label>
                      <Select
                        value={groupId}
                        onChange={(value) => setGroupId(value)}
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
                        {t('dashboardTrainer:courseOptional')}
                      </label>
                      <Select
                        value={courseId}
                        onChange={(value) => setCourseId(value)}
                        options={[
                          { value: "", label: t('dashboardTrainer:noCourse') },
                          ...(courses || []).map((course) => ({
                            value: course._id,
                            label: course.title,
                          })),
                        ]}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      {t('dashboardTrainer:taskTitle')} *
                    </label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={t('dashboardTrainer:taskTitlePlaceholder')}
                      required
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      {t('dashboardTrainer:taskTitleArOptional')}
                    </label>
                    <Input
                      value={titleAr}
                      onChange={(e) => setTitleAr(e.target.value)}
                      placeholder={t('dashboardTrainer:taskTitleArPlaceholder')}
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      {t('dashboardTrainer:taskDescription')} *
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={t('dashboardTrainer:taskDescriptionPlaceholder')}
                      required
                      rows={4}
                      className="w-full px-4 py-3 rounded-lg border border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      {t('dashboardTrainer:taskDescriptionArOptional')}
                    </label>
                    <textarea
                      value={descriptionAr}
                      onChange={(e) => setDescriptionAr(e.target.value)}
                      placeholder={t('dashboardTrainer:taskDescriptionArPlaceholder')}
                      rows={4}
                      className="w-full px-4 py-3 rounded-lg border border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">
                        {t('dashboardTrainer:deadline')} *
                      </label>
                      <Input
                        type="datetime-local"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        required
                        className="bg-white/5 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">
                        {t('dashboardTrainer:maxScore')}
                      </label>
                      <Input
                        type="number"
                        value={maxScore}
                        onChange={(e) => setMaxScore(parseInt(e.target.value) || 100)}
                        min="0"
                        className="bg-white/5 border-white/20 text-white"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allowLateSubmission}
                          onChange={(e) => setAllowLateSubmission(e.target.checked)}
                          className="w-4 h-4 text-primary"
                        />
                        <span className="text-sm text-white/80">{t('dashboardTrainer:allowLateSubmission')}</span>
                      </label>
                    </div>
                  </div>
                </div>
              </CardBody>
            </CardComponent>
          </motion.div>

          {/* Questions */}
          <motion.div variants={itemVariants}>
            <CardComponent variant="glass">
              <CardBody>
                <QuestionBuilder questions={questions} onChange={setQuestions} />
              </CardBody>
            </CardComponent>
          </motion.div>

          {/* Actions */}
          <motion.div variants={itemVariants} className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/trainer/tasks")}
              disabled={isSaving}
            >
              {t('dashboardCommon:cancel')}
            </Button>
            {/* Save as Draft — always available */}
            <Button
              type="button"
              variant="outline"
              leftIcon={<FileText className="w-5 h-5" />}
              disabled={isSaving}
              isLoading={isSaving && saveMode === 'draft'}
              onClick={(e) => handleSubmit(e as any, 'draft')}
            >
              {t('dashboardTrainer:saveAsDraft', 'Save as Draft')}
            </Button>
            {/* Publish */}
            <Button
              type="submit"
              variant="primary"
              leftIcon={<Save className="w-5 h-5" />}
              disabled={isSaving}
              isLoading={isSaving && saveMode === 'publish'}
              onClick={() => setSaveMode('publish')}
            >
              {isEditing ? t('dashboardTrainer:updateTask') : t('dashboardTrainer:publishTask', 'Publish Task')}
            </Button>
          </motion.div>
        </div>
      </form>
    </motion.div>
  );
}
