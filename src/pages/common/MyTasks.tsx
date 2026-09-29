import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ListTodo,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Calendar,
  FolderOpen,
  ZoomIn,
  Clock,
  Skull,
  ChevronDown,
  ChevronUp,
  Play,
  RotateCcw,
  Flame,
  AlarmClock,
} from "lucide-react";
import { useEngineerTasks } from "../../hooks/engineer/useEngineerTasks";
import { useAuth } from "../../providers/AuthProvider";
import SubTaskPanel from "../../components/cto/SubTaskPanel";
import ExtensionRequestPanel from "../../components/cto/ExtensionRequestPanel";
import SubmissionPanel from "../../components/cto/SubmissionPanel";
import {
  CardComponent,
  CardBody,
  Button,
  LoadingState,
  Alert,
  Select,
} from "../../components/ui";
import { useTranslation } from "react-i18next";
import type { InternalTask } from "../../hooks/cto/useCTOProjects";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDueMeta(task: InternalTask): {
  label: string;
  urgency: "overdue" | "today" | "soon" | "ok" | "none";
  daysLeft: number | null;
} {
  const ref = task.hardDeadline || task.dueDate;
  if (!ref) return { label: "", urgency: "none", daysLeft: null };
  const now = new Date();
  const due = new Date(ref);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  let label = "";
  if (diffDays < 0) label = `${Math.abs(diffDays)}d overdue`;
  else if (diffDays === 0) label = "Due today";
  else if (diffDays === 1) label = "Due tomorrow";
  else label = `${diffDays}d left`;

  let urgency: "overdue" | "today" | "soon" | "ok" = "ok";
  if (diffDays < 0) urgency = "overdue";
  else if (diffDays === 0) urgency = "today";
  else if (diffDays <= 3) urgency = "soon";

  return { label, urgency, daysLeft: diffDays };
}

