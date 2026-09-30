import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FolderOpen,
  Plus,
  ListTodo,
  CheckCircle,
  Clock,
  Users,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Trophy,
  TrendingUp,
  AlertTriangle,
  Star,
  Crown,
  X,
  Smartphone,
  Shield,
  ShieldAlert,
  Check,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useCTOProjects } from "../../hooks/cto/useCTOProjects";
import { api } from "../../lib/api";
import {
  CardComponent,
  CardBody,
  Button,
  LoadingState,
  Alert,
  Select,
  Modal,
  Input,
} from "../../components/ui";
import { useTranslation } from "react-i18next";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const BRAND = "#0f1f33";
const CHART_COLORS = ["#0f1f33", "#16a34a", "#4ade80", "#86efac", "#bbf7d0", "#dcfce7", "#f0fdf4", "#064e3b"];
const STATUS_COLORS = { todo: "#6b7280", in_progress: "#3b82f6", done: "#22c55e" };
const PRIORITY_COLORS = { 1: "#ef4444", 2: "#f97316", 3: "#22c55e" };

interface AnalyticsData {
  summary: {
    totalProjects: number;
    totalTasks: number;
    totalUsers: number;
    overdueCount: number;
    todo: number;
    in_progress: number;
    done: number;
  };
  priorityBreakdown: { 1: number; 2: number; 3: number };
  monthlyProductivity: { month: string; completed: number }[];
  statusBreakdown: { todo: number; in_progress: number; done: number };
  employeeScores: {
    _id: string;
    name: string;
    email: string;
    role: string;
    allTimeScore: number;
    thisMonthScore: number;
    tasksAllTime: number;
    tasksThisMonth: number;
  }[];
  topEmployees: { name: string; fullName: string; score: number; tasks: number }[];
  employeeOfMonth: {
    _id: string;
    name: string;
    email: string;
    role: string;
    score: number;
    tasks: number;
    isManual: boolean;
  } | null;
}

const priorityBadge = (priority: 1 | 2 | 3) => {
  if (priority === 1) return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">P1</span>;
  if (priority === 2) return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30">P2</span>;
  return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">P3</span>;
};

const rankColors = ["text-yellow-500", "text-gray-400", "text-amber-600"];
const rankIcons = [
  <Crown className="w-4 h-4 text-yellow-500" />,
  <Star className="w-4 h-4 text-gray-400" />,
  <Star className="w-4 h-4 text-amber-600" />,
];

