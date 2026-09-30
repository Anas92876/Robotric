import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Clock,
  CalendarDays,
  CalendarCheck,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Flame,
  Inbox,
  Skull,
} from "lucide-react";
import { api } from "../../lib/api";
import {
  CardComponent,
  CardBody,
  Button,
  LoadingState,
  Alert,
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

interface DeadlineTask {
  _id: string;
  title: string;
  description?: string;
  priority: 1 | 2 | 3;
  status: "todo" | "in_progress" | "done";
  dueDate?: string;
  hardDeadline?: string;
  projectId: { _id: string; name: string } | string;
  createdAt: string;
}

type Bucket = "hard_breached" | "hard_soon" | "overdue" | "today" | "week" | "later";

interface BucketConfig {
  key: Bucket;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  bgClass: string;
  borderClass: string;
  headerClass: string;
  badgeClass: string;
  countClass: string;
  emptyText: string;
  isHard?: boolean;
}

const BUCKETS: BucketConfig[] = [
  {
    key: "hard_breached",
    label: "Hard Deadline MISSED",
    sublabel: "Critical — these were must-not-miss and are now past due",
    icon: <Flame className="w-5 h-5 animate-pulse" />,
    bgClass: "bg-red-100",
    borderClass: "border-red-400",
    headerClass: "text-red-700",
    badgeClass: "bg-red-200 text-red-800 border border-red-300",
    countClass: "bg-red-600 text-white",
    emptyText: "No hard deadlines breached",
    isHard: true,
  },
  {
    key: "hard_soon",
    label: "Hard Deadline Approaching",
    sublabel: "Critical deadlines within 48 hours — act now",
    icon: <AlertTriangle className="w-5 h-5" />,
    bgClass: "bg-orange-100",
    borderClass: "border-orange-400",
    headerClass: "text-orange-700",
    badgeClass: "bg-orange-200 text-orange-800 border border-orange-300",
    countClass: "bg-orange-600 text-white",
    emptyText: "No critical deadlines approaching",
    isHard: true,
  },
  {
    key: "overdue",
    label: "Soft Deadline Overdue",
    sublabel: "Past the expected date — needs attention",
    icon: <Clock className="w-5 h-5" />,
    bgClass: "bg-yellow-50",
    borderClass: "border-yellow-300",
    headerClass: "text-yellow-700",
    badgeClass: "bg-yellow-100 text-yellow-700 border border-yellow-200",
    countClass: "bg-yellow-500 text-white",
    emptyText: "No overdue tasks",
  },
  {
    key: "today",
    label: "Due Today",
    sublabel: "Must be completed by end of day",
    icon: <AlertCircle className="w-5 h-5" />,
    bgClass: "bg-orange-50",
    borderClass: "border-orange-200",
    headerClass: "text-orange-600",
    badgeClass: "bg-orange-100 text-orange-700 border border-orange-200",
    countClass: "bg-orange-500 text-white",
    emptyText: "Nothing due today",
  },
  {
    key: "week",
    label: "Due This Week",
    sublabel: "Coming up in the next 7 days",
    icon: <CalendarDays className="w-5 h-5" />,
    bgClass: "bg-blue-50",
    borderClass: "border-blue-200",
    headerClass: "text-blue-600",
    badgeClass: "bg-blue-100 text-blue-700 border border-blue-200",
    countClass: "bg-blue-500 text-white",
    emptyText: "Nothing due this week",
  },
  {
    key: "later",
    label: "Upcoming",
    sublabel: "More than 7 days away",
    icon: <CalendarCheck className="w-5 h-5" />,
    bgClass: "bg-gray-50",
    borderClass: "border-gray-200",
    headerClass: "text-gray-600",
    badgeClass: "bg-gray-100 text-gray-600 border border-gray-200",
    countClass: "bg-gray-500 text-white",
    emptyText: "No upcoming tasks",
  },
];

const priorityLabel: Record<number, { label: string; cls: string }> = {
  1: { label: "P1", cls: "bg-red-500/20 text-red-500 border border-red-500/30" },
  2: { label: "P2", cls: "bg-orange-500/20 text-orange-500 border border-orange-500/30" },
  3: { label: "P3", cls: "bg-green-500/20 text-green-500 border border-green-500/30" },
};

const statusLabel: Record<string, { label: string; cls: string }> = {
  todo: { label: "To Do", cls: "bg-gray-100 text-gray-600 border border-gray-200" },
  in_progress: { label: "In Progress", cls: "bg-blue-100 text-blue-600 border border-blue-200" },
  done: { label: "Done", cls: "bg-green-100 text-green-600 border border-green-200" },
};

function daysLabel(dueDate: string, now: Date): string {
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    const abs = Math.abs(diffDays);
    return abs === 1 ? "1 day overdue" : `${abs} days overdue`;
  }
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  return `Due in ${diffDays} days`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function getProjectName(task: DeadlineTask): string {
  if (!task.projectId || typeof task.projectId === "string") return "";
  return task.projectId.name;
}

function bucketTasks(tasks: DeadlineTask[], now: Date): Record<Bucket, DeadlineTask[]> {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const endOfWeek = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const result: Record<Bucket, DeadlineTask[]> = {
    hard_breached: [], hard_soon: [], overdue: [], today: [], week: [], later: [],
  };

  for (const task of tasks) {
    if (task.status === "done") continue;

    if (task.hardDeadline) {
      const hard = new Date(task.hardDeadline);
      if (hard < now) { result.hard_breached.push(task); continue; }
      if (hard <= in48h) { result.hard_soon.push(task); continue; }
    }

    if (!task.dueDate) continue;
    const due = new Date(task.dueDate);
    if (due < startOfToday) {
      result.overdue.push(task);
    } else if (due <= endOfToday) {
      result.today.push(task);
    } else if (due <= endOfWeek) {
      result.week.push(task);
    } else {
      result.later.push(task);
    }
  }

  const sortDate = (t: DeadlineTask) =>
    new Date((t.hardDeadline || t.dueDate) ?? t.createdAt).getTime();
  for (const key of Object.keys(result) as Bucket[]) {
    result[key].sort((a, b) => a.priority - b.priority || sortDate(a) - sortDate(b));
  }

  return result;
}

export default function EngineerDeadlines() {
  const { i18n } = useTranslation(["dashboardCommon"]);
  const isRTL = i18n.language === "ar";

  const [tasks, setTasks] = useState<DeadlineTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<Bucket, boolean>>({
    hard_breached: false,
    hard_soon: false,
    overdue: false,
    today: false,
    week: false,
    later: true,
  });
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await api.get("/engineer/tasks");
      const all: DeadlineTask[] = res.data.data || [];
      setTasks(all.filter(t => t.dueDate || t.hardDeadline));
    } catch (e: any) {
      setFetchError(e.response?.data?.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const updateStatus = async (taskId: string, status: "in_progress" | "done") => {
    setActionId(taskId);
    try {
      await api.patch(`/engineer/tasks/${taskId}/status`, { status });
      setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status } : t));
    } catch { /* silent */ } finally {
      setActionId(null);
    }
  };

  const toggleBucket = (key: Bucket) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) return <LoadingState type="skeleton" text="Loading your deadlines..." />;

  const now = new Date();
  const bucketed = bucketTasks(tasks, now);
  const criticalCount = bucketed.hard_breached.length + bucketed.hard_soon.length;
  const softWarningCount = bucketed.overdue.length + bucketed.today.length;
  const allClear = Object.values(bucketed).every(b => b.length === 0);
  const noDeadlineTasks = tasks.length === 0;

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>

      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
          <div>
            <h1
              className="text-4xl font-bold inline-block"
              style={{ color: '#0f1f33', backgroundClip: "text" }}
            >
              My Deadlines
            </h1>
            <p className="mt-2" style={{ color: "#0f1f33CC" }}>
              Your tasks grouped by urgency
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={fetchTasks}>
              Refresh
            </Button>
            <Link to="/engineer/tasks">
              <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                All Tasks
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Error */}
      {fetchError && (
        <motion.div variants={itemVariants}>
          <Alert variant="error">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm">{fetchError}</p>
            </div>
          </Alert>
        </motion.div>
      )}

      {/* Summary banner */}
      {!noDeadlineTasks && (
        <motion.div variants={itemVariants}>
          {allClear ? (
            <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-green-50 border border-green-200">
              <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-700">All caught up!</p>
                <p className="text-sm text-green-600">No overdue or upcoming tasks — great work.</p>
              </div>
            </div>
          ) : criticalCount > 0 ? (
            <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-red-100 border-2 border-red-500">
              <Skull className="w-6 h-6 text-red-600 flex-shrink-0 animate-pulse" />
              <div>
                <p className="font-bold text-red-700 text-base">
                  {bucketed.hard_breached.length > 0 && `${bucketed.hard_breached.length} HARD deadline${bucketed.hard_breached.length !== 1 ? "s" : ""} MISSED`}
                  {bucketed.hard_breached.length > 0 && bucketed.hard_soon.length > 0 && " · "}
                  {bucketed.hard_soon.length > 0 && `${bucketed.hard_soon.length} critical deadline${bucketed.hard_soon.length !== 1 ? "s" : ""} within 48h`}
                </p>
                <p className="text-sm text-red-600">Contact your manager immediately</p>
              </div>
            </div>
          ) : softWarningCount > 0 ? (
            <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-yellow-50 border border-yellow-300">
              <Flame className="w-6 h-6 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-yellow-700">
                  {softWarningCount} task{softWarningCount !== 1 ? "s" : ""} past their expected date
                </p>
                <p className="text-sm text-yellow-600">
                  {bucketed.overdue.length > 0 && `${bucketed.overdue.length} overdue`}
                  {bucketed.overdue.length > 0 && bucketed.today.length > 0 && " · "}
                  {bucketed.today.length > 0 && `${bucketed.today.length} due today`}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-blue-50 border border-blue-200">
              <Clock className="w-6 h-6 text-blue-500 flex-shrink-0" />
              <div>
                <p className="font-semibold text-blue-700">Upcoming deadlines</p>
                <p className="text-sm text-blue-600">
                  {bucketed.week.length + bucketed.later.length} task{bucketed.week.length + bucketed.later.length !== 1 ? "s" : ""} scheduled ahead
                </p>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* No tasks with deadlines */}
      {noDeadlineTasks && !fetchError && (
        <motion.div variants={itemVariants}>
          <CardComponent variant="glass">
            <CardBody>
              <div className="text-center py-16">
                <Inbox className="w-14 h-14 mx-auto mb-4 text-ink/20" />
                <p className="text-lg font-semibold text-ink/60 mb-1">No deadline-tracked tasks</p>
                <p className="text-sm text-ink/40">Tasks with due dates assigned to you will appear here.</p>
                <Link to="/engineer/tasks" className="mt-4 inline-block">
                  <Button variant="primary" size="sm" leftIcon={<ArrowRight className="w-4 h-4" />}>Go to My Tasks</Button>
                </Link>
              </div>
            </CardBody>
          </CardComponent>
        </motion.div>
      )}

      {/* Buckets */}
      {!noDeadlineTasks && BUCKETS.map((bucket) => {
        const items = bucketed[bucket.key];
        const isCollapsed = collapsed[bucket.key];

        return (
          <motion.div key={bucket.key} variants={itemVariants}>
            <button
              onClick={() => toggleBucket(bucket.key)}
              className={`w-full flex items-center justify-between px-5 py-3.5 rounded-xl border transition-all duration-200 hover:shadow-sm ${bucket.bgClass} ${bucket.borderClass}`}
            >
              <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                <span className={bucket.headerClass}>{bucket.icon}</span>
                <div className={isRTL ? "text-right" : "text-left"}>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-base ${bucket.headerClass}`}>{bucket.label}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${bucket.countClass}`}>{items.length}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{bucket.sublabel}</p>
                </div>
              </div>
              <span className="text-gray-400">
                {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </span>
            </button>

            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 space-y-2">
                    {items.length === 0 ? (
                      <div className={`flex items-center gap-2 px-5 py-4 rounded-xl border border-dashed ${bucket.borderClass} text-sm text-gray-400`}>
                        <CheckCircle className="w-4 h-4 flex-shrink-0 text-green-400" />
                        {bucket.emptyText}
                      </div>
                    ) : (
                      items.map((task) => {
                        const project = getProjectName(task);
                        const pInfo = priorityLabel[task.priority] || priorityLabel[3];
                        const sInfo = statusLabel[task.status] || statusLabel.todo;
                        const displayDate = task.hardDeadline || task.dueDate;
                        const dayStr = displayDate ? daysLabel(displayDate, now) : "";
                        const isDone = task.status === "done";
                        const isActing = actionId === task._id;

                        return (
                          <motion.div
                            key={task._id}
                            layout
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: isDone ? 0.5 : 1, x: 0 }}
                            className={`flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${bucket.isHard ? "bg-red-50" : "bg-white"} ${bucket.borderClass} ${isRTL ? "flex-row-reverse" : ""}`}
                          >
                            {/* Priority stripe */}
                            <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${task.priority === 1 ? "bg-red-400" : task.priority === 2 ? "bg-orange-400" : "bg-green-400"}`} />

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className={`flex items-start justify-between gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                                <p className={`font-semibold text-ink text-sm leading-snug ${isDone ? "line-through opacity-60" : ""}`}>
                                  {task.title}
                                </p>
                                <div className={`flex items-center gap-1.5 flex-shrink-0 ${isRTL ? "flex-row-reverse" : ""}`}>
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${pInfo.cls}`}>{pInfo.label}</span>
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${sInfo.cls}`}>{sInfo.label}</span>
                                </div>
                              </div>

                              {task.description && (
                                <p className="text-xs text-ink/50 mt-1 line-clamp-1">{task.description}</p>
                              )}

                              <div className={`flex items-center flex-wrap gap-3 mt-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                                {task.hardDeadline && (
                                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300">
                                    <Skull className="w-3 h-3" />
                                    Hard: {formatDate(task.hardDeadline)} · {daysLabel(task.hardDeadline, now)}
                                  </span>
                                )}
                                {task.dueDate && (
                                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${task.hardDeadline ? "bg-gray-100 text-gray-500 border border-gray-200" : bucket.badgeClass}`}>
                                    <Clock className="w-3 h-3" />
                                    {task.hardDeadline ? "Soft: " : ""}{formatDate(task.dueDate)}
                                    {!task.hardDeadline && dayStr && ` · ${dayStr}`}
                                  </span>
                                )}
                                {project && (
                                  <span className="text-xs text-ink/40 flex items-center gap-1">
                                    <span className="w-1 h-1 rounded-full bg-ink/20 inline-block" />
                                    {project}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Action buttons */}
                            <div className={`flex items-center gap-1.5 flex-shrink-0 ${isRTL ? "flex-row-reverse" : ""}`}>
                              {!isDone ? (
                                <button
                                  onClick={() => updateStatus(task._id, "done")}
                                  disabled={isActing}
                                  title="Mark as done"
                                  className="flex items-center justify-center w-8 h-8 rounded-lg border border-ink/20 hover:bg-green-50 hover:border-green-400 hover:text-green-600 transition-all text-ink/30 disabled:opacity-40"
                                >
                                  {isActing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                </button>
                              ) : (
                                <button
                                  onClick={() => updateStatus(task._id, "in_progress")}
                                  disabled={isActing}
                                  title="Undo — move back to In Progress"
                                  className="flex items-center justify-center w-8 h-8 rounded-lg border border-ink/10 hover:bg-yellow-50 hover:border-yellow-400 hover:text-yellow-600 transition-all text-ink/20 disabled:opacity-40"
                                >
                                  {isActing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                </button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
