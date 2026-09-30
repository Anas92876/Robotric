import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ListTodo,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  RefreshCw,
  Calendar,
  Users,
} from "lucide-react";
import { useCTOProjects } from "../../hooks/cto/useCTOProjects";
import type { InternalTask, TaskStatus } from "../../hooks/cto/useCTOProjects";
import SubTaskPanel from "../../components/cto/SubTaskPanel";
import ExtensionReviewPanel from "../../components/cto/ExtensionReviewPanel";
import TaskImageUpload from "../../components/cto/TaskImageUpload";
import SubmissionPanel from "../../components/cto/SubmissionPanel";
import ClientRequestPanel from "../../components/cto/ClientRequestPanel";
import type { TaskAttachment } from "../../hooks/cto/useCTOProjects";
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
  if (status === "pending_review") return "bg-amber-500/20 text-amber-500 border border-amber-500/30";
  if (status === "declined") return "bg-red-500/20 text-red-400 border border-red-500/30";
  return "bg-gray-500/20 text-gray-400 border border-gray-500/30";
};

interface StaffUser {
  _id: string;
  name: string;
  email: string;
}

interface EditTaskForm {
  title: string;
  description: string;
  priority: '1' | '2' | '3';
  status: 'todo' | 'in_progress' | 'done';
  assignedTo: string[];
  dueDate: string;
  hardDeadline: string;
  attachments: TaskAttachment[];
}

