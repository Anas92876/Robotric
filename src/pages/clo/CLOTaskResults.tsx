import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { useCLOTasks } from "../../hooks";
import { useTranslation } from 'react-i18next';
import { formatDate } from "../../utils/dateTime";
import {
  CardComponent,
  CardBody,
  Button,
  Badge,
  LoadingState,
  Alert,
} from "../../components/ui";

export default function CLOTaskResults() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { taskResults, isLoading, error, getTaskResults } = useCLOTasks();
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardCLO']);
  const isRTL = i18n.language === 'ar';

  useEffect(() => {
    if (taskId) {
      getTaskResults(taskId);
    }
  }, [taskId, getTaskResults]);

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

  if (isLoading && !taskResults) {
    return <LoadingState type="skeleton" text={t('dashboardCLO:loadingTaskResults')} />;
  }

  if (error && !taskResults) {
    return (
      <div className="space-y-8">
        <Alert variant="error">
          <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold mb-1">{t('dashboardCLO:failedToLoadTaskResults')}</p>
              <p className="text-sm opacity-90">{error}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={() => taskId && getTaskResults(taskId)}
            >
              {t('dashboardCommon:retry')}
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  if (!taskResults) {
    return null;
  }

  const { statistics } = taskResults;
  const completionRate = statistics.totalStudents > 0
    ? (statistics.totalSubmissions / statistics.totalStudents) * 100
    : 0;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />}
          onClick={() => navigate("/clo/tasks")}
        >
          {t('dashboardCLO:backToTasks')}
        </Button>
        <div className={isRTL ? 'text-right' : ''}>
          <h1 className="text-3xl font-bold inline-block group-hover:scale-105 transition-transform duration-300" style={{
            color: '#003300',
            backgroundClip: 'text'
          }}>{taskResults.taskTitle}</h1>
          <p className="mt-1 transition-colors duration-300" style={{ color: '#003300' + 'CC' }}>{t('dashboardCLO:taskPerformanceDesc')}</p>
        </div>
      </motion.div>

      {/* Statistics Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <CardComponent variant="glass" hover>
          <CardBody>
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : ''}>
                <p className="text-sm text-[#003300]/60 mb-1">{t('dashboardCLO:totalStudents')}</p>
                <p className="text-2xl font-bold text-[#003300]">
                  {statistics.totalStudents}
                </p>
              </div>
              <Users className="w-8 h-8 text-primary" />
            </div>
          </CardBody>
        </CardComponent>

        <CardComponent variant="glass" hover>
          <CardBody>
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : ''}>
                <p className="text-sm text-[#003300]/60 mb-1">{t('dashboardCLO:totalSubmissions')}</p>
                <p className="text-2xl font-bold text-[#003300]">
                  {statistics.totalSubmissions}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
          </CardBody>
        </CardComponent>

        <CardComponent variant="glass" hover>
          <CardBody>
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : ''}>
                <p className="text-sm text-[#003300]/60 mb-1">{t('dashboardCLO:completionRate')}</p>
                <p className="text-2xl font-bold text-[#003300]">
                  {completionRate.toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-accent" />
            </div>
          </CardBody>
        </CardComponent>

        <CardComponent variant="glass" hover>
          <CardBody>
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : ''}>
                <p className="text-sm text-[#003300]/60 mb-1">{t('dashboardCLO:averageScore')}</p>
                <p className="text-2xl font-bold text-[#003300]">
                  {statistics.averageScore.toFixed(1)}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-secondary" />
            </div>
          </CardBody>
        </CardComponent>
      </motion.div>

      {/* Detailed Statistics */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CardComponent variant="glass">
          <CardBody>
            <h3 className={`text-lg font-semibold text-[#003300] mb-4 ${isRTL ? 'text-right' : ''}`}>{t('dashboardCLO:submissionStatus')}</h3>
            <div className="space-y-3">
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-[#003300]">{t('dashboardCLO:gradedLabel')}</span>
                </div>
                <span className="text-lg font-bold text-[#003300]">
                  {statistics.gradedSubmissions}
                </span>
              </div>
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Clock className="w-5 h-5 text-yellow-600" />
                  <span className="text-[#003300]">{t('dashboardCLO:pendingReviewLabel')}</span>
                </div>
                <span className="text-lg font-bold text-[#003300]">
                  {statistics.pendingSubmissions}
                </span>
              </div>
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="text-[#003300]">{t('dashboardCLO:lateSubmissions')}</span>
                </div>
                <span className="text-lg font-bold text-[#003300]">
                  {statistics.lateSubmissions}
                </span>
              </div>
            </div>
          </CardBody>
        </CardComponent>

        <CardComponent variant="glass">
          <CardBody>
            <h3 className={`text-lg font-semibold text-[#003300] mb-4 ${isRTL ? 'text-right' : ''}`}>{t('dashboardCLO:performanceMetrics')}</h3>
            <div className="space-y-4">
              <div>
                <div className={`flex items-center justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-sm text-[#003300]/60">{t('dashboardCLO:completionRate')}</span>
                  <span className="text-sm font-medium text-[#003300]">
                    {completionRate.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </div>
              <div>
                <div className={`flex items-center justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-sm text-[#003300]/60">{t('dashboardCLO:averageScore')}</span>
                  <span className="text-sm font-medium text-[#003300]">
                    {statistics.averageScore.toFixed(1)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-accent transition-all duration-500"
                    style={{ width: `${(statistics.averageScore / 100) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </CardBody>
        </CardComponent>
      </motion.div>

      {/* Submissions Summary */}
      {taskResults.submissions && taskResults.submissions.length > 0 && (
        <motion.div variants={itemVariants}>
          <CardComponent variant="glass">
            <CardBody>
              <h3 className={`text-lg font-semibold text-[#003300] mb-4 ${isRTL ? 'text-right' : ''}`}>
                {t('dashboardCLO:submissionSummary')}
              </h3>
              <div className="space-y-2">
                {taskResults.submissions.slice(0, 10).map((submission: any, index: number) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg bg-white/50 border border-primary/10 ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={isRTL ? 'text-right' : ''}>
                      <p className="font-medium text-[#003300]">
                        {submission.studentName || "Student"}
                      </p>
                      <p className="text-xs text-[#003300]/60">
                        {submission.submittedAt
                          ? formatDate(submission.submittedAt)
                          : t('dashboardCLO:notSubmitted')}
                      </p>
                    </div>
                    <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      {submission.score !== undefined && (
                        <span className="text-sm font-medium text-[#003300]">
                          {submission.score}
                        </span>
                      )}
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
                        {submission.status?.replace("_", " ") || t('dashboardCLO:notSubmitted')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </CardComponent>
        </motion.div>
      )}
    </motion.div>
  );
}
