import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Upload,
  File,
  X,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Download,
} from "lucide-react";
import { useFileUpload } from "../../hooks";
import { api } from "../../lib/api";
import { useTranslation } from 'react-i18next';
import {
  CardComponent,
  CardBody,
  Button,
  Badge,
  LoadingState,
  Alert,
  useToast,
  Breadcrumb,
} from "../../components/ui";

interface Assignment {
  _id: string;
  title: string;
  description: string;
  instructions?: string;
  dueDate: string;
  maxScore: number;
  allowedFileTypes: string[];
  maxFileSize: number;
  allowLateSubmission: boolean;
  course: {
    _id: string;
    title: string;
  };
  module: string;
}

interface Submission {
  _id: string;
  files: Array<{
    filename: string;
    originalName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
  }>;
  submittedAt: string;
  isLate: boolean;
  status: "submitted" | "graded" | "returned";
  grade?: {
    score: number;
    feedback: string;
    gradedBy: {
      name: string;
    };
    gradedAt: string;
  };
}

export default function StudentAssignment() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardStudent']);
  const isRTL = i18n.language === 'ar';

  const toast = useToast();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const {
    files,
    uploading,
    progress,
    error: uploadError,
    uploadFiles,
    setFiles,
    removeFile,
    reset,
  } = useFileUpload();

  useEffect(() => {
    fetchAssignmentData();
  }, [assignmentId]);

  const fetchAssignmentData = async () => {
    if (!assignmentId) return;

    try {
      setIsLoading(true);
      setError(null);

      const [assignmentRes, submissionRes] = await Promise.all([
        api.get(`/student/assignments/${assignmentId}`),
        api.get(`/student/assignments/${assignmentId}/submission`).catch(() => null),
      ]);

      setAssignment(assignmentRes.data.data);
      setSubmission(submissionRes?.data?.data || null);
    } catch (err: any) {
      setError(err.response?.data?.message || t('dashboardStudent:failedLoadAssignment'));
      console.error("Error fetching assignment:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const newFiles = Array.from(e.dataTransfer.files);
      setFiles([...files, ...newFiles]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const newFiles = Array.from(e.target.files);
      setFiles([...files, ...newFiles]);
    }
  };

  const handleSubmit = async () => {
    if (!assignmentId || files.length === 0) return;

    try {
      await uploadFiles(assignmentId);
      await fetchAssignmentData();
      reset();
      toast.success(t('dashboardCommon:successMessage'), t('dashboardStudent:submissionSuccess') || 'Assignment submitted successfully');
    } catch (err: any) {
      console.error("Failed to submit assignment:", err);
      toast.error(t('dashboardCommon:error'), err?.message || t('dashboardCommon:errorMessage'));
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const isOverdue = assignment && new Date(assignment.dueDate) < new Date();
  const canSubmit = assignment && (!isOverdue || assignment.allowLateSubmission);

  // Show loading state
  if (isLoading) {
    return <LoadingState type="skeleton" text={t('dashboardStudent:loadingAssignment')} />;
  }

  // Show error state
  if (error || !assignment) {
    return (
      <div className="space-y-4 sm:space-y-6 md:space-y-8">
        <Alert variant="error">
          <div className={`flex items-start gap-3`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold mb-1">{t('dashboardStudent:failedLoadAssignment')}</p>
              <p className="text-sm opacity-90">{error || t('dashboardStudent:assignmentNotFound')}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={fetchAssignmentData}
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Breadcrumbs */}
      <Breadcrumb
        showHome={false}
        items={[
          { label: t('dashboardStudent:myCourses'), path: '/student/courses' },
          { label: assignment.course.title, path: `/student/courses/${assignment.course._id}` },
          { label: assignment.title },
        ]}
      />
      {/* Header */}
      <div>
        <Link to={`/student/courses/${assignment.course._id}`}>
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />}>
            {t('dashboardStudent:backToCourse')}
          </Button>
        </Link>
        <div className={`flex items-start justify-between mt-4`}>
          <div className={`flex-1`}>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 transition-colors duration-300" style={{ color: '#003300' }}>{assignment.title}</h1>
            <p dir="auto" className="transition-colors duration-300" style={{ color: '#003300' + 'CC' }}>{assignment.description}</p>
          </div>
          <div className={`flex items-center gap-3`}>
            <Badge
              variant={isOverdue ? "error" : "primary"}
              size="md"
            >
              <Clock className={`w-4 h-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
              Due: {new Date(assignment.dueDate).toLocaleDateString()}
            </Badge>
            <Badge variant="secondary" size="md">
              {assignment.maxScore} points
            </Badge>
          </div>
        </div>
      </div>

      {/* Overdue Warning */}
      {isOverdue && (
        <Alert variant="warning">
          <AlertCircle className="w-4 h-4" />
          <div >
            <p className="font-semibold">{t('dashboardStudent:assignmentOverdue')}</p>
            {assignment.allowLateSubmission ? (
              <p className="text-sm">{t('dashboardStudent:lateSubmissionsAllowed')}</p>
            ) : (
              <p className="text-sm">{t('dashboardStudent:lateSubmissionsNotAccepted')}</p>
            )}
          </div>
        </Alert>
      )}

      {/* Submission Status */}
      {submission && (
        <CardComponent variant="glass">
          <CardBody>
            <div className={`flex items-start justify-between mb-4`}>
              <div >
                <h3 className="text-lg font-semibold mb-1">{t('dashboardStudent:yourSubmission')}</h3>
                <p className="text-sm text-white/60">
                  {t('dashboardStudent:submittedOn')} {new Date(submission.submittedAt).toLocaleString()}
                  {submission.isLate && (
                    <Badge variant="warning" size="sm" className={isRTL ? 'mr-2' : 'ml-2'}>
                      {t('dashboardStudent:late')}
                    </Badge>
                  )}
                </p>
              </div>
              <Badge
                variant={
                  submission.status === "graded"
                    ? "success"
                    : submission.status === "returned"
                    ? "warning"
                    : "primary"
                }
                size="md"
              >
                {submission.status === "graded" ? (
                  <>
                    <CheckCircle className={`w-4 h-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                    {t('dashboardStudent:graded')}
                  </>
                ) : submission.status === "returned" ? (
                  t('dashboardStudent:returnedStatus')
                ) : (
                  t('dashboardStudent:submitted')
                )}
              </Badge>
            </div>

            {/* Submitted Files */}
            <div className="space-y-2 mb-4">
              {submission.files.map((file, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10`}
                >
                  <File className="w-5 h-5 text-primary flex-shrink-0" />
                  <div className={`flex-1 min-w-0`}>
                    <p className="text-sm font-medium truncate">{file.originalName}</p>
                    <p className="text-xs text-white/40">{formatFileSize(file.fileSize)}</p>
                  </div>
                  <a
                    href={file.fileUrl}
                    download
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>

            {/* Grade */}
            {submission.grade && (
              <div className="p-4 rounded-lg bg-gradient-to-r from-success/10 to-success/5 border border-success/20">
                <div className={`flex items-center justify-between mb-3`}>
                  <h4 className="font-semibold">{t('dashboardStudent:grade')}</h4>
                  <div className="text-2xl font-bold text-success">
                    {submission.grade.score}/{assignment.maxScore}
                  </div>
                </div>
                {submission.grade.feedback && (
                  <div >
                    <p className="text-sm text-white/60 mb-1">{t('dashboardStudent:feedbackLabel')}</p>
                    <p className="text-sm">{submission.grade.feedback}</p>
                  </div>
                )}
                <p className={`text-xs text-white/40 mt-2`}>
                  {t('dashboardStudent:gradedBy', {
                    name: submission.grade.gradedBy.name,
                    date: new Date(submission.grade.gradedAt).toLocaleDateString()
                  })}
                </p>
              </div>
            )}
          </CardBody>
        </CardComponent>
      )}

      {/* Instructions */}
      <CardComponent variant="glass">
        <CardBody>
          <h3 className={`text-lg font-semibold mb-3`}>{t('dashboardStudent:instructions')}</h3>
          {assignment.instructions ? (
            <div className="prose prose-invert max-w-none">
              <p className={`text-white/80 whitespace-pre-wrap`}>
                {assignment.instructions}
              </p>
            </div>
          ) : (
            <p className={`text-white/60`}>{t('dashboardStudent:noInstructionsProvided')}</p>
          )}

          <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10">
            <p className={`text-sm text-white/60 mb-2`}>{t('dashboardStudent:submissionRequirements')}</p>
            <ul className={`text-sm space-y-1`}>
              <li>• {t('dashboardStudent:allowedFileTypes', { types: assignment.allowedFileTypes.join(", ") })}</li>
              <li>• {t('dashboardStudent:maxFileSizePerFile', { size: assignment.maxFileSize })}</li>
              <li>• {t('dashboardStudent:maxFilesCount', { count: 10 })}</li>
            </ul>
          </div>
        </CardBody>
      </CardComponent>

      {/* File Upload */}
      {canSubmit && !submission && (
        <CardComponent variant="glass">
          <CardBody>
            <h3 className={`text-lg font-semibold mb-4`}>{t('dashboardStudent:submitYourWork')}</h3>

            {/* Drag & Drop Area */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-lg p-8 sm:p-12 text-center transition-all min-h-[200px] sm:min-h-[240px] flex flex-col items-center justify-center ${
                dragActive
                  ? "border-primary bg-primary/10"
                  : "border-white/20 hover:border-white/40"
              }`}
            >
              <input
                type="file"
                multiple
                accept={assignment.allowedFileTypes.map((t) => `.${t}`).join(",")}
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-white/40" />
              <p className="text-base sm:text-lg font-medium mb-1">
                {t('dashboardStudent:dragAndDrop')}
              </p>
              <p className="text-sm text-white/60">{t('dashboardStudent:orClickToBrowse')}</p>
            </div>

            {/* Selected Files */}
            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10`}
                  >
                    <File className="w-5 h-5 text-accent flex-shrink-0" />
                    <div className={`flex-1 min-w-0`}>
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-white/40">{formatFileSize(file.size)}</p>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Progress */}
            {uploading && (
              <div className="mt-4">
                <div className={`flex items-center justify-between text-sm mb-2`}>
                  <span>{t('dashboardStudent:uploadingProgress', { progress: '' }).replace(' %', '...')}</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-gradient-to-r from-primary to-accent"
                  />
                </div>
              </div>
            )}

            {/* Upload Error */}
            {uploadError && (
              <Alert variant="error" className="mt-4">
                {uploadError}
              </Alert>
            )}

            {/* Submit Button */}
            <Button
              variant="primary"
              size="lg"
              className="w-full mt-6"
              onClick={handleSubmit}
              disabled={files.length === 0 || uploading}
              loading={uploading}
              leftIcon={<Upload className="w-5 h-5" />}
            >
              {uploading ? t('dashboardStudent:uploadingProgress', { progress }) : t('dashboardCommon:submit')}
            </Button>
          </CardBody>
        </CardComponent>
      )}

      {!canSubmit && !submission && (
        <Alert variant="error">
          <AlertCircle className="w-4 h-4" />
          <p>{t('dashboardStudent:deadlinePassed')}</p>
        </Alert>
      )}
    </motion.div>
  );
}