export default function CTOTasks() {
  const { projects, tasks, isLoading, error, getProjects, getTasks, updateTask, deleteTask, createTask, declineTask } = useCTOProjects();
  const { i18n } = useTranslation(["dashboardCommon"]);
  const isRTL = i18n.language === "ar";

  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [engineerFilter, setEngineerFilter] = useState("all");

  const [users, setUsers] = useState<StaffUser[]>([]);
  const [editTask, setEditTask] = useState<InternalTask | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editForm, setEditForm] = useState<EditTaskForm>({
    title: "",
    description: "",
    priority: "2",
    status: "todo",
    assignedTo: [],
    dueDate: "",
    hardDeadline: "",
    attachments: [],
  });
  const [createForm, setCreateForm] = useState({
    projectId: "",
    subProjectId: "",
    title: "",
    description: "",
    priority: "2" as '1' | '2' | '3',
    assignedTo: [] as string[],
    dueDate: "",
    hardDeadline: "",
  });
  const [subProjects, setSubProjects] = useState<{ _id: string; name: string }[]>([]);
  const [subProjectsLoading, setSubProjectsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [isDeclining, setIsDeclining] = useState(false);

  useEffect(() => {
    getProjects();
    getTasks();
    fetchEngineers();
  }, [getProjects, getTasks]);

  const fetchEngineers = async () => {
    try {
      const response = await api.get("/cto/internal/engineers");
      setUsers(response.data.data || []);
    } catch {
      // Silently fail
    }
  };

  const applyFilters = () => {
    getTasks({
      status: statusFilter !== "all" ? statusFilter as TaskStatus : undefined,
      priority: priorityFilter !== "all" ? parseInt(priorityFilter) as 1 | 2 | 3 : undefined,
      projectId: projectFilter !== "all" ? projectFilter : undefined,
      assignedTo: engineerFilter !== "all" ? engineerFilter : undefined,
    });
  };

  useEffect(() => {
    applyFilters();
  }, [statusFilter, priorityFilter, projectFilter, engineerFilter]);

  const openEditModal = (task: InternalTask) => {
    setEditForm({
      title: task.title,
      description: task.description || "",
      priority: String(task.priority) as '1' | '2' | '3',
      // The edit modal's status select only ever offers todo/in_progress/done — a
      // pending_review or declined client request is normalized to "todo" here, so
      // filling in priority/assignee/dueDate and saving *is* the approve action.
      status: (task.status === 'pending_review' || task.status === 'declined') ? 'todo' : task.status,
      assignedTo: getAssignees(task).map(u => u._id),
      dueDate: task.dueDate ? task.dueDate.slice(0, 16) : "",
      hardDeadline: task.hardDeadline ? task.hardDeadline.slice(0, 16) : "",
      attachments: task.attachments || [],
    });
    setFormError(null);
    setShowDeclineForm(false);
    setDeclineReason("");
    setEditTask(task);
  };

  const closeEditModal = () => {
    setEditTask(null);
    setFormError(null);
    setShowDeclineForm(false);
    setDeclineReason("");
  };

  const handleDecline = async () => {
    if (!editTask || !declineReason.trim()) {
      setFormError("A reason is required to decline this request");
      return;
    }
    setIsDeclining(true);
    setFormError(null);
    try {
      await declineTask(editTask._id, declineReason.trim());
      closeEditModal();
      applyFilters();
    } catch (err: any) {
      setFormError(err.message || "Failed to decline request");
    } finally {
      setIsDeclining(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!editTask || !editForm.title.trim()) {
      setFormError("Task title is required");
      return;
    }
    setIsSaving(true);
    setFormError(null);
    try {
      await updateTask(editTask._id, {
        title: editForm.title.trim(),
        description: editForm.description.trim() || undefined,
        priority: parseInt(editForm.priority) as 1 | 2 | 3,
        status: editForm.status,
        assignedTo: editForm.assignedTo,
        dueDate: editForm.dueDate || undefined,
        hardDeadline: editForm.hardDeadline || undefined,
      });
      closeEditModal();
      applyFilters();
    } catch (err: any) {
      setFormError(err.message || "Failed to update task");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTaskId) return;
    setIsDeleting(true);
    try {
      await deleteTask(deleteTaskId);
      setDeleteTaskId(null);
    } catch (err: any) {
      alert(err.message || "Failed to delete task");
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchSubProjects = async (projectId: string) => {
    if (!projectId) { setSubProjects([]); return; }
    setSubProjectsLoading(true);
    try {
      const response = await api.get(`/cto/internal/projects/${projectId}/sub-projects`);
      setSubProjects(response.data.data || []);
    } catch {
      setSubProjects([]);
    } finally {
      setSubProjectsLoading(false);
    }
  };

  const handleProjectChange = (projectId: string) => {
    setCreateForm(prev => ({ ...prev, projectId, subProjectId: "" }));
    fetchSubProjects(projectId);
  };

  const handleCreateTask = async () => {
    if (!createForm.projectId || !createForm.title.trim()) {
      setFormError("Project and task title are required");
      return;
    }
    setIsSaving(true);
    setFormError(null);
    try {
      await createTask({
        projectId: createForm.projectId,
        subProjectId: createForm.subProjectId || undefined,
        title: createForm.title.trim(),
        description: createForm.description.trim() || undefined,
        priority: parseInt(createForm.priority) as 1 | 2 | 3,
        assignedTo: createForm.assignedTo,
        dueDate: createForm.dueDate || undefined,
        hardDeadline: createForm.hardDeadline || undefined,
      });
      setShowCreateModal(false);
      setCreateForm({ projectId: "", subProjectId: "", title: "", description: "", priority: "2", assignedTo: [] as string[], dueDate: "", hardDeadline: "" });
      setSubProjects([]);
      setFormError(null);
      applyFilters();
    } catch (err: any) {
      setFormError(err.message || "Failed to create task");
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString();
  };

  const getAssignees = (task: InternalTask): { _id: string; name: string }[] => {
    if (!task.assignedTo) return [];
    if (Array.isArray(task.assignedTo)) return task.assignedTo;
    return [task.assignedTo as any];
  };

  const getProjectName = (task: InternalTask) => {
    if (typeof task.projectId === "object" && task.projectId !== null) {
      return (task.projectId as any).name;
    }
    return projects.find(p => p._id === task.projectId)?.name || "-";
  };

  if (isLoading && tasks.length === 0) {
    return <LoadingState type="skeleton" text="Loading tasks..." />;
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
          <Button variant="ghost" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={() => getTasks()}>
            Retry
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
          <div className={isRTL ? "text-right" : ""}>
            <h1
              className="text-4xl font-bold inline-block"
              style={{
                color: '#0f1f33',
                backgroundClip: "text",
              }}
            >
              All Tasks
            </h1>
            <p className="mt-2" style={{ color: "#0f1f33CC" }}>
              View and manage tasks across all projects
            </p>
          </div>
          <Button variant="primary" leftIcon={<Plus className="w-5 h-5" />} onClick={() => { setFormError(null); setSubProjects([]); setCreateForm({ projectId: "", subProjectId: "", title: "", description: "", priority: "2", assignedTo: [] as string[], dueDate: "", hardDeadline: "" }); setShowCreateModal(true); }}>
            Create Task
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          { label: "Total", value: tasks.length, color: "text-ink" },
          { label: "Pending Review", value: tasks.filter(t => t.status === "pending_review").length, color: "text-amber-500" },
          { label: "To Do", value: tasks.filter(t => t.status === "todo").length, color: "text-gray-400" },
          { label: "In Progress", value: tasks.filter(t => t.status === "in_progress").length, color: "text-blue-400" },
          { label: "Done", value: tasks.filter(t => t.status === "done").length, color: "text-green-400" },
        ].map(stat => (
          <CardComponent key={stat.label} variant="glass" hover>
            <CardBody>
              <div className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
                <div className={isRTL ? "text-right" : ""}>
                  <p className="text-sm text-ink/60 mb-1">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
                <ListTodo className="w-8 h-8 text-ink/20" />
              </div>
            </CardBody>
          </CardComponent>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className={`flex gap-3 flex-wrap ${isRTL ? "flex-row-reverse" : ""}`}>
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "all", label: "All Status" },
            { value: "pending_review", label: "Pending Review" },
            { value: "todo", label: "To Do" },
            { value: "in_progress", label: "In Progress" },
            { value: "done", label: "Done" },
            { value: "declined", label: "Declined" },
          ]}
        />
        <Select
          value={priorityFilter}
          onChange={setPriorityFilter}
          options={[
            { value: "all", label: "All Priority" },
            { value: "1", label: "P1 - Critical" },
            { value: "2", label: "P2 - High" },
            { value: "3", label: "P3 - Normal" },
          ]}
        />
        <Select
          value={projectFilter}
          onChange={setProjectFilter}
          options={[
            { value: "all", label: "All Projects" },
            ...projects.map(p => ({ value: p._id, label: p.name })),
          ]}
        />
        {users.length > 0 && (
          <Select
            value={engineerFilter}
            onChange={setEngineerFilter}
            options={[
              { value: "all", label: "All Members" },
              ...users.map(e => ({ value: e._id, label: e.name })),
            ]}
          />
        )}
      </motion.div>

      {/* Extension Requests */}
      <motion.div variants={itemVariants}>
        <ExtensionReviewPanel />
      </motion.div>

      {/* Task List */}
      {tasks.length === 0 ? (
        <motion.div variants={itemVariants}>
          <CardComponent variant="glass">
            <CardBody>
              <div className="text-center py-12">
                <ListTodo className="w-16 h-16 mx-auto mb-4 text-ink/20" />
                <p className="text-ink/60 text-lg mb-2">No tasks found</p>
                <p className="text-ink/40 text-sm">Try adjusting filters or create a new task</p>
              </div>
            </CardBody>
          </CardComponent>
        </motion.div>
      ) : (
        <motion.div variants={containerVariants} className="space-y-3">
          {tasks.map(task => (
            <motion.div key={task._id} variants={itemVariants}>
              <CardComponent variant="glass" hover>
                <CardBody>
                  <div className={`flex items-center gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <div className="flex-1 min-w-0">
                      <div className={`flex items-center gap-2 mb-1 flex-wrap ${isRTL ? "flex-row-reverse" : ""}`}>
                        <span className="font-semibold text-ink">{task.title}</span>
                        {priorityBadge(task.priority)}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${statusBadgeClass(task.status)}`}>
                          {task.status.replace("_", " ")}
                        </span>
                        {/* Project badge */}
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-ink/10 text-ink">
                          {getProjectName(task)}
                        </span>
                        {task.source === 'client' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-ink/8 text-ink/70 border border-ink/15">
                            Client Request
                          </span>
                        )}
                      </div>
                      <div className={`flex items-center gap-4 text-xs text-ink/40 flex-wrap ${isRTL ? "flex-row-reverse" : ""}`}>
                        {getAssignees(task).length > 0 && (
                          <span className={`flex items-center gap-1 ${isRTL ? "flex-row-reverse" : ""}`}>
                            <Users className="w-3 h-3" />
                            {getAssignees(task).map(u => u.name).join(", ")}
                          </span>
                        )}
                        {task.dueDate && (
                          <span className={`flex items-center gap-1 ${isRTL ? "flex-row-reverse" : ""}`}>
                            <Calendar className="w-3 h-3" />
                            {formatDate(task.dueDate)}
                          </span>
                        )}
                        {task.hardDeadline && (
                          <span className={`flex items-center gap-1 font-semibold text-red-500 ${isRTL ? "flex-row-reverse" : ""}`}>
                            <AlertCircle className="w-3 h-3" />
                            Hard: {formatDate(task.hardDeadline)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={`flex items-center gap-2 flex-shrink-0 ${isRTL ? "flex-row-reverse" : ""}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Edit2 className="w-4 h-4" />}
                        onClick={() => openEditModal(task)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Trash2 className="w-4 h-4" />}
                        className="text-red-400 hover:bg-red-500/10"
                        onClick={() => setDeleteTaskId(task._id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  <SubTaskPanel taskId={task._id} mode="cto" />
                  <SubmissionPanel taskId={task._id} mode="cto" initialSubmission={task.submission} />
                  {task.source === 'client' && <ClientRequestPanel task={task} mode="cto" />}
                </CardBody>
              </CardComponent>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Edit Task Modal */}
      <Modal isOpen={!!editTask} onClose={closeEditModal} title="Edit Task" size="lg">
        <div className="space-y-4">
          {formError && <Alert variant="error"><p className="text-sm">{formError}</p></Alert>}

          <div>
            <label className="block text-sm font-medium text-ink mb-1">Task Title *</label>
            <Input
              placeholder="Task title..."
              value={editForm.title}
              onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Description</label>
            <textarea
              placeholder="Task description..."
              value={editForm.description}
              onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-ink/20 bg-white text-ink text-sm focus:outline-none focus:ring-2 focus:ring-ink/30 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Priority</label>
              <Select
                value={editForm.priority}
                onChange={v => setEditForm(prev => ({ ...prev, priority: v as '1'|'2'|'3' }))}
                options={[{ value: "1", label: "P1" }, { value: "2", label: "P2" }, { value: "3", label: "P3" }]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Status</label>
              <Select
                value={editForm.status}
                onChange={v => setEditForm(prev => ({ ...prev, status: v as 'todo'|'in_progress'|'done' }))}
                options={[{ value: "todo", label: "To Do" }, { value: "in_progress", label: "In Progress" }, { value: "done", label: "Done" }]}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Assign To</label>
            {editForm.assignedTo.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {editForm.assignedTo.map(uid => {
                  const u = users.find(u => u._id === uid);
                  return (
                    <span key={uid} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-ink/10 text-ink border border-ink/15">
                      {u?.name || uid}
                      <button type="button" onClick={() => setEditForm(prev => ({ ...prev, assignedTo: prev.assignedTo.filter(id => id !== uid) }))} className="hover:text-red-500 transition-colors ml-0.5">×</button>
                    </span>
                  );
                })}
              </div>
            )}
            <select
              value=""
              onChange={e => {
                const val = e.target.value;
                if (val && !editForm.assignedTo.includes(val)) {
                  setEditForm(prev => ({ ...prev, assignedTo: [...prev.assignedTo, val] }));
                }
              }}
              className="w-full px-3 py-2 rounded-lg border border-ink/20 bg-white text-ink text-sm focus:outline-none focus:ring-2 focus:ring-ink/30"
            >
              <option value="">— Add assignee —</option>
              {users.filter(u => !editForm.assignedTo.includes(u._id)).map(u => (
                <option key={u._id} value={u._id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Due Date <span className="text-ink/40 font-normal">(soft)</span></label>
              <input
                type="datetime-local"
                value={editForm.dueDate}
                onChange={e => setEditForm(prev => ({ ...prev, dueDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-ink/20 bg-white text-ink text-sm focus:outline-none focus:ring-2 focus:ring-ink/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-red-600 mb-1">Hard Deadline <span className="text-red-400 font-normal">(critical)</span></label>
              <input
                type="datetime-local"
                value={editForm.hardDeadline}
                onChange={e => setEditForm(prev => ({ ...prev, hardDeadline: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-red-200 bg-red-50/50 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              />
              <p className="text-xs text-red-400 mt-1">Missing this is a critical problem</p>
            </div>
          </div>
          {editTask && (
            <TaskImageUpload
              taskId={editTask._id}
              images={editForm.attachments}
              uploadUrl={`/cto/internal/tasks/${editTask._id}/attachments`}
              deleteUrl={pid => `/cto/internal/tasks/${editTask._id}/attachments/${pid}`}
              onChanged={imgs => setEditForm(prev => ({ ...prev, attachments: imgs }))}
              label="Reference Images"
            />
          )}
          {editTask?.source === 'client' && editTask.status === 'pending_review' && (
            showDeclineForm ? (
              <div className="rounded-lg border border-red-200 bg-red-50/60 p-3 space-y-2">
                <label className="block text-sm font-medium text-red-700">Reason for declining *</label>
                <textarea
                  value={declineReason}
                  onChange={e => setDeclineReason(e.target.value)}
                  rows={2}
                  placeholder="Let the client know why this request won't move forward..."
                  className="w-full px-3 py-2 rounded-lg border border-red-200 bg-white text-ink text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setShowDeclineForm(false); setDeclineReason(""); }} disabled={isDeclining}>
                    Cancel
                  </Button>
                  <Button variant="danger" size="sm" onClick={handleDecline} isLoading={isDeclining} disabled={isDeclining}>
                    Confirm Decline
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeclineForm(true)}
                className="text-sm font-medium text-red-500 hover:text-red-600"
              >
                Decline this request
              </button>
            )
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={closeEditModal} disabled={isSaving}>Cancel</Button>
            <Button variant="primary" onClick={handleEditSubmit} isLoading={isSaving} disabled={isSaving}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Create Task Modal */}
      <Modal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); setFormError(null); setSubProjects([]); }} title="Create Task" size="lg">
        <div className="space-y-4">
          {formError && <Alert variant="error"><p className="text-sm">{formError}</p></Alert>}

          <div>
            <label className="block text-sm font-medium text-ink mb-1">Project *</label>
            <Select
              value={createForm.projectId}
              onChange={handleProjectChange}
              options={[{ value: "", label: "Select project..." }, ...projects.map(p => ({ value: p._id, label: p.name }))]}
            />
          </div>

          {createForm.projectId && (
            <div>
              <label className="block text-sm font-medium text-ink mb-1">
                Sub-project <span className="text-ink/40 font-normal">(optional)</span>
              </label>
              {subProjectsLoading ? (
                <p className="text-xs text-ink/40 py-2">Loading sub-projects...</p>
              ) : (
                <Select
                  value={createForm.subProjectId}
                  onChange={v => setCreateForm(prev => ({ ...prev, subProjectId: v }))}
                  options={[
                    { value: "", label: subProjects.length === 0 ? "No sub-projects" : "None (top-level task)" },
                    ...subProjects.map(sp => ({ value: sp._id, label: sp.name })),
                  ]}
                />
              )}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Task Title *</label>
            <Input
              placeholder="Task title..."
              value={createForm.title}
              onChange={e => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Description</label>
            <textarea
              placeholder="Task description..."
              value={createForm.description}
              onChange={e => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-ink/20 bg-white text-ink text-sm focus:outline-none focus:ring-2 focus:ring-ink/30 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Priority</label>
            <Select
              value={createForm.priority}
              onChange={v => setCreateForm(prev => ({ ...prev, priority: v as '1'|'2'|'3' }))}
              options={[{ value: "1", label: "P1" }, { value: "2", label: "P2" }, { value: "3", label: "P3" }]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Assign To</label>
            {createForm.assignedTo.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {createForm.assignedTo.map(uid => {
                  const u = users.find(u => u._id === uid);
                  return (
                    <span key={uid} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-ink/10 text-ink border border-ink/15">
                      {u?.name || uid}
                      <button type="button" onClick={() => setCreateForm(prev => ({ ...prev, assignedTo: prev.assignedTo.filter(id => id !== uid) }))} className="hover:text-red-500 transition-colors ml-0.5">×</button>
                    </span>
                  );
                })}
              </div>
            )}
            <select
              value=""
              onChange={e => {
                const val = e.target.value;
                if (val && !createForm.assignedTo.includes(val)) {
                  setCreateForm(prev => ({ ...prev, assignedTo: [...prev.assignedTo, val] }));
                }
              }}
              className="w-full px-3 py-2 rounded-lg border border-ink/20 bg-white text-ink text-sm focus:outline-none focus:ring-2 focus:ring-ink/30"
            >
              <option value="">— Add assignee —</option>
              {users.filter(u => !createForm.assignedTo.includes(u._id)).map(u => (
                <option key={u._id} value={u._id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Due Date <span className="text-ink/40 font-normal">(soft)</span></label>
              <input
                type="datetime-local"
                value={createForm.dueDate}
                onChange={e => setCreateForm(prev => ({ ...prev, dueDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-ink/20 bg-white text-ink text-sm focus:outline-none focus:ring-2 focus:ring-ink/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-red-600 mb-1">Hard Deadline <span className="text-red-400 font-normal">(critical)</span></label>
              <input
                type="datetime-local"
                value={createForm.hardDeadline}
                onChange={e => setCreateForm(prev => ({ ...prev, hardDeadline: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-red-200 bg-red-50/50 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              />
              <p className="text-xs text-red-400 mt-1">Missing this is a critical problem</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setShowCreateModal(false); setFormError(null); }} disabled={isSaving}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateTask} isLoading={isSaving} disabled={isSaving}>Create Task</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal isOpen={!!deleteTaskId} onClose={() => setDeleteTaskId(null)} title="Delete Task" size="sm">
        <div className="space-y-4">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-ink font-medium mb-1">Delete this task?</p>
            <p className="text-ink/70 text-sm">This action cannot be undone.</p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteTaskId(null)} disabled={isDeleting}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} isLoading={isDeleting} disabled={isDeleting}>Delete Task</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
