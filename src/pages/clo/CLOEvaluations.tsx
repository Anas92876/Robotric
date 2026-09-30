import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  BookOpen,
  ChevronRight,
  Calendar,
  Users,
  User,
  Clock,
  RefreshCw,
  AlertCircle,
  Award,
  ArrowLeft,
} from "lucide-react";
import { useCLOEvaluations } from "../../hooks/clo/useCLOEvaluations";
import { useCLOCourses } from "../../hooks/clo/useCLOCourses";
import { useTranslation } from 'react-i18next';
import { formatDate } from "../../utils/dateTime";
import {
  Button,
  Badge,
  LoadingState,
  Alert,
} from "../../components/ui";

export default function CLOEvaluations() {
  const { evaluations, isLoading, error, fetchEvaluations } = useCLOEvaluations();
  const { courses, fetchCourses } = useCLOCourses();
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardCLO']);
  const isRTL = i18n.language === 'ar';

  // Step state: 'course' | 'session' | 'details'
  const [step, setStep] = useState<'course' | 'session' | 'details'>('course');
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  useEffect(() => {
    fetchCourses({ status: 'published' });
  }, [fetchCourses]);

  const handleSelectCourse = async (course: any) => {
    setSelectedCourse(course);
    setStep('session');

    setLoadingSessions(true);
    try {
      const fetchedEvaluations = await fetchEvaluations({});

      const sessionMap = new Map();
      const allEvals = fetchedEvaluations || evaluations;

      allEvals.forEach(evaluation => {
        if (!evaluation.sessionId || !evaluation.groupId) return;

        const evalCourseId = evaluation.groupId?.courseId?._id || evaluation.groupId?.courseId;
        if (evalCourseId === course._id) {
          const sessionId = evaluation.sessionId?._id || evaluation.sessionId;
          if (!sessionId) return;

          if (!sessionMap.has(sessionId)) {
            sessionMap.set(sessionId, {
              ...evaluation.sessionId,
              _id: sessionId,
              evaluationsCount: 0,
              groups: new Set(),
            });
          }
          const session = sessionMap.get(sessionId);
          session.evaluationsCount++;
          if (evaluation.groupId?.name) {
            session.groups.add(evaluation.groupId.name);
          }
        }
      });

      const sessionsArray = Array.from(sessionMap.values()).map(session => ({
        ...session,
        groups: Array.from(session.groups),
      }));
      setSessions(sessionsArray);
    } catch (err) {
      console.error('Error loading sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleSelectSession = async (session: any) => {
    setSelectedSession(session);
    setStep('details');

    await fetchEvaluations({});
  };

  const handleBack = () => {
    if (step === 'details') {
      setStep('session');
      setSelectedSession(null);
    } else if (step === 'session') {
      setStep('course');
      setSelectedCourse(null);
      setSessions([]);
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "text-green-600";
    if (rating >= 3) return "text-yellow-600";
    return "text-red-600";
  };

  // Filter evaluations for selected session
  const sessionEvaluations = selectedSession
    ? evaluations.filter(e => e.sessionId?._id === selectedSession._id)
    : [];

  // Calculate statistics for selected session
  const sessionStats = selectedSession ? {
    total: sessionEvaluations.length,
    averageRating: sessionEvaluations.length > 0
      ? (sessionEvaluations.reduce((sum, e) => sum + e.overallRating, 0) / sessionEvaluations.length).toFixed(1)
      : 0,
    averagePerformance: sessionEvaluations.length > 0
      ? Math.round(sessionEvaluations.reduce((sum, e) => sum + (e.performanceScore || 0), 0) / sessionEvaluations.length)
      : 0,
  } : null;

  if (isLoading && courses.length === 0) {
    return <LoadingState type="skeleton" text={t('dashboardCLO:loadingCourses')} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header with Breadcrumb */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : ''}>
          <div className={`flex items-center gap-2 text-sm text-ink/60 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span className={step === 'course' ? 'text-primary font-medium' : ''}>{t('dashboardCLO:selectCourse')}</span>
            {(step === 'session' || step === 'details') && (
              <>
                <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                <span className={step === 'session' ? 'text-primary font-medium' : ''}>
                  {selectedCourse?.title || t('dashboardCLO:selectSession')}
                </span>
              </>
            )}
            {step === 'details' && (
              <>
                <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                <span className="text-primary font-medium">{t('dashboardCLO:evaluationDetails')}</span>
              </>
            )}
          </div>
          <h1 className="text-3xl font-bold inline-block" style={{
            color: '#0f1f33',
            backgroundClip: 'text'
          }}>{t('dashboardCLO:sessionEvaluations')}</h1>
          <p className="mt-1 transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>
            {step === 'course' && t('dashboardCLO:selectCourseToViewEvaluations')}
            {step === 'session' && t('dashboardCLO:selectSessionToViewEvaluations')}
            {step === 'details' && t('dashboardCLO:viewDetailedEvaluationDesc')}
          </p>
        </div>
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {step !== 'course' && (
            <Button
              variant="outline"
              leftIcon={<ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />}
              onClick={handleBack}
            >
              {t('dashboardCommon:back')}
            </Button>
          )}
          <Button
            variant="ghost"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={() => {
              if (step === 'course') fetchCourses({ status: 'published' });
              else if (step === 'session') handleSelectCourse(selectedCourse);
              else fetchEvaluations({});
            }}
            disabled={isLoading || loadingSessions}
          >
            {t('dashboardCommon:refresh')}
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="error">
          <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold mb-1">{t('dashboardCommon:error')}</p>
              <p className="text-sm opacity-90">{error}</p>
            </div>
          </div>
        </Alert>
      )}

      <AnimatePresence mode="wait">
        {/* Step 1: Course Selection */}
        {step === 'course' && (
          <motion.div
            key="courses"
            initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRTL ? -20 : 20 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {courses.length > 0 ? (
              courses.map((course, index) => (
                <motion.div
                  key={course._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <button
                    onClick={() => handleSelectCourse(course)}
                    className={`w-full bg-white rounded-xl p-6 border border-ink/10 hover:border-primary/30 hover:shadow-lg transition-all ${isRTL ? 'text-right' : 'text-left'} group`}
                  >
                    <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white flex-shrink-0">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-ink mb-1 group-hover:text-primary transition-colors">
                          {course.title}
                        </h3>
                        <div className={`flex flex-wrap items-center gap-2 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          {course.category && (
                            <Badge variant="secondary" size="sm">
                              {course.category}
                            </Badge>
                          )}
                          {course.level && (
                            <Badge variant="secondary" size="sm" className="capitalize">
                              {course.level}
                            </Badge>
                          )}
                        </div>
                        {course.description && (
                          <p className="text-sm text-ink/60 line-clamp-2 mb-3">
                            {course.description}
                          </p>
                        )}
                        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <span className="text-sm text-ink/60">
                            {t('dashboardCLO:clickToViewSessions')}
                          </span>
                          <ChevronRight className={`w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-all ${isRTL ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
                        </div>
                      </div>
                    </div>
                  </button>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full bg-white rounded-xl p-12 border border-ink/10 text-center">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-ink/20" />
                <h3 className="text-lg font-semibold text-ink mb-2">
                  {t('dashboardCLO:noCourses')}
                </h3>
                <p className="text-ink/60">
                  {t('dashboardCLO:noPublishedCourses')}
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Step 2: Session Selection */}
        {step === 'session' && (
          <motion.div
            key="sessions"
            initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRTL ? -20 : 20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {loadingSessions ? (
              <LoadingState type="spinner" text={t('dashboardCLO:loadingSessions')} />
            ) : sessions.length > 0 ? (
              sessions.map((session, index) => (
                <motion.div
                  key={session._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <button
                    onClick={() => handleSelectSession(session)}
                    className={`w-full bg-white rounded-xl p-6 border border-ink/10 hover:border-primary/30 hover:shadow-lg transition-all ${isRTL ? 'text-right' : 'text-left'} group`}
                  >
                    <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white flex-shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-semibold text-ink mb-2 group-hover:text-primary transition-colors">
                          {session.title}
                        </h3>
                        <div className={`flex flex-wrap items-center gap-3 text-sm text-ink/60 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(session.scheduledDate)}</span>
                          </div>
                          <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <Clock className="w-4 h-4" />
                            <span>{session.duration || 0} min</span>
                          </div>
                          <Badge variant="secondary" size="sm" className="capitalize">
                            {session.type}
                          </Badge>
                        </div>
                        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <FileText className="w-4 h-4 text-primary" />
                            <span className="text-sm text-ink/80">
                              {t('dashboardCLO:evaluationsSubmitted', { count: session.evaluationsCount })}
                            </span>
                          </div>
                          <ChevronRight className={`w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-all ${isRTL ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
                        </div>
                      </div>
                    </div>
                  </button>
                </motion.div>
              ))
            ) : (
              <div className="bg-white rounded-xl p-12 border border-ink/10 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-ink/20" />
                <h3 className="text-lg font-semibold text-ink mb-2">
                  {t('dashboardCLO:noSessionsFound')}
                </h3>
                <p className="text-ink/60">
                  {t('dashboardCLO:noEvaluationsForCourse')}
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Step 3: Evaluation Details */}
        {step === 'details' && (
          <motion.div
            key="details"
            initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRTL ? -20 : 20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Statistics Cards */}
            {sessionStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl p-4 border border-ink/10">
                  <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <FileText className="w-4 h-4 text-primary" />
                    <p className="text-xs text-ink/60">{t('dashboardCLO:totalEvaluations')}</p>
                  </div>
                  <p className="text-2xl font-bold text-ink">{sessionStats.total}</p>
                </div>

                <div className="bg-white rounded-xl p-4 border border-ink/10">
                  <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Award className="w-4 h-4 text-yellow-600" />
                    <p className="text-xs text-ink/60">{t('dashboardCLO:averageRating')}</p>
                  </div>
                  <p className="text-2xl font-bold text-ink">
                    {sessionStats.averageRating} <span className="text-sm text-ink/60">/ 5</span>
                  </p>
                </div>
              </div>
            )}

            {/* Evaluations List */}
            <div className="space-y-4">
              {sessionEvaluations.length > 0 ? (
                sessionEvaluations.map((evaluation, index) => (
                  <motion.div
                    key={evaluation._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <div className="bg-white rounded-xl p-6 border border-ink/10">
                      <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        {/* Rating Badge */}
                        <div className="flex-shrink-0">
                          <div className={`text-3xl font-bold ${getRatingColor(evaluation.overallRating)}`}>
                            {typeof evaluation.overallRating === 'number'
                              ? evaluation.overallRating.toFixed(1)
                              : parseFloat(evaluation.overallRating).toFixed(1)}
                          </div>
                          <p className="text-xs text-ink/60 text-center">/ 5</p>
                        </div>

                        {/* Content */}
                        <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : ''}`}>
                          <div className={`flex items-start justify-between mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div>
                              <h4 className="text-lg font-semibold text-ink mb-1">
                                {t('dashboardCLO:studentLabel')} {evaluation.studentId?.name || "N/A"}
                              </h4>
                              <div className={`flex flex-wrap items-center gap-3 text-sm text-ink/60 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                  <User className="w-4 h-4" />
                                  <span>{t('dashboardCLO:trainerLabel')} {evaluation.trainerId?.name || "N/A"}</span>
                                </div>
                                <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                  <Users className="w-4 h-4" />
                                  <span>{t('dashboardCLO:groupLabel')} {evaluation.groupId?.name || "N/A"}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Metrics Grid */}
                          <div className="mb-4">
                            <div>
                              <p className="text-xs text-ink/60 mb-1">{t('dashboardCLO:evaluatedOn')}</p>
                              <p className="text-sm font-semibold text-ink">
                                {formatDate(evaluation.evaluationDate)}
                              </p>
                            </div>
                          </div>

                          {/* Trainer Notes */}
                          {evaluation.trainerNotes?.generalNotes && (
                            <div className="bg-gray-50 rounded-lg p-3 border border-ink/5">
                              <p className="text-xs text-ink/60 mb-1 font-medium">{t('dashboardCLO:trainerNotes')}</p>
                              <p className="text-sm text-ink/80">
                                {evaluation.trainerNotes.generalNotes}
                              </p>
                            </div>
                          )}

                          {/* Evaluation Parameters */}
                          {evaluation.parameters && Object.keys(evaluation.parameters).length > 0 && (
                            <div className="mt-4 pt-4 border-t border-ink/10">
                              <p className="text-xs text-ink/60 mb-2 font-medium">{t('dashboardCLO:evaluationDetailsSection')}</p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {Object.entries(evaluation.parameters).map(([key, value]) => (
                                  <div key={key} className={isRTL ? 'text-right' : ''}>
                                    <p className="text-xs text-ink/60 capitalize">{key}</p>
                                    <p className="text-sm font-semibold text-ink">
                                      {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="bg-white rounded-xl p-12 border border-ink/10 text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-ink/20" />
                  <h3 className="text-lg font-semibold text-ink mb-2">
                    {t('dashboardCLO:noEvaluations')}
                  </h3>
                  <p className="text-ink/60">
                    {t('dashboardCLO:noEvaluationsForSession')}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