export default function CTODashboard() {
  const { projects, tasks, isLoading, error, getProjects, getTasks } = useCTOProjects();
  const { i18n } = useTranslation(["dashboardCommon"]);
  const isRTL = i18n.language === "ar";

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [allUsers, setAllUsers] = useState<{ _id: string; name: string }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isSavingOverride, setIsSavingOverride] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);

  // App Version Control
  const [versionSettings, setVersionSettings] = useState({ minimumAppVersion: "1.0.0", forceUpdate: false, updateMessage: "" });
  const [versionLoading, setVersionLoading] = useState(true);
  const [versionSaving, setVersionSaving] = useState(false);
  const [versionSaved, setVersionSaved] = useState(false);
  const [versionError, setVersionError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const res = await api.get("/cto/internal/analytics");
      setAnalytics(res.data.data);
    } catch (e: any) {
      setAnalyticsError(e.response?.data?.message || "Failed to load analytics");
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  const fetchVersionSettings = useCallback(async () => {
    try {
      const res = await api.get("/app-version");
      const d = res.data.data;
      setVersionSettings({
        minimumAppVersion: d.minimumAppVersion ?? "1.0.0",
        forceUpdate: d.forceUpdate ?? false,
        updateMessage: d.updateMessage ?? "",
      });
    } catch { /* silent — non-critical */ }
    finally { setVersionLoading(false); }
  }, []);

  const saveVersionSettings = async () => {
    setVersionSaving(true);
    setVersionError(null);
    setVersionSaved(false);
    try {
      await api.put("/admin/settings/version", versionSettings);
      setVersionSaved(true);
      setTimeout(() => setVersionSaved(false), 3000);
    } catch (e: any) {
      setVersionError(e.response?.data?.message || "Failed to save settings");
    } finally {
      setVersionSaving(false);
    }
  };

  useEffect(() => {
    getProjects();
    getTasks();
    fetchAnalytics();
    fetchVersionSettings();
  }, [getProjects, getTasks, fetchAnalytics, fetchVersionSettings]);

  const openOverrideModal = async () => {
    setSelectedUserId("");
    setOverrideError(null);
    try {
      const res = await api.get("/cto/internal/engineers");
      setAllUsers(res.data.data || []);
    } catch {
      setAllUsers([]);
    }
    setShowOverrideModal(true);
  };

  const handleSetOverride = async () => {
    if (!selectedUserId) { setOverrideError("Select an employee"); return; }
    setIsSavingOverride(true);
    setOverrideError(null);
    try {
      await api.post("/cto/internal/analytics/employee-of-month", { userId: selectedUserId });
      setShowOverrideModal(false);
      fetchAnalytics();
    } catch (e: any) {
      setOverrideError(e.response?.data?.message || "Failed to update");
    } finally {
      setIsSavingOverride(false);
    }
  };

  const handleClearOverride = async () => {
    try {
      await api.delete("/cto/internal/analytics/employee-of-month");
      fetchAnalytics();
    } catch { /* silent */ }
  };

  if ((isLoading && projects.length === 0) || analyticsLoading) {
    return <LoadingState type="skeleton" text="Loading dashboard..." />;
  }

  if (error && projects.length === 0) {
    return (
      <Alert variant="error">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold mb-1">Failed to load dashboard</p>
            <p className="text-sm opacity-90">{error}</p>
          </div>
          <Button variant="ghost" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={() => { getProjects(); getTasks(); fetchAnalytics(); }}>
            Retry
          </Button>
        </div>
      </Alert>
    );
  }

  const a = analytics;
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === "done").length;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const statCards = [
    { label: "Total Projects", value: a?.summary.totalProjects ?? projects.length, icon: <FolderOpen className="w-7 h-7" />, sub: `${a?.summary.totalTasks ?? 0} tasks total` },
    { label: "Done This Month", value: a ? (a.monthlyProductivity[a.monthlyProductivity.length - 1]?.completed ?? 0) : doneTasks, icon: <CheckCircle className="w-7 h-7" />, sub: "Completed tasks" },
    { label: "In Progress", value: a?.summary.in_progress ?? 0, icon: <Clock className="w-7 h-7" />, sub: "Active tasks" },
    { label: "Overdue", value: a?.summary.overdueCount ?? 0, icon: <AlertTriangle className="w-7 h-7" />, sub: "Need attention", warn: (a?.summary.overdueCount ?? 0) > 0, link: "/cto-internal/deadlines" },
  ];

  const statusPieData = a ? [
    { name: "To Do", value: a.statusBreakdown.todo, color: STATUS_COLORS.todo },
    { name: "In Progress", value: a.statusBreakdown.in_progress, color: STATUS_COLORS.in_progress },
    { name: "Done", value: a.statusBreakdown.done, color: STATUS_COLORS.done },
  ].filter(d => d.value > 0) : [];

  const priorityPieData = a ? [
    { name: "P1 Critical", value: a.priorityBreakdown[1], color: PRIORITY_COLORS[1] },
    { name: "P2 High", value: a.priorityBreakdown[2], color: PRIORITY_COLORS[2] },
    { name: "P3 Normal", value: a.priorityBreakdown[3], color: PRIORITY_COLORS[3] },
  ].filter(d => d.value > 0) : [];

  const currentMonthName = new Date().toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-8">

      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
          <div className={isRTL ? "text-right" : ""}>
            <h1
              className="text-4xl font-bold inline-block"
              style={{ color: '#0f1f33', backgroundClip: "text" }}
            >
              Manager Dashboard
            </h1>
            <p className="mt-2" style={{ color: "#0f1f33CC" }}>Team performance & project analytics</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={fetchAnalytics}>
              Refresh
            </Button>
            <Link to="/cto-internal/projects">
              <Button variant="primary" leftIcon={<Plus className="w-5 h-5" />}>New Project</Button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card: any) => {
          const inner = (
            <div className={`relative bg-white rounded-xl p-5 border transition-all duration-300 hover:shadow-xl ${card.warn ? "border-red-200 hover:border-red-300" : "border-ink/15 hover:border-ink/30"}`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-xl ${card.warn ? "bg-red-50 text-red-500" : "text-frost"}`}
                  style={card.warn ? {} : { background: "#0f1f33" }}>
                  {card.icon}
                </div>
                <span className={`text-3xl font-bold ${card.warn ? "text-red-500" : "text-ink"}`}>{card.value}</span>
              </div>
              <p className="font-semibold text-ink text-sm">{card.label}</p>
              <p className="text-xs text-ink/50 mt-0.5">{card.sub}</p>
              {card.link && card.warn && (
                <p className="text-xs text-red-400 mt-1.5 font-medium">View details →</p>
              )}
            </div>
          );
          return (
            <div key={card.label} className="relative group">
              <div className={`absolute inset-0 rounded-2xl blur-md opacity-20 group-hover:opacity-40 transition-opacity duration-300 ${card.warn ?"bg-red-500":"bg-emerald-500"}`} />
              {card.link ? <Link to={card.link}>{inner}</Link> : inner}
            </div>
          );
        })}
      </motion.div>

      {/* Completion rate bar */}
      <motion.div variants={itemVariants}>
        <CardComponent variant="glass">
          <CardBody>
            <div className={`flex items-center justify-between mb-3 ${isRTL ? "flex-row-reverse" : ""}`}>
              <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                <TrendingUp className="w-5 h-5 text-ink/60" />
                <span className="font-semibold text-ink">Overall Completion Rate</span>
              </div>
              <span className="text-2xl font-bold text-ink">{completionRate}%</span>
            </div>
            <div className="w-full bg-ink/10 rounded-full h-3 overflow-hidden">
              <motion.div
                className="h-3 rounded-full"
                style={{ background: "#0f1f33" }}
                initial={{ width: 0 }}
                animate={{ width: `${completionRate}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-ink/50">
              <span>{doneTasks} done</span>
              <span>{totalTasks - doneTasks} remaining</span>
            </div>
          </CardBody>
        </CardComponent>
      </motion.div>

      {/* Charts row 1: Monthly productivity + Status pie */}
      {a && (
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Monthly productivity line chart */}
          <div className="lg:col-span-2">
            <CardComponent variant="glass">
              <CardBody>
                <h2 className="text-lg font-bold text-ink mb-4">Monthly Productivity (Last 6 Months)</h2>
                {a.monthlyProductivity.length === 0 ? (
                  <div className="flex items-center justify-center h-48 text-ink/40 text-sm">No data yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={a.monthlyProductivity} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#0f1f3315" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#0f1f33AA" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#0f1f33AA" }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ background: "white", border: "1px solid #0f1f3320", borderRadius: 8, fontSize: 12 }}
                        formatter={(v: number) => [`${v} tasks`, "Completed"]}
                      />
                      <Line type="monotone" dataKey="completed" stroke={BRAND} strokeWidth={2.5} dot={{ fill: BRAND, r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </CardComponent>
          </div>

          {/* Status pie chart */}
          <div>
            <CardComponent variant="glass">
              <CardBody>
                <h2 className="text-lg font-bold text-ink mb-4">Task Status</h2>
                {statusPieData.length === 0 ? (
                  <div className="flex items-center justify-center h-48 text-ink/40 text-sm">No tasks yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={statusPieData} cx="50%" cy="45%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                        {statusPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "white", border: "1px solid #0f1f3320", borderRadius: 8, fontSize: 12 }}
                        formatter={(v: number) => [`${v} tasks`]}
                      />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </CardComponent>
          </div>
        </motion.div>
      )}

      {/* Charts row 2: Employee scores bar + Priority pie */}
      {a && (
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Employee scores bar chart */}
          <div className="lg:col-span-2">
            <CardComponent variant="glass">
              <CardBody>
                <h2 className="text-lg font-bold text-ink mb-1">Employee Scores — {currentMonthName}</h2>
                <p className="text-xs text-ink/50 mb-4">P1=15pts · P2=10pts · P3=5pts · On-time bonus=+5pts</p>
                {a.topEmployees.length === 0 ? (
                  <div className="flex items-center justify-center h-48 text-ink/40 text-sm">No completed tasks this month</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={a.topEmployees} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#0f1f3315" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#0f1f33AA" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#0f1f33AA" }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ background: "white", border: "1px solid #0f1f3320", borderRadius: 8, fontSize: 12 }}
                        formatter={(v: number, _: string, props: any) => [`${v} pts (${props.payload.tasks} tasks)`, props.payload.fullName]}
                      />
                      <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                        {a.topEmployees.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </CardComponent>
          </div>

          {/* Priority distribution pie */}
          <div>
            <CardComponent variant="glass">
              <CardBody>
                <h2 className="text-lg font-bold text-ink mb-4">Task Priority Mix</h2>
                {priorityPieData.length === 0 ? (
                  <div className="flex items-center justify-center h-48 text-ink/40 text-sm">No tasks yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={priorityPieData} cx="50%" cy="45%" outerRadius={80} paddingAngle={3} dataKey="value">
                        {priorityPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "white", border: "1px solid #0f1f3320", borderRadius: 8, fontSize: 12 }}
                        formatter={(v: number) => [`${v} tasks`]}
                      />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </CardComponent>
          </div>
        </motion.div>
      )}

      {/* Employee of the Month + Full Leaderboard */}
      {a && (
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Employee of the Month card */}
          <div>
            <CardComponent variant="glass">
              <CardBody>
                <div className={`flex items-center justify-between mb-4 ${isRTL ? "flex-row-reverse" : ""}`}>
                  <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <h2 className="text-lg font-bold text-ink">Employee of the Month</h2>
                  </div>
                  <button onClick={openOverrideModal} className="text-xs text-ink/40 hover:text-ink transition-colors underline underline-offset-2">
                    Override
                  </button>
                </div>

                {a.employeeOfMonth ? (
                  <div className="text-center py-4">
                    {/* Avatar circle */}
                    <div className="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl font-bold text-frost"
                      style={{ background: "#0f1f33" }}>
                      {a.employeeOfMonth.name.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-xl font-bold text-ink">{a.employeeOfMonth.name}</p>
                    <p className="text-xs text-ink/50 mb-3">{a.employeeOfMonth.role}</p>
                    <div className="flex items-center justify-center gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-yellow-500">{a.employeeOfMonth.score}</p>
                        <p className="text-xs text-ink/50">points</p>
                      </div>
                      <div className="w-px h-8 bg-ink/10" />
                      <div className="text-center">
                        <p className="text-2xl font-bold text-ink">{a.employeeOfMonth.tasks}</p>
                        <p className="text-xs text-ink/50">tasks done</p>
                      </div>
                    </div>
                    {a.employeeOfMonth.isManual && (
                      <div className="mt-3 flex items-center justify-center gap-1.5">
                        <span className="text-xs text-ink/40 bg-ink/5 px-2 py-0.5 rounded-full">Manually selected</span>
                        <button onClick={handleClearOverride} className="text-xs text-red-400 hover:text-red-600 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    {!a.employeeOfMonth.isManual && (
                      <p className="text-xs text-ink/40 mt-3">Auto-selected by score</p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Trophy className="w-12 h-12 mx-auto mb-3 text-ink/20" />
                    <p className="text-ink/50 text-sm">No completed tasks this month yet</p>
                  </div>
                )}
              </CardBody>
            </CardComponent>
          </div>

          {/* Full leaderboard */}
          <div className="lg:col-span-2">
            <CardComponent variant="glass">
              <CardBody>
                <div className={`flex items-center gap-2 mb-4 ${isRTL ? "flex-row-reverse" : ""}`}>
                  <Users className="w-5 h-5 text-ink/60" />
                  <h2 className="text-lg font-bold text-ink">Team Leaderboard — {currentMonthName}</h2>
                </div>

                {a.employeeScores.length === 0 ? (
                  <div className="text-center py-8 text-ink/40 text-sm">No activity this month</div>
                ) : (
                  <div className="space-y-2">
                    {a.employeeScores.map((emp, idx) => {
                      const pct = a.employeeScores[0].thisMonthScore > 0
                        ? (emp.thisMonthScore / a.employeeScores[0].thisMonthScore) * 100
                        : 0;
                      return (
                        <div key={emp._id.toString()} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-ink/5 transition-colors">
                          <div className="w-7 flex-shrink-0 flex items-center justify-center">
                            {idx < 3 ? rankIcons[idx] : <span className="text-xs text-ink/40 font-medium">{idx + 1}</span>}
                          </div>
                          <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-frost"
                            style={{ background: CHART_COLORS[idx % CHART_COLORS.length] }}>
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-sm font-semibold text-ink truncate ${idx === 0 ? "text-yellow-600" : ""}`}>{emp.name}</span>
                              <span className="text-sm font-bold text-ink ml-2 flex-shrink-0">{emp.thisMonthScore} pts</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-ink/10 rounded-full h-1.5 overflow-hidden">
                                <motion.div
                                  className="h-1.5 rounded-full"
                                  style={{ background: idx === 0 ? "#ca8a04" : "#0f1f33" }}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ duration: 0.8, delay: idx * 0.05 }}
                                />
                              </div>
                              <span className="text-xs text-ink/40 flex-shrink-0">{emp.tasksThisMonth} tasks</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardBody>
            </CardComponent>
          </div>
        </motion.div>
      )}

      {/* Analytics error banner */}
      {analyticsError && (
        <motion.div variants={itemVariants}>
          <Alert variant="error">
            <p className="text-sm">{analyticsError} — charts may be incomplete.</p>
          </Alert>
        </motion.div>
      )}

      {/* App Version Control */}
      <motion.div variants={itemVariants}>
        <CardComponent variant="glass">
          <CardBody>
            <div className={`flex items-center justify-between mb-5 ${isRTL ? "flex-row-reverse" : ""}`}>
              <div className={`flex items-center gap-2.5 ${isRTL ? "flex-row-reverse" : ""}`}>
                <div className={`p-2 rounded-xl ${versionSettings.forceUpdate ? "bg-red-500/10" : "bg-ink/10"}`}>
                  {versionSettings.forceUpdate
                    ? <ShieldAlert className="w-5 h-5 text-red-500" />
                    : <Shield className="w-5 h-5 text-ink/70" />
                  }
                </div>
                <div>
                  <h2 className="text-lg font-bold text-ink">App Version Control</h2>
                  <p className="text-xs text-ink/50">Control the mobile app update gate</p>
                </div>
              </div>
              <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                {versionSaved && (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <Check className="w-3.5 h-3.5" /> Saved
                  </span>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={saveVersionSettings}
                  isLoading={versionSaving}
                  disabled={versionSaving || versionLoading}
                >
                  Save Changes
                </Button>
              </div>
            </div>

            {versionError && (
              <Alert variant="error" className="mb-4">
                <p className="text-sm">{versionError}</p>
              </Alert>
            )}

            {versionLoading ? (
              <div className="h-24 flex items-center justify-center text-ink/40 text-sm">Loading settings...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                {/* Force Update Toggle */}
                <div className={`rounded-xl border p-4 transition-all duration-300 ${versionSettings.forceUpdate ? "border-red-300 bg-red-50" : "border-ink/10 bg-white/50"}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-ink">Force Update</p>
                      <p className="text-xs text-ink/50 mt-0.5">Immediately block all users</p>
                    </div>
                    <Smartphone className={`w-4 h-4 mt-0.5 ${versionSettings.forceUpdate ? "text-red-500" : "text-ink/30"}`} />
                  </div>
                  <button
                    onClick={() => setVersionSettings(s => ({ ...s, forceUpdate: !s.forceUpdate }))}
                    className={`mt-2 relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 focus:outline-none ${versionSettings.forceUpdate ? "bg-red-500" : "bg-ink/20"}`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${versionSettings.forceUpdate ? "translate-x-6" : "translate-x-1"}`}
                    />
                  </button>
                  {versionSettings.forceUpdate && (
                    <p className="text-xs text-red-500 font-medium mt-2">⚠ All users are blocked now</p>
                  )}
                </div>

                {/* Minimum App Version */}
                <div className="rounded-xl border border-ink/10 bg-white/50 p-4">
                  <p className="text-sm font-semibold text-ink mb-0.5">Minimum Version</p>
                  <p className="text-xs text-ink/50 mb-3">Block users below this version</p>
                  <Input
                    value={versionSettings.minimumAppVersion}
                    onChange={(e) => setVersionSettings(s => ({ ...s, minimumAppVersion: e.target.value }))}
                    placeholder="e.g. 1.3.0"
                    className="font-mono"
                  />
                  <p className="text-xs text-ink/40 mt-1.5">Current app: 1.3.0</p>
                </div>

                {/* Update Message */}
                <div className="rounded-xl border border-ink/10 bg-white/50 p-4">
                  <p className="text-sm font-semibold text-ink mb-0.5">Update Message</p>
                  <p className="text-xs text-ink/50 mb-3">Shown to users on the update screen</p>
                  <textarea
                    value={versionSettings.updateMessage}
                    onChange={(e) => setVersionSettings(s => ({ ...s, updateMessage: e.target.value }))}
                    placeholder="e.g. إصدار جديد متاح الآن..."
                    rows={3}
                    className="w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm text-ink placeholder-ink/30 resize-none focus:outline-none focus:ring-2 focus:ring-ink/30 transition"
                    dir="auto"
                  />
                </div>
              </div>
            )}
          </CardBody>
        </CardComponent>
      </motion.div>

      {/* Projects Grid */}
      <motion.div variants={itemVariants}>
        <div className={`flex items-center justify-between mb-4 ${isRTL ? "flex-row-reverse" : ""}`}>
          <h2 className="text-2xl font-bold" style={{ color: BRAND }}>Projects</h2>
          <Link to="/cto-internal/projects">
            <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>View All</Button>
          </Link>
        </div>

        {projects.length === 0 ? (
          <CardComponent variant="glass">
            <CardBody>
              <div className="text-center py-12">
                <FolderOpen className="w-16 h-16 mx-auto mb-4 text-ink/20" />
                <p className="text-ink/60 text-lg mb-2">No projects yet</p>
                <Link to="/cto-internal/projects">
                  <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>Create Project</Button>
                </Link>
              </div>
            </CardBody>
          </CardComponent>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.slice(0, 6).map((project) => (
              <CardComponent key={project._id} variant="glass" hover>
                <CardBody>
                  <div className="space-y-3">
                    <div className={`flex items-start justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
                      <h3 className="text-base font-semibold text-ink flex-1 mr-2 leading-tight">{project.name}</h3>
                      {priorityBadge(project.priority)}
                    </div>
                    {project.description && (
                      <p className="text-xs text-ink/60 line-clamp-2">{project.description}</p>
                    )}
                    {project.taskCounts && (
                      <>
                        <div className="w-full bg-ink/10 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-1.5 rounded-full bg-green-500 transition-all"
                            style={{ width: project.taskCounts.total > 0 ? `${(project.taskCounts.done / project.taskCounts.total) * 100}%` : "0%" }}
                          />
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-xs text-gray-400">{project.taskCounts.todo} todo</span>
                          <span className="text-xs text-blue-400">{project.taskCounts.in_progress} active</span>
                          <span className="text-xs text-green-400">{project.taskCounts.done} done</span>
                        </div>
                      </>
                    )}
                    <Link to={`/cto-internal/projects/${project._id}`}>
                      <Button variant="outline" size="sm" className="w-full" rightIcon={<ArrowRight className="w-4 h-4" />}>
                        View Project
                      </Button>
                    </Link>
                  </div>
                </CardBody>
              </CardComponent>
            ))}
          </div>
        )}
      </motion.div>

      {/* Recent Tasks */}
      <motion.div variants={itemVariants}>
        <div className={`flex items-center justify-between mb-4 ${isRTL ? "flex-row-reverse" : ""}`}>
          <h2 className="text-2xl font-bold" style={{ color: BRAND }}>Recent Tasks</h2>
          <Link to="/cto-internal/tasks">
            <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>View All</Button>
          </Link>
        </div>
        <CardComponent variant="glass">
          <CardBody>
            {tasks.length === 0 ? (
              <div className="text-center py-8">
                <ListTodo className="w-12 h-12 mx-auto mb-3 text-ink/20" />
                <p className="text-ink/60">No tasks yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.slice(0, 8).map((task) => {
                  const assignees = Array.isArray(task.assignedTo) ? task.assignedTo : task.assignedTo ? [task.assignedTo as any] : [];
                  const statusCls =
                    task.status === "done" ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : task.status === "in_progress" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    : "bg-gray-500/20 text-gray-400 border border-gray-500/30";
                  return (
                    <div key={task._id} className={`flex items-center gap-4 p-3 rounded-lg hover:bg-ink/5 transition-colors ${isRTL ? "flex-row-reverse" : ""}`}>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-ink truncate text-sm">{task.title}</p>
                        {assignees.length > 0 && (
                          <p className="text-xs text-ink/50 mt-0.5">{assignees.map((u: any) => u.name).join(", ")}</p>
                        )}
                      </div>
                      <div className={`flex items-center gap-2 flex-shrink-0 ${isRTL ? "flex-row-reverse" : ""}`}>
                        {priorityBadge(task.priority)}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${statusCls}`}>
                          {task.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </CardComponent>
      </motion.div>

      {/* Override Employee of Month Modal */}
      <Modal isOpen={showOverrideModal} onClose={() => setShowOverrideModal(false)} title="Set Employee of the Month" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-ink/60">Manually select this month's winner. This overrides the automatic score-based selection.</p>
          {overrideError && <Alert variant="error"><p className="text-sm">{overrideError}</p></Alert>}
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Select Employee</label>
            <Select
              value={selectedUserId}
              onChange={setSelectedUserId}
              options={[
                { value: "", label: "Choose an employee..." },
                ...allUsers.map(u => ({ value: u._id, label: u.name })),
              ]}
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={() => setShowOverrideModal(false)} disabled={isSavingOverride}>Cancel</Button>
            <Button variant="primary" onClick={handleSetOverride} isLoading={isSavingOverride} disabled={isSavingOverride || !selectedUserId}>
              Set Winner
            </Button>
          </div>
        </div>
      </Modal>

    </motion.div>
  );
}
