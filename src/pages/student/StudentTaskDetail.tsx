import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Send,
  FileText,
  Paperclip,
  Upload,
  X,
  Archive,
} from "lucide-react";
import { useTasks, type Answer } from "../../hooks";
import {
  CardComponent,
  CardBody,
  Button,
  Badge,
  LoadingState,
  Alert,
  Modal,
  Breadcrumb,
} from "../../components/ui";
import { MCQQuestion } from "../../components/tasks/MCQQuestion";
import { TextQuestion } from "../../components/tasks/TextQuestion";
import { ImageQuestion } from "../../components/tasks/ImageQuestion";
import { SubmissionViewer } from "../../components/tasks/SubmissionViewer";
import { useTranslation } from 'react-i18next';
import { formatDate } from "../../utils/dateTime";

export default function StudentTaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardStudent']);
  const isRTL = i18n.language === 'ar';
  const { taskDetails, isLoading, error, getTaskDetails, submitTask } = useTasks();

  const [answers, setAnswers] = useState<Answer[]>([]);
  const [allFiles, setAllFiles] = useState<File[]>([]);
  const [archiveFiles, setArchiveFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  useEffect(() => {
    if (taskId) {
      getTaskDetails(taskId);
    }
  }, [taskId, getTaskDetails]);

  useEffect(() => {
    if (taskDetails?.submission?.answers) {
      setAnswers(taskDetails.submission.answers);
    } else if (taskDetails?.task.questions) {
      // Initialize empty answers
      setAnswers(
        taskDetails.task.questions.map((q) => ({
          questionId: q._id || '',
          answerType: q.answerType,
        }))
      );
    }
  }, [taskDetails]);

  const handleAnswerChange = useCallback((questionId: string, answer: Answer) => {
    setAnswers((prev) => {
      const existing = prev.findIndex((a) => a.questionId === questionId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = answer;
        return updated;
      }
      return [...prev, answer];
    });
  }, []);

  const handleFilesChange = (files: File[]) => {
    setAllFiles((prev) => {
      // Merge files, avoiding duplicates
      const newFiles = [...prev];
      files.forEach((file) => {
        if (!newFiles.find((f) => f.name === file.name && f.size === file.size)) {
          newFiles.push(file);
        }
      });
      return newFiles;
    });
  };

  const validateSubmission = (): string | null => {
    if (!taskDetails?.task.questions) return "No questions found";

    const requiredQuestions = taskDetails.task.questions.filter((q) => q.required);

    for (const question of requiredQuestions) {
      const answer = answers.find((a) => a.questionId === (question._id || ''));

      if (!answer) {
        return `Question "${question.questionText}" is required`;
      }

      if (question.answerType === "mcq" && (!answer.selectedAnswers || answer.selectedAnswers.length === 0)) {
        return `Question "${question.questionText}" requires an answer`;
      }

      if (question.answerType === "text" && (!answer.textAnswer || answer.textAnswer.trim() === "")) {
        return `Question "${question.questionText}" requires an answer`;
      }

      if (question.answerType === "image") {
        const imageAnswer = answer.imageAnswers || [];
        const imageFiles = allFiles.filter((_, index) =>
          answer.imageFileIndices?.includes(index)
        );
        if (imageAnswer.length === 0 && imageFiles.length === 0) {
          return `Question "${question.questionText}" requires at least one image`;
        }
      }
    }

    return null;
  };

  const handleSubmit = async () => {
    if (!taskId) return;

    const validationError = validateSubmission();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      await submitTask(taskId, answers, [...allFiles, ...archiveFiles]);
      setShowSubmitModal(false);
      await getTaskDetails(taskId);
    } catch (err: any) {
      setSubmitError(err.message || "Failed to submit task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDeadline = (deadline: string) => {
    const date = new Date(deadline);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return t('dashboardStudent:overdueLabel');
    if (days === 0) return t('dashboardStudent:dueToday');
    if (days === 1) return t('dashboardStudent:dueTomorrow');
    return t('dashboardStudent:dueInDays', { days });
  };

  const isOverdue = taskDetails?.task.deadline
    ? new Date(taskDetails.task.deadline) < new Date()
    : false;

  const isSubmitted = taskDetails?.submission?.status &&
    taskDetails.submission.status !== "not_submitted";

  const isGraded = taskDetails?.submission?.status === "graded";

  // Show loading state
  if (isLoading && !taskDetails) {
    return <LoadingState type="skeleton" text={t('dashboardStudent:loadingTask')} />;
  }

  // Show error state
  if (error && !taskDetails) {
    return (
      <div className="space-y-4 sm:space-y-6 md:space-y-8">
        <Alert variant="error">
          <div className={`flex items-start gap-3`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold mb-1">{t('dashboardStudent:failedLoadTask')}</p>
              <p className="text-sm opacity-90">{error}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={() => taskId && getTaskDetails(taskId)}
            >
              {t('dashboardCommon:retry')}
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  if (!taskDetails) {
    return null;
  }

  const { task, submission } = taskDetails;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto space-y-6 pb-24 lg:pb-6"
    >
      {/* Breadcrumbs */}
      <Breadcrumb
        showHome={false}
        items={[
          { label: t('dashboardStudent:myTasks'), path: '/student/tasks' },
          { label: task.title },
        ]}
      />
      {/* Header */}
      <div className={`flex items-center gap-4`}>
        <Link to="/student/tasks">
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />}>
            {t('dashboardStudent:backToTasks')}
          </Button>
        </Link>
      </div>

      {/* Task Info */}
      <CardComponent variant="glass">
        <CardBody>
          <div className={`flex items-start justify-between mb-4`}>
            <div className={`flex-1`}>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 transition-colors duration-300" style={{ color: '#0f1f33' }}>{task.title}</h1>
              {task.courseId && (
                <p className="mb-2 transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>{task.courseId.title}</p>
              )}
              <p dir="auto" className="transition-colors duration-300" style={{ color: '#0f1f33' }}>{task.description}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {isGraded ? (
                <Badge variant="success" size="lg">
                  {t('dashboardStudent:gradedStatus')}
                </Badge>
              ) : isSubmitted ? (
                <Badge variant="warning" size="lg">
                  {submission?.status === "pending_review" ? t('dashboardStudent:pendingReview') : t('dashboardStudent:submitted')}
                </Badge>
              ) : (
                <Badge variant={isOverdue ? "error" : "primary"} size="lg">
                  {task.status === "open" ? t('dashboardStudent:openStatus') : t('dashboardStudent:closedStatus')}
                </Badge>
              )}
            </div>
          </div>

          <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/10`}>
            <div>
              <p className="text-xs text-white/60 mb-1">{t('dashboardStudent:deadline')}</p>
              <div className={`flex items-center gap-1`}>
                <Clock className="w-4 h-4 text-white/60" />
                <p className="text-sm font-medium text-white">
                  {formatDeadline(task.deadline)}
                </p>
              </div>
              <p className="text-xs text-white/40 mt-1">
                {formatDate(task.deadline)}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/60 mb-1">{t('dashboardStudent:maxScore')}</p>
              <p className="text-sm font-medium text-white">{task.maxScore} points</p>
            </div>
            {isGraded && submission?.score !== undefined && (
              <div>
                <p className="text-xs text-white/60 mb-1">{t('dashboardStudent:yourScore')}</p>
                <p className="text-sm font-medium text-green-400">
                  {submission.score}/{task.maxScore}
                </p>
              </div>
            )}
            {submission?.isLate && (
              <div>
                <p className="text-xs text-white/60 mb-1">{t('dashboardCommon:status')}</p>
                <Badge variant="error" size="sm">{t('dashboardStudent:lateSubmission')}</Badge>
              </div>
            )}
          </div>

          {isGraded && submission?.feedback && (
            <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
              <p className={`text-sm font-medium text-white mb-2`}>{t('dashboardStudent:feedbackLabel')}</p>
              <p className={`text-sm text-white/80`}>{submission.feedback}</p>
            </div>
          )}
        </CardBody>
      </CardComponent>

      {/* Questions */}
      {task.questions && task.questions.length > 0 && (
        <div className="space-y-4">
          <h2 className={`text-xl font-semibold text-white flex items-center gap-2`}>
            <FileText className="w-5 h-5" />
            {t('dashboardStudent:questionsCount', { count: task.questions.length })}
          </h2>

          {isSubmitted ? (
            <SubmissionViewer
              questions={task.questions}
              answers={submission?.answers || []}
            />
          ) : (
            task.questions.map((question, index) => {
              const questionId = question._id || `question-${index}`;
              const answer = answers.find((a) => a.questionId === questionId);

              return (
                <div key={questionId}>
                  {question.answerType === "mcq" && (
                    <MCQQuestion
                      question={question}
                      answer={answer}
                      onChange={(ans) => handleAnswerChange(questionId, ans)}
                      disabled={task.status === "closed"}
                    />
                  )}
                  {question.answerType === "text" && (
                    <TextQuestion
                      question={question}
                      answer={answer}
                      onChange={(ans) => handleAnswerChange(questionId, ans)}
                      disabled={task.status === "closed"}
                    />
                  )}
                  {question.answerType === "image" && (
                    <ImageQuestion
                      question={question}
                      answer={answer}
                      onChange={(ans) => handleAnswerChange(questionId, ans)}
                      onFilesChange={handleFilesChange}
                      disabled={task.status === "closed"}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Archive File Attachment */}
      {!isSubmitted && task.status === "open" && (
        <CardComponent variant="glass" className="mb-2">
          <CardBody>
            <div className="flex items-center gap-2 mb-3">
              <Paperclip className="w-5 h-5 text-white/60" />
              <h2 className="text-base font-semibold text-white">{t('dashboardStudent:attachFiles')}</h2>
              <span className="text-xs text-white/40">ZIP / RAR — {t('dashboardStudent:max50mb')}</span>
            </div>

            {archiveFiles.map((file, i) => (
              <div key={i} className="flex items-center justify-between p-3 mb-2 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center gap-2 min-w-0">
                  <Archive className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm text-white truncate">{file.name}</span>
                  <span className="text-xs text-white/40 flex-shrink-0">{formatFileSize(file.size)}</span>
                </div>
                <button onClick={() => setArchiveFiles(prev => prev.filter((_, idx) => idx !== i))} className="ml-2 text-red-400 hover:text-red-300 flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}

            <label className="flex flex-col items-center justify-center border-2 border-dashed border-white/20 rounded-lg p-5 cursor-pointer hover:border-primary/50 hover:bg-white/5 transition-all">
              <Upload className="w-6 h-6 text-white/40 mb-2" />
              <span className="text-sm text-white/60">{t('dashboardStudent:clickToAttach')}</span>
              <span className="text-xs text-white/30 mt-1">.zip, .rar</span>
              <input
                type="file"
                accept=".zip,.rar,application/zip,application/x-rar-compressed,application/vnd.rar"
                multiple
                className="hidden"
                onChange={(e) => {
                  const picked = Array.from(e.target.files || []);
                  const MAX = 50 * 1024 * 1024;
                  const valid = picked.filter(f => {
                    if (f.size > MAX) { alert(`${f.name} exceeds 50MB`); return false; }
                    return true;
                  });
                  setArchiveFiles(prev => [...prev, ...valid]);
                  e.target.value = '';
                }}
              />
            </label>
          </CardBody>
        </CardComponent>
      )}

      {/* Submit Button */}
      {!isSubmitted && task.status === "open" && (
        <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'}`}>
          <Button
            variant="primary"
            size="lg"
            leftIcon={<Send className="w-5 h-5" />}
            onClick={() => setShowSubmitModal(true)}
            disabled={isSubmitting}
          >
            {t('dashboardStudent:submitTaskBtn')}
          </Button>
        </div>
      )}

      {/* Submit Modal */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title={t('dashboardStudent:submitTaskTitle')}
      >
        <div className="space-y-4">
          <p className={`text-white/80`}>
            {t('dashboardStudent:submitTaskConfirm')}
          </p>
          {submitError && (
            <Alert variant="error">
              <p className="text-sm">{submitError}</p>
            </Alert>
          )}
          <div className={`flex justify-end gap-3`}>
            <Button
              variant="outline"
              onClick={() => setShowSubmitModal(false)}
              disabled={isSubmitting}
            >
              {t('dashboardCommon:cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={isSubmitting}
              isLoading={isSubmitting}
            >
              {t('dashboardStudent:confirmSubmit')}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
