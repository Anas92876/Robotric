import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Clock,
  CheckCircle,
  PlayCircle,
  ClipboardList,
  Calendar,
  DollarSign,
  Users,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  Lock,
  FileText,
  ChevronRight,
  ChevronLeft,
  Star,
  Timer,
} from "lucide-react";
import { useCourseDetails, type Session } from "../../hooks";
import { Button, Badge, LoadingState, Alert } from "../../components/ui";
import { PDFViewer } from "../../components/ui/PDFViewer";
import { useTranslation } from "react-i18next";
import { formatDate } from "../../utils/dateTime";

const TEXT_PRIMARY = "#003300";
const TEXT_SECONDARY = "#003300CC";
const TEXT_TERTIARY = "#00330080";

// ─── Animation presets ────────────────────────────────────────────────────────
const fade = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

// ─── Thin progress bar ─────────────────────────────────────────────────────────
function ProgressBar({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div className={`w-full h-2 rounded-full bg-[#003300]/10 overflow-hidden ${className}`}>
      <motion.div
        className="h-full rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        style={{ background: "#003300" }}
      />
    </div>
  );
}

// ─── Countdown helper ─────────────────────────────────────────────────────────
function useCountdown(targetDate: string | undefined) {
  const [diff, setDiff] = useState<number>(0);

  useEffect(() => {
    if (!targetDate) return;
    const target = new Date(targetDate).getTime();
    const update = () => setDiff(Math.max(0, target - Date.now()));
    update();
    const id = setInterval(update, 60_000); // update every minute
    return () => clearInterval(id);
  }, [targetDate]);

  const totalMinutes = Math.floor(diff / 60_000);
  const days    = Math.floor(totalMinutes / 1440);
  const hours   = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  return { days, hours, minutes, isInFuture: diff > 0 };
}

