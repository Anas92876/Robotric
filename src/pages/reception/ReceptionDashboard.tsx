/**
 * Reception Dashboard Component
 *
 * Main dashboard for reception staff to manage:
 * - Student and trainer accounts
 * - Course enrollments
 * - Interested customer leads
 *
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  AlertCircle,
  GraduationCap,
  Users,
  BookOpen,
  TrendingUp,
  UsersRound,
  UserPlus,
  FileText,
  Clock,
  ArrowRight,
  Bus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useReceptionDashboard } from '../../hooks';
import { StatsCard, CardComponent, CardBody, LoadingState, Alert, Button, Badge } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../providers/AuthProvider';
import { useTranslation } from 'react-i18next';

const ReceptionDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { stats, isLoading, error, refetch } = useReceptionDashboard();
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardReception']);
  const isRTL = i18n.language === 'ar';

  const [recentEnrollments, setRecentEnrollments] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);

  // Transport-assignment backlog — enrollments paid up for transport but with no
  // driver yet. Cheap server-side count; refreshed every time the dashboard mounts.
  const [pendingTransportCount, setPendingTransportCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get('/reception/transport/pending-assignment-count')
      .then(res => { if (!cancelled) setPendingTransportCount(res.data?.data?.pendingCount ?? 0); })
      .catch(() => { if (!cancelled) setPendingTransportCount(null); });
    return () => { cancelled = true; };
  }, []);

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

  // Fetch recent data
  useEffect(() => {
    const fetchRecentData = async () => {
      try {
        setIsLoadingRecent(true);

        const [enrollmentsRes, activitiesRes] = await Promise.all([
          api.get('/reception/recent-enrollments?limit=5'),
          api.get('/reception/recent-activities?limit=10')
        ]);

        setRecentEnrollments(enrollmentsRes.data.data || []);
        setRecentActivities(activitiesRes.data.data || []);
      } catch (err) {
        console.error('Error fetching recent data:', err);
      } finally {
        setIsLoadingRecent(false);
      }
    };

    fetchRecentData();
  }, []);

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

  // Get activity icon
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "payment":
        return <FileText className="w-5 h-5 text-green-400" />;
      case "lead_converted":
        return <UserPlus className="w-5 h-5 text-blue-400" />;
      case "enrollment_created":
        return <BookOpen className="w-5 h-5 text-purple-400" />;
      case "enrollment_updated":
        return <FileText className="w-5 h-5 text-yellow-400" />;
      default:
        return <Clock className="w-5 h-5 text-primary" />;
    }
  };

  // Show loading state
  if (isLoading) {
    return <LoadingState type="skeleton" text={t('dashboardReception:loadingDashboard')} />;
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

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-8"
    >
      {/* Welcome Section */}
      <motion.div variants={itemVariants}>
        <h1 className="text-4xl font-bold inline-block group-hover:scale-105 transition-transform duration-300" style={{ 
          background: 'linear-gradient(135deg, #003300 0%, #004d00 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          {t('dashboardReception:welcomeBack')}, {user?.name || t('dashboardCommon:welcome')}
        </h1>
        <p className={`mt-2 transition-colors duration-300 ${isRTL ? 'text-right font-arabic' : ''}`} style={{ color: '#003300' + 'CC' }}>
          {t('dashboardReception:dashboardSubtitle')}
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6"
      >
        <StatsCard
          label={t('dashboardReception:totalStudents')}
          value={stats?.totalStudents || 0}
          icon={<GraduationCap className="w-6 h-6" />}
        />
        <StatsCard
          label={t('dashboardReception:totalTrainers')}
          value={stats?.totalTrainers || 0}
          icon={<Users className="w-6 h-6" />}
        />
        <StatsCard
          label={t('dashboardReception:totalEnrollments')}
          value={stats?.totalEnrollments || 0}
          icon={<BookOpen className="w-6 h-6" />}
        />
        <StatsCard
          label={t('dashboardReception:recentEnrollments')}
          value={stats?.recentEnrollments || 0}
          icon={<TrendingUp className="w-6 h-6" />}
          trend={{
            value: 7,
            isPositive: true,
            label: t('dashboardReception:last7Days')
          }}
        />
        <StatsCard
          label={t('dashboardReception:activeGroups')}
          value={stats?.activeGroups || 0}
          icon={<UsersRound className="w-6 h-6" />}
        />
      </motion.div>

      {/* Transport-assignment backlog — only shown when there's actual work to
           surface. Clicking jumps straight to the enrollment list so reception
           can pick a row and assign a driver. We keep the card outside the main
           stats grid so its presence (or absence) communicates urgency. */}
      {pendingTransportCount !== null && pendingTransportCount > 0 && (
        <motion.div variants={itemVariants}>
          <button
            type="button"
            // Navigate to enrollments with transport-enabled filter on. Rows whose
            // students still need driver assignment will show the yellow banner.
            onClick={() => navigate('/reception/enrollments?transportationFilter=enabled')}
            className="w-full flex items-center gap-4 bg-yellow-50 border border-yellow-200 rounded-2xl p-5 hover:bg-yellow-100 transition-colors text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center shrink-0">
              <Bus className="w-6 h-6 text-yellow-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-yellow-900 font-semibold">
                {pendingTransportCount} {isRTL ? 'تسجيل نقل بانتظار تعيين سائق' : `transport enrollment${pendingTransportCount === 1 ? '' : 's'} waiting for driver assignment`}
              </p>
              <p className="text-sm text-yellow-800 mt-0.5">
                {isRTL
                  ? 'الطلاب مدفوعون لكن لم يُسنَدوا إلى سائق بعد'
                  : 'Students are paid up for transport but have no bus seat yet'}
              </p>
            </div>
            <ArrowRight className={`w-5 h-5 text-yellow-700 shrink-0 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <div className="mb-6">
          <h2 className={`text-2xl font-bold text-white ${isRTL ? 'font-arabic' : ''}`}>{t('dashboardReception:quickActions')}</h2>
          <p className={`text-white/60 text-sm mt-1 ${isRTL ? 'font-arabic text-right' : ''}`}>{t('dashboardReception:quickActionsDesc')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Manage Users Card */}
          <motion.button
            onClick={() => navigate('/reception/users')}
            whileHover={{ scale: 1.02, y: -5 }}
            whileTap={{ scale: 0.98 }}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 p-6 text-left transition-all duration-300 hover:border-primary hover:shadow-lg hover:shadow-primary/20"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-primary/20 group-hover:bg-primary/30 transition-colors">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <ArrowRight className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>

              <h3 className={`text-lg font-bold text-white mb-2 ${isRTL ? 'font-arabic text-right' : ''}`}>{t('dashboardReception:manageUsers')}</h3>
              <p className={`text-sm text-white/70 ${isRTL ? 'font-arabic text-right' : ''}`}>{t('dashboardReception:manageUsersDesc')}</p>
            </div>
          </motion.button>

          {/* Add New User Card */}
          <motion.button
            onClick={() => navigate('/reception/users')}
            whileHover={{ scale: 1.02, y: -5 }}
            whileTap={{ scale: 0.98 }}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/30 p-6 text-left transition-all duration-300 hover:border-accent hover:shadow-lg hover:shadow-accent/20"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-accent/20 group-hover:bg-accent/30 transition-colors">
                  <UserPlus className="w-6 h-6 text-accent" />
                </div>
                <ArrowRight className="w-5 h-5 text-accent opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>

              <h3 className={`text-lg font-bold text-white mb-2 ${isRTL ? 'font-arabic text-right' : ''}`}>{t('dashboardReception:addNewUser')}</h3>
              <p className={`text-sm text-white/70 ${isRTL ? 'font-arabic text-right' : ''}`}>{t('dashboardReception:addNewUserDesc')}</p>
            </div>
          </motion.button>

          {/* Enrollments Card */}
          <motion.button
            onClick={() => navigate('/reception/enrollments')}
            whileHover={{ scale: 1.02, y: -5 }}
            whileTap={{ scale: 0.98 }}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-secondary/20 to-secondary/5 border border-secondary/30 p-6 text-left transition-all duration-300 hover:border-secondary hover:shadow-lg hover:shadow-secondary/20"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-secondary/20 group-hover:bg-secondary/30 transition-colors">
                  <FileText className="w-6 h-6 text-secondary" />
                </div>
                <ArrowRight className="w-5 h-5 text-secondary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>

              <h3 className={`text-lg font-bold text-white mb-2 ${isRTL ? 'font-arabic text-right' : ''}`}>{t('dashboardReception:enrollmentsLabel')}</h3>
              <p className={`text-sm text-white/70 ${isRTL ? 'font-arabic text-right' : ''}`}>{t('dashboardReception:enrollmentsDesc')}</p>
            </div>
          </motion.button>

          {/* Manage Leads Card */}
          <motion.button
            onClick={() => navigate('/reception/leads')}
            whileHover={{ scale: 1.02, y: -5 }}
            whileTap={{ scale: 0.98 }}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-secondary/20 to-secondary/5 border border-secondary/30 p-6 text-left transition-all duration-300 hover:border-secondary hover:shadow-lg hover:shadow-secondary/20"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-secondary/20 group-hover:bg-secondary/30 transition-colors">
                  <FileText className="w-6 h-6 text-secondary" />
                </div>
                <ArrowRight className="w-5 h-5 text-secondary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>

              <h3 className={`text-lg font-bold text-white mb-2 ${isRTL ? 'font-arabic text-right' : ''}`}>{t('dashboardReception:manageLeads')}</h3>
              <p className={`text-sm text-white/70 ${isRTL ? 'font-arabic text-right' : ''}`}>{t('dashboardReception:manageLeadsDesc')}</p>
            </div>
          </motion.button>
        </div>
      </motion.div>

      {/* Recent Activity Section */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Recent Enrollments */}
        <CardComponent variant="glass" hover>
          <CardBody>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  {t('dashboardReception:recentEnrollments')}
                </h2>
                <p className="text-white/60 text-sm mt-1">{t('dashboardReception:last7Days')}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/reception/enrollments')}
                className="text-primary hover:text-primary/80"
              >
                {t('dashboardCommon:viewAll')}
                <ArrowRight className={`w-4 h-4 ${isRTL ? 'mr-1' : 'ml-1'}`} />
              </Button>
            </div>

            {isLoadingRecent ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : recentEnrollments.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/50 text-sm">{t('dashboardReception:noRecentEnrollments')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentEnrollments.map((enrollment) => (
                  <button
                    key={enrollment._id}
                    onClick={() => navigate('/reception/enrollments')}
                    className="w-full flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 hover:border-primary/50 transition-all group"
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                      {enrollment.student.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-medium text-white truncate">
                        {enrollment.student.name}
                      </p>
                      <p className="text-sm text-white/60 truncate">
                        {enrollment.course.title}
                      </p>
                    </div>

                    {/* Status Badge */}
                    <Badge
                      variant={enrollment.status === 'active' ? 'success' : 'secondary'}
                      size="sm"
                    >
                      {enrollment.status}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </CardBody>
        </CardComponent>

        {/* Recent Activities */}
        <CardComponent variant="glass" hover>
          <CardBody>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-accent" />
                  {t('dashboardReception:recentActivities')}
                </h2>
                <p className="text-white/60 text-sm mt-1">{t('dashboardReception:latestUpdates')}</p>
              </div>
            </div>

            {isLoadingRecent ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : recentActivities.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/50 text-sm">{t('dashboardReception:noRecentActivities')}</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {recentActivities.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-4 rounded-lg bg-white/5 border border-white/10 hover:border-primary/30 transition-all"
                  >
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {getActivityIcon(activity.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium">
                        {activity.description}
                      </p>

                      {/* Details */}
                      {activity.type === 'payment' && activity.details && (
                        <p className="text-xs text-white/60 mt-1">
                          ${activity.details.amount} • {activity.details.receiptNumber}
                        </p>
                      )}

                      {/* Time */}
                      <p className="text-xs text-white/40 mt-1">
                        {formatTimeAgo(activity.date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </CardComponent>
      </motion.div>
    </motion.div>
  );
};

export default ReceptionDashboard;
