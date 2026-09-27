import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Save,
  ArrowLeft,
  AlertCircle,
  Calendar,
  Timer,
} from "lucide-react";
import { api } from "../../lib/api";
import { Button, LoadingState, Alert } from "../../components/ui";
import { useTranslation } from 'react-i18next';
import { formatDate } from "../../utils/dateTime";

interface Student {
  _id: string;
  name: string;
  email: string;
}

interface AttendanceRecord {
  student: string;
  status: "present" | "absent" | "late";
  checkInTime?: string; // HH:MM format
  notes?: string;
}

// Returns initials from a full name
function getInitials(name: string) {
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Format Date → "HH:MM"
function toHHMM(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

// Derive present/late from checkInTime vs session startTime (+5 min threshold)
function deriveStatus(checkInHHMM: string, sessionStartHHMM: string): "present" | "late" {
  if (!sessionStartHHMM) return "present";
  const [sh, sm] = sessionStartHHMM.split(":").map(Number);
  const [ch, cm] = checkInHHMM.split(":").map(Number);
  const startMinutes = sh * 60 + sm;
  const checkInMinutes = ch * 60 + cm;
  return checkInMinutes > startMinutes + 5 ? "late" : "present";
}

export default function TrainerTakeAttendance() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session");
  const groupId = searchParams.get("group");
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardTrainer']);
  const isRTL = i18n.language === 'ar';

  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Map<string, AttendanceRecord>>(new Map());
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ------------------------------------------------------------------
  // Fetch session + students + existing attendance
  // ------------------------------------------------------------------
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!sessionId && !groupId) throw new Error("Session ID or Group ID is required");

        let fetchedStudents: Student[] = [];

        if (sessionId) {
          const sessionRes = await api.get(`/trainer/sessions/${sessionId}`);
          setSessionInfo(sessionRes.data.data);
          const studentsRes = await api.get(
            `/trainer/groups/${sessionRes.data.data.groupId._id}/students`
          );
          fetchedStudents = studentsRes.data.data || [];
        } else if (groupId) {
          const studentsRes = await api.get(`/trainer/groups/${groupId}/students`);
          fetchedStudents = studentsRes.data.data || [];
        }

        setStudents(fetchedStudents);

        let existingAttendance: any = null;
        if (sessionId) {
          try {
            const res = await api.get(`/trainer/attendance/session/${sessionId}`);
            existingAttendance = res.data.data;
          } catch {
            // No existing record
          }
        }

        // Build initial map — default غائب so trainer explicitly marks حاضر
        const initialAttendance = new Map<string, AttendanceRecord>();
        fetchedStudents.forEach((student: Student) => {
          const existing = existingAttendance?.records?.find(
            (r: any) => r.student._id === student._id || r.student === student._id
          );
          // Normalise stored checkInTime to HH:MM if it came as ISO string
          let checkInTime = existing?.checkInTime;
          if (checkInTime && checkInTime.includes("T")) {
            const d = new Date(checkInTime);
            checkInTime = toHHMM(d);
          }
          initialAttendance.set(student._id, {
            student: student._id,
            status: existing?.status ?? "absent",
            checkInTime,
            notes: existing?.notes,
          });
        });
        setAttendance(initialAttendance);
      } catch (err: any) {
        setError(err.message || "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [sessionId, groupId]);

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------
  const sessionStart: string = sessionInfo?.startTime ?? "";

  // Mark حاضر — sets checkInTime to NOW, derives status from that time
  const markPresent = (studentId: string) => {
    const now = toHHMM(new Date());
    const status = deriveStatus(now, sessionStart);
    setAttendance((prev) => {
      const next = new Map(prev);
      next.set(studentId, { student: studentId, status, checkInTime: now });
      return next;
    });
  };

  // Mark غائب — clears check-in time
  const markAbsent = (studentId: string) => {
    setAttendance((prev) => {
      const next = new Map(prev);
      next.set(studentId, { student: studentId, status: "absent", checkInTime: undefined });
      return next;
    });
  };

  // Trainer manually changes the check-in time → re-derive status
  const updateCheckInTime = (studentId: string, timeHHMM: string) => {
    setAttendance((prev) => {
      const next = new Map(prev);
      const record = next.get(studentId)!;
      const status = deriveStatus(timeHHMM, sessionStart);
      next.set(studentId, { ...record, checkInTime: timeHHMM, status });
      return next;
    });
  };

  // Quick "في الوقت" — set check-in to session start time → always present
  const markOnTime = (studentId: string) => {
    const time = sessionStart || toHHMM(new Date());
    setAttendance((prev) => {
      const next = new Map(prev);
      next.set(studentId, { student: studentId, status: "present", checkInTime: time });
      return next;
    });
  };

  // ------------------------------------------------------------------
  // Save
  // ------------------------------------------------------------------
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      // Convert HH:MM checkInTime back to ISO for the API
      const records = Array.from(attendance.values()).map((r) => {
        if (r.checkInTime && !r.checkInTime.includes("T")) {
          const [h, m] = r.checkInTime.split(":").map(Number);
          const d = new Date();
          d.setHours(h, m, 0, 0);
          return { ...r, checkInTime: d.toISOString() };
        }
        return r;
      });

      await api.post(`/trainer/attendance`, {
        sessionId: sessionId || undefined,
        groupId: groupId || undefined,
        date: new Date().toISOString(),
        records,
      });

      setSaveSuccess(true);
      setTimeout(() => navigate(-1), 1200);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save attendance");
    } finally {
      setIsSaving(false);
    }
  };

  // ------------------------------------------------------------------
  // Derived stats
  // ------------------------------------------------------------------
  const allRecords = Array.from(attendance.values());
  const presentCount = allRecords.filter((r) => r.status === "present").length;
  const lateCount = allRecords.filter((r) => r.status === "late").length;
  const absentCount = allRecords.filter((r) => r.status === "absent").length;
  const attendedCount = presentCount + lateCount;

  // ------------------------------------------------------------------
  // Loading / fatal error
  // ------------------------------------------------------------------
  if (isLoading) return <LoadingState type="skeleton" text={t('dashboardTrainer:loadingStudents')} />;

  if (error && students.length === 0) {
    return (
      <Alert variant="error">
        <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">{t('dashboardTrainer:failedLoadAttendanceData')}</p>
            <p className="text-sm opacity-90">{error}</p>
          </div>
        </div>
      </Alert>
    );
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-5 pb-10"
    >
      {/* ── Back + Title ─────────────────────────────────────── */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-[#003300]/60 hover:text-[#003300] transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('dashboardCommon:back')}
        </button>

        <h1
          className="text-2xl font-bold"
          style={{
            background: "linear-gradient(135deg, #003300 0%, #004d00 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {t('dashboardTrainer:takeAttendance')}
        </h1>

        {sessionInfo && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-[#003300]/60">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {sessionInfo.title}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {sessionInfo.groupId?.name}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatDate(sessionInfo.scheduledDate)} — {sessionInfo.startTime}
            </span>
          </div>
        )}
      </div>

      {/* ── Info banner: late rule ────────────────────────────── */}
      <div className="flex items-start gap-3 bg-[#003300]/5 border border-[#003300]/10 rounded-xl px-4 py-3">
        <Timer className="w-4 h-4 text-[#003300]/50 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-[#003300]/60 leading-relaxed">
          {t('dashboardTrainer:lateRuleInfoA')} <strong>{sessionStart}</strong> {t('dashboardTrainer:lateRuleInfoB')}
        </p>
      </div>

      {/* ── Summary bar ──────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-center">
          <p className="text-2xl font-bold text-emerald-700">{attendedCount}</p>
          <p className="text-xs text-emerald-600 mt-0.5">
            {t('dashboardTrainer:present')}{" "}
            {lateCount > 0 && (
              <span className="text-amber-500">({lateCount} {t('dashboardTrainer:late')})</span>
            )}
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-center">
          <p className="text-2xl font-bold text-red-600">{absentCount}</p>
          <p className="text-xs text-red-500 mt-0.5">{t('dashboardTrainer:absent')}</p>
        </div>
        <div className="bg-[#003300]/5 border border-[#003300]/15 rounded-xl px-4 py-3 text-center">
          <p className="text-2xl font-bold text-[#003300]">{students.length}</p>
          <p className="text-xs text-[#003300]/60 mt-0.5">{t('dashboardTrainer:totalStudents')}</p>
        </div>
      </div>

      {/* ── Students list ────────────────────────────────────── */}
      <div className="bg-white border border-[#003300]/10 rounded-2xl overflow-hidden shadow-sm">
        {/* List header + bulk actions */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#003300]/8">
          <h2 className="text-sm font-bold text-[#003300]">
            {t('dashboardTrainer:studentsListCount', { count: students.length })}
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => students.forEach((s) => markPresent(s._id))}
              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 font-medium transition-colors"
            >
              {t('dashboardTrainer:markAllPresent')}
            </button>
            <button
              type="button"
              onClick={() => students.forEach((s) => markAbsent(s._id))}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 font-medium transition-colors"
            >
              {t('dashboardTrainer:markAllAbsent')}
            </button>
          </div>
        </div>

        {/* Student rows */}
        <div className="divide-y divide-[#003300]/6">
          {students.map((student, index) => {
            const record = attendance.get(student._id);
            const status = record?.status ?? "absent";
            const checkInTime = record?.checkInTime ?? "";
            const isPresent = status === "present";
            const isLate = status === "late";
            const isAbsent = status === "absent";
            const attended = isPresent || isLate;

            return (
              <motion.div
                key={student._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.03 }}
                className={`px-5 py-3.5 transition-colors ${
                  isAbsent
                    ? "bg-red-50/30"
                    : isLate
                    ? "bg-amber-50/40"
                    : "bg-emerald-50/25"
                }`}
              >
                {/* Top row: avatar + name + حاضر/غائب buttons */}
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      isAbsent
                        ? "bg-red-100 text-red-600"
                        : isLate
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {getInitials(student.name)}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-[#003300] truncate">
                        {student.name}
                      </p>
                      {isLate && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                          {t('dashboardTrainer:late')}
                        </span>
                      )}
                      {isPresent && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                          {t('dashboardTrainer:onTime')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#003300]/45 truncate">{student.email}</p>
                  </div>

                  {/* حاضر / غائب buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => (attended ? markAbsent(student._id) : markPresent(student._id))}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                        attended
                          ? "bg-emerald-500 border-emerald-500 text-white shadow-sm"
                          : "bg-white border-[#003300]/20 text-[#003300]/60 hover:border-emerald-400 hover:text-emerald-600"
                      }`}
                    >
                      <CheckCircle className="w-4 h-4" />
                      {t('dashboardTrainer:present')}
                    </button>
                    <button
                      type="button"
                      onClick={() => markAbsent(student._id)}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                        isAbsent
                          ? "bg-red-500 border-red-500 text-white shadow-sm"
                          : "bg-white border-[#003300]/20 text-[#003300]/60 hover:border-red-400 hover:text-red-500"
                      }`}
                    >
                      <XCircle className="w-4 h-4" />
                      {t('dashboardTrainer:absent')}
                    </button>
                  </div>
                </div>

                {/* Bottom row: time controls — only shown when attended */}
                <AnimatePresence>
                  {attended && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-2 mt-2.5 pr-12">
                        {/* "في الوقت" quick chip */}
                        {sessionStart && (
                          <button
                            type="button"
                            onClick={() => markOnTime(student._id)}
                            className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors whitespace-nowrap ${
                              checkInTime === sessionStart
                                ? "bg-emerald-500 border-emerald-500 text-white"
                                : "bg-white border-[#003300]/20 text-[#003300]/60 hover:border-emerald-400 hover:text-emerald-600"
                            }`}
                          >
                            {t('dashboardTrainer:onTime')} ({sessionStart})
                          </button>
                        )}

                        {/* Manual time input */}
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#003300]/40 flex-shrink-0" />
                          <input
                            type="time"
                            value={checkInTime}
                            onChange={(e) => updateCheckInTime(student._id, e.target.value)}
                            className="text-xs border border-[#003300]/20 rounded-lg px-2 py-1 text-[#003300] bg-white focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200"
                          />
                          <span className="text-xs text-[#003300]/40">{t('dashboardTrainer:arrivalTime')}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Error ────────────────────────────────────────────── */}
      {error && (
        <Alert variant="error">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </Alert>
      )}

      {/* ── Save success ─────────────────────────────────────── */}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-emerald-700"
          >
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-semibold">{t('dashboardTrainer:attendanceSaved')}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Actions ──────────────────────────────────────────── */}
      <div className="flex justify-end gap-3 pt-1">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-5 py-2.5 rounded-xl border border-[#003300]/20 text-sm font-medium text-[#003300]/70 hover:bg-[#003300]/5 transition-colors"
        >
          {t('dashboardCommon:cancel')}
        </button>
        <Button
          variant="primary"
          leftIcon={<Save className="w-4 h-4" />}
          onClick={handleSave}
          disabled={isSaving || saveSuccess}
        >
          {isSaving ? t('dashboardTrainer:savingAttendance') : t('dashboardTrainer:saveAttendance')}
        </Button>
      </div>
    </motion.div>
  );
}
