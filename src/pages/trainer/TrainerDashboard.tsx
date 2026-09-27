import { Link } from "react-router-dom";
import {
  Users,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  FileText,
  Upload
} from "lucide-react";
import { useAuth } from "../../providers/AuthProvider";
import {
  StatsCard,
  CardComponent,
  Badge,
  LoadingState,
  Alert,
  Button,
  CardBody
} from "../../components/ui";
import { useTrainerDashboard } from "../../hooks/trainer/useTrainerDashboard";
import { motion } from "framer-motion";
import { useTranslation } from 'react-i18next';

export default function TrainerDashboard() {
  const { user } = useAuth();
  const { stats, recentActivities, isLoading, error, refetch } = useTrainerDashboard();
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardTrainer']);
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
    return <LoadingState type="skeleton" text={t('dashboardCommon:loading')} />;
  }

  // Show error state
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

  // Format time
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

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

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "success";
      case "in_progress":
        return "primary";
      case "scheduled":
        return "warning";
      case "cancelled":
        return "error";
      default:
        return "primary";
    }
  };

  // Get activity icon
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "session_completed":
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case "evaluation_submitted":
        return <FileText className="w-5 h-5 text-blue-400" />;
      case "resource_uploaded":
        return <Upload className="w-5 h-5 text-purple-400" />;
      default:
        return <BookOpen className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-8"
    >
      {/* Welcome Section */}
      <motion.div variants={itemVariants} className={isRTL ? 'text-right font-arabic' : ''}>
        <h1 className="text-4xl font-bold inline-block group-hover:scale-105 transition-transform duration-300" style={{
          background: 'linear-gradient(135deg, #003300 0%, #004d00 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          {t('dashboardTrainer:welcomeBack')}, {user?.name || t('dashboardTrainer:trainer')}
        </h1>
        <p className="mt-2 transition-colors duration-300" style={{ color: '#003300' + 'CC' }}>
          {t('dashboardTrainer:manageSubtitle')}
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <StatsCard
          label={t('dashboardTrainer:todaySessions')}
          value={stats?.todaysSessions || 0}
          icon={<Calendar className="w-6 h-6" />}
          trend={stats?.completedToday ? {
            value: stats.completedToday,
            isPositive: true,
            label: t('dashboardTrainer:completed')
          } : undefined}
        />
        <StatsCard
          label={t('dashboardTrainer:activeGroups')}
          value={stats?.activeGroups || 0}
          icon={<Users className="w-6 h-6" />}
        />
        <StatsCard
          label={t('dashboardTrainer:totalStudents')}
          value={stats?.totalStudents || 0}
          icon={<Users className="w-6 h-6" />}
        />
        <StatsCard
          label={t('dashboardTrainer:weekSessions')}
          value={stats?.weekSessions || 0}
          icon={<Clock className="w-6 h-6" />}
        />
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <CardComponent variant="glass">
            <CardBody>
              <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <h2 className={`text-xl font-semibold ${isRTL ? 'font-arabic' : ''}`}>{t('dashboardTrainer:todaySchedule')}</h2>
                <Link to="/trainer/schedule">
                  <Button variant="ghost" size="sm" rightIcon={isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}>
                    {t('dashboardCommon:viewCalendar')}
                  </Button>
                </Link>
              </div>

              {stats?.todaysSessionsList && stats.todaysSessionsList.length > 0 ? (
                <div className="space-y-4">
                  {stats.todaysSessionsList.map((session: any) => (
                    <Link
                      key={session._id}
                      to={`/trainer/sessions/${session._id}`}
                      className="block"
                    >
                      <div className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-300 border border-white/10 hover:border-primary/50 cursor-pointer group"
                      >
                      <div className={`flex items-center justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <h3 className="font-medium group-hover:text-primary transition-colors">
                          {session.title}
                        </h3>
                        <Badge
                          variant={getStatusColor(session.status) as any}
                          size="sm"
                        >
                          {session.status}
                        </Badge>
                      </div>
                      <div className={`flex items-center gap-4 text-sm text-white/60 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <Clock className="w-4 h-4" />
                          {formatTime(session.startTime)} - {formatTime(session.endTime)}
                        </span>
                        <span className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <Users className="w-4 h-4" />
                          {session.groupName}
                        </span>
                      </div>
                      {session.location && (
                        <div className={`mt-2 text-xs text-white/40 ${isRTL ? 'text-right' : 'text-left'}`}>
                          📍 {session.location}
                        </div>
                      )}
                    </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  {/* Animated Icon Container */}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="relative w-24 h-24 mx-auto mb-6"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-xl animate-pulse" />
                    <div className="relative w-full h-full bg-gradient-to-br from-primary/30 to-accent/30 rounded-full flex items-center justify-center border border-primary/30">
                      <Calendar className="w-12 h-12 text-primary" />
                    </div>
                  </motion.div>

                  {/* Message */}
                  <h3 className={`text-lg font-semibold text-white mb-2 ${isRTL ? 'font-arabic' : ''}`}>
                    {t('dashboardCommon:noSessionsToday')}
                  </h3>
                  <p className={`text-white/60 mb-6 max-w-xs mx-auto ${isRTL ? 'font-arabic' : ''}`}>
                    {t('dashboardCommon:noSessionsTodayDesc')}
                  </p>

                  {/* Action Button */}
                  <Link to="/trainer/schedule" className="inline-block group cursor-pointer">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="relative overflow-hidden"
                    >
                      <div className={`relative px-6 py-3 bg-gradient-to-r from-primary to-accent rounded-xl font-semibold text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300 flex items-center gap-2 ${isRTL ? 'flex-row-reverse font-arabic' : ''}`}>
                        <Calendar className="w-5 h-5" />
                        {t('dashboardCommon:viewSchedule')}
                        {isRTL ? <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> : <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                      </div>
                    </motion.div>
                  </Link>
                </div>
              )}
            </CardBody>
          </CardComponent>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants}>
          <CardComponent variant="glass">
            <CardBody>
              <h2 className={`text-xl font-semibold mb-6 ${isRTL ? 'font-arabic text-right' : ''}`}>{t('dashboardCommon:quickActions')}</h2>

              <div className="space-y-4">
                {/* View Sessions Action */}
                <Link to="/trainer/sessions" className="block group cursor-pointer">
                  <motion.div
                    whileHover={{ scale: 1.02, x: isRTL ? -4 : 4 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 p-4 transition-all duration-300 hover:border-primary hover:shadow-lg hover:shadow-primary/20"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className={`relative z-10 flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="p-2 rounded-lg bg-primary/20 group-hover:bg-primary/30 transition-colors">
                        <BookOpen className="w-5 h-5 text-primary" />
                      </div>
                      <div className={`flex-1 ${isRTL ? 'text-right font-arabic' : ''}`}>
                        <p className="font-semibold text-white">{t('dashboardCommon:viewSessions')}</p>
                        <p className="text-xs text-white/60">{t('dashboardCommon:viewSessionsDesc')}</p>
                      </div>
                      {isRTL
                        ? <ArrowLeft className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 group-hover:-translate-x-1 transition-all" />
                        : <ArrowRight className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />}
                    </div>
                  </motion.div>
                </Link>

                {/* Manage Groups Action */}
                <Link to="/trainer/groups" className="block group cursor-pointer">
                  <motion.div
                    whileHover={{ scale: 1.02, x: isRTL ? -4 : 4 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative overflow-hidden rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/30 p-4 transition-all duration-300 hover:border-accent hover:shadow-lg hover:shadow-accent/20"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className={`relative z-10 flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="p-2 rounded-lg bg-accent/20 group-hover:bg-accent/30 transition-colors">
                        <Users className="w-5 h-5 text-accent" />
                      </div>
                      <div className={`flex-1 ${isRTL ? 'text-right font-arabic' : ''}`}>
                        <p className="font-semibold text-white">{t('dashboardCommon:manageGroups')}</p>
                        <p className="text-xs text-white/60">{t('dashboardCommon:manageGroupsDesc')}</p>
                      </div>
                      {isRTL
                        ? <ArrowLeft className="w-5 h-5 text-accent opacity-0 group-hover:opacity-100 group-hover:-translate-x-1 transition-all" />
                        : <ArrowRight className="w-5 h-5 text-accent opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />}
                    </div>
                  </motion.div>
                </Link>

                {/* View Schedule Action */}
                <Link to="/trainer/schedule" className="block group cursor-pointer">
                  <motion.div
                    whileHover={{ scale: 1.02, x: isRTL ? -4 : 4 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative overflow-hidden rounded-xl bg-gradient-to-br from-secondary/20 to-secondary/5 border border-secondary/30 p-4 transition-all duration-300 hover:border-secondary hover:shadow-lg hover:shadow-secondary/20"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className={`relative z-10 flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="p-2 rounded-lg bg-secondary/20 group-hover:bg-secondary/30 transition-colors">
                        <Calendar className="w-5 h-5 text-secondary" />
                      </div>
                      <div className={`flex-1 ${isRTL ? 'text-right font-arabic' : ''}`}>
                        <p className="font-semibold text-white">{t('dashboardCommon:viewSchedule')}</p>
                        <p className="text-xs text-white/60">{t('dashboardCommon:scheduleDesc')}</p>
                      </div>
                      {isRTL
                        ? <ArrowLeft className="w-5 h-5 text-secondary opacity-0 group-hover:opacity-100 group-hover:-translate-x-1 transition-all" />
                        : <ArrowRight className="w-5 h-5 text-secondary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />}
                    </div>
                  </motion.div>
                </Link>
              </div>
            </CardBody>
          </CardComponent>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div variants={itemVariants}>
        <CardComponent variant="glass">
          <CardBody>
            <h2 className="text-xl font-semibold mb-6">{t('dashboardTrainer:recentActivity')}</h2>

            {recentActivities && recentActivities.length > 0 ? (
              <div className="space-y-4">
                {recentActivities.slice(0, 8).map((activity: any, index: number) => (
                  <div
                    key={activity._id || index}
                    className={`flex items-start gap-4 p-3 rounded-lg hover:bg-white/5 transition-all duration-300 ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{activity.title}</p>
                      <p className="text-xs text-white/60 truncate">{activity.description}</p>
                      <p className="text-xs text-white/40 mt-1">{formatTimeAgo(activity.timestamp)}</p>
                    </div>
                    {activity.link && (
                      <Link to={activity.link}>
                        <Button variant="ghost" size="sm">
                          {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                        </Button>
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-white/40">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className={`text-sm ${isRTL ? 'font-arabic' : ''}`}>{t('dashboardCommon:noRecentActivity')}</p>
              </div>
            )}
          </CardBody>
        </CardComponent>
      </motion.div>
    </motion.div>
  );
}
