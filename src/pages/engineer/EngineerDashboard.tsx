import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle,
  Clock,
  ListTodo,
  AlertCircle,
  RefreshCw,
  FolderOpen,
} from "lucide-react";
import { useEngineerTasks } from "../../hooks/engineer/useEngineerTasks";
import type { InternalTask } from "../../hooks/cto/useCTOProjects";
import {
  CardComponent,
  CardBody,
  Button,
  LoadingState,
  Alert,
} from "../../components/ui";
import { useAuth } from "../../providers/AuthProvider";
import { useTranslation } from "react-i18next";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const priorityBadge = (priority: 1 | 2 | 3) => {
  if (priority === 1) return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">P1</span>;
  if (priority === 2) return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30">P2</span>;
  return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">P3</span>;
};

const statusBadgeClass = (status: string) => {
  if (status === "done") return "bg-green-500/20 text-green-400 border border-green-500/30";
  if (status === "in_progress") return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
  return "bg-gray-500/20 text-gray-400 border border-gray-500/30";
};

type HistoryFilter = "all" | "in_progress" | "done_today" | "done_week" | "done_month";

const historyTabs: { label: string; value: HistoryFilter }[] = [
  { label: "All", value: "all" },
  { label: "In Progress", value: "in_progress" },
  { label: "Done Today", value: "done_today" },
  { label: "Done This Week", value: "done_week" },
  { label: "Done This Month", value: "done_month" },
];

