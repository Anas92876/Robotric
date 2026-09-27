import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Star, MessageSquare, Calendar, BookOpen, TrendingUp,
  AlertCircle, RefreshCw, ChevronDown, ChevronUp, ChevronRight, X, Award
} from 'lucide-react';
import { api } from '../../lib/api';
import { CardComponent, CardBody, LoadingState, Alert, Badge } from '../../components/ui';

interface Evaluation {
  _id: string;
  sessionTitle: string;
  sessionDate: string | null;
  sessionType: string | null;
  courseId: string | null;
  courseName: string | null;
  groupName: string | null;
  overallScore: number | null;
  maxScore: number;
  parameters: Array<{ name: string; score: number; maxScore: number }>;
  trainerNotes: string | null;
  evaluationDate: string;
}

interface CourseGroup {
  courseId: string | null;
  courseName: string;
  groupName: string | null;
  totalSessions: number;
  scoredSessions: number;
  averageScore: number | null;
  percentage: number | null;
  evaluations: Evaluation[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 }
};

// ── Circular percentage gauge ────────────────────────────────────────────────
function PercentageGauge({ pct, size = 96, stroke = 8, label }: { pct: number; size?: number; stroke?: number; label?: string }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct >= 80 ? '#003300' : pct >= 60 ? '#ca8a04' : '#dc2626';
  return (
    <div className="flex flex-col items-center gap-1">
      <div style={{ width: size, height: size, position: 'relative' }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-bold text-[#003300]" style={{ fontSize: size * 0.22 }}>{pct}%</span>
        </div>
      </div>
      {label && <span className="text-xs text-[#003300]/60 font-medium text-center">{label}</span>}
    </div>
  );
}

// ── Star row ─────────────────────────────────────────────────────────────────
function StarRow({ score, max, size = 'md' }: { score: number; max: number; size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => i + 1).map(star => (
        <Star key={star} className={`${cls} ${star <= Math.round(score) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
      ))}
      <span className={`font-bold ml-1.5 ${size === 'sm' ? 'text-xs' : 'text-sm'} text-gray-700`}>
        {score}/{max}
      </span>
    </div>
  );
}

// ── Single session evaluation card (inside course detail panel) ───────────────
function SessionEvalCard({ evaluation, isRTL }: { evaluation: Evaluation; isRTL: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation(['dashboardStudent', 'dashboardCommon']);

  const formattedDate = (() => {
    const raw = evaluation.sessionDate || evaluation.evaluationDate;
    if (!raw) return null;
    return new Date(raw).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  })();

  const hasDetails = evaluation.parameters.length > 0 || !!evaluation.trainerNotes;

  return (
    <div className="bg-white/70 border border-white/40 rounded-xl p-4">
      {/* Header */}
      <div className={`flex items-start justify-between gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[#003300] text-sm leading-tight">{evaluation.sessionTitle}</p>
          {formattedDate && (
            <span className="flex items-center gap-1 text-xs text-[#003300]/50 mt-1">
              <Calendar className="w-3 h-3" />{formattedDate}
            </span>
          )}
        </div>
        {evaluation.overallScore !== null && (
          <StarRow score={evaluation.overallScore} max={evaluation.maxScore} size="sm" />
        )}
      </div>

      {/* Trainer notes preview */}
      {evaluation.trainerNotes && !expanded && (
        <div className="mt-2 p-2.5 rounded-lg bg-yellow-50 border border-yellow-100">
          <p className="text-xs font-semibold text-yellow-700 mb-0.5 flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            {t('dashboardStudent:trainerNotes', 'Trainer Notes')}
          </p>
          <p className="text-xs text-yellow-800 line-clamp-2 leading-relaxed" dir="auto">{evaluation.trainerNotes}</p>
        </div>
      )}

      {/* Expanded */}
      {expanded && (
        <div className="mt-2 space-y-2">
          {evaluation.parameters.length > 0 && (
            <div className="space-y-1.5">
              {evaluation.parameters.map((p, i) => (
                <div key={i} className={`flex items-center justify-between p-2 rounded-lg bg-gray-50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-xs text-[#003300]/80">{p.name}</span>
                  <StarRow score={p.score} max={p.maxScore} size="sm" />
                </div>
              ))}
            </div>
          )}
          {evaluation.trainerNotes && (
            <div className="p-2.5 rounded-lg bg-yellow-50 border border-yellow-100">
              <p className="text-xs font-semibold text-yellow-700 mb-0.5 flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {t('dashboardStudent:trainerNotes', 'Trainer Notes')}
              </p>
              <p className="text-xs text-yellow-800 leading-relaxed" dir="auto">{evaluation.trainerNotes}</p>
            </div>
          )}
        </div>
      )}

      {hasDetails && (
        <button
          onClick={() => setExpanded(p => !p)}
          className={`mt-2 flex items-center gap-1 text-xs font-semibold text-[#003300]/50 hover:text-[#003300] transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          {expanded
            ? <><ChevronUp className="w-3 h-3" />{t('dashboardCommon:showLess', 'Show less')}</>
            : <><ChevronDown className="w-3 h-3" />{t('dashboardCommon:showMore', 'Show details')}</>}
        </button>
      )}
    </div>
  );
}

// ── Course card (collapsed) ───────────────────────────────────────────────────
function CourseCard({ group, isRTL, onClick }: { group: CourseGroup; isRTL: boolean; onClick: () => void }) {
  const pctColor = group.percentage !== null
    ? group.percentage >= 80 ? 'text-green-700 bg-green-100' : group.percentage >= 60 ? 'text-yellow-700 bg-yellow-100' : 'text-red-700 bg-red-100'
    : 'text-gray-500 bg-gray-100';

  return (
    <motion.div variants={itemVariants}>
      <CardComponent variant="glass" hover>
        <CardBody className="p-5">
          <button className="w-full text-left" onClick={onClick}>
            <div className={`flex items-center justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {/* Left: icon + names */}
              <div className={`flex items-center gap-3 flex-1 min-w-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className={`font-bold text-[#003300] text-base leading-tight truncate ${isRTL ? 'text-right' : ''}`}>
                    {group.courseName}
                  </p>
                  {group.groupName && (
                    <span className="inline-flex items-center gap-1 mt-1 text-xs text-[#003300]/50 bg-white/60 border border-white/40 rounded-full px-2 py-0.5">
                      <BookOpen className="w-2.5 h-2.5" />
                      {group.groupName}
                    </span>
                  )}
                  <p className={`text-xs text-[#003300]/50 mt-1 ${isRTL ? 'text-right' : ''}`}>
                    {group.scoredSessions}/{group.totalSessions} sessions evaluated
                  </p>
                </div>
              </div>

              {/* Right: gauge + arrow */}
              <div className={`flex items-center gap-3 shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                {group.percentage !== null ? (
                  <PercentageGauge pct={group.percentage} size={72} stroke={6} />
                ) : (
                  <div className="w-[72px] h-[72px] rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center">
                    <span className="text-xs text-gray-400">—</span>
                  </div>
                )}
                <ChevronRight className="w-5 h-5 text-[#003300]/30" />
              </div>
            </div>

            {/* Average score row */}
            {group.averageScore !== null && (
              <div className={`flex items-center gap-2 mt-3 pt-3 border-t border-white/40 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <StarRow score={group.averageScore} max={5} size="sm" />
                <span className={`text-xs ${pctColor} font-semibold px-2 py-0.5 rounded-full`}>
                  {group.percentage}%
                </span>
              </div>
            )}
          </button>
        </CardBody>
      </CardComponent>
    </motion.div>
  );
}

// ── Course detail panel (slide-in) ────────────────────────────────────────────
function CourseDetailPanel({ group, isRTL, onClose }: { group: CourseGroup; isRTL: boolean; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: isRTL ? -40 : 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: isRTL ? -40 : 40 }}
      className="space-y-4"
    >
      {/* Back + title */}
      <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center text-[#003300] hover:bg-white/30 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className={`font-bold text-[#003300] text-xl leading-tight truncate ${isRTL ? 'text-right' : ''}`}>
            {group.courseName}
          </h2>
          {group.groupName && (
            <p className={`text-xs text-[#003300]/50 mt-0.5 ${isRTL ? 'text-right' : ''}`}>{group.groupName}</p>
          )}
        </div>
      </div>

      {/* Course average banner */}
      {group.percentage !== null && (
        <CardComponent variant="glass">
          <CardBody className="p-5">
            <div className={`flex items-center gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <PercentageGauge pct={group.percentage} size={96} stroke={9} label="Course Average" />
              <div className="flex-1">
                <p className={`text-sm text-[#003300]/60 mb-1 ${isRTL ? 'text-right' : ''}`}>Overall Score</p>
                <StarRow score={group.averageScore!} max={5} />
                <p className={`text-xs text-[#003300]/50 mt-2 ${isRTL ? 'text-right' : ''}`}>
                  Based on {group.scoredSessions} of {group.totalSessions} sessions
                </p>
              </div>
            </div>
          </CardBody>
        </CardComponent>
      )}

      {/* Session evaluations */}
      <div className="space-y-3">
        {group.evaluations.map(ev => (
          <SessionEvalCard key={ev._id} evaluation={ev} isRTL={isRTL} />
        ))}
      </div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function StudentEvaluations() {
  const { t, i18n } = useTranslation(['dashboardStudent', 'dashboardCommon']);
  const isRTL = i18n.language === 'ar';

  const [courseGroups, setCourseGroups] = useState<CourseGroup[]>([]);
  const [overallAverage, setOverallAverage] = useState<number | null>(null);
  const [overallPercentage, setOverallPercentage] = useState<number | null>(null);
  const [totalEvals, setTotalEvals] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<CourseGroup | null>(null);

  const fetchEvaluations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/student/sessions/evaluations');
      setCourseGroups(res.data.courseGroups || []);
      setOverallAverage(res.data.overallAverage ?? null);
      setOverallPercentage(res.data.overallPercentage ?? null);
      setTotalEvals(res.data.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load evaluations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchEvaluations(); }, []);

  const withNotes = courseGroups.reduce((s, g) => s + g.evaluations.filter(e => e.trainerNotes).length, 0);

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-6">

      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1
          className="text-2xl sm:text-3xl md:text-4xl font-bold"
          style={{ background: 'linear-gradient(135deg, #003300 0%, #004d00 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
        >
          {t('dashboardStudent:myEvaluations', 'My Evaluations')}
        </h1>
        <p className="mt-2 text-[#003300]/70">
          {t('dashboardStudent:myEvaluationsSubtitle', 'Your trainer feedback and scores from all sessions')}
        </p>
      </motion.div>

      {/* Error */}
      {error && (
        <motion.div variants={itemVariants}>
          <Alert variant="error">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={fetchEvaluations} className="flex items-center gap-1 text-sm underline">
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
            </div>
          </Alert>
        </motion.div>
      )}

      {isLoading && <LoadingState type="skeleton" text={t('dashboardStudent:loadingEvaluations', 'Loading evaluations...')} />}

      {!isLoading && !error && courseGroups.length > 0 && (
        <AnimatePresence mode="wait">
          {selectedCourse ? (
            <CourseDetailPanel
              key="detail"
              group={selectedCourse}
              isRTL={isRTL}
              onClose={() => setSelectedCourse(null)}
            />
          ) : (
            <motion.div key="list" initial="hidden" animate="visible" variants={containerVariants} className="space-y-6">

              {/* Overall average — only when 2+ courses */}
              {overallPercentage !== null && courseGroups.length >= 2 && (
                <motion.div variants={itemVariants}>
                  <CardComponent variant="glass">
                    <CardBody className="p-6">
                      <div className={`flex items-center gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="relative">
                          <PercentageGauge pct={overallPercentage} size={112} stroke={10} />
                          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <Award className="w-3.5 h-3.5 text-white" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className={`text-xs font-semibold text-[#003300]/50 uppercase tracking-wider mb-1 ${isRTL ? 'text-right' : ''}`}>
                            {t('dashboardStudent:overallAverage', 'Full Courses Average')}
                          </p>
                          <p className={`text-3xl font-bold text-[#003300] ${isRTL ? 'text-right' : ''}`}>
                            {overallAverage}<span className="text-lg font-normal text-[#003300]/40">/5</span>
                          </p>
                          <div className={`flex items-center gap-3 mt-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <span className="text-xs text-[#003300]/50">{courseGroups.length} courses</span>
                            <span className="text-xs text-[#003300]/30">·</span>
                            <span className="text-xs text-[#003300]/50">{totalEvals} sessions</span>
                            <span className="text-xs text-[#003300]/30">·</span>
                            <span className="text-xs text-[#003300]/50">{withNotes} with notes</span>
                          </div>
                        </div>
                      </div>
                    </CardBody>
                  </CardComponent>
                </motion.div>
              )}

              {/* Stats row — single course or fallback */}
              {(overallPercentage === null || courseGroups.length < 2) && (
                <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <CardComponent variant="glass"><CardBody className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-primary/10"><Star className="w-5 h-5 text-primary" /></div>
                      <div>
                        <p className="text-xs text-[#003300]/60">{t('dashboardStudent:totalEvaluations', 'Total Evaluations')}</p>
                        <p className="text-2xl font-bold text-[#003300]">{totalEvals}</p>
                      </div>
                    </div>
                  </CardBody></CardComponent>

                  {courseGroups[0]?.averageScore !== null && (
                    <CardComponent variant="glass"><CardBody className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-yellow-500/10"><TrendingUp className="w-5 h-5 text-yellow-600" /></div>
                        <div>
                          <p className="text-xs text-[#003300]/60">{t('dashboardStudent:averageScore', 'Average Score')}</p>
                          <p className="text-2xl font-bold text-[#003300]">{courseGroups[0]?.averageScore}<span className="text-sm font-normal text-[#003300]/50">/5</span></p>
                        </div>
                      </div>
                    </CardBody></CardComponent>
                  )}

                  <CardComponent variant="glass"><CardBody className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-blue-500/10"><MessageSquare className="w-5 h-5 text-blue-600" /></div>
                      <div>
                        <p className="text-xs text-[#003300]/60">{t('dashboardStudent:withNotes', 'With Trainer Notes')}</p>
                        <p className="text-2xl font-bold text-[#003300]">{withNotes}</p>
                      </div>
                    </div>
                  </CardBody></CardComponent>
                </motion.div>
              )}

              {/* Course cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {courseGroups.map((group, i) => (
                  <CourseCard
                    key={group.courseId || group.courseName}
                    group={group}
                    isRTL={isRTL}
                    onClick={() => setSelectedCourse(group)}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Empty */}
      {!isLoading && !error && courseGroups.length === 0 && (
        <motion.div variants={itemVariants}>
          <CardComponent variant="glass">
            <CardBody className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-primary/40" />
              </div>
              <h3 className="text-xl font-bold text-[#003300] mb-2">
                {t('dashboardStudent:noEvaluationsYet', 'No evaluations yet')}
              </h3>
              <p className="text-[#003300]/60 text-sm">
                {t('dashboardStudent:noEvaluationsDesc', 'Your trainer evaluations will appear here after each session.')}
              </p>
            </CardBody>
          </CardComponent>
        </motion.div>
      )}
    </motion.div>
  );
}
