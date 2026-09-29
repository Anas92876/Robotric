/**
 * StudentSessionDetails Page
 * Mobile-first, clean layout. Navigated to directly from course detail sessions list.
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  BookOpen,
  FileText,
  AlertCircle,
  RefreshCw,
  Star,
  MessageSquare,
  Eye,
  CheckCircle2,
  XCircle,
  AlarmClock,
  ShieldCheck,
  Lock,
  Timer,
  PlayCircle,
} from 'lucide-react';
import { api } from '../../lib/api';
import { PDFViewer } from '../../components/ui/PDFViewer';
import { Modal } from '../../components/ui/Modal';
import { useTranslation } from 'react-i18next';
import { formatDate as fmtDate, formatTime } from "../../utils/dateTime";
import { Button, Alert } from '../../components/ui';

const TEXT_PRIMARY = '#003300';
const TEXT_SECONDARY = '#003300CC';
const TEXT_TERTIARY = '#00330080';

interface SessionMaterial {
  _id: string;
  title: string;
  description?: string;
  category?: string;
  type?: string;
  createdAt?: string | null;
  fileSize?: number;
}

interface SessionEvaluation {
  overallScore: number;
  maxScore?: number;
  parameters?: Array<{ name: string; score: number; maxScore: number }>;
  trainerNotes?: string | null;
}

type AttendanceStatus = 'present' | 'late' | 'excused' | 'absent';

interface AttendanceRecord {
  status: AttendanceStatus;
  checkInTime?: string;
}

interface SessionDetails {
  _id: string;
  title: string;
  description?: string;
  type: string;
  scheduledDate?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  courseId?: { _id: string; title: string } | null;
  materials?: SessionMaterial[];
  evaluation?: SessionEvaluation | null;
  hasVideo?: boolean;
}

// ─── Animation presets ─────────────────────────────────────────────────────────
const fade = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22 } },
};
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

// ─── Attendance badge ──────────────────────────────────────────────────────────
const ATTENDANCE_CONFIG: Record<AttendanceStatus, {
  label: string;
  labelAr: string;
  icon: React.ElementType;
  bg: string;
  color: string;
  border: string;
}> = {
  present:  { label: 'Present',  labelAr: 'حاضر',    icon: CheckCircle2, bg: 'rgba(34,197,94,0.08)',   color: '#16a34a', border: 'rgba(34,197,94,0.2)'   },
  late:     { label: 'Late',     labelAr: 'متأخر',   icon: AlarmClock,   bg: 'rgba(245,158,11,0.08)', color: '#d97706', border: 'rgba(245,158,11,0.2)' },
  excused:  { label: 'Excused',  labelAr: 'معذور',   icon: ShieldCheck,  bg: 'rgba(59,130,246,0.08)', color: '#2563eb', border: 'rgba(59,130,246,0.2)'  },
  absent:   { label: 'Absent',   labelAr: 'غائب',    icon: XCircle,      bg: 'rgba(239,68,68,0.08)',  color: '#dc2626', border: 'rgba(239,68,68,0.2)'   },
};

function AttendanceBadge({ record, isRTL }: { record: AttendanceRecord; isRTL: boolean }) {
  const cfg = ATTENDANCE_CONFIG[record.status];
  const Icon = cfg.icon;
  const label = isRTL ? cfg.labelAr : cfg.label;

  return (
    <div
      className="flex items-center justify-between px-4 sm:px-5 py-3"
      style={{ background: cfg.bg }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${cfg.color}20` }}
        >
          <Icon className="w-4 h-4" style={{ color: cfg.color }} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: cfg.color, opacity: 0.65 }}>
            {isRTL ? 'حالة الحضور' : 'Attendance'}
          </p>
          <p className="text-sm font-bold leading-tight" style={{ color: cfg.color }}>
            {label}
          </p>
        </div>
      </div>
      {record.checkInTime && (
        <div className="text-end">
          <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: cfg.color, opacity: 0.65 }}>
            {isRTL ? 'وقت الدخول' : 'Check-in'}
          </p>
          <p className="text-sm font-bold" style={{ color: cfg.color }}>
            {formatTime(record.checkInTime)}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Star rating display ───────────────────────────────────────────────────────
function StarRow({ score, maxScore = 5 }: { score: number; maxScore?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: maxScore }, (_, i) => i + 1).map((s) => (
        <Star
          key={s}
          className={`w-4 h-4 ${s <= Math.round(score) ? 'text-amber-400 fill-amber-400' : 'text-[#003300]/15'}`}
        />
      ))}
      <span className="ms-1.5 text-xs font-bold" style={{ color: TEXT_PRIMARY }}>
        {score}/{maxScore}
      </span>
    </div>
  );
}

// ─── Material card ─────────────────────────────────────────────────────────────
function MaterialCard({
  material,
  onView,
}: {
  material: SessionMaterial;
  onView: (id: string) => void;
}) {
  const { t } = useTranslation(['dashboardStudent']);
  const isPdf = material.type?.toLowerCase().includes('pdf') || material.category?.toLowerCase().includes('pdf');

  const formatSize = (bytes?: number) => {
    if (!bytes) return null;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-[#003300]/8 hover:border-[#003300]/20 transition-colors">
      {/* Icon */}
      <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,51,0,0.06)' }}>
        <FileText className="w-5 h-5" style={{ color: TEXT_TERTIARY }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight truncate" style={{ color: TEXT_PRIMARY }}>
          {material.title}
        </p>
        {material.description && (
          <p className="text-xs mt-0.5 line-clamp-1" style={{ color: TEXT_SECONDARY }}>
            {material.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          {material.category && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#003300]/6 text-[#003300]">
              {material.category}
            </span>
          )}
          {formatSize(material.fileSize) && (
            <span className="text-[10px]" style={{ color: TEXT_TERTIARY }}>
              {formatSize(material.fileSize)}
            </span>
          )}
        </div>
      </div>

      {/* View button */}
      <button
        onClick={() => onView(material._id)}
        className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[#003300]/8 transition-colors active:scale-95"
        style={{ color: TEXT_SECONDARY }}
        aria-label={t('dashboardStudent:viewMaterial')}
      >
        <Eye className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Secured video player ─────────────────────────────────────────────────────
// Loads a backend-served HTML page in the iframe. The HTML page contains
// Loads backend HTML page: iframe fixed at 514×289 (YouTube hides "Watch on YouTube"
// below this size), scaled to fill viewport. controls=1 = no bot check.
// Full-coverage blocker + custom JS controls (play/pause, seek, mute, fullscreen).
function SessionVideoPlayer({ sessionId, isRTL }: { sessionId: string; isRTL: boolean }) {
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const tokenRes = await api.get(`/student/sessions/${sessionId}/video-token`);
        const token: string = tokenRes.data.data.token;
        const base = (api.defaults.baseURL ?? '').replace(/\/$/, '');
        if (!cancelled) setPlayerUrl(`${base}/student/sessions/${sessionId}/video-embed?token=${encodeURIComponent(token)}`);
      } catch {
        if (!cancelled) setErr(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 rounded-2xl bg-[#003300]/4 animate-pulse">
        <PlayCircle className="w-10 h-10 text-[#003300]/20" />
      </div>
    );
  }

  if (err || !playerUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-32 rounded-2xl bg-[#003300]/4 gap-2">
        <AlertCircle className="w-6 h-6 text-[#003300]/30" />
        <p className="text-xs text-[#003300]/40">
          {isRTL ? 'تعذّر تحميل الفيديو' : 'Could not load video'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '16px', overflow: 'hidden' }}>
      <iframe
        src={playerUrl}
        title="Session Video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
      />
    </div>
  );
}

// ─── Locked / upcoming screen ─────────────────────────────────────────────────
function LockedScreen({
  session,
  isRTL,
}: {
  session: SessionDetails;
  isRTL: boolean;
}) {
  const { t } = useTranslation(['dashboardStudent', 'dashboardCommon']);

  // Live countdown
  const [diff, setDiff] = useState(() =>
    session.scheduledDate ? Math.max(0, new Date(session.scheduledDate).getTime() - Date.now()) : 0
  );

  useEffect(() => {
    if (!session.scheduledDate) return;
    const target = new Date(session.scheduledDate).getTime();
    const tick = () => setDiff(Math.max(0, target - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session.scheduledDate]);

  const totalSec  = Math.floor(diff / 1000);
  const days      = Math.floor(totalSec / 86400);
  const hours     = Math.floor((totalSec % 86400) / 3600);
  const mins      = Math.floor((totalSec % 3600) / 60);
  const secs      = totalSec % 60;

  const pad = (n: number) => String(n).padStart(2, '0');

  const dateStr = session.scheduledDate
    ? fmtDate(session.scheduledDate, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const timeStr = session.startTime
    ? `${session.startTime}${session.endTime ? ` – ${session.endTime}` : ''}`
    : null;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-3 sm:space-y-4"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Back button */}
      <motion.div variants={fade}>
        <Link
          to={session.courseId ? `/student/courses/${session.courseId._id}` : '/student/courses'}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl font-semibold text-sm transition-all active:scale-[0.97]"
          style={{ background: 'rgba(0,51,0,0.07)', color: TEXT_PRIMARY }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,51,0,0.12)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0,51,0,0.07)')}
        >
          {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {session.courseId ? session.courseId.title : t('dashboardStudent:myCourses')}
        </Link>
      </motion.div>

      {/* Lock card */}
      <motion.div
        variants={fade}
        className="rounded-2xl overflow-hidden border border-amber-200 bg-amber-50 shadow-sm"
      >
        {/* Top amber strip */}
        <div className="h-1.5 w-full bg-amber-400" />

        <div className="p-6 sm:p-8 text-center">
          {/* Lock icon */}
          <div className="mx-auto mb-5 w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(245,158,11,0.15)' }}>
            <Lock className="w-8 h-8 text-amber-500" />
          </div>

          {/* Title */}
          <h1 className="text-xl sm:text-2xl font-bold mb-1" style={{ color: TEXT_PRIMARY }}>
            {session.title}
          </h1>
          <p className="text-sm mb-6" style={{ color: TEXT_SECONDARY }}>
            {isRTL
              ? 'هذه الجلسة لم تبدأ بعد. ستكون متاحة في موعدها.'
              : 'This session hasn\'t started yet. It will be available on its scheduled date.'}
          </p>

          {/* Countdown tiles */}
          {diff > 0 && (
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6">
              {[
                { val: pad(days),  label: isRTL ? 'يوم' : 'Days'  },
                { val: pad(hours), label: isRTL ? 'ساعة' : 'Hours' },
                { val: pad(mins),  label: isRTL ? 'دقيقة' : 'Mins' },
                { val: pad(secs),  label: isRTL ? 'ثانية' : 'Secs' },
              ].map(({ val, label }) => (
                <div
                  key={label}
                  className="flex flex-col items-center justify-center w-16 sm:w-20 h-16 sm:h-20 rounded-2xl border border-amber-200 bg-white shadow-sm"
                >
                  <span className="text-2xl sm:text-3xl font-bold tabular-nums" style={{ color: TEXT_PRIMARY }}>
                    {val}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 mt-0.5">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Date / time info */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
            {dateStr && (
              <div className="flex items-center gap-2 text-sm" style={{ color: TEXT_SECONDARY }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(59,130,246,0.08)' }}>
                  <Calendar className="w-4 h-4 text-blue-500" />
                </div>
                <span className="font-medium">{dateStr}</span>
              </div>
            )}
            {timeStr && (
              <div className="flex items-center gap-2 text-sm" style={{ color: TEXT_SECONDARY }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(139,92,246,0.08)' }}>
                  <Clock className="w-4 h-4 text-purple-500" />
                </div>
                <span className="font-medium">{timeStr}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Description card if present */}
      {session.description && (
        <motion.div
          variants={fade}
          className="rounded-2xl bg-white border border-[#003300]/8 shadow-sm p-4 sm:p-5"
        >
          <p className="text-sm leading-relaxed" dir="auto" style={{ color: TEXT_SECONDARY }}>
            {session.description}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Page skeleton ─────────────────────────────────────────────────────────────
function PageSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 w-32 bg-[#003300]/10 rounded" />
      <div className="rounded-2xl bg-white p-4 border border-[#003300]/8 space-y-3">
        <div className="h-6 w-2/3 bg-[#003300]/10 rounded" />
        <div className="h-4 w-full bg-[#003300]/8 rounded" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#003300]/8 shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-[#003300]/8 rounded w-1/2" />
                <div className="h-4 bg-[#003300]/10 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl bg-white p-4 border border-[#003300]/8 space-y-3">
        <div className="h-5 w-1/3 bg-[#003300]/10 rounded" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#003300]/8 shrink-0" />
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
export default function StudentSessionDetails() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardStudent']);
  const isRTL = i18n.language === 'ar';

  const [session, setSession] = useState<SessionDetails | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Server-confirmed locked session (403 + locked:true from backend)
  const [serverLockedSession, setServerLockedSession] = useState<SessionDetails | null>(null);

  const [showViewer, setShowViewer] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [showDescModal, setShowDescModal] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      if (!sessionId) return;
      setLoading(true);
      setError(null);
      try {
        const sessionRes = await api.get(`/student/sessions/${sessionId}`);
        const sessionData: SessionDetails = sessionRes.data.session;
        setSession(sessionData);

        // Fetch attendance for this session's course, match by session title + date
        if (sessionData.courseId?._id) {
          try {
            const attRes = await api.get(`/student/attendance/courses/${sessionData.courseId._id}`);
            const records: Array<any> = attRes.data.data || [];

            const sessionDate = sessionData.scheduledDate
              ? new Date(sessionData.scheduledDate).toDateString()
              : null;

            const match = records.find((r: any) => {
              // Try _id match first (if backend ever adds it)
              if (r.session?._id === sessionId || r.sessionId === sessionId) return true;
              // Match by title
              if (r.session?.title === sessionData.title) return true;
              // Match by date
              if (sessionDate && r.session?.date) {
                return new Date(r.session.date).toDateString() === sessionDate;
              }
              return false;
            });

            if (match) setAttendance({ status: match.status, checkInTime: match.checkInTime });
          } catch {
            // Attendance is optional — fail silently
          }
        }
      } catch (err: any) {
        const status = err.response?.status;
        // Server explicitly says this is a future-locked session
        if (status === 403 && err.response?.data?.locked === true) {
          const d = err.response.data;
          setServerLockedSession({
            _id: sessionId!,
            title: d.title || '',
            type: '',
            scheduledDate: d.scheduledDate,
            startTime: d.startTime,
            endTime: d.endTime,
          });
        } else {
          setError(
            status === 403 ? t('dashboardStudent:noAccessSession', 'You do not have access to this session') :
            status === 404 ? t('dashboardStudent:sessionNotFound') :
            err.response?.data?.error?.message || t('dashboardStudent:failedLoadSession')
          );
        }
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [sessionId]);

  const handleViewMaterial = (materialId: string) => {
    setSelectedMaterialId(materialId);
    setShowViewer(true);
  };

  if (loading) return <PageSkeleton />;

  if (error || !session) {
    return (
      <Alert variant="error">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{t('dashboardStudent:failedLoadSession')}</p>
            <p className="text-sm opacity-80 mt-0.5">{error || t('dashboardStudent:sessionNotFound')}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </Alert>
    );
  }

  // Server-confirmed lock (403 + locked:true) — show locked screen with server data
  if (serverLockedSession) {
    return <LockedScreen session={serverLockedSession} isRTL={isRTL} />;
  }

  // Client-side guard: also block if date is in the future (redundant safety net)
  const isFutureLocked = session.scheduledDate
    ? new Date(session.scheduledDate) > new Date()
    : false;

  if (isFutureLocked) {
    return <LockedScreen session={session} isRTL={isRTL} />;
  }

  const formatDate = (dateString: string) =>
    fmtDate(dateString, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const evaluation = session.evaluation;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-3 sm:space-y-4"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* ── Back button ── */}
      <motion.div variants={fade}>
        <Link
          to={session.courseId ? `/student/courses/${session.courseId._id}` : '/student/courses'}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl font-semibold text-sm transition-all active:scale-[0.97]"
          style={{
            background: 'rgba(0,51,0,0.07)',
            color: TEXT_PRIMARY,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,51,0,0.12)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0,51,0,0.07)')}
        >
          {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {session.courseId ? session.courseId.title : t('dashboardStudent:myCourses')}
        </Link>
      </motion.div>

      {/* ── Session header card ── */}
      <motion.div variants={fade} className="rounded-2xl bg-white border border-[#003300]/8 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5">
          {/* Title + type badge */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <h1 className="text-xl sm:text-2xl font-bold leading-tight" style={{ color: TEXT_PRIMARY }}>
              {session.title}
            </h1>
            <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-[#003300]/8 capitalize" style={{ color: TEXT_PRIMARY }}>
              {session.type}
            </span>
          </div>

          {session.description && (
            <div className="mb-4">
              <p className="text-sm line-clamp-3" dir="auto" style={{ color: TEXT_SECONDARY }}>
                {session.description}
              </p>
              <button
                onClick={() => setShowDescModal(true)}
                className="mt-1.5 text-xs font-semibold transition-opacity hover:opacity-70 active:scale-95"
                style={{ color: TEXT_PRIMARY }}
              >
                {isRTL ? 'عرض المزيد ↓' : 'View more ↓'}
              </button>
            </div>
          )}

          {/* Meta grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {session.scheduledDate && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(59,130,246,0.08)' }}>
                  <Calendar className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_TERTIARY }}>
                    {t('dashboardCommon:date')}
                  </p>
                  <p className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>
                    {formatDate(session.scheduledDate)}
                  </p>
                </div>
              </div>
            )}

            {session.startTime && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(139,92,246,0.08)' }}>
                  <Clock className="w-4 h-4 text-purple-500" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_TERTIARY }}>
                    {t('dashboardCommon:time')}
                  </p>
                  <p className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>
                    {session.startTime}{session.endTime && ` – ${session.endTime}`}
                  </p>
                </div>
              </div>
            )}

            {session.location && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(34,197,94,0.08)' }}>
                  <MapPin className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_TERTIARY }}>
                    {t('dashboardStudent:location')}
                  </p>
                  <p className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>
                    {session.location}
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ── Attendance strip — full-width bottom of header card ── */}
        {attendance && (
          <div className="border-t border-[#003300]/6">
            <AttendanceBadge record={attendance} isRTL={isRTL} />
          </div>
        )}
      </motion.div>

      {/* ── Evaluation card ── */}
      {evaluation && (
        <motion.div variants={fade} className="rounded-2xl bg-white border border-[#003300]/8 shadow-sm overflow-hidden">
          {/* Header strip */}
          <div className="flex items-center gap-2.5 px-4 sm:px-5 py-3.5 border-b border-[#003300]/6">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.1)' }}>
              <MessageSquare className="w-4 h-4 text-amber-500" />
            </div>
            <h2 className="font-bold text-base" style={{ color: TEXT_PRIMARY }}>
              {t('dashboardStudent:trainerNotes', 'Trainer Notes')}
            </h2>
          </div>

          <div className="p-4 sm:p-5 space-y-3">
            {/* Overall score */}
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(0,51,0,0.04)' }}>
              <span className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>
                {t('dashboardStudent:overallScore', 'Overall Score')}
              </span>
              <StarRow score={evaluation.overallScore} maxScore={evaluation.maxScore || 5} />
            </div>

            {/* Parameters */}
            {evaluation.parameters && evaluation.parameters.length > 0 && (
              <div className="space-y-2">
                {evaluation.parameters.map((param, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-[#003300]/6">
                    <span className="text-sm" dir="auto" style={{ color: TEXT_SECONDARY }}>
                      {param.name}
                    </span>
                    <StarRow score={param.score} maxScore={param.maxScore || 5} />
                  </div>
                ))}
              </div>
            )}

            {/* Trainer notes text */}
            {evaluation.trainerNotes && (
              <div className="p-3.5 rounded-xl" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600 mb-1.5">
                  {t('dashboardStudent:trainerNotes', 'Trainer Notes')}
                </p>
                <p className="text-sm leading-relaxed" dir="auto" style={{ color: TEXT_PRIMARY }}>
                  {evaluation.trainerNotes}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Video card ── */}
      {session.hasVideo && (
        <motion.div variants={fade} className="rounded-2xl bg-white border border-[#003300]/8 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 sm:px-5 py-3.5 border-b border-[#003300]/6">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-red-50">
              <PlayCircle className="w-4 h-4 text-red-500" />
            </div>
            <h2 className="font-bold text-base" style={{ color: TEXT_PRIMARY }}>
              {isRTL ? 'فيديو الجلسة' : 'Session Video'}
            </h2>
          </div>
          <div className="p-4 sm:p-5">
            <SessionVideoPlayer sessionId={session._id} isRTL={isRTL} />
          </div>
        </motion.div>
      )}

      {/* ── Materials card ── */}
      <motion.div variants={fade} className="rounded-2xl bg-white border border-[#003300]/8 shadow-sm overflow-hidden">
        {/* Header strip */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-[#003300]/6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.08)' }}>
              <BookOpen className="w-4 h-4 text-blue-500" />
            </div>
            <h2 className="font-bold text-base" style={{ color: TEXT_PRIMARY }}>
              {t('dashboardStudent:courseMaterials')}
            </h2>
          </div>
          {session.materials && session.materials.length > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#003300]/6" style={{ color: TEXT_TERTIARY }}>
              {session.materials.length}
            </span>
          )}
        </div>

        <div className="p-4 sm:p-5">
          {session.materials && session.materials.length > 0 ? (
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
              {session.materials.map((material) => (
                <motion.div key={material._id} variants={fade}>
                  <MaterialCard material={material} onView={handleViewMaterial} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(0,51,0,0.05)' }}>
                <FileText className="w-7 h-7" style={{ color: TEXT_TERTIARY }} />
              </div>
              <p className="font-semibold text-sm" style={{ color: TEXT_PRIMARY }}>
                {t('dashboardStudent:noMaterialsYet')}
              </p>
              <p className="text-xs mt-1" style={{ color: TEXT_SECONDARY }}>
                {t('dashboardStudent:materialsAvailableSoon')}
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Description modal ── */}
      <Modal
        isOpen={showDescModal}
        onClose={() => setShowDescModal(false)}
        title={session.title}
        size="md"
      >
        <div dir={isRTL ? 'rtl' : 'ltr'} className="px-1">
          <p className="text-sm leading-relaxed whitespace-pre-wrap" dir="auto" style={{ color: TEXT_SECONDARY }}>
            {session.description}
          </p>
        </div>
      </Modal>

      {/* PDF Viewer */}
      <PDFViewer
        resourceId={selectedMaterialId}
        isOpen={showViewer}
        onClose={() => {
          setShowViewer(false);
          setSelectedMaterialId(null);
        }}
      />
    </motion.div>
  );
}
