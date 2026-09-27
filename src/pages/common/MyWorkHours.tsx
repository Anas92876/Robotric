import { useEffect, useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Play,
  Square,
  Timer,
  History,
  AlertTriangle,
  Clock,
  CalendarDays,
  Inbox,
  Lock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useWorkClock, type WorkSession } from "../../hooks/useWorkClock";
import { CardComponent, CardBody, Alert, LoadingState } from "../../components/ui";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

/* ── helpers ── */

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatTime(d: string): string {
  return new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatDay(d: string): string {
  return new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfWeek(): Date {
  const now = new Date();
  const d = new Date(now);
  d.setDate(now.getDate() - now.getDay()); // Sunday
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export default function MyWorkHours() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const { isHourly, active, sessions, isLoading, isBusy, error, startWork, stopWork, fetchSessions } = useWorkClock();

  const [now, setNow] = useState(Date.now());
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Live ticking while clocked in
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  const loadHistory = useCallback(async () => {
    await fetchSessions();
    setHistoryLoaded(true);
  }, [fetchSessions]);

  useEffect(() => {
    if (isHourly) loadHistory();
  }, [isHourly, loadHistory]);

  // Refresh history once the active session closes, so the new entry appears immediately
  useEffect(() => {
    if (historyLoaded && !active) loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const elapsed = active ? now - new Date(active.clockIn).getTime() : 0;

  const closedSessions = useMemo(() => sessions.filter(s => s.clockOut), [sessions]);

  const stats = useMemo(() => {
    const today = new Date();
    const weekStart = startOfWeek();
    const monthStart = startOfMonth();
    let todayMin = 0, weekMin = 0, monthMin = 0;
    for (const s of closedSessions) {
      const d = new Date(s.clockIn);
      if (isSameDay(d, today)) todayMin += s.durationMinutes;
      if (d >= weekStart) weekMin += s.durationMinutes;
      if (d >= monthStart) monthMin += s.durationMinutes;
    }
    return { todayMin, weekMin, monthMin };
  }, [closedSessions]);

  if (isLoading) {
    return <LoadingState message="Loading your work clock..." />;
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-5">

      {/* ── Header ── */}
      <motion.div variants={itemVariants} className={isRTL ? "text-right" : ""}>
        <h1
          className="text-4xl font-bold inline-block"
          style={{
            background: "linear-gradient(135deg, #003300 0%, #004d00 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          My Work Hours
        </h1>
        <p className="mt-1.5" style={{ color: "#003300CC" }}>
          Clock in when you start, clock out when you're done for the day
        </p>
      </motion.div>

      {!isHourly ? (
        <motion.div variants={itemVariants}>
          <CardComponent>
            <CardBody>
              <div className={`flex flex-col items-center text-center py-10 gap-3 ${isRTL ? "items-center" : ""}`}>
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <Lock className="w-7 h-7 text-gray-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Hour tracking isn't enabled for your account</p>
                  <p className="text-sm text-gray-500 mt-1 max-w-md">
                    If you're paid hourly, ask your manager to enable hour tracking for you from the Work Hours page.
                  </p>
                </div>
              </div>
            </CardBody>
          </CardComponent>
        </motion.div>
      ) : (
        <>
          {error && (
            <motion.div variants={itemVariants}>
              <Alert variant="error">{error}</Alert>
            </motion.div>
          )}

          {/* ── Clock card ── */}
          <motion.div variants={itemVariants}>
            <div
              className={`rounded-2xl border-2 shadow-sm overflow-hidden ${
                active ? "border-green-300 bg-gradient-to-br from-green-50 to-emerald-50" : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex flex-col items-center text-center px-6 py-10 gap-5">
                <div
                  className={`w-20 h-20 rounded-2xl flex items-center justify-center ${
                    active ? "bg-green-600" : "bg-gray-100"
                  }`}
                >
                  <Timer className={`w-10 h-10 ${active ? "text-white" : "text-gray-400"}`} />
                </div>

                {active ? (
                  <>
                    <div className={`flex items-center gap-2 text-green-700 ${isRTL ? "flex-row-reverse" : ""}`}>
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-600" />
                      </span>
                      <span className="font-semibold">Working since {formatTime(active.clockIn)}</span>
                    </div>
                    <p className="font-mono text-5xl sm:text-6xl font-bold text-green-700 tabular-nums">
                      {formatElapsed(elapsed)}
                    </p>
                  </>
                ) : (
                  <div>
                    <p className="text-lg font-semibold text-gray-800">You're not clocked in</p>
                    <p className="text-sm text-gray-500 mt-1">Press Start Work when your day begins</p>
                  </div>
                )}

                {active ? (
                  <button
                    onClick={stopWork}
                    disabled={isBusy}
                    className="flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-60 text-lg"
                  >
                    <Square className="w-5 h-5" />
                    End Work Day
                  </button>
                ) : (
                  <button
                    onClick={startWork}
                    disabled={isBusy}
                    className="flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 text-lg"
                    style={{ background: "linear-gradient(135deg, #003300 0%, #004d00 100%)" }}
                  >
                    <Play className="w-5 h-5" />
                    Start Work
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          {/* ── Stats strip ── */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: "Today",     value: formatDuration(stats.todayMin), icon: <Clock className="w-5 h-5" />,       bg: "bg-[#003300]/5", color: "text-[#003300]" },
              { label: "This Week", value: formatDuration(stats.weekMin),  icon: <CalendarDays className="w-5 h-5" />, bg: "bg-blue-50",     color: "text-blue-600" },
              { label: "This Month", value: formatDuration(stats.monthMin), icon: <History className="w-5 h-5" />,    bg: "bg-gray-50",     color: "text-gray-600" },
            ].map(stat => (
              <div key={stat.label} className={`rounded-xl p-4 ${stat.bg}`}>
                <div className={`flex items-center gap-2 ${stat.color} ${isRTL ? "flex-row-reverse" : ""}`}>
                  {stat.icon}
                  <span className="text-sm font-medium">{stat.label}</span>
                </div>
                <p className={`text-2xl font-bold mt-1 ${stat.color} ${isRTL ? "text-right" : ""}`}>{stat.value}</p>
              </div>
            ))}
          </motion.div>

          {/* ── History ── */}
          <motion.div variants={itemVariants}>
            <CardComponent>
              <CardBody>
                <div className={`flex items-center justify-between mb-4 ${isRTL ? "flex-row-reverse" : ""}`}>
                  <h2 className="text-lg font-bold text-gray-900">Work History</h2>
                  <span className="text-sm text-gray-500">Last 90 days</span>
                </div>

                {sessions.length === 0 ? (
                  <div className="flex flex-col items-center py-10 text-gray-400">
                    <Inbox className="w-10 h-10 mb-2" />
                    <p className="text-sm">No work days recorded yet</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[28rem] overflow-y-auto">
                    {sessions.map((s: WorkSession) => (
                      <div
                        key={s._id}
                        className={`flex items-center justify-between gap-3 py-2.5 px-3 rounded-lg ${
                          s.clockOut ? "hover:bg-gray-50" : "bg-green-50 border border-green-200"
                        } ${isRTL ? "flex-row-reverse" : ""}`}
                      >
                        <span className="text-sm font-medium text-gray-700">{formatDay(s.clockIn)}</span>
                        <span className={`flex items-center gap-3 text-sm ${isRTL ? "flex-row-reverse" : ""}`}>
                          <span className="text-gray-500 tabular-nums">
                            {formatTime(s.clockIn)} – {s.clockOut ? formatTime(s.clockOut) : "now"}
                          </span>
                          {s.autoClosed && (
                            <span title="Auto-closed — you forgot to clock out, your manager may adjust this">
                              <AlertTriangle className="w-4 h-4 text-amber-500" />
                            </span>
                          )}
                          {s.clockOut ? (
                            <span className="font-semibold text-gray-800 tabular-nums w-16 text-right">
                              {formatDuration(s.durationMinutes)}
                            </span>
                          ) : (
                            <span className="font-semibold text-green-700">In progress</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </CardComponent>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
