import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  FileText,
  Eye,
  ZoomIn,
  X,
  Download,
  Archive,
} from "lucide-react";
import { useTrainerTasks } from "../../hooks";
import { type TaskSubmission } from "../../hooks/trainer/useTrainerTasks";
import { api } from "../../lib/api";
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
import { SubmissionViewer } from "../../components/tasks/SubmissionViewer";
import { useTranslation } from 'react-i18next';
import { formatDate } from "../../utils/dateTime";

export default function TrainerTaskSubmissions() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { submissions, taskDetails, isLoading, error, getTaskSubmissions, getTaskDetails, gradeSubmission } = useTrainerTasks();
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardTrainer']);
  const isRTL = i18n.language === 'ar';

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedSubmission, setSelectedSubmission] = useState<TaskSubmission | null>(null);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState("");
  const [status, setStatus] = useState<"pending_review" | "graded" | "returned">("graded");
  const [isGrading, setIsGrading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ url: string; filename?: string } | null>(null);

  useEffect(() => {
    if (taskId) {
      getTaskSubmissions(taskId);
      getTaskDetails(taskId);
    }
  }, [taskId, getTaskSubmissions, getTaskDetails]);

  // Ensure submissions is always an array
  const submissionsArray = Array.isArray(submissions) ? submissions : [];
  
  const filteredSubmissions = submissionsArray.filter((submission) => {
    if (!submission || !submission.studentId) {
      console.warn('Invalid submission:', submission);
      return false;
    }
    const matchesSearch = submission.studentId.name
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase()) ||
      submission.studentId.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || submission.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    console.log('Submissions state updated:', submissions);
    console.log('Submissions is array:', Array.isArray(submissions));
    console.log('Filtered submissions count:', filteredSubmissions.length);
  }, [submissions, filteredSubmissions.length]);

  const handleGrade = async () => {
    if (!taskId || !selectedSubmission) return;

    try {
      setIsGrading(true);
      await gradeSubmission(taskId, selectedSubmission._id, {
        score,
        feedback,
        status,
      });
      setShowGradeModal(false);
      setSelectedSubmission(null);
      await getTaskSubmissions(taskId);
    } catch (err: any) {
      console.error("Failed to grade submission:", err);
    } finally {
      setIsGrading(false);
    }
  };

  const openViewModal = (submission: TaskSubmission) => {
    setSelectedSubmission(submission);
    setShowViewModal(true);
    // Task details are optional - we can display answers without them
  };

  const openGradeModal = async (submission: TaskSubmission) => {
    setSelectedSubmission(submission);
    setScore(submission.score || 0);
    setFeedback(submission.feedback || "");
    setStatus(submission.status as any);
    setShowGradeModal(true);
    
    // Ensure task details are loaded
    if (taskId && !taskDetails) {
      await getTaskDetails(taskId);
    }
  };

  const downloadFile = async (submissionId: string, fileId: string, filename: string) => {
    try {
      const response = await api.get(
        `/trainer/tasks/${taskId}/submissions/${submissionId}/files/${fileId}`
      );
      const { downloadUrl } = response.data.data;
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('Download failed:', err);
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

  // Debug logging
  console.log('Render - isLoading:', isLoading, 'submissions.length:', submissionsArray.length, 'error:', error);
  console.log('Render - filteredSubmissions.length:', filteredSubmissions.length);

  if (isLoading && submissionsArray.length === 0) {
    return <LoadingState type="skeleton" text={t('dashboardTrainer:loadingSubmissions')} />;
  }

  if (error && submissionsArray.length === 0) {
    return (
      <div className="space-y-8">
        <Alert variant="error">
          <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold mb-1">{t('dashboardTrainer:failedGradeSubmission')}</p>
              <p className="text-sm opacity-90">{error}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={() => taskId && getTaskSubmissions(taskId)}
            >
              {t('dashboardCommon:retry')}
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate("/trainer/tasks")}
        >
          {t('dashboardTrainer:backToTasks')}
        </Button>
        <div>
          <h1 className="text-3xl font-bold inline-block group-hover:scale-105 transition-transform duration-300" style={{
            background: 'linear-gradient(135deg, #003300 0%, #004d00 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>{t('dashboardTrainer:taskSubmissions')}</h1>
          <p className="mt-1 transition-colors duration-300" style={{ color: '#003300' + 'CC' }}>{t('dashboardTrainer:reviewAndGrade')}</p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder={t('dashboardTrainer:searchByStudent')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(value) => setStatusFilter(value)}
          options={[
            { value: "all", label: t('dashboardCommon:allStatus') },
            { value: "pending_review", label: t('dashboardTrainer:pendingReview') },
            { value: "graded", label: t('dashboardTrainer:graded') },
            { value: "returned", label: t('dashboardTrainer:returned') },
          ]}
          leftIcon={<Filter className="w-4 h-4" />}
        />
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <CardComponent variant="glass" hover>
          <CardBody>
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div>
                <p className="text-sm text-white/60 mb-1">{t('dashboardTrainer:totalSubmissions')}</p>
                <p className="text-2xl font-bold text-white">{submissionsArray.length}</p>
              </div>
              <FileText className="w-8 h-8 text-primary" />
            </div>
          </CardBody>
        </CardComponent>
        <CardComponent variant="glass" hover>
          <CardBody>
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div>
                <p className="text-sm text-white/60 mb-1">{t('dashboardTrainer:pendingReview')}</p>
                <p className="text-2xl font-bold text-white">
                  {submissionsArray.filter((s) => s.status === "pending_review").length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-accent" />
            </div>
          </CardBody>
        </CardComponent>
        <CardComponent variant="glass" hover>
          <CardBody>
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div>
                <p className="text-sm text-white/60 mb-1">{t('dashboardTrainer:graded')}</p>
                <p className="text-2xl font-bold text-white">
                  {submissionsArray.filter((s) => s.status === "graded").length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </CardBody>
        </CardComponent>
        <CardComponent variant="glass" hover>
          <CardBody>
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div>
                <p className="text-sm text-white/60 mb-1">{t('dashboardTrainer:lateSubmissions')}</p>
                <p className="text-2xl font-bold text-white">
                  {submissionsArray.filter((s) => s.isLate).length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
          </CardBody>
        </CardComponent>
      </motion.div>

      {/* Submissions List */}
      {filteredSubmissions.length === 0 ? (
        <motion.div variants={itemVariants}>
          <CardComponent variant="glass">
            <CardBody>
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto mb-4 text-white/20" />
                <p className="text-white/60 text-lg mb-2">{t('dashboardTrainer:noSubmissions')}</p>
                <p className="text-white/40 text-sm">
                  {searchQuery || statusFilter !== "all"
                    ? t('dashboardTrainer:tryAdjustingFilters')
                    : t('dashboardTrainer:noSubmissions')}
                </p>
              </div>
            </CardBody>
          </CardComponent>
        </motion.div>
      ) : (
        <motion.div variants={containerVariants} className="space-y-4">
          {filteredSubmissions.map((submission) => (
            <motion.div key={submission._id} variants={itemVariants}>
              <CardComponent variant="glass" hover>
                <CardBody>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold">
                          {submission.studentId.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">
                            {submission.studentId.name}
                          </h3>
                          <p className="text-sm text-white/60">{submission.studentId.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-sm text-white/60">
                        <span>
                          {t('dashboardTrainer:submittedAt')}:{" "}
                          {submission.submittedAt
                            ? formatDate(submission.submittedAt)
                            : t('dashboardTrainer:notSubmitted')}
                        </span>
                        {submission.isLate && (
                          <Badge variant="error" size="sm">
                            {t('dashboardTrainer:isLate')}
                          </Badge>
                        )}
                      </div>
                      {submission.score !== undefined && (
                        <div className="mt-2">
                          <span className="text-sm font-medium text-white">
                            {t('dashboardTrainer:score')}: {submission.score}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Badge
                        variant={
                          submission.status === "graded"
                            ? "success"
                            : submission.status === "pending_review"
                            ? "warning"
                            : "secondary"
                        }
                        size="sm"
                      >
                        {submission.status.replace("_", " ")}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openViewModal(submission)}
                        leftIcon={<Eye className="w-4 h-4" />}
                        className="text-white/70 hover:text-white border-white/20 hover:border-white/40"
                      >
                        {t('dashboardTrainer:viewSubmission')}
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => openGradeModal(submission)}
                      >
                        {submission.status === "graded" ? t('dashboardTrainer:updateGrade') : t('dashboardTrainer:grade')}
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </CardComponent>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* View Submission Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedSubmission(null);
        }}
        title={t('dashboardTrainer:viewSubmissionTitle')}
        size="xl"
      >
        {selectedSubmission && (
          <div className="space-y-6 max-h-[80vh] overflow-y-auto">
            <div>
              <p className="text-sm text-white/60 mb-2">{t('dashboardTrainer:studentName')}</p>
              <p className="text-white font-medium">
                {selectedSubmission.studentId.name} ({selectedSubmission.studentId.email})
              </p>
            </div>

            {/* Show Student Answers */}
            {taskDetails?.task?.questions && selectedSubmission.answers ? (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">{t('dashboardTrainer:studentAnswers')}</h3>
                <SubmissionViewer
                  questions={taskDetails.task.questions}
                  answers={selectedSubmission.answers}
                />
              </div>
            ) : selectedSubmission.answers && selectedSubmission.answers.length > 0 ? (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">{t('dashboardTrainer:studentAnswers')}</h3>
                <div className="space-y-4">
                  {selectedSubmission.answers.map((answer: any, index: number) => (
                    <CardComponent key={index} variant="glass" className="mb-4">
                      <CardBody>
                        <div className="mb-2">
                          <p className="text-sm text-white/60 mb-1">{t('dashboardTrainer:questionNumber', { number: index + 1 })}</p>
                          <Badge variant="secondary" size="sm" className="mb-2">
                            {answer.answerType?.toUpperCase() || t('dashboardTrainer:unknown')}
                          </Badge>
                        </div>
                        {answer.answerType === 'mcq' && answer.selectedAnswers && (
                          <div className="space-y-2">
                            <p className="text-sm text-white">{t('dashboardTrainer:selectedOptions')} {answer.selectedAnswers.join(', ')}</p>
                          </div>
                        )}
                        {answer.answerType === 'text' && answer.textAnswer && (
                          <div className="p-4 bg-white/5 rounded-lg border border-white/20">
                            <p className="text-sm text-white whitespace-pre-wrap">{answer.textAnswer}</p>
                          </div>
                        )}
                        {answer.answerType === 'image' && answer.imageAnswers && answer.imageAnswers.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {answer.imageAnswers.map((img: any, imgIndex: number) => (
                              <motion.div
                                key={imgIndex}
                                whileHover={{ scale: 1.02, y: -2 }}
                                transition={{ duration: 0.2 }}
                                className="relative group cursor-pointer border border-white/20 rounded-lg overflow-hidden bg-white/5 hover:border-primary/50 transition-all"
                                onClick={() => setSelectedImage({ url: img.cloudinaryUrl, filename: img.filename })}
                              >
                                <div className="relative aspect-square">
                                  <img
                                    src={img.cloudinaryUrl}
                                    alt={img.filename || `Image ${imgIndex + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                                    <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </div>
                                {img.filename && (
                                  <div className="p-2 bg-white/10">
                                    <p className="text-xs text-white/60 truncate">{img.filename}</p>
                                  </div>
                                )}
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </CardBody>
                    </CardComponent>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-white/60">{t('dashboardTrainer:noAnswers')}</p>
              </div>
            )}

            {/* Attached Files */}
            {selectedSubmission.attachedFiles && selectedSubmission.attachedFiles.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">{t('dashboardTrainer:attachedFiles')}</h3>
                <div className="space-y-2">
                  {selectedSubmission.attachedFiles.map((file: any) => (
                    <div key={file._id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center gap-2 min-w-0">
                        <Archive className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm text-white truncate">{file.originalName || file.filename}</span>
                        {file.size && (
                          <span className="text-xs text-white/40 flex-shrink-0">
                            {file.size < 1024 * 1024 ? (file.size / 1024).toFixed(1) + ' KB' : (file.size / (1024 * 1024)).toFixed(1) + ' MB'}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Download className="w-4 h-4" />}
                        onClick={() => downloadFile(selectedSubmission._id, file._id, file.originalName || file.filename)}
                        className="text-white/70 hover:text-white border-white/20 hover:border-white/40 flex-shrink-0 ml-2"
                      >
                        {t('dashboardCommon:download')}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <Button
                variant="outline"
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedSubmission(null);
                }}
              >
                {t('dashboardCommon:close')}
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setShowViewModal(false);
                  openGradeModal(selectedSubmission);
                }}
              >
                {t('dashboardTrainer:gradeThisSubmission')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Grade Modal */}
      <Modal
        isOpen={showGradeModal}
        onClose={() => {
          setShowGradeModal(false);
          setSelectedSubmission(null);
        }}
        title={t('dashboardTrainer:gradeSubmission')}
        size="xl"
      >
        {selectedSubmission && (
          <div className="space-y-6 max-h-[80vh] overflow-y-auto">
            <div className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
              <p className="text-sm text-white/60 mb-1">{t('dashboardTrainer:studentName')}</p>
              <p className="text-white font-semibold text-lg">
                {selectedSubmission.studentId.name}
              </p>
              <p className="text-sm text-white/60 mt-1">
                {selectedSubmission.studentId.email}
              </p>
            </div>

            {/* Show Student Answers */}
            {taskDetails?.task?.questions && selectedSubmission.answers ? (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">{t('dashboardTrainer:studentAnswers')}</h3>
                <SubmissionViewer
                  questions={taskDetails.task.questions}
                  answers={selectedSubmission.answers}
                />
              </div>
            ) : selectedSubmission.answers && selectedSubmission.answers.length > 0 ? (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">{t('dashboardTrainer:studentAnswers')}</h3>
                <div className="space-y-4">
                  {selectedSubmission.answers.map((answer: any, index: number) => (
                    <CardComponent key={index} variant="glass" className="mb-4">
                      <CardBody>
                        <div className="mb-2">
                          <p className="text-sm text-white/60 mb-1">{t('dashboardTrainer:questionNumber', { number: index + 1 })}</p>
                          <Badge variant="secondary" size="sm" className="mb-2">
                            {answer.answerType?.toUpperCase() || t('dashboardTrainer:unknown')}
                          </Badge>
                        </div>
                        {answer.answerType === 'mcq' && answer.selectedAnswers && (
                          <div className="space-y-2">
                            <p className="text-sm text-white">{t('dashboardTrainer:selectedLabel')} {answer.selectedAnswers.join(', ')}</p>
                          </div>
                        )}
                        {answer.answerType === 'text' && answer.textAnswer && (
                          <div className="p-4 bg-white/5 rounded-lg border border-white/20">
                            <p className="text-sm text-white whitespace-pre-wrap">{answer.textAnswer}</p>
                          </div>
                        )}
                        {answer.answerType === 'image' && answer.imageAnswers && answer.imageAnswers.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {answer.imageAnswers.map((img: any, imgIndex: number) => (
                              <motion.div
                                key={imgIndex}
                                whileHover={{ scale: 1.02, y: -2 }}
                                transition={{ duration: 0.2 }}
                                className="relative group cursor-pointer border border-white/20 rounded-lg overflow-hidden bg-white/5 hover:border-primary/50 transition-all"
                                onClick={() => setSelectedImage({ url: img.cloudinaryUrl, filename: img.filename })}
                              >
                                <div className="relative aspect-square">
                                  <img
                                    src={img.cloudinaryUrl}
                                    alt={img.filename || `Image ${imgIndex + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                                    <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </div>
                                {img.filename && (
                                  <div className="p-2 bg-white/10">
                                    <p className="text-xs text-white/60 truncate">{img.filename}</p>
                                  </div>
                                )}
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </CardBody>
                    </CardComponent>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-white/60">{t('dashboardTrainer:noAnswers')}</p>
              </div>
            )}

            {/* Attached Files in grade modal */}
            {selectedSubmission.attachedFiles && selectedSubmission.attachedFiles.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">{t('dashboardTrainer:attachedFiles')}</h3>
                <div className="space-y-2">
                  {selectedSubmission.attachedFiles.map((file: any) => (
                    <div key={file._id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center gap-2 min-w-0">
                        <Archive className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm text-white truncate">{file.originalName || file.filename}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Download className="w-4 h-4" />}
                        onClick={() => downloadFile(selectedSubmission._id, file._id, file.originalName || file.filename)}
                        className="text-white/70 hover:text-white border-white/20 hover:border-white/40 flex-shrink-0 ml-2"
                      >
                        {t('dashboardCommon:download')}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-white/10 pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    {t('dashboardTrainer:score')} <span className="text-white/40">({t('dashboardCommon:of')} {taskDetails?.task.maxScore || 100})</span>
                  </label>
                  <Input
                    type="number"
                    value={score}
                    onChange={(e) => setScore(parseInt(e.target.value) || 0)}
                    min="0"
                    max={taskDetails?.task.maxScore || 100}
                    className="bg-white/5 border-white/20 text-white focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    {t('dashboardCommon:status')}
                  </label>
                  <Select
                    value={status}
                    onChange={(value) => setStatus(value as any)}
                    options={[
                      { value: "pending_review", label: t('dashboardTrainer:pendingReview') },
                      { value: "graded", label: t('dashboardTrainer:graded') },
                      { value: "returned", label: t('dashboardTrainer:returned') },
                    ]}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  {t('dashboardTrainer:feedback')}
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={5}
                  placeholder={t('dashboardTrainer:feedbackPlaceholder')}
                  className="w-full px-4 py-3 rounded-lg border border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                />
                <p className="text-xs text-white/50 mt-1">
                  {t('dashboardTrainer:feedbackHint')}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <Button
                variant="outline"
                onClick={() => {
                  setShowGradeModal(false);
                  setSelectedSubmission(null);
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
        )}
      </Modal>

      {/* Image Lightbox */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/95 backdrop-blur-sm z-[60] flex items-center justify-center p-4 md:p-8"
          onClick={() => setSelectedImage(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative max-w-6xl max-h-full w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImage.url}
              alt={selectedImage.filename || 'Submission image'}
              className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-xl shadow-2xl mx-auto"
            />
            {selectedImage.filename && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-4 rounded-b-xl">
                <p className="text-white text-sm text-center">{selectedImage.filename}</p>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 border border-white/20"
            >
              <X className="w-4 h-4" />
            </Button>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