export default function EngineerDashboard() {
  const { user } = useAuth();
  const { tasks, isLoading, error, getMyTasks, updateTaskStatus } = useEngineerTasks();
  const { i18n } = useTranslation(["dashboardCommon"]);
  const isRTL = i18n.language === "ar";

  const [activeTab, setActiveTab] = useState<HistoryFilter>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    getMyTasks();
  }, [getMyTasks]);

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

  const isToday = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  };

  const isThisWeek = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    return d >= weekAgo;
  };

  const isThisMonth = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  };

  const getFilteredTasks = (): InternalTask[] => {
    switch (activeTab) {
      case "in_progress":
        return tasks.filter(t => t.status === "in_progress");
      case "done_today":
        return tasks.filter(t => t.status === "done" && isToday(t.completedAt));
      case "done_week":
        return tasks.filter(t => t.status === "done" && isThisWeek(t.completedAt));
      case "done_month":
        return tasks.filter(t => t.status === "done" && isThisMonth(t.completedAt));
      default:
        return tasks;
    }
  };

  // Group tasks by project
  const groupByProject = (taskList: InternalTask[]) => {
    const groups: Record<string, { projectName: string; tasks: InternalTask[] }> = {};
    taskList.forEach(task => {
      const projectId = typeof task.projectId === "object" ? task.projectId._id : task.projectId;
      const projectName = typeof task.projectId === "object" ? task.projectId.name : projectId;
      if (!groups[projectId]) {
        groups[projectId] = { projectName, tasks: [] };
      }
      groups[projectId].tasks.push(task);
    });
    // Sort each group by priority
    Object.values(groups).forEach(group => {
      group.tasks.sort((a, b) => a.priority - b.priority);
    });
    return groups;
  };

  const filteredTasks = getFilteredTasks();
  const groupedTasks = groupByProject(filteredTasks);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const now = new Date();
    const isOverdue = d < now;
    return { text: d.toLocaleDateString(), overdue: isOverdue && true };
  };

  if (isLoading && tasks.length === 0) {
    return <LoadingState type="skeleton" text="Loading your dashboard..." />;
  }

  if (error && tasks.length === 0) {
    return (
      <Alert variant="error">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold mb-1">Failed to load dashboard</p>
            <p className="text-sm opacity-90">{error}</p>
          </div>
          <Button variant="ghost" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={() => getMyTasks()}>
            Retry
          </Button>
        </div>
      </Alert>
    );
  }

  const totalTasks = tasks.length;
  const todoTasks = tasks.filter(t => t.status === "todo").length;
  const inProgressTasks = tasks.filter(t => t.status === "in_progress").length;
  const doneTasks = tasks.filter(t => t.status === "done").length;

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-8">
      {/* Header */}
      <motion.div variants={itemVariants} className={isRTL ? "text-right" : ""}>
        <h1
          className="text-4xl font-bold inline-block"
          style={{
            color: '#003300',
            backgroundClip: "text",
          }}
        >
          My Dashboard
        </h1>
        <p className="mt-2" style={{ color: "#003300CC" }}>
          Welcome back, {user?.name || "Programmer"}
        </p>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {[
          { label: "Total Tasks", value: totalTasks, icon: <ListTodo className="w-8 h-8" />, color: "#003300" },
          { label: "To Do", value: todoTasks, icon: <ListTodo className="w-8 h-8" />, color: "#6b7280" },
          { label: "In Progress", value: inProgressTasks, icon: <Clock className="w-8 h-8" />, color: "#3b82f6" },
          { label: "Done", value: doneTasks, icon: <CheckCircle className="w-8 h-8" />, color: "#22c55e" },
        ].map(card => (
          <div key={card.label} className="relative group">
            <div className="relative bg-white rounded-xl p-6 border border-[#003300]/20 hover:border-[#003300]/40 hover:shadow-xl transition-all duration-500 group/card overflow-hidden">
              <div className="absolute inset-0 bg-[#003300]/10 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 rounded-xl -z-10" />
              <div className="flex items-center justify-between mb-4">
                <div
                  className="p-3 rounded-xl"
                  style={{ background: "#003300", color: "#ffffcc" }}
                >
                  {card.icon}
                </div>
                <div
                  className="text-3xl font-bold"
                  style={{ color: card.color }}
                >
                  {card.value}
                </div>
              </div>
              <h3 className="text-base font-semibold" style={{ color: "#003300" }}>
                {card.label}
              </h3>
            </div>
          </div>
        ))}
      </motion.div>

      {/* History Filter Tabs */}
      <motion.div variants={itemVariants}>
        <div className={`flex gap-2 flex-wrap border-b border-[#003300]/10 pb-2 ${isRTL ? "flex-row-reverse" : ""}`}>
          {historyTabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === tab.value
                  ? "text-white"
                  : "text-[#003300]/60 hover:text-[#003300]"
              }`}
              style={activeTab === tab.value ? { background: "#003300" } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Task Groups */}
      {Object.keys(groupedTasks).length === 0 ? (
        <motion.div variants={itemVariants}>
          <CardComponent variant="glass">
            <CardBody>
              <div className="text-center py-12">
                <FolderOpen className="w-16 h-16 mx-auto mb-4 text-[#003300]/20" />
                <p className="text-[#003300]/60 text-lg mb-2">No tasks found</p>
                <p className="text-[#003300]/40 text-sm">No tasks match the current filter</p>
              </div>
            </CardBody>
          </CardComponent>
        </motion.div>
      ) : (
        <motion.div variants={containerVariants} className="space-y-6">
          {Object.entries(groupedTasks).map(([projectId, { projectName, tasks: projectTasks }]) => (
            <motion.div key={projectId} variants={itemVariants}>
              <div className="mb-3">
                <h3 className={`text-lg font-semibold flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`} style={{ color: "#003300" }}>
                  <FolderOpen className="w-5 h-5 opacity-60" />
                  {projectName}
                  <span className="text-sm font-normal opacity-50">({projectTasks.length})</span>
                </h3>
              </div>

              <div className="space-y-3">
                {projectTasks.map(task => {
                  const due = formatDate(task.dueDate);
                  return (
                    <CardComponent key={task._id} variant="glass" hover>
                      <CardBody>
                        <div className={`flex items-center gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
                          <div className="flex-1 min-w-0">
                            <div className={`flex items-center gap-2 mb-1 flex-wrap ${isRTL ? "flex-row-reverse" : ""}`}>
                              <span className="font-semibold text-[#003300]">{task.title}</span>
                              {priorityBadge(task.priority)}
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${statusBadgeClass(task.status)}`}>
                                {task.status.replace("_", " ")}
                              </span>
                            </div>
                            {due && (
                              <p className={`text-xs ${due.overdue && task.status !== "done" ? "text-red-400" : "text-[#003300]/40"}`}>
                                Due: {due.text}
                                {due.overdue && task.status !== "done" && " (Overdue)"}
                              </p>
                            )}
                          </div>

                          {/* Status Action Buttons */}
                          <div className={`flex items-center gap-2 flex-shrink-0 ${isRTL ? "flex-row-reverse" : ""}`}>
                            {task.status === "todo" && (
                              <Button
                                variant="primary"
                                size="sm"
                                isLoading={updatingId === task._id}
                                disabled={!!updatingId}
                                onClick={() => handleStatusUpdate(task._id, "in_progress")}
                              >
                                Start
                              </Button>
                            )}
                            {task.status === "in_progress" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  isLoading={updatingId === task._id}
                                  disabled={!!updatingId}
                                  onClick={() => handleStatusUpdate(task._id, "todo")}
                                >
                                  Move Back
                                </Button>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  isLoading={updatingId === task._id}
                                  disabled={!!updatingId}
                                  onClick={() => handleStatusUpdate(task._id, "done")}
                                >
                                  Mark Done
                                </Button>
                              </>
                            )}
                            {task.status === "done" && (
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
                                <CheckCircle className="w-3 h-3" />
                                Done
                              </span>
                            )}
                          </div>
                        </div>
                      </CardBody>
                    </CardComponent>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
