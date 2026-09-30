import { Link } from "react-router-dom";
import { BookOpen, Clock, TrendingUp, DollarSign, Calendar, CheckCircle, AlertCircle, RefreshCw, ArrowRight, Activity } from "lucide-react";
import { useAuth } from "../../providers/AuthProvider";
import { ROUTES } from "../../constants/routes.constants";
import { StatsCard, CardComponent, Badge, LoadingState, Alert, Button, CardBody } from "../../components/ui";
import { useStudentDashboard } from "../../hooks";
import { motion } from "framer-motion";
import { useTranslation } from 'react-i18next';

export default function StudentDashboard() {
  const { user } = useAuth();
  const { stats, recentActivity, upcomingDeadlines, progressOverview, isLoading, error, refetch } = useStudentDashboard();
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardStudent']);
  const isRTL = i18n.language === 'ar';

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  // Show loading state
  if (isLoading) {
    return <LoadingState type="skeleton" text={t('dashboardStudent:loadingDashboard')} />;
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-4 sm:space-y-6 md:space-y-8">
        <Alert variant="error">
          <div className={`flex items-start gap-3`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold mb-1">{t('dashboardStudent:failedToLoad')}</p>
              <p className="text-sm opacity-90">{error}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={refetch}
            >
              {t('dashboardCommon:retry')}
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  // Format time ago
  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('dashboardCommon:justNow');
    if (diffMins < 60) return t('dashboardCommon:minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('dashboardCommon:hoursAgo', { count: diffHours });
    return t('dashboardCommon:daysAgo', { count: diffDays });
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "error";
      case "medium":
        return "warning";
      case "low":
        return "success";
      default:
        return "primary";
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-4 sm:space-y-6 md:space-y-8"
    >
      {/* Welcome Section */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold inline-block" style={{
          color: '#0f1f33',
          backgroundClip: 'text'
        }}>
          {t('dashboardStudent:welcomeBack')}, {user?.name || "Student"}
        </h1>
        <p className="mt-2 transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>
          {t('dashboardStudent:trackProgress')}
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6"
      >
        <StatsCard
          label={t('dashboardStudent:enrolledCourses')}
          value={stats?.totalEnrolledCourses || 0}
          icon={<BookOpen className="w-6 h-6" />}
          trend={stats?.activeCourses ? {
            value: stats.activeCourses,
            isPositive: true,
            label: t('dashboardStudent:active')
          } : undefined}
        />
        <StatsCard
          label={t('dashboardStudent:sessionsCompleted')}
          value={stats?.totalSessionsCompleted || 0}
          icon={<CheckCircle className="w-6 h-6" />}
        />
        <StatsCard
          label={t('dashboardStudent:averageProgress')}
          value={`${Math.round(stats?.averageProgress || 0)}%`}
          icon={<TrendingUp className="w-6 h-6" />}
          trend={stats?.averageProgress && stats.averageProgress > 50 ? {
            value: Math.round(stats.averageProgress),
            isPositive: true
          } : undefined}
        />
        <StatsCard
          label={t('dashboardStudent:attendanceRate')}
          value={`${Math.round(stats?.averageAttendance || 0)}%`}
          icon={<Calendar className="w-6 h-6" />}
        />
      </motion.div>

      {/* Secondary Stats */}
      {stats && stats.totalRemaining > 0 && (
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 gap-4 md:gap-6"
        >
          <CardComponent variant="glass" hover>
            <CardBody>
              <div className={`flex items-center justify-between`}>
                <div>
                  <p className="text-sm text-white/60 mb-1">{t('dashboardStudent:paymentStatus')}</p>
                  <p className="text-2xl font-bold">
                    ${stats.totalRemaining.toFixed(2)}
                  </p>
                  <p className="text-xs text-white/40 mt-1">{t('dashboardStudent:remaining')}</p>
                </div>
                <DollarSign className="w-8 h-8 text-primary" />
              </div>
              {stats.overduePayments > 0 && (
                <Badge variant="error" size="sm" className="mt-3">
                  {stats.overduePayments} {t('dashboardStudent:overdue')}
                </Badge>
              )}
            </CardBody>
          </CardComponent>
        </motion.div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-4 md:gap-6">
        {/* Course Progress Overview */}
        <motion.div variants={itemVariants}>
          <CardComponent variant="glass">
            <CardBody>
              <div className={`flex items-center justify-between mb-6`}>
                <h2 className="text-xl font-semibold">{t('dashboardStudent:courseProgress')}</h2>
                <Link to="/student/courses">
                  <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    {t('dashboardCommon:viewAll')}
                  </Button>
                </Link>
              </div>

              {progressOverview && progressOverview.length > 0 ? (
                <div className="space-y-4">
                  {progressOverview.slice(0, 4).map((course) => (
                    <Link
                      key={course.courseId}
                      to={`/student/courses/${course.courseId}`}
                      className="block group"
                    >
                      <div className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-300 border border-white/10 hover:border-primary/50">
                        <div className={`flex items-center justify-between mb-2`}>
                          <h3 className="font-medium group-hover:text-primary transition-colors">
                            {course.courseTitle}
                          </h3>
                          <Badge
                            variant={course.status === "completed" ? "success" : "primary"}
                            size="sm"
                          >
                            {course.status}
                          </Badge>
                        </div>
                        <div className={`flex items-center gap-4 text-sm text-white/60`}>
                          <span>{course.completedSessions} / {course.totalSessions} {t('dashboardStudent:sessionsCount')}</span>
                          <span>{Math.round(course.progress)}% {t('dashboardStudent:complete')}</span>
                        </div>
                        <div className="mt-3 h-2 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${course.progress}%` }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="h-full bg-primary rounded-full"
                          />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-white/40">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{t('dashboardStudent:noCoursesEnrolled')}</p>
                  <Link to="/courses">
                    <Button variant="primary" size="sm" className="mt-4">
                      {t('dashboardStudent:browseCourses')}
                    </Button>
                  </Link>
                </div>
              )}
            </CardBody>
          </CardComponent>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div variants={itemVariants}>
        <CardComponent variant="glass">
          <CardBody>
            <h2 className="text-xl font-semibold mb-6">{t('dashboardStudent:recentActivity')}</h2>

            {recentActivity && recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.slice(0, 6).map((activity, index) => (
                  <div
                    key={activity._id || index}
                    className={`flex items-start gap-4 p-3 rounded-lg hover:bg-white/5 transition-all duration-300`}
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      {activity.type === "session" && <BookOpen className="w-5 h-5 text-primary" />}
                      {activity.type === "module" && <BookOpen className="w-5 h-5 text-primary" />}
                      {activity.type === "quiz" && <Clock className="w-5 h-5 text-accent" />}
                      {activity.type === "assignment" && <CheckCircle className="w-5 h-5 text-secondary" />}
                      {activity.type === "payment" && <DollarSign className="w-5 h-5 text-green-400" />}
                      {activity.type === "attendance" && <Calendar className="w-5 h-5 text-purple-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{activity.title}</p>
                      <p className="text-xs text-white/60 truncate">{activity.courseTitle}</p>
                      <p className="text-xs text-white/40 mt-1">{formatTimeAgo(activity.timestamp)}</p>
                    </div>
                    {activity.status && (
                      <Badge variant="primary" size="sm">
                        {activity.status}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-white/40">
                <Activity className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">{t('dashboardStudent:noRecentActivity')}</p>
              </div>
            )}
          </CardBody>
        </CardComponent>
      </motion.div>
    </motion.div>
  );
}