// ─── Session row ──────────────────────────────────────────────────────────────
function SessionRow({
  session,
  index,
  isCompleted,
  isCurrent,
  isFutureLocked,
  isRTL,
}: {
  session: Session;
  index: number;
  isCompleted: boolean;
  isCurrent: boolean;
  isFutureLocked: boolean;
  isRTL: boolean;
}) {
  const { t, i18n } = useTranslation(["dashboardStudent", "dashboardCommon"]);
  const locked = session.isLocked || isFutureLocked;
  const { days, hours, minutes } = useCountdown(isFutureLocked ? session.scheduledDate : undefined);

  const num = session.sessionNumber || index + 1;

  const dateStr = session.scheduledDate
    ? formatDate(session.scheduledDate, { day: "numeric", month: "short" })
    : null;

  const circleStyle = isCompleted
    ? "bg-green-100 text-green-600"
    : isCurrent
    ? "bg-[#003300] text-[#cccc99]"
    : isFutureLocked
    ? "bg-amber-50 text-amber-400"
    : locked
    ? "bg-[#003300]/8 text-[#003300]/30"
    : "bg-[#003300]/10 text-[#003300]";

  const rowStyle = isCurrent
    ? "border-[#003300]/30 bg-[#003300]/4 ring-1 ring-[#003300]/20"
    : isCompleted
    ? "border-green-100 bg-green-50/50"
    : isFutureLocked
    ? "border-amber-100 bg-amber-50/40"
    : locked
    ? "border-[#003300]/6 bg-white/40 opacity-60"
    : "border-[#003300]/8 bg-white hover:border-[#003300]/20 hover:bg-[#003300]/2";

  // Compact countdown: "3d 2h" or "45m"
  const countdownStr = isFutureLocked
    ? days > 0
      ? `${days}d ${hours}h`
      : hours > 0
      ? `${hours}h ${minutes}m`
      : `${minutes}m`
    : null;

  const inner = (
    <div
      className={`flex items-center gap-3 p-3 sm:p-4 rounded-2xl border transition-all duration-200 ${rowStyle} ${
        !locked ? "active:scale-[0.985]" : ""
      }`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Number / status circle */}
      <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${circleStyle}`}>
        {isCompleted ? (
          <CheckCircle className="w-5 h-5" />
        ) : isFutureLocked ? (
          <Lock className="w-4 h-4" />
        ) : locked ? (
          <Lock className="w-4 h-4" />
        ) : (
          num
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-sm font-semibold leading-tight truncate"
            style={{ color: locked ? TEXT_TERTIARY : TEXT_PRIMARY }}
          >
            {session.title}
          </span>
          {isCurrent && (
            <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#003300] text-[#cccc99]">
              {t("dashboardStudent:current")}
            </span>
          )}
          {isFutureLocked && (
            <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
              {isRTL ? "قادم" : "Upcoming"}
            </span>
          )}
          {session.quiz && !locked && (
            <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
              Quiz
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {dateStr && (
            <div className="flex items-center gap-1 text-xs" style={{ color: TEXT_TERTIARY }}>
              <Calendar className="w-3 h-3" />
              <span>{dateStr}</span>
              {session.startTime && <span>· {session.startTime}</span>}
            </div>
          )}
          {countdownStr && (
            <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600">
              <Timer className="w-3 h-3" />
              <span>{isRTL ? `بعد ${countdownStr}` : `in ${countdownStr}`}</span>
            </div>
          )}
        </div>
      </div>

      {/* Right chevron or lock icon */}
      <div className="shrink-0">
        {isFutureLocked ? (
          <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center">
            <Lock className="w-3.5 h-3.5 text-amber-500" />
          </div>
        ) : !locked ? (
          <div className="text-[#003300]/30">
            {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        ) : null}
      </div>
    </div>
  );

  if (locked) {
    return <div>{inner}</div>;
  }

  return (
    <Link to={`/student/sessions/${session._id}`} className="block group focus:outline-none">
      {inner}
    </Link>
  );
}

// ─── Page skeleton ─────────────────────────────────────────────────────────────
function PageSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-4 w-32 bg-[#003300]/10 rounded" />
      <div className="rounded-2xl bg-white p-4 sm:p-5 space-y-3 border border-[#003300]/8">
        <div className="h-6 w-3/4 bg-[#003300]/10 rounded" />
        <div className="h-4 w-full bg-[#003300]/8 rounded" />
        <div className="h-2 w-full bg-[#003300]/8 rounded-full" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-2xl bg-white p-4 border border-[#003300]/8 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#003300]/10 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 bg-[#003300]/10 rounded w-3/4" />
              <div className="h-3 bg-[#003300]/6 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function StudentCourseDetails() {
  const { courseId } = useParams<{ courseId: string }>();
  const { course, sessions, progress, isLoading, error, refetch } = useCourseDetails(courseId!);
  const { t, i18n } = useTranslation(["dashboardCommon", "dashboardStudent"]);
  const isRTL = i18n.language === "ar";

  // PDF viewer
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState<string | null>(null);
  const [selectedPdfTitle, setSelectedPdfTitle] = useState<string>("");

  const now = new Date();

  // Future-locked: session date is strictly in the future (hasn't started yet)
  const isSessionFutureLocked = useCallback(
    (session: Session) => {
      if (!session.scheduledDate) return false;
      return new Date(session.scheduledDate) > now;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // A session is completed if its scheduled date is in the past
  const isSessionCompleted = useCallback(
    (session: Session) => {
      if (session.scheduledDate) {
        return new Date(session.scheduledDate) < now;
      }
      // Fallback to completedModules if no date
      return progress?.completedModules?.includes(session._id) || false;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [progress?.completedModules]
  );

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => (a.sessionNumber || 0) - (b.sessionNumber || 0)),
    [sessions]
  );

  const completedCount = useMemo(
    () => sortedSessions.filter(isSessionCompleted).length,
    [sortedSessions, isSessionCompleted]
  );

  const progressPct = sessions.length > 0
    ? Math.round((completedCount / sessions.length) * 100)
    : 0;

  // Next actionable session: first past (available) unlocked session
  const nextSession = useMemo(() => {
    return sortedSessions.find(
      (s) => !s.isLocked && !isSessionCompleted(s) && !isSessionFutureLocked(s)
    ) || null;
  }, [sortedSessions, isSessionCompleted, isSessionFutureLocked]);

  if (isLoading) return <PageSkeleton />;

  if (error || !course) {
    return (
      <Alert variant="error">
        <div className={`flex items-start gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{t("dashboardCommon:loadingError")}</p>
            <p className="text-sm opacity-80">{error || "Course not found"}</p>
          </div>
          <Button variant="ghost" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={refetch}>
            {t("dashboardCommon:retry")}
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4" dir={isRTL ? "rtl" : "ltr"}>

      {/* ── Back + breadcrumb (single line) ── */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          to="/student/courses"
          className="flex items-center gap-1.5 font-medium text-[#003300]/60 hover:text-[#003300] transition-colors"
        >
          {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {t("dashboardStudent:myCourses")}
        </Link>
        <span className="text-[#003300]/30">/</span>
        <span className="text-[#003300] font-semibold truncate">{course.title}</span>
      </div>

      {/* ── Course header card ── */}
      <div className="rounded-2xl bg-white border border-[#003300]/8 shadow-sm overflow-hidden">
        {/* Thumbnail strip (if present) */}
        {course.thumbnail && (
          <div className="relative h-28 sm:h-40 w-full overflow-hidden">
            <img
              src={course.thumbnail}
              alt={course.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50" />
          </div>
        )}

        <div className="p-4 sm:p-5">
          {/* Title + level */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold leading-tight" style={{ color: TEXT_PRIMARY }}>
                {course.title}
              </h1>
              {course.description && (
                <p className="mt-1 text-sm line-clamp-2" dir="auto" style={{ color: TEXT_SECONDARY }}>
                  {course.description}
                </p>
              )}
            </div>
            {course.level && (
              <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-[#003300]/8 text-[#003300]">
                {course.level}
              </span>
            )}
          </div>

          {/* Progress bar + fraction */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: TEXT_SECONDARY }}>
              <span>{t("dashboardStudent:courseProgress")}</span>
              <span className="font-bold" style={{ color: TEXT_PRIMARY }}>
                {completedCount} / {sessions.length} · {progressPct}%
              </span>
            </div>
            <ProgressBar value={progressPct} />
          </div>

          {/* Meta chips row */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs" style={{ color: TEXT_SECONDARY }}>
            {course.instructor && (
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {course.instructor.name}
              </span>
            )}
            {course.duration && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {course.duration}
              </span>
            )}
            <span className="flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              {sessions.length} {t("dashboardStudent:sessions")}
            </span>
            {course.startDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(course.startDate)}
              </span>
            )}
          </div>
        </div>

        {/* ── Continue Learning CTA — full-width bottom strip ── */}
        {nextSession && (
          <Link
            to={`/student/sessions/${nextSession._id}`}
            className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-t border-[#003300]/8 hover:bg-[#003300]/3 transition-colors active:bg-[#003300]/6 group"
            style={{ borderTopColor: "rgba(0,51,0,0.08)" }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "#003300" }}
              >
                <PlayCircle className="w-4 h-4 text-[#cccc99]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold" style={{ color: TEXT_PRIMARY }}>
                  {t("dashboardStudent:continueLearning")}
                </p>
                <p className="text-xs truncate" style={{ color: TEXT_SECONDARY }}>
                  {nextSession.title}
                </p>
              </div>
            </div>
            <div className="shrink-0 group-hover:translate-x-0.5 transition-transform" style={{ color: TEXT_TERTIARY }}>
              {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </div>
          </Link>
        )}
      </div>

      {/* ── Quick links strip ── */}
      <div className="flex gap-2">
        <Link
          to={`/student/payments/${courseId}`}
          className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white border border-[#003300]/8 text-sm font-semibold hover:border-[#003300]/20 transition-colors active:scale-[0.98]"
          style={{ color: TEXT_PRIMARY }}
        >
          <DollarSign className="w-4 h-4 shrink-0" style={{ color: TEXT_TERTIARY }} />
          {t("dashboardStudent:paymentHistory")}
        </Link>
        {course?.boardEnabled && course?.groupId && (
          <Link
            to={`/student/groups/${course.groupId}/board`}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white border border-[#003300]/8 text-sm font-semibold hover:border-[#003300]/20 transition-colors active:scale-[0.98]"
            style={{ color: TEXT_PRIMARY }}
          >
            <ClipboardList className="w-4 h-4 shrink-0" style={{ color: TEXT_TERTIARY }} />
            {t("dashboardStudent:groupBoard")}
          </Link>
        )}
      </div>

      {/* ── Sessions list ── */}
      <div>
        <h2
          className="text-base font-bold mb-3"
          style={{ color: TEXT_PRIMARY }}
        >
          {t("dashboardStudent:courseSessions")}
          <span className="ms-2 text-sm font-normal" style={{ color: TEXT_TERTIARY }}>
            ({sessions.length})
          </span>
        </h2>

        {sortedSessions.length > 0 ? (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-2"
          >
            {sortedSessions.map((session, index) => (
              <motion.div key={session._id} variants={fade}>
                <SessionRow
                  session={session}
                  index={index}
                  isCompleted={isSessionCompleted(session)}
                  isCurrent={nextSession?._id === session._id}
                  isFutureLocked={isSessionFutureLocked(session)}
                  isRTL={isRTL}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="rounded-2xl bg-white border border-[#003300]/8 text-center py-14 px-6">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: TEXT_PRIMARY }} />
            <p className="font-semibold text-sm" style={{ color: TEXT_PRIMARY }}>
              {t("dashboardStudent:noSessionsAvailableYet")}
            </p>
            <p className="text-xs mt-1" style={{ color: TEXT_SECONDARY }}>
              {t("dashboardStudent:sessionsWillAppear")}
            </p>
          </div>
        )}
      </div>

      {/* PDF Viewer */}
      <PDFViewer
        resourceId={selectedResourceId}
        initialUrl={selectedPdfUrl}
        title={selectedPdfTitle}
        isOpen={pdfViewerOpen}
        onClose={() => {
          setPdfViewerOpen(false);
          setSelectedResourceId(null);
          setSelectedPdfUrl(null);
        }}
      />
    </div>
  );
}
