import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Timer,
  RefreshCw,
  Users,
  Clock,
  CalendarDays,
  Pencil,
  Trash2,
  Save,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Inbox,
} from "lucide-react";
import { api } from "../../lib/api";
import {
  CardComponent,
  CardBody,
  Button,
  LoadingState,
  Alert,
  Select,
  Switch,
} from "../../components/ui";
import { useTranslation } from "react-i18next";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

interface StaffMember {
  _id: string;
  name: string;
  email: string;
  role: string;
  isHourly: boolean;
  workingSince: string | null;
}

interface SessionUser {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface WorkSessionRow {
  _id: string;
  user: SessionUser | null;
  clockIn: string;
  clockOut: string | null;
  durationMinutes: number;
  autoClosed: boolean;
}

/* ── date helpers ── */

function toDateInput(d: Date): string {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

function toLocalDateTimeInput(iso: string): string {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

function startOfWeek(): Date {
  const now = new Date();
  const d = new Date(now);
  d.setDate(now.getDate() - now.getDay()); // Sunday
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDay(d: string): string {
  return new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function formatTime(d: string): string {
  return new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export default function CTOWorkHours() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [sessions, setSessions] = useState<WorkSessionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterUserId, setFilterUserId] = useState("");
  const [fromDate, setFromDate] = useState(() => toDateInput(startOfWeek()));
  const [toDate, setToDate] = useState(() => toDateInput(new Date()));

  // Hourly toggle
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [showEnableList, setShowEnableList] = useState(false);

  // Inline session editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editIn, setEditIn] = useState("");
  const [editOut, setEditOut] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchStaff = useCallback(async () => {
    const res = await api.get("/cto/internal/work/staff");
    setStaff(res.data.data || []);
  }, []);

  const fetchSessions = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterUserId) params.append("userId", filterUserId);
    if (fromDate) params.append("from", fromDate);
    if (toDate) params.append("to", toDate);
    const res = await api.get(`/cto/internal/work/sessions?${params.toString()}`);
    setSessions(res.data.data || []);
  }, [filterUserId, fromDate, toDate]);

  const loadAll = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await Promise.all([fetchStaff(), fetchSessions()]);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || "Failed to load work hours");
    } finally {
      setIsLoading(false);
    }
  }, [fetchStaff, fetchSessions]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const toggleHourly = async (member: StaffMember) => {
    setTogglingId(member._id);
    try {
      await api.patch(`/cto/internal/work/staff/${member._id}/hourly`, { isHourly: !member.isHourly });
      setStaff(prev => prev.map(s => (s._id === member._id ? { ...s, isHourly: !member.isHourly } : s)));
    } catch {
      /* keep previous state on failure */
    } finally {
      setTogglingId(null);
    }
  };

  const openEdit = (session: WorkSessionRow) => {
    setEditingId(session._id);
    setEditIn(toLocalDateTimeInput(session.clockIn));
    setEditOut(session.clockOut ? toLocalDateTimeInput(session.clockOut) : "");
  };

  const saveEdit = async (sessionId: string) => {
    setSavingId(sessionId);
    try {
      const payload: Record<string, string | null> = {
        clockIn: new Date(editIn).toISOString(),
        clockOut: editOut ? new Date(editOut).toISOString() : null,
      };
      const res = await api.put(`/cto/internal/work/sessions/${sessionId}`, payload);
      const updated = res.data.data;
      setSessions(prev => prev.map(s => (s._id === sessionId ? { ...s, ...updated } : s)));
      setEditingId(null);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Failed to update session");
    } finally {
      setSavingId(null);
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!window.confirm("Delete this work session? This cannot be undone.")) return;
    try {
      await api.delete(`/cto/internal/work/sessions/${sessionId}`);
      setSessions(prev => prev.filter(s => s._id !== sessionId));
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Failed to delete session");
    }
  };

  const applyPreset = (preset: "today" | "week" | "month") => {
    const now = new Date();
    if (preset === "today") {
      setFromDate(toDateInput(now));
    } else if (preset === "week") {
      setFromDate(toDateInput(startOfWeek()));
    } else {
      setFromDate(toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)));
    }
    setToDate(toDateInput(now));
  };

  /* ── derived data ── */

  const hourlyStaff = useMemo(() => staff.filter(s => s.isHourly), [staff]);
  const otherStaff = useMemo(() => staff.filter(s => !s.isHourly), [staff]);
  const workingNow = useMemo(() => hourlyStaff.filter(s => s.workingSince), [hourlyStaff]);

  const closedSessions = useMemo(() => sessions.filter(s => s.clockOut), [sessions]);
  const totalMinutes = useMemo(
    () => closedSessions.reduce((sum, s) => sum + s.durationMinutes, 0),
    [closedSessions]
  );

  // Per-staff totals within the selected range
  const staffTotals = useMemo(() => {
    const map = new Map<string, { name: string; minutes: number }>();
    for (const s of closedSessions) {
      if (!s.user) continue;
      const entry = map.get(s.user._id) || { name: s.user.name, minutes: 0 };
      entry.minutes += s.durationMinutes;
      map.set(s.user._id, entry);
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [closedSessions]);

  const staffOptions = useMemo(
    () => [
      { value: "", label: "All staff" },
      ...staff.filter(s => s.isHourly).map(s => ({ value: s._id, label: s.name })),
    ],
    [staff]
  );

  if (isLoading && staff.length === 0) {
    return <LoadingState message="Loading work hours..." />;
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-5">

      {/* ── Header ── */}
      <motion.div variants={itemVariants} className={`flex items-start justify-between gap-4 flex-wrap ${isRTL ? "flex-row-reverse" : ""}`}>
        <div className={isRTL ? "text-right" : ""}>
          <h1
            className="text-4xl font-bold inline-block"
            style={{
              color: '#003300',
              backgroundClip: "text",
            }}
          >
            Work Hours
          </h1>
          <p className="mt-1.5" style={{ color: "#003300CC" }}>
            Track clocked hours for hourly-paid staff
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<RefreshCw className="w-4 h-4" />}
          onClick={loadAll}
        >
          Refresh
        </Button>
      </motion.div>

      {error && (
        <motion.div variants={itemVariants}>
          <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>
        </motion.div>
      )}

      {/* ── Stats strip ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Hourly Staff",  value: String(hourlyStaff.length),         icon: <Users className="w-5 h-5" />,        color: "text-[#003300]", bg: "bg-[#003300]/5" },
          { label: "Working Now",   value: String(workingNow.length),          icon: <Timer className="w-5 h-5" />,        color: "text-green-600", bg: "bg-green-50" },
          { label: "Total Hours",   value: formatDuration(totalMinutes),       icon: <Clock className="w-5 h-5" />,        color: "text-blue-600",  bg: "bg-blue-50" },
          { label: "Sessions",      value: String(sessions.length),            icon: <CalendarDays className="w-5 h-5" />, color: "text-gray-600",  bg: "bg-gray-50" },
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

      {/* ── Hourly staff management ── */}
      <motion.div variants={itemVariants}>
        <CardComponent>
          <CardBody>
            <div className={`flex items-center justify-between mb-4 ${isRTL ? "flex-row-reverse" : ""}`}>
              <h2 className="text-lg font-bold text-gray-900">Hourly Staff</h2>
              <span className="text-sm text-gray-500">{hourlyStaff.length} enabled</span>
            </div>

            {hourlyStaff.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">
                No staff are marked as hourly yet — enable them below to let them clock in.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {hourlyStaff.map(member => (
                  <div
                    key={member._id}
                    className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${
                      member.workingSince ? "border-green-300 bg-green-50" : "border-gray-200 bg-white"
                    } ${isRTL ? "flex-row-reverse" : ""}`}
                  >
                    <div className={`min-w-0 ${isRTL ? "text-right" : ""}`}>
                      <p className="font-semibold text-gray-900 truncate">{member.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                      {member.workingSince ? (
                        <p className={`text-xs font-medium text-green-700 mt-0.5 flex items-center gap-1.5 ${isRTL ? "flex-row-reverse" : ""}`}>
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-600" />
                          </span>
                          Working since {formatTime(member.workingSince)}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 mt-0.5">Not clocked in</p>
                      )}
                    </div>
                    <Switch
                      checked={member.isHourly}
                      onChange={() => toggleHourly(member)}
                      disabled={togglingId === member._id}
                      size="sm"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Enable more staff */}
            <button
              onClick={() => setShowEnableList(v => !v)}
              className={`mt-4 flex items-center gap-2 text-sm font-medium text-[#003300] hover:underline ${isRTL ? "flex-row-reverse" : ""}`}
            >
              <UserPlus className="w-4 h-4" />
              Enable hourly tracking for more staff
              {showEnableList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <AnimatePresence>
              {showEnableList && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 border-t border-gray-100 pt-3 space-y-1 max-h-72 overflow-y-auto">
                    {otherStaff.map(member => (
                      <div
                        key={member._id}
                        className={`flex items-center justify-between gap-3 py-2 px-2 rounded-lg hover:bg-gray-50 ${isRTL ? "flex-row-reverse" : ""}`}
                      >
                        <div className={isRTL ? "text-right" : ""}>
                          <span className="text-sm font-medium text-gray-800">{member.name}</span>
                          <span className="text-xs text-gray-400 mx-2 capitalize">{member.role}</span>
                        </div>
                        <Switch
                          checked={false}
                          onChange={() => toggleHourly(member)}
                          disabled={togglingId === member._id}
                          size="sm"
                        />
                      </div>
                    ))}
                    {otherStaff.length === 0 && (
                      <p className="text-sm text-gray-400 py-2">All staff are already hourly</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardBody>
        </CardComponent>
      </motion.div>

      {/* ── Sessions ── */}
      <motion.div variants={itemVariants}>
        <CardComponent>
          <CardBody>
            <div className={`flex items-center justify-between mb-4 flex-wrap gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
              <h2 className="text-lg font-bold text-gray-900">Clocked Sessions</h2>
              <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                {([["today", "Today"], ["week", "This Week"], ["month", "This Month"]] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => applyPreset(key)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className={`flex flex-wrap items-end gap-3 mb-4 ${isRTL ? "flex-row-reverse" : ""}`}>
              <div className="w-52">
                <label className="block text-xs font-medium text-gray-500 mb-1">Staff member</label>
                <Select value={filterUserId} onChange={setFilterUserId} options={staffOptions} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#003300]/30"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#003300]/30"
                />
              </div>
            </div>

            {/* Per-staff totals for the range */}
            {staffTotals.length > 0 && (
              <div className={`flex flex-wrap gap-2 mb-4 ${isRTL ? "flex-row-reverse" : ""}`}>
                {staffTotals.map(t => (
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#003300]/5 text-[#003300] border border-[#003300]/10"
                  >
                    {t.name}
                    <span className="font-bold">{formatDuration(t.minutes)}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Session list */}
            {sessions.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-gray-400">
                <Inbox className="w-10 h-10 mb-2" />
                <p className="text-sm">No work sessions in this period</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map(session => {
                  const isEditing = editingId === session._id;
                  const isOpen = !session.clockOut;
                  return (
                    <div
                      key={session._id}
                      className={`rounded-xl border p-3 transition-colors ${
                        isOpen ? "border-green-300 bg-green-50" : "border-gray-200 bg-white hover:bg-gray-50"
                      }`}
                    >
                      {isEditing ? (
                        <div className={`flex flex-wrap items-end gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Clock in</label>
                            <input
                              type="datetime-local"
                              value={editIn}
                              onChange={e => setEditIn(e.target.value)}
                              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#003300]/30"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Clock out</label>
                            <input
                              type="datetime-local"
                              value={editOut}
                              onChange={e => setEditOut(e.target.value)}
                              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#003300]/30"
                            />
                          </div>
                          <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                            <button
                              onClick={() => saveEdit(session._id)}
                              disabled={savingId === session._id}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-[#003300] hover:bg-[#004d00] transition-colors disabled:opacity-60"
                            >
                              {savingId === session._id
                                ? <RefreshCw className="w-4 h-4 animate-spin" />
                                : <Save className="w-4 h-4" />}
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors"
                            >
                              <X className="w-4 h-4" />
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className={`flex items-center justify-between gap-3 flex-wrap ${isRTL ? "flex-row-reverse" : ""}`}>
                          <div className={`flex items-center gap-3 min-w-0 ${isRTL ? "flex-row-reverse" : ""}`}>
                            <div className={`min-w-0 ${isRTL ? "text-right" : ""}`}>
                              <p className="font-semibold text-gray-900 truncate">
                                {session.user?.name || "Deleted user"}
                              </p>
                              <p className="text-xs text-gray-500">{formatDay(session.clockIn)}</p>
                            </div>
                          </div>
                          <div className={`flex items-center gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
                            <span className="text-sm text-gray-600 tabular-nums">
                              {formatTime(session.clockIn)} – {session.clockOut ? formatTime(session.clockOut) : "now"}
                            </span>
                            {isOpen ? (
                              <span className={`flex items-center gap-1.5 text-xs font-semibold text-green-700 ${isRTL ? "flex-row-reverse" : ""}`}>
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-600" />
                                </span>
                                Working
                              </span>
                            ) : (
                              <span className={`text-sm font-bold text-gray-800 tabular-nums w-16 ${isRTL ? "text-left" : "text-right"}`}>
                                {formatDuration(session.durationMinutes)}
                              </span>
                            )}
                            {session.autoClosed && (
                              <span
                                className="flex items-center gap-1 text-xs font-medium text-amber-600"
                                title="Auto-closed by the system — the employee forgot to clock out. Edit to correct the time."
                              >
                                <AlertTriangle className="w-4 h-4" />
                                Auto-closed
                              </span>
                            )}
                            <div className={`flex items-center gap-1 ${isRTL ? "flex-row-reverse" : ""}`}>
                              <button
                                onClick={() => openEdit(session)}
                                className="p-2 rounded-lg text-gray-400 hover:text-[#003300] hover:bg-gray-100 transition-colors"
                                title="Edit times"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteSession(session._id)}
                                className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="Delete session"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </CardComponent>
      </motion.div>
    </motion.div>
  );
}
