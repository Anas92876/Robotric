import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Calendar as CalendarIcon,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import { useAttendanceOverview } from "../../hooks";
import { useTranslation } from 'react-i18next';
import { formatDate, formatTime } from "../../utils/dateTime";
import {
  CardComponent,
  CardBody,
  Button,
  Badge,
  LoadingState,
  Alert,
} from "../../components/ui";

export default function StudentAttendanceOverview() {
  const { data, isLoading, error, refetch } = useAttendanceOverview();
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardStudent']);
  const isRTL = i18n.language === 'ar';

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present":
        return <CheckCircle className="w-5 h-5 text-success" />;
      case "late":
        return <Clock className="w-5 h-5 text-warning" />;
      case "excused":
        return <AlertTriangle className="w-5 h-5 text-info" />;
      case "absent":
        return <XCircle className="w-5 h-5 text-error" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "success";
      case "late":
        return "warning";
      case "excused":
        return "info";
      case "absent":
        return "error";
      default:
        return "secondary";
    }
  };

  const getAttendancePercentageColor = (percentage: number) => {
    if (percentage >= 90) return "text-success";
    if (percentage >= 75) return "text-primary";
    if (percentage >= 60) return "text-warning";
    return "text-error";
  };

  const getAttendanceBgColor = (percentage: number) => {
    if (percentage >= 90) return "bg-success/20";
    if (percentage >= 75) return "bg-primary/20";
    if (percentage >= 60) return "bg-warning/20";
    return "bg-error/20";
  };

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

  // Show loading state
  if (isLoading) {
    return <LoadingState type="skeleton" text={t('dashboardStudent:loadingAttendance')} />;
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-4 sm:space-y-6 md:space-y-8">
        <Alert variant="error">
          <div className={`flex items-start gap-3`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold mb-1">{t('dashboardCommon:failedToLoad')}</p>
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

  const overallStats = data?.overallStats;
  const courses = data?.courses || [];
  const recentAttendance = data?.recentAttendance || [];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className={`space-y-4 sm:space-y-6 md:space-y-8 ${isRTL ? 'font-arabic' : ''}`}
    >
      {/* Header */}
      <motion.div variants={itemVariants} >
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold inline-block group-hover:scale-105 transition-transform duration-300" style={{
          color: '#0f1f33',
          backgroundClip: 'text'
        }}>
          {t('dashboardStudent:attendanceOverview')}
        </h1>
        <p className="mt-2 transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>
          {t('dashboardStudent:attendanceSubtitle')}
        </p>
      </motion.div>

      {/* Overall Stats Cards */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6"
      >
        {/* Average Attendance */}
        <CardComponent variant="glass" hover>
          <CardBody>
            <div className={`flex items-center justify-between`}>
              <div>
                <p className="text-sm mb-1 transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>{t('dashboardStudent:averageAttendance')}</p>
                <p className={`text-xl sm:text-2xl md:text-3xl font-bold ${getAttendancePercentageColor(overallStats?.averageAttendance || 0)}`}>
                  {overallStats?.averageAttendance || 0}%
                </p>
              </div>
              <div className={`w-16 h-16 rounded-full ${getAttendanceBgColor(overallStats?.averageAttendance || 0)} flex items-center justify-center`}>
                <TrendingUp className={`w-8 h-8 ${getAttendancePercentageColor(overallStats?.averageAttendance || 0)}`} />
              </div>
            </div>
            <div className="mt-3 h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${overallStats?.averageAttendance || 0}%` }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className={`h-full rounded-full ${
 (overallStats?.averageAttendance || 0) >= 90
 ?"bg-success"
 : (overallStats?.averageAttendance || 0) >= 75
 ?"bg-primary"
 : (overallStats?.averageAttendance || 0) >= 60
 ?"bg-warning"
 :"bg-error"
 }`}
              />
            </div>
          </CardBody>
        </CardComponent>

        {/* Total Present */}
        <CardComponent variant="glass" hover>
          <CardBody>
            <div className={`flex items-center justify-between`}>
              <div>
                <p className="text-sm text-white/60 mb-1">{t('dashboardStudent:totalPresent')}</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-success">
                  {overallStats?.totalPresent || 0}
                </p>
                <p className="text-xs text-white/40 mt-1">
                  {t('dashboardStudent:outOfSessions', { count: overallStats?.totalSessions || 0 })}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
          </CardBody>
        </CardComponent>

        {/* Total Late */}
        <CardComponent variant="glass" hover>
          <CardBody>
            <div className={`flex items-center justify-between`}>
              <div>
                <p className="text-sm text-white/60 mb-1">{t('dashboardStudent:totalLate')}</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-warning">
                  {overallStats?.totalLate || 0}
                </p>
                <p className="text-xs text-white/40 mt-1">
                  {t('dashboardStudent:courseCount', { count: overallStats?.totalCourses || 0 })}
                </p>
              </div>
              <Clock className="w-8 h-8 text-warning" />
            </div>
          </CardBody>
        </CardComponent>

        {/* Total Absent */}
        <CardComponent variant="glass" hover>
          <CardBody>
            <div className={`flex items-center justify-between`}>
              <div>
                <p className="text-sm text-white/60 mb-1">{t('dashboardStudent:totalAbsent')}</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-error">
                  {overallStats?.totalAbsent || 0}
                </p>
                <p className="text-xs text-white/40 mt-1">
                  {t('dashboardStudent:needsImprovement')}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-error" />
            </div>
          </CardBody>
        </CardComponent>
      </motion.div>

      {/* Course-wise Attendance */}
      <motion.div variants={itemVariants}>
        <h2 className={`text-2xl font-semibold mb-4`}>{t('dashboardStudent:attendanceByCourse')}</h2>
        {courses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {courses.map((course, index) => (
              <motion.div
                key={course.courseId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <CardComponent variant="glass" hover className="h-full">
                  <CardBody>
                    {/* Course Header */}
                    <div className="flex items-start gap-3 mb-4">
                      {course.courseThumbnail ? (
                        <img
                          src={course.courseThumbnail}
                          alt={course.courseTitle}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                          <BookOpen className="w-6 h-6 text-white/40" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{course.courseTitle}</h3>
                        <p className="text-xs text-white/60">
                          {t('dashboardStudent:outOfSessions', { count: course.totalSessions })}
                        </p>
                      </div>
                    </div>

                    {/* Attendance Percentage */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-white/60">{t('dashboardStudent:attendanceRate')}</span>
                        <span className={`font-semibold ${getAttendancePercentageColor(course.attendancePercentage)}`}>
                          {course.attendancePercentage}%
                        </span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${course.attendancePercentage}%` }}
                          transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                          className={`h-full rounded-full ${
 course.attendancePercentage >= 90
 ?"bg-success"
 : course.attendancePercentage >= 75
 ?"bg-primary"
 : course.attendancePercentage >= 60
 ?"bg-warning"
 :"bg-error"
 }`}
                        />
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className={`flex items-center gap-2`}>
                        <CheckCircle className="w-4 h-4 text-success" />
                        <div >
                          <p className="text-xs text-white/40">{t('dashboardStudent:present')}</p>
                          <p className="text-sm font-semibold">{course.presentCount}</p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-2`}>
                        <Clock className="w-4 h-4 text-warning" />
                        <div >
                          <p className="text-xs text-white/40">{t('dashboardStudent:late')}</p>
                          <p className="text-sm font-semibold">{course.lateCount}</p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-2`}>
                        <XCircle className="w-4 h-4 text-error" />
                        <div >
                          <p className="text-xs text-white/40">{t('dashboardStudent:absent')}</p>
                          <p className="text-sm font-semibold">{course.absentCount}</p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-2`}>
                        <AlertTriangle className="w-4 h-4 text-info" />
                        <div >
                          <p className="text-xs text-white/40">{t('dashboardStudent:excused')}</p>
                          <p className="text-sm font-semibold">{course.excusedCount}</p>
                        </div>
                      </div>
                    </div>

                    {/* View Details Button */}
                    <Link to={`/student/attendance/${course.courseId}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        rightIcon={<ArrowRight className="w-4 h-4" />}
                      >
                        {t('dashboardStudent:viewDetails')}
                      </Button>
                    </Link>
                  </CardBody>
                </CardComponent>
              </motion.div>
            ))}
          </div>
        ) : (
          <CardComponent variant="glass">
            <CardBody className="text-center py-12">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-white/20" />
              <h3 className="text-xl font-semibold mb-2">{t('dashboardStudent:noCoursesFound')}</h3>
              <p className="text-white/60 mb-6">
                {t('dashboardStudent:noCoursesEnrolled')}
              </p>
              <Link to="/student/courses">
                <Button variant="primary" size="md">
                  {t('dashboardStudent:browseCourses')}
                </Button>
              </Link>
            </CardBody>
          </CardComponent>
        )}
      </motion.div>

      {/* Recent Attendance Activity */}
      {recentAttendance.length > 0 && (
        <motion.div variants={itemVariants}>
          <h2 className={`text-2xl font-semibold mb-4`}>{t('dashboardStudent:recentAttendance')}</h2>
          <CardComponent variant="glass">
            <CardBody>
              <div className="space-y-3">
                {recentAttendance.map((record, index) => (
                  <motion.div
                    key={record._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                  >
                    <div className="flex-shrink-0">
                      {getStatusIcon(record.status)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold truncate">
                          {record.session.title}
                        </h3>
                        <Badge variant={getStatusColor(record.status) as any} size="sm">
                          {record.status}
                        </Badge>
                        <Badge variant="secondary" size="sm">
                          {record.session.type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-white/60 flex-wrap">
                        <span className="font-medium text-primary">
                          {record.courseTitle}
                        </span>
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          {formatDate(record.session.date)}
                        </div>
                        {record.session.startTime && record.session.endTime && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {record.session.startTime} - {record.session.endTime}
                          </div>
                        )}
                        {record.checkInTime && (
                          <div className="text-xs text-white/40">
                            {t('dashboardStudent:checkedIn')} {formatTime(record.checkInTime)}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardBody>
          </CardComponent>
        </motion.div>
      )}

      {/* Status Legend */}
      <motion.div variants={itemVariants}>
        <CardComponent variant="glass">
          <CardBody>
            <h3 className={`text-sm font-semibold mb-3`}>{t('dashboardStudent:statusLegend')}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className={`flex items-center gap-2`}>
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-sm">{t('dashboardStudent:presentOnTime')}</span>
              </div>
              <div className={`flex items-center gap-2`}>
                <Clock className="w-4 h-4 text-warning" />
                <span className="text-sm">{t('dashboardStudent:lateAttended')}</span>
              </div>
              <div className={`flex items-center gap-2`}>
                <AlertTriangle className="w-4 h-4 text-info" />
                <span className="text-sm">{t('dashboardStudent:excusedValid')}</span>
              </div>
              <div className={`flex items-center gap-2`}>
                <XCircle className="w-4 h-4 text-error" />
                <span className="text-sm">{t('dashboardStudent:absentNotAttended')}</span>
              </div>
            </div>
          </CardBody>
        </CardComponent>
      </motion.div>
    </motion.div>
  );
}
