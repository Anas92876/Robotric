import { motion } from "framer-motion";
import {
  Users,
  BookOpen,
  UsersRound,
  GraduationCap,
  TrendingUp,
  Activity,
  Award,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  BarChart3,
} from "lucide-react";
import { useCLODashboard } from "../../hooks";
import {
  Button,
  LoadingState,
  Alert,
  Badge,
} from "../../components/ui";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';

export default function CLODashboard() {
  const { stats, topTrainers, recentActivity, isLoading, error, refetch } =
    useCLODashboard();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardCLO']);
  const isRTL = i18n.language === 'ar';

  // Animation variants
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

  if (isLoading) {
    return <LoadingState type="skeleton" text={t('dashboardCLO:loadingDashboard')} />;
  }

  if (error) {
    return (
      <div className="space-y-8">
        <Alert variant="error">
          <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold mb-1">{t('dashboardCommon:failedLoadDashboard')}</p>
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

  // Stat cards configuration - Simplified color scheme
  const statCards = [
    {
      title: t('dashboardCLO:totalTrainers'),
      value: stats?.trainers.total || 0,
      subtitle: `${stats?.trainers.active || 0} ${t('dashboardCLO:activeTrainers').toLowerCase()}`,
      icon: <Users className="w-8 h-8" />,
      color: "from-emerald-500 to-green-500",
      lightColor: "from-emerald-50 to-green-50",
      link: "/clo/trainers",
    },
    {
      title: t('dashboardCLO:totalCourses'),
      value: stats?.courses.total || 0,
      subtitle: `${stats?.courses.published || 0} ${t('dashboardCommon:published').toLowerCase()}`,
      icon: <BookOpen className="w-8 h-8" />,
      color: "from-emerald-500 to-teal-500",
      lightColor: "from-emerald-50 to-teal-50",
      link: "/clo/courses",
    },
    {
      title: t('dashboardCLO:activeGroups'),
      value: stats?.groups.active || 0,
      subtitle: `${stats?.groups.total || 0} ${t('dashboardCLO:totalGroupsCount')}`,
      icon: <UsersRound className="w-8 h-8" />,
      color: "from-green-500 to-emerald-500",
      lightColor: "from-green-50 to-emerald-50",
      link: "/clo/groups",
    },
    {
      title: t('dashboardCLO:totalStudents'),
      value: stats?.students.total || 0,
      subtitle: `${stats?.enrollments.active || 0} ${t('dashboardCLO:activeEnrollments')}`,
      icon: <GraduationCap className="w-8 h-8" />,
      color: "from-teal-500 to-cyan-500",
      lightColor: "from-teal-50 to-cyan-50",
      link: "#",
    },
  ];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        variants={itemVariants}
      >
        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={isRTL ? 'text-right font-arabic' : ''}>
            <h1 className="text-4xl font-bold mb-2 inline-block" style={{
              color: '#0f1f33',
              backgroundClip: 'text'
            }}>
              {t('dashboardCLO:dashboard')}
            </h1>
            <p className="transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>
              {t('dashboardCLO:cloSubtitle')}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={refetch}
            className="text-ink/70 hover:text-primary border-primary/20 hover:border-primary/40 hover:bg-primary/5"
          >
            {t('dashboardCommon:refresh')}
          </Button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {statCards.map((card, index) => (
          <motion.div
            key={card.title}
            variants={itemVariants}
            className="relative group cursor-pointer"
            onClick={() => navigate(card.link)}
          >
            {/* Subtle background effect */}
            <div
              className={`absolute inset-0 ${card.lightColor} rounded-2xl blur-md opacity-30 group-hover:opacity-50 transition-opacity duration-300`}
            ></div>

            {/* Card content */}
            <div className="relative bg-white rounded-xl sm:rounded-2xl p-6 border border-ink/20 hover:border-ink/40 hover:shadow-2xl transition-all duration-500 ease-out group/card overflow-hidden">
              {/* Animated Background Gradient on Hover */}
              <div className="absolute inset-0 bg-ink/10 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 rounded-xl sm:rounded-2xl -z-10" />
              
              {/* Shimmer Effect */}
              <div className="absolute inset-0 -translate-x-full group-hover/card:translate-x-full transition-transform duration-1000 ease-in-out bg-transparent rounded-xl sm:rounded-2xl -z-10" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  {/* Icon with gradient background */}
                  <div
                    className="p-3 rounded-xl flex items-center justify-center group-hover/card:scale-110 transition-transform duration-300"
                    style={{ 
                      background: '#0f1f33',
                      color: '#eefcf1'
                    }}
                  >
                    {card.icon}
                  </div>

                  {/* Value with gradient text */}
                  <div
                    className="text-3xl font-bold group-hover/card:scale-105 transition-transform duration-300 inline-block"
                    style={{ 
                      color: '#0f1f33',
                      backgroundClip: 'text'
                    }}
                  >
                    {card.value.toLocaleString()}
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold mb-1 transition-colors duration-300" style={{ color: '#0f1f33' }}>
                  {card.title}
                </h3>

                {/* Subtitle */}
                {card.subtitle && (
                  <p className="text-sm transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>{card.subtitle}</p>
                )}
              </div>

              {/* Corner Decoration */}
              <div className="absolute top-0 right-0 w-20 h-20 bg-ink/5 rounded-bl-full opacity-0 group-hover/card:opacity-100 transition-opacity duration-500" />
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Performance Metrics */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {/* Attendance Rate */}
        <div className="relative group">
          <div className="absolute inset-0 bg-green-50 rounded-2xl blur-md opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
          <div className="relative bg-white rounded-2xl p-6 border border-primary/10 hover:border-primary/20 hover:shadow-lg transition-all duration-300">
            <div className={`flex items-center gap-3 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="p-3 rounded-xl bg-green-50">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
              <div className={`flex-1 ${isRTL ? 'text-right font-arabic' : ''}`}>
                <h3 className="text-lg font-semibold text-ink">
                  {t('dashboardCLO:attendanceRate')}
                </h3>
                <p className="text-sm text-ink/60">{t('dashboardCLO:attendanceRateDesc')}</p>
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-4xl font-bold text-green-500">
                {stats?.performance.attendanceRate || 0}%
              </span>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            {/* Progress bar for attendance */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-green-500 transition-all duration-500"
                style={{
                  width: `${stats?.performance.attendanceRate || 0}%`,
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="relative group">
          <div className="absolute inset-0 bg-teal-50 rounded-2xl blur-md opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
          <div className="relative bg-white rounded-2xl p-6 border border-primary/10 hover:border-primary/20 hover:shadow-lg transition-all duration-300">
            <div className={`flex items-center gap-3 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="p-3 rounded-xl bg-teal-50">
                <Award className="w-6 h-6 text-teal-600" />
              </div>
              <div className={`flex-1 ${isRTL ? 'text-right font-arabic' : ''}`}>
                <h3 className="text-lg font-semibold text-ink">
                  {t('dashboardCLO:completionRate')}
                </h3>
                <p className="text-sm text-ink/60">{t('dashboardCLO:completionRateDesc')}</p>
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-4xl font-bold text-teal-500">
                {stats?.performance.completionRate || 0}%
              </span>
              <TrendingUp className="w-5 h-5 text-teal-500" />
            </div>
            {/* Progress bar for completion */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-teal-500 transition-all duration-500"
                style={{
                  width: `${stats?.performance.completionRate || 0}%`,
                }}
              ></div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Top Trainers & Recent Activity */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Top Performing Trainers */}
        <div className="bg-white rounded-2xl p-6 border border-primary/10 shadow-md">
          <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <h3 className={`text-2xl font-bold text-ink ${isRTL ? 'font-arabic' : ''}`}>
              {t('dashboardCLO:topPerformingTrainers')}
            </h3>
            <Link to="/clo/trainers">
              <Button variant="ghost" size="sm">
                {t('dashboardCommon:viewAll')}
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            {topTrainers && topTrainers.length > 0 ? (
              topTrainers.slice(0, 5).map((trainer: any, index: number) => (
                <div
                  key={trainer._id}
                  className={`flex items-center justify-between p-4 rounded-xl hover:bg-emerald-50/50 transition-colors border border-transparent hover:border-emerald-100 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`flex items-center gap-3 flex-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500 text-white font-bold text-sm">
                      #{index + 1}
                    </div>
                    <div className={`flex-1 min-w-0 ${isRTL ? 'text-right font-arabic' : ''}`}>
                      <p className="font-semibold text-ink truncate">
                        {trainer.trainerName}
                      </p>
                      <p className="text-sm text-ink/60">
                        {trainer.totalGroups} {trainer.totalGroups === 1 ? t('dashboardCLO:groupLabel') : t('dashboardCLO:groupsLabel')}
                      </p>
                    </div>
                  </div>
                  <div className={isRTL ? 'text-left font-arabic' : 'text-right'}>
                    <p className="text-xl font-bold text-green-600">
                      {trainer.avgAttendance?.toFixed(1) || 0}%
                    </p>
                    <p className="text-xs text-ink/50">{t('dashboardCLO:attendanceLabel')}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 text-ink/20" />
                <p className={`text-ink/60 ${isRTL ? 'font-arabic' : ''}`}>{t('dashboardCLO:noTrainerData')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl p-6 border border-primary/10 shadow-md">
          <h3 className={`text-2xl font-bold text-ink mb-6 ${isRTL ? 'font-arabic text-right' : ''}`}>
            {t('dashboardCLO:recentActivity')}
          </h3>

          <div className="space-y-4">
            {recentActivity?.groups && recentActivity.groups.length > 0 ? (
              <>
                <div>
                  <h4 className={`text-sm font-semibold text-ink/60 mb-3 uppercase tracking-wide ${isRTL ? 'font-arabic text-right' : ''}`}>
                    {t('dashboardCLO:recentGroups')}
                  </h4>
                  <div className="space-y-2">
                    {recentActivity.groups.slice(0, 3).map((group: any) => (
                      <div
                        key={group._id}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-emerald-50/50 transition-colors"
                      >
                        <div className="p-2 rounded-lg bg-emerald-50">
                          <UsersRound className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-ink text-sm truncate">
                            {group.name}
                          </p>
                          <p className="text-xs text-ink/60">
                            {group.courseId?.title || "N/A"}
                          </p>
                        </div>
                        <Badge
                          variant={
                            group.status === "active" ? "success" : "secondary"
                          }
                          size="sm"
                        >
                          {group.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {recentActivity.courses && recentActivity.courses.length > 0 && (
                  <div className="pt-4 border-t border-ink/10">
                    <h4 className={`text-sm font-semibold text-ink/60 mb-3 uppercase tracking-wide ${isRTL ? 'font-arabic text-right' : ''}`}>
                      {t('dashboardCLO:recentCourses')}
                    </h4>
                    <div className="space-y-2">
                      {recentActivity.courses.slice(0, 3).map((course: any) => (
                        <div
                          key={course._id}
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-teal-50/50 transition-colors"
                        >
                          <div className="p-2 rounded-lg bg-teal-50">
                            <BookOpen className="w-4 h-4 text-teal-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-ink text-sm truncate">
                              {course.title}
                            </p>
                            <p className="text-xs text-ink/60">
                              {course.category}
                            </p>
                          </div>
                          <Badge
                            variant={
                              course.status === "published"
                                ? "success"
                                : "warning"
                            }
                            size="sm"
                          >
                            {course.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 mx-auto mb-3 text-ink/20" />
                <p className={`text-ink/60 ${isRTL ? 'font-arabic' : ''}`}>{t('dashboardCommon:noRecentActivity')}</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