function formatDateShort(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const PRIORITY_CFG = {
  1: { label: "Critical", short: "P1", bar: "#ef4444", badge: "bg-red-500/15 text-red-500 border-red-500/30" },
  2: { label: "High",     short: "P2", bar: "#f97316", badge: "bg-orange-500/15 text-orange-500 border-orange-500/30" },
  3: { label: "Normal",   short: "P3", bar: "#22c55e", badge: "bg-green-500/15 text-green-500 border-green-500/30" },
} as const;

const STATUS_CFG = {
  todo:        { label: "To Do",       dot: "bg-gray-400",  ring: "bg-gray-100 text-gray-600 border-gray-200" },
  in_progress: { label: "In Progress", dot: "bg-blue-500",  ring: "bg-blue-100 text-blue-600 border-blue-200" },
  done:        { label: "Done",        dot: "bg-green-500", ring: "bg-green-100 text-green-600 border-green-200" },
} as const;

const URGENCY_STYLES = {
  overdue: { chip: "bg-red-100 text-red-600 border-red-200",   icon: <Flame    className="w-3 h-3" /> },
  today:   { chip: "bg-orange-100 text-orange-600 border-orange-200", icon: <AlarmClock className="w-3 h-3" /> },
  soon:    { chip: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: <Clock  className="w-3 h-3" /> },
  ok:      { chip: "bg-gray-100 text-gray-500 border-gray-200",  icon: <Calendar className="w-3 h-3" /> },
  none:    { chip: "",                                           icon: null },
};

// ─── Attachment lightbox strip ────────────────────────────────────────────────

function AttachmentStrip({ attachments }: { attachments?: { url: string; publicId: string; name?: string }[] }) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  if (!attachments || attachments.length === 0) return null;
  return (
    <div className="mt-3 pt-3 border-t border-[#003300]/8">
      <p className="text-[10px] text-[#003300]/40 font-semibold uppercase tracking-wide mb-2">
        Reference images from manager
      </p>
      <div className="flex flex-wrap gap-2">
        {attachments.map(img => (
          <div
            key={img.publicId}
            className="relative group w-16 h-16 rounded-lg border border-[#003300]/10 overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-shadow"
            onClick={() => setLightbox(img.url)}
          >
            <img src={img.url} alt={img.name || "ref"} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
              <ZoomIn className="w-4 h-4 text-white drop-shadow" />
            </div>
          </div>
        ))}
      </div>
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="preview"
            className="max-w-full max-h-full rounded-xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center bg-white/15 hover:bg-white/25 rounded-full transition-colors"
          >
            <span className="text-white text-sm font-bold">✕</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Single task card ─────────────────────────────────────────────────────────

function TaskCard({
  task,
  updatingId,
  onStatusUpdate,
  currentUserId,
  isRTL,
}: {
  task: InternalTask;
  updatingId: string | null;
  onStatusUpdate: (id: string, status: "todo" | "in_progress" | "done") => void;
  currentUserId?: string;
  isRTL: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const due = getDueMeta(task);
  const pCfg = PRIORITY_CFG[task.priority];
  const sCfg = STATUS_CFG[task.status];
  const uStyle = URGENCY_STYLES[due.urgency];
  const isDone = task.status === "done";
  const isUpdating = updatingId === task._id;

  const getProjectName = () => {
    if (typeof task.projectId === "object" && task.projectId !== null) return task.projectId.name;
    return "-";
  };

  const urgencyBorder = !isDone && due.urgency === "overdue" ? "#ef4444"
    : !isDone && due.urgency === "today"   ? "#f97316"
    : !isDone && due.urgency === "soon"    ? "#eab308"
    : pCfg.bar;

  return (
    <motion.div variants={itemVariants} layout>
      <div
        className={`rounded-2xl border bg-white shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden ${
          !isDone && due.urgency === "overdue" ? "border-red-200" :
          !isDone && due.urgency === "today"   ? "border-orange-200" :
          "border-[#003300]/10"
        }`}
      >
        {!isDone && (due.urgency === "overdue" || due.urgency === "today") && (
          <div className={`h-1 w-full ${due.urgency === "overdue" ? "bg-red-400" : "bg-orange-400"}`} />
        )}

        <div className="p-4">
          <div className={`flex items-start gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
            <div
              className="w-1 self-stretch rounded-full flex-shrink-0 min-h-[2.5rem]"
              style={{ background: urgencyBorder }}
            />

            <div className="flex-1 min-w-0">
              <div className={`flex items-start justify-between gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                <div className="flex-1 min-w-0">
                  <div className={`flex items-center gap-2 flex-wrap ${isRTL ? "flex-row-reverse" : ""}`}>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${pCfg.badge}`}>
                      {pCfg.short}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${sCfg.ring}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sCfg.dot} inline-block`} />
                      {sCfg.label}
                    </span>
                    {task.hardDeadline && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">
                        <Skull className="w-2.5 h-2.5" /> Hard deadline
                      </span>
                    )}
                  </div>
                  <p className={`font-semibold text-[#003300] mt-1.5 leading-snug ${isDone ? "line-through opacity-50" : ""}`}>
                    {task.title}
                  </p>
                </div>

                <button
                  onClick={() => setExpanded(v => !v)}
                  className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-[#003300]/30 hover:text-[#003300]/60 hover:bg-[#003300]/5 transition-colors mt-0.5"
                >
                  {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {!expanded && task.description && (
                <p className="text-sm text-[#003300]/45 mt-1.5 line-clamp-1">{task.description}</p>
              )}

              <div className={`flex items-center gap-3 mt-2.5 flex-wrap ${isRTL ? "flex-row-reverse" : ""}`}>
                <span className={`flex items-center gap-1 text-xs text-[#003300]/40 ${isRTL ? "flex-row-reverse" : ""}`}>
                  <FolderOpen className="w-3 h-3" />
                  {getProjectName()}
                </span>

                {due.urgency !== "none" && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${uStyle.chip}`}>
                    {uStyle.icon}
                    {due.label}
                  </span>
                )}

                {task.hardDeadline && (
                  <span className="text-xs text-[#003300]/35 flex items-center gap-1">
                    <Skull className="w-2.5 h-2.5 text-red-400" />
                    Hard: {formatDateShort(task.hardDeadline)}
                  </span>
                )}

                {task.dueDate && !task.hardDeadline && (
                  <span className="text-xs text-[#003300]/35 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDateShort(task.dueDate)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className={`flex items-center gap-2 mt-3 pt-3 border-t border-[#003300]/8 flex-wrap ${isRTL ? "flex-row-reverse" : ""}`}>
            {task.status === "todo" && (
              <Button
                variant="primary"
                size="sm"
                isLoading={isUpdating}
                disabled={!!updatingId}
                leftIcon={<Play className="w-3.5 h-3.5" />}
                onClick={() => onStatusUpdate(task._id, "in_progress")}
              >
                Start Task
              </Button>
            )}

            {task.status === "in_progress" && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={isUpdating}
                  disabled={!!updatingId}
                  leftIcon={<CheckCircle className="w-3.5 h-3.5" />}
                  onClick={() => onStatusUpdate(task._id, "done")}
                >
                  Mark Done
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  isLoading={isUpdating}
                  disabled={!!updatingId}
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  onClick={() => onStatusUpdate(task._id, "todo")}
                >
                  Move Back
                </Button>
              </>
            )}

            {task.status === "done" && (
              <>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-500/15 text-green-600 border border-green-500/25">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Completed
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  isLoading={isUpdating}
                  disabled={!!updatingId}
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  onClick={() => onStatusUpdate(task._id, "in_progress")}
                >
                  Undo
                </Button>
              </>
            )}
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-1 border-t border-[#003300]/8 pt-3">
                {task.description && (
                  <p className="text-sm text-[#003300]/60 leading-relaxed">{task.description}</p>
                )}
                <AttachmentStrip attachments={task.attachments} />
                <div className="pt-1">
                  <SubTaskPanel taskId={task._id} mode="employee" currentUserId={currentUserId} />
                </div>
                <SubmissionPanel taskId={task._id} mode="employee" initialSubmission={task.submission} />
                <ExtensionRequestPanel taskId={task._id} taskDueDate={task.dueDate} taskHardDeadline={task.hardDeadline} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type TabStatus = "all" | "todo" | "in_progress" | "done";

const TAB_DEFS: { key: TabStatus; label: string; dot?: string }[] = [
  { key: "all",         label: "All" },
  { key: "todo",        label: "To Do",      dot: "bg-gray-400" },
  { key: "in_progress", label: "In Progress", dot: "bg-blue-500" },
  { key: "done",        label: "Done",        dot: "bg-green-500" },
];

export default function MyTasks() {
  const { projects, tasks, isLoading, error, getMyProjects, getMyTasks, updateTaskStatus } = useEngineerTasks();
  const { user } = useAuth();
  const { i18n } = useTranslation(["dashboardCommon"]);
  const isRTL = i18n.language === "ar";

  const [activeTab, setActiveTab] = useState<TabStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    getMyProjects();
    getMyTasks();
  }, [getMyProjects, getMyTasks]);

  useEffect(() => {
    getMyTasks({
      priority: priorityFilter !== "all" ? parseInt(priorityFilter) as 1 | 2 | 3 : undefined,
      projectId: projectFilter !== "all" ? projectFilter : undefined,
    });
  }, [priorityFilter, projectFilter]);

  const handleStatusUpdate = async (taskId: string, status: "todo" | "in_progress" | "done") => {
    setUpdatingId(taskId);
    try {
      await updateTaskStatus(taskId, status);
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const tabCounts = useMemo(() => ({
    all:         tasks.length,
    todo:        tasks.filter(t => t.status === "todo").length,
    in_progress: tasks.filter(t => t.status === "in_progress").length,
    done:        tasks.filter(t => t.status === "done").length,
  }), [tasks]);

  const urgencyCounts = useMemo(() => {
    const active = tasks.filter(t => t.status !== "done");
    return {
      overdue: active.filter(t => getDueMeta(t).urgency === "overdue").length,
      today:   active.filter(t => getDueMeta(t).urgency === "today").length,
      soon:    active.filter(t => getDueMeta(t).urgency === "soon").length,
    };
  }, [tasks]);

  const displayTasks = useMemo(() => {
    let list = activeTab === "all" ? tasks : tasks.filter(t => t.status === activeTab);
    const urgencyOrder = { overdue: 0, today: 1, soon: 2, ok: 3, none: 4 };
    list = [...list].sort((a, b) => {
      if (a.status === "done" && b.status !== "done") return 1;
      if (b.status === "done" && a.status !== "done") return -1;
      const ua = getDueMeta(a).urgency;
      const ub = getDueMeta(b).urgency;
      if (urgencyOrder[ua] !== urgencyOrder[ub]) return urgencyOrder[ua] - urgencyOrder[ub];
      return a.priority - b.priority;
    });
    return list;
  }, [tasks, activeTab]);

  if (isLoading && tasks.length === 0) {
    return <LoadingState type="skeleton" text="Loading your tasks..." />;
  }

  if (error && tasks.length === 0) {
    return (
      <Alert variant="error">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold mb-1">Failed to load tasks</p>
            <p className="text-sm opacity-90">{error}</p>
          </div>
          <Button variant="ghost" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={() => getMyTasks()}>
            Retry
          </Button>
        </div>
      </Alert>
    );
  }

  const hasUrgent = urgencyCounts.overdue > 0 || urgencyCounts.today > 0;

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-5">

      {/* ── Header ── */}
      <motion.div variants={itemVariants} className={isRTL ? "text-right" : ""}>
        <h1
          className="text-4xl font-bold inline-block"
          style={{
            color: '#003300',
            backgroundClip: "text",
          }}
        >
          My Tasks
        </h1>
        <p className="mt-1.5" style={{ color: "#003300CC" }}>
          All tasks assigned to you
        </p>
      </motion.div>

      {/* ── Urgency alert banner ── */}
      {hasUrgent && (
        <motion.div variants={itemVariants}>
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 ${urgencyCounts.overdue > 0 ? "bg-red-50 border-red-300" : "bg-orange-50 border-orange-300"}`}>
            {urgencyCounts.overdue > 0
              ? <Flame className="w-5 h-5 text-red-500 flex-shrink-0 animate-pulse" />
              : <AlarmClock className="w-5 h-5 text-orange-500 flex-shrink-0" />}
            <p className={`text-sm font-semibold ${urgencyCounts.overdue > 0 ? "text-red-700" : "text-orange-700"}`}>
              {urgencyCounts.overdue > 0 && `${urgencyCounts.overdue} overdue task${urgencyCounts.overdue !== 1 ? "s" : ""}`}
              {urgencyCounts.overdue > 0 && urgencyCounts.today > 0 && "  ·  "}
              {urgencyCounts.today > 0 && `${urgencyCounts.today} due today`}
              {urgencyCounts.soon > 0 && (urgencyCounts.overdue > 0 || urgencyCounts.today > 0)
                ? `  ·  ${urgencyCounts.soon} due within 3 days`
                : urgencyCounts.soon > 0
                ? `${urgencyCounts.soon} due within 3 days`
                : ""}
            </p>
          </div>
        </motion.div>
      )}

      {/* ── Stats strip ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total",       value: tasks.length,          color: "text-[#003300]",  bg: "bg-[#003300]/5" },
          { label: "To Do",       value: tabCounts.todo,         color: "text-gray-500",   bg: "bg-gray-50" },
          { label: "In Progress", value: tabCounts.in_progress,  color: "text-blue-600",   bg: "bg-blue-50" },
          { label: "Done",        value: tabCounts.done,         color: "text-green-600",  bg: "bg-green-50" },
        ].map(stat => (
          <div key={stat.label} className={`${stat.bg} rounded-xl px-4 py-3 border border-[#003300]/8`}>
            <p className="text-xs text-[#003300]/50 font-medium">{stat.label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </motion.div>

      {/* ── Status tabs + filters ── */}
      <motion.div variants={itemVariants} className={`flex items-center justify-between gap-3 flex-wrap ${isRTL ? "flex-row-reverse" : ""}`}>
        <div className="flex items-center gap-1 bg-[#003300]/5 rounded-xl p-1">
          {TAB_DEFS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                activeTab === tab.key
                  ? "bg-white text-[#003300] shadow-sm"
                  : "text-[#003300]/50 hover:text-[#003300]/80"
              }`}
            >
              {tab.dot && <span className={`w-1.5 h-1.5 rounded-full ${tab.dot} inline-block`} />}
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                activeTab === tab.key ? "bg-[#003300]/10 text-[#003300]" : "bg-[#003300]/8 text-[#003300]/40"
              }`}>
                {tabCounts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
          <Select
            value={priorityFilter}
            onChange={setPriorityFilter}
            options={[
              { value: "all", label: "All Priority" },
              { value: "1",   label: "P1 - Critical" },
              { value: "2",   label: "P2 - High" },
              { value: "3",   label: "P3 - Normal" },
            ]}
          />
          {projects.length > 0 && (
            <Select
              value={projectFilter}
              onChange={setProjectFilter}
              options={[
                { value: "all", label: "All Projects" },
                ...projects.map(p => ({ value: p._id, label: p.name })),
              ]}
            />
          )}
        </div>
      </motion.div>

      {/* ── Task list ── */}
      {displayTasks.length === 0 ? (
        <motion.div variants={itemVariants}>
          <CardComponent variant="glass">
            <CardBody>
              <div className="text-center py-14">
                <ListTodo className="w-14 h-14 mx-auto mb-4 text-[#003300]/15" />
                <p className="text-[#003300]/50 text-lg font-medium mb-1">No tasks found</p>
                <p className="text-[#003300]/35 text-sm">
                  {activeTab !== "all" || priorityFilter !== "all" || projectFilter !== "all"
                    ? "Try adjusting the filters or switching tabs"
                    : "No tasks assigned to you yet"}
                </p>
              </div>
            </CardBody>
          </CardComponent>
        </motion.div>
      ) : (
        <motion.div variants={containerVariants} className="space-y-3">
          {displayTasks.map(task => (
            <TaskCard
              key={task._id}
              task={task}
              updatingId={updatingId}
              onStatusUpdate={handleStatusUpdate}
              currentUserId={user?._id || user?.id}
              isRTL={isRTL}
            />
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
