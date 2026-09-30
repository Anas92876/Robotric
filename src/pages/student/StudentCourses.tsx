import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Clock,
  Search,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  Users,
  DollarSign,
  CheckCircle2,
  Lock,
  Award,
  Star,
  Download,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useStudentCourses, type EnrolledCourse } from "../../hooks";
import { Button, Alert } from "../../components/ui";
import { useTranslation } from "react-i18next";

// ─── Animation ────────────────────────────────────────────────────────────────

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// ─── Mini progress bar ─────────────────────────────────────────────────────────

function ProgressBar({ value, color = "#0f1f33" }: { value: number; color?: string }) {
  return (
    <div className="w-full h-1.5 rounded-full bg-black/10 overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ background: color }}
      />
    </div>
  );
}

// ─── Bundle Course Card ────────────────────────────────────────────────────────

function BundleCourseCard({ enrollment, isRTL }: { enrollment: EnrolledCourse; isRTL: boolean }) {
  const { t } = useTranslation(["dashboardStudent", "dashboardCommon"]);
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const subCourses = enrollment.bundleSubCourses || [];
  const bundlePrice = enrollment.payment?.totalAmount ?? enrollment.course.bundlePrice ?? 0;
  const remaining = enrollment.payment?.remainingAmount ?? 0;

  // Compute overall bundle progress as average across sub-courses
  const avgProgress = subCourses.length > 0
    ? Math.round(subCourses.reduce((s, sc) => s + (sc.progress?.percentageComplete || 0), 0) / subCourses.length)
    : 0;

  return (
    <motion.div variants={item}>
      <div
        className="relative bg-white rounded-2xl overflow-hidden shadow-sm border border-violet-200"
        dir={isRTL ? "rtl" : "ltr"}
      >
        {/* Violet header bar */}
        <div className="h-1.5 w-full bg-violet-400" />

        {/* Main card body */}
        <div className="p-4">
          {/* Top row: icon + title + badge */}
          <div className="flex items-start gap-3 mb-3">
            <div className="w-11 h-11 rounded-xl bg-violet-500 flex items-center justify-center flex-shrink-0 shadow-md">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
                  {isRTL ? 'باقة دورات' : 'Bundle'}
                </span>
                <span className="text-[10px] text-ink/50">
                  {subCourses.length || enrollment.course.bundleCourses?.length || 0} {isRTL ? 'دورات' : 'courses'}
                </span>
              </div>
              <h3 className="text-sm font-bold text-ink leading-snug line-clamp-2">
                {enrollment.course.title}
              </h3>
            </div>
          </div>

          {/* Progress bar (avg of sub-courses) */}
          {subCourses.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-ink/50">{isRTL ? 'التقدم الإجمالي' : 'Overall Progress'}</span>
                <span className="text-[10px] font-bold text-violet-700">{avgProgress}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-violet-100 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-violet-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${avgProgress}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
            </div>
          )}

          {/* Price + payment status */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-violet-500" />
              <span className="text-sm font-bold text-violet-700">${bundlePrice}</span>
              {remaining > 0 && (
                <span className="text-[10px] text-amber-600 font-semibold">
                  (${remaining} {isRTL ? 'متبقي' : 'remaining'})
                </span>
              )}
              {remaining <= 0 && bundlePrice > 0 && (
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                  <CheckCircle2 className="w-3 h-3" />
                  {isRTL ? 'مدفوع' : 'Paid'}
                </span>
              )}
            </div>
            {enrollment.course.category && (
              <span className="text-[10px] bg-ink/6 text-ink/60 font-medium px-2 py-0.5 rounded-md">
                {enrollment.course.category}
              </span>
            )}
          </div>

          {/* Expand / collapse button */}
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-violet-50 hover:bg-violet-100 border border-violet-200 transition-colors"
          >
            <span className="text-xs font-semibold text-violet-700">
              {expanded
                ? (isRTL ? 'إخفاء الدورات' : 'Hide courses')
                : (isRTL ? 'عرض الدورات' : 'View courses')
              }
            </span>
            {expanded
              ? <ChevronUp className="w-3.5 h-3.5 text-violet-500" />
              : <ChevronDown className="w-3.5 h-3.5 text-violet-500" />
            }
          </button>
        </div>

        {/* ── Expandable sub-courses list ── */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <div className="border-t border-violet-100">
                {subCourses.length === 0 ? (
                  // Fallback: use course.bundleCourses from the course object if bundleSubCourses not computed yet
                  (enrollment.course.bundleCourses || []).map((sc) => (
                    <button
                      key={sc._id}
                      onClick={() => navigate(`/student/courses/${sc._id}`)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-violet-50/60 transition-colors border-b border-violet-50 last:border-b-0 text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-3.5 h-3.5 text-violet-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">{sc.title}</p>
                        {sc.level && <p className="text-[10px] text-ink/45 capitalize">{sc.level}</p>}
                      </div>
                      {isRTL
                        ? <ChevronLeft className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                        : <ChevronRight className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                      }
                    </button>
                  ))
                ) : (
                  subCourses.map((sc) => (
                    <button
                      key={sc._id}
                      onClick={() => navigate(`/student/courses/${sc.course._id}`)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-violet-50/60 transition-colors border-b border-violet-50 last:border-b-0 text-left"
                    >
                      {/* Sub-course thumbnail or icon */}
                      {sc.course.thumbnail ? (
                        <img src={sc.course.thumbnail} alt={sc.course.title} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-4 h-4 text-violet-600" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-ink truncate">{sc.course.title}</p>
                        {/* Mini progress + attendance row */}
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex items-center gap-1">
                            <div className="w-16 h-1 rounded-full bg-violet-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-violet-500"
                                style={{ width: `${sc.progress?.percentageComplete || 0}%` }}
                              />
                            </div>
                            <span className="text-[9px] text-violet-600 font-bold">{sc.progress?.percentageComplete || 0}%</span>
                          </div>
                          <span className="text-[9px] text-ink/40">
                            {isRTL ? 'حضور:' : 'Att:'} {sc.attendance?.percentage || 0}%
                          </span>
                        </div>
                      </div>

                      {isRTL
                        ? <ChevronLeft className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                        : <ChevronRight className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                      }
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Locked Course Card ────────────────────────────────────────────────────────

function LockedCourseCard({ enrollment, isRTL }: { enrollment: EnrolledCourse; isRTL: boolean }) {
  const { t } = useTranslation(["dashboardStudent", "dashboardCommon"]);
  const courseId = enrollment.course._id;
  const hasCert = enrollment.hasCertificate;

  return (
    <motion.div variants={item}>
      <div
        className="relative bg-white rounded-2xl overflow-hidden shadow-sm border border-ink/8"
        dir={isRTL ? "rtl" : "ltr"}
      >
        {/* Thumbnail with dark overlay */}
        <div className="relative aspect-video w-full overflow-hidden hidden sm:block">
          {enrollment.course.thumbnail ? (
            <img
              src={enrollment.course.thumbnail}
              alt={enrollment.course.title}
              className="w-full h-full object-cover grayscale opacity-40"
              loading="lazy"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center opacity-30"
              style={{ background: "#0f1f33" }}
            >
              <BookOpen className="w-14 h-14 text-glow/70" />
            </div>
          )}
          {/* Lock overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"
            style={{ background: "rgba(0,0,0,0.45)" }}>
            <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center border border-white/20">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <span className="text-white text-xs font-bold px-3 py-1 rounded-full"
              style={{ background: "rgba(15, 31, 51,0.6)", border: "1px solid rgba(63, 211, 96,0.3)" }}>
              {t("dashboardStudent:courseClosed", "Course Closed")}
            </span>
          </div>
        </div>

        {/* Mobile thumbnail strip */}
        <div className="flex sm:hidden">
          <div className="relative w-28 shrink-0 self-stretch overflow-hidden">
            {enrollment.course.thumbnail ? (
              <img
                src={enrollment.course.thumbnail}
                alt={enrollment.course.title}
                className="absolute inset-0 w-full h-full object-cover grayscale opacity-30"
                loading="lazy"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center opacity-30"
                style={{ background: "#0f1f33" }}>
                <BookOpen className="w-8 h-8 text-glow/70" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.4)" }}>
              <Lock className="w-6 h-6 text-white" />
            </div>
          </div>

          {/* Mobile content */}
          <div className="flex-1 min-w-0 p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                {t("dashboardStudent:courseClosed", "Course Closed")}
              </span>
            </div>
            <h3 className="text-sm font-bold text-ink/70 leading-tight line-clamp-2">
              {enrollment.course.title}
            </h3>
            {/* Action buttons */}
            <div className="flex gap-2 mt-auto">
              {hasCert ? (
                <Link
                  to={`/student/courses/${courseId}`}
                  className="flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-lg text-white"
                  style={{ background: "#0f1f33" }}
                >
                  <Award className="w-3 h-3" />
                  {t("dashboardStudent:viewCertificate", "Certificate")}
                </Link>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-semibold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                  <Clock className="w-3 h-3" />
                  {t("dashboardStudent:certificatePending", "In Progress")}
                </span>
              )}
              <Link
                to={`/student/evaluations`}
                className="flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200"
              >
                <Star className="w-3 h-3" />
                {t("dashboardStudent:evaluations", "Evaluations")}
              </Link>
            </div>
          </div>
        </div>

        {/* Desktop body */}
        <div className="hidden sm:flex sm:flex-col p-4 gap-3">
          {/* Level + duration */}
          <div className="flex items-center justify-between text-xs text-ink/40">
            {enrollment.course.level && <span>{enrollment.course.level}</span>}
            {enrollment.course.duration && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {enrollment.course.duration}
              </span>
            )}
          </div>

          <h3 className="text-base font-bold text-ink/60 leading-snug line-clamp-2">
            {enrollment.course.title}
          </h3>

          {/* Status message */}
          {hasCert ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
              <Award className="w-4 h-4 text-green-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-green-700">{t("dashboardStudent:certificateReady", "Certificate Ready")}</p>
                {enrollment.certificate?.issuedAt && (
                  <p className="text-[10px] text-green-600">
                    {new Date(enrollment.certificate.issuedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-700">{t("dashboardStudent:certificatePending", "Certificate In Progress")}</p>
                <p className="text-[10px] text-amber-600">{t("dashboardStudent:certificatePendingDesc", "Your certificate is being prepared")}</p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div
            className="mt-auto flex items-center gap-2 pt-3"
            style={{ borderTop: "1px solid rgba(15, 31, 51,0.08)" }}
          >
            {hasCert && (
              <Link
                to={`/student/courses/${courseId}`}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                style={{ background: "#0f1f33" }}
              >
                <Download className="w-4 h-4" />
                {t("dashboardStudent:viewCertificate", "View Certificate")}
              </Link>
            )}
            <Link
              to="/student/evaluations"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold text-blue-700 bg-blue-50 border border-blue-200 transition-all hover:bg-blue-100"
            >
              <Star className="w-4 h-4" />
              {t("dashboardStudent:evaluations", "Evaluations")}
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Course Card ───────────────────────────────────────────────────────────────

function CourseCard({ enrollment, isRTL }: { enrollment: EnrolledCourse; isRTL: boolean }) {
  const { t } = useTranslation(["dashboardStudent", "dashboardCommon"]);
  const courseId = enrollment.course._id;
  const progress = Math.round(enrollment.progress?.percentageComplete || 0);
  const attendance = Math.round(enrollment.attendance?.percentage || 0);
  const remaining = enrollment.payment?.remainingAmount || 0;
  const isCompleted = enrollment.status === "completed";
  const isDropped = enrollment.status === "dropped";
  const isGroupClosed = enrollment.groupStatus === "completed" || enrollment.groupStatus === "archived" || enrollment.groupStatus === "cancelled";

  // Render locked card for closed groups
  if (isGroupClosed) {
    return <LockedCourseCard enrollment={enrollment} isRTL={isRTL} />;
  }

  const statusColor = isCompleted
    ? { bg: "#dcfce7", text: "#15803d" }
    : isDropped
    ? { bg: "#fee2e2", text: "#dc2626" }
    : { bg: "#0f1f33", text: "#3fd360" };

  return (
    <motion.div variants={item}>
      <Link
        to={`/student/courses/${courseId}`}
        className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-ink rounded-2xl"
        dir={isRTL ? "rtl" : "ltr"}
      >
        {/* ── Card shell ── */}
        <div className="relative bg-white rounded-2xl overflow-hidden shadow-sm border border-ink/8 transition-all duration-250 group-hover:shadow-md group-hover:-translate-y-0.5 group-active:scale-[0.985] group-active:shadow-sm">

          {/* ══ MOBILE: horizontal layout (image left, content right) ══ */}
          <div className="flex sm:hidden">
            {/* Thumbnail — fixed square, compact */}
            <div className="relative w-28 shrink-0 self-stretch overflow-hidden">
              {enrollment.course.thumbnail ? (
                <img
                  src={enrollment.course.thumbnail}
                  alt={enrollment.course.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ background: "#0f1f33" }}
                >
                  <BookOpen className="w-8 h-8 text-glow/70" />
                </div>
              )}
              {/* Progress strip at bottom of thumbnail */}
              <div className="absolute bottom-0 inset-x-0 h-1 bg-black/20">
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${progress}%`,
                    background: isCompleted ? "#22c55e" : "#3fd360",
                  }}
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 p-3 flex flex-col gap-1.5">
              {/* Status pill */}
              <div className="flex items-center justify-between gap-2">
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: statusColor.bg, color: statusColor.text }}
                >
                  {t(`dashboardStudent:${enrollment.status}`, enrollment.status)}
                </span>
                {enrollment.course.level && (
                  <span className="text-[10px] text-ink/50 font-medium">
                    {enrollment.course.level}
                  </span>
                )}
              </div>

              {/* Title */}
              <h3 className="text-sm font-bold text-ink leading-tight line-clamp-2">
                {enrollment.course.title}
              </h3>

              {/* Progress bar + % */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-ink/50">{t("dashboardStudent:progress")}</span>
                  <span className="text-[10px] font-bold text-ink">{progress}%</span>
                </div>
                <ProgressBar
                  value={progress}
                  color={isCompleted ? "#22c55e" : "#0f1f33"}
                />
              </div>

              {/* Bottom row: payment warning or continue arrow */}
              <div className="flex items-center justify-between mt-auto pt-1">
                {remaining > 0 ? (
                  <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-600">
                    <DollarSign className="w-2.5 h-2.5" />
                    {remaining.toLocaleString()} {t("dashboardCommon:remaining", "remaining")}
                  </span>
                ) : isCompleted ? (
                  <span className="flex items-center gap-0.5 text-[10px] font-semibold text-green-600">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    {t("dashboardStudent:completed")}
                  </span>
                ) : (
                  <span className="text-[10px] text-ink/40">
                    {t("dashboardStudent:attendance")}: {attendance}%
                  </span>
                )}
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"
                  style={{ background: "#0f1f33" }}>
                  {isRTL
                    ? <ChevronLeft className="w-3.5 h-3.5 text-glow" />
                    : <ChevronRight className="w-3.5 h-3.5 text-glow" />}
                </div>
              </div>
            </div>
          </div>

          {/* ══ TABLET+: vertical card layout ══ */}
          <div className="hidden sm:flex sm:flex-col">
            {/* Thumbnail */}
            <div className="relative aspect-video w-full overflow-hidden">
              {enrollment.course.thumbnail ? (
                <img
                  src={enrollment.course.thumbnail}
                  alt={enrollment.course.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ background: "#0f1f33" }}
                >
                  <BookOpen className="w-14 h-14 text-glow/70" />
                </div>
              )}

              {/* Status badge */}
              <span
                className="absolute top-3 end-3 text-[11px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: statusColor.bg, color: statusColor.text }}
              >
                {t(`dashboardStudent:${enrollment.status}`, enrollment.status)}
              </span>

              {/* Progress bar at bottom of image */}
              <div className="absolute bottom-0 inset-x-0 h-1.5 bg-black/25">
                <motion.div
                  className="h-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  style={{
                    background: isCompleted ? "#22c55e" : "#3fd360",
                  }}
                />
              </div>
            </div>

            {/* Body */}
            <div className="p-4 flex flex-col gap-3 flex-1">
              {/* Level + duration */}
              <div className="flex items-center justify-between text-xs text-ink/50">
                {enrollment.course.level && <span>{enrollment.course.level}</span>}
                {enrollment.course.duration && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {enrollment.course.duration}
                  </span>
                )}
              </div>

              {/* Title */}
              <h3 className="text-base font-bold text-ink leading-snug line-clamp-2">
                {enrollment.course.title}
              </h3>

              {/* Stats: progress + attendance */}
              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1 text-[11px] text-ink/60">
                      <TrendingUp className="w-3 h-3" />
                      {t("dashboardStudent:progress")}
                    </span>
                    <span className="text-[11px] font-bold text-ink">{progress}%</span>
                  </div>
                  <ProgressBar
                    value={progress}
                    color={isCompleted ? "#22c55e" : "#0f1f33"}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1 text-[11px] text-ink/60">
                      <Users className="w-3 h-3" />
                      {t("dashboardStudent:attendance")}
                    </span>
                    <span className="text-[11px] font-bold text-ink">{attendance}%</span>
                  </div>
                  <ProgressBar
                    value={attendance}
                    color={attendance < 50 ? "#ef4444" : attendance < 75 ? "#f59e0b" : "#0f1f33"}
                  />
                </div>
              </div>

              {/* Payment warning */}
              {remaining > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                  <DollarSign className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="text-xs font-semibold text-amber-700">
                    {remaining.toLocaleString()} {t("dashboardCommon:remaining", "remaining")}
                  </span>
                </div>
              )}

              {/* CTA */}
              <div
                className="mt-auto flex items-center justify-between pt-3"
                style={{ borderTop: "1px solid rgba(15, 31, 51,0.08)" }}
              >
                <span className="text-sm font-bold text-ink">
                  {isCompleted
                    ? t("dashboardStudent:viewCertificate")
                    : t("dashboardStudent:continueLearning")}
                </span>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200"
                  style={{ background: "#0f1f33" }}
                >
                  {isRTL
                    ? <ChevronLeft className="w-4 h-4 text-glow" />
                    : <ChevronRight className="w-4 h-4 text-glow" />}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ─── Loading skeleton grid ─────────────────────────────────────────────────────

function CourseSkeleton({ isRTL }: { isRTL: boolean }) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-lg bg-ink/10 animate-pulse" />
        <div className="h-4 w-72 rounded-lg bg-ink/6 animate-pulse" />
      </div>
      {/* filter skeleton */}
      <div className="space-y-2">
        <div className="h-10 w-full rounded-xl bg-white/70 animate-pulse" />
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-1 h-9 rounded-xl bg-white/70 animate-pulse" />
          ))}
        </div>
      </div>
      {/* card skeletons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl overflow-hidden bg-white shadow-sm border border-ink/8 animate-pulse">
            {/* mobile */}
            <div className="flex sm:hidden h-24">
              <div className="w-28 bg-ink/10 shrink-0" />
              <div className="flex-1 p-3 space-y-2">
                <div className="h-3 w-16 bg-ink/10 rounded" />
                <div className="h-4 w-full bg-ink/10 rounded" />
                <div className="h-3 w-3/4 bg-ink/10 rounded" />
                <div className="h-1.5 w-full bg-ink/8 rounded-full" />
              </div>
            </div>
            {/* tablet+ */}
            <div className="hidden sm:block">
              <div className="aspect-video bg-ink/10" />
              <div className="p-4 space-y-3">
                <div className="h-3 w-24 bg-ink/8 rounded" />
                <div className="h-5 w-full bg-ink/10 rounded" />
                <div className="space-y-1.5">
                  <div className="h-1.5 w-full bg-ink/8 rounded-full" />
                  <div className="h-1.5 w-full bg-ink/8 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

const FILTERS = ["all", "active", "completed"] as const;
type Filter = typeof FILTERS[number];

export default function StudentCourses() {
  const { courses, isLoading, error, refetch } = useStudentCourses();
  const { t, i18n } = useTranslation(["dashboardCommon", "dashboardStudent"]);
  const isRTL = i18n.language === "ar";

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Filter>("all");

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(id);
  }, [searchQuery]);

  const filtered = useMemo(
    () =>
      (courses || []).filter((e) => {
        // Belt-and-suspenders: never show sub-bundle enrollments in the flat list
        if (e?.enrollmentSource === 'bundle') return false;
        const matchSearch = e?.course?.title
          ?.toLowerCase()
          .includes(debouncedSearch.toLowerCase()) ?? false;
        const matchStatus = statusFilter === "all" || e?.status === statusFilter;
        return matchSearch && matchStatus;
      }),
    [courses, debouncedSearch, statusFilter]
  );

  if (isLoading) return <CourseSkeleton isRTL={isRTL} />;

  if (error) {
    return (
      <Alert variant="error">
        <div className={`flex items-start gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold mb-0.5">{t("dashboardCommon:loadingError")}</p>
            <p className="text-sm opacity-80">{error}</p>
          </div>
          <Button variant="ghost" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={refetch}>
            {t("dashboardCommon:retry")}
          </Button>
        </div>
      </Alert>
    );
  }

  const filterLabel: Record<Filter, string> = {
    all: t("dashboardCommon:all"),
    active: t("dashboardStudent:active"),
    completed: t("dashboardStudent:completed"),
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={container}
      className="space-y-4 sm:space-y-5"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* ── Header ── */}
      <motion.div variants={item}>
        <h1
          className="text-2xl sm:text-3xl font-bold"
          style={{
            color: '#0f1f33',
            backgroundClip: "text",
          }}
        >
          {t("dashboardStudent:myCourses")}
        </h1>
        <p className="mt-1 text-sm text-ink/60">
          {t("dashboardStudent:enrolledCoursesSubtitle")}
        </p>
      </motion.div>

      {/* ── Search + filters ── */}
      <motion.div variants={item} className="space-y-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40 pointer-events-none" />
          <input
            type="search"
            placeholder={t("dashboardCommon:search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full ps-9 pe-4 py-2.5 rounded-xl bg-white border border-ink/15 text-ink placeholder-ink/40 text-sm focus:outline-none focus:ring-2 focus:ring-ink/30 transition"
          />
        </div>

        {/* Filter pills */}
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
              style={
                statusFilter === f
                  ? {
                      background: "#0f1f33",
                      color: "#3fd360",
                      boxShadow: "0 2px 8px rgba(15, 31, 51,0.25)",
                    }
                  : {
                      background: "rgba(255,255,255,0.7)",
                      color: "#0f1f33",
                      border: "1px solid rgba(15, 31, 51,0.12)",
                    }
              }
            >
              {filterLabel[f]}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Course grid ── */}
      {filtered.length > 0 ? (
        <motion.div
          variants={container}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
        >
          {filtered.map((enrollment) =>
            enrollment.course.type === 'bundle' ? (
              <BundleCourseCard key={enrollment._id} enrollment={enrollment} isRTL={isRTL} />
            ) : (
              <CourseCard key={enrollment._id} enrollment={enrollment} isRTL={isRTL} />
            )
          )}
        </motion.div>
      ) : (
        <motion.div variants={item}>
          <div className="rounded-2xl bg-white/70 border border-ink/8 text-center py-14 px-6">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(15, 31, 51,0.07)" }}
            >
              <BookOpen className="w-8 h-8 text-ink/30" />
            </div>
            <h3 className="text-lg font-bold text-ink mb-2">
              {t("dashboardCommon:noResults")}
            </h3>
            <p className="text-sm text-ink/60 mb-6">
              {searchQuery || statusFilter !== "all"
                ? t("dashboardStudent:tryAdjustingFilters")
                : t("dashboardStudent:noCoursesEnrolled")}
            </p>
            {!searchQuery && statusFilter === "all" && (
              <Link
                to="/courses"
                className="inline-block px-6 py-2.5 rounded-xl text-sm font-bold text-glow"
                style={{ background: "#0f1f33" }}
              >
                {t("dashboardStudent:browseCourses")}
              </Link>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
