import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  RefreshCw,
  Users,
  Calendar,
  ListTodo,
  FolderOpen,
  ChevronRight,
} from "lucide-react";
import { useCTOProjects } from "../../hooks/cto/useCTOProjects";
import type { InternalTask, CreateTaskData, TaskAttachment, TaskStatus } from "../../hooks/cto/useCTOProjects";
import TaskImageUpload from "../../components/cto/TaskImageUpload";
import ClientRequestPanel from "../../components/cto/ClientRequestPanel";
import { api } from "../../lib/api";
import {
  CardComponent,
  CardBody,
  Button,
  LoadingState,
  Alert,
  Input,
  Select,
  Modal,
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

interface TaskFormState {
  title: string;
  description: string;
  priority: '1' | '2' | '3';
  status: 'todo' | 'in_progress' | 'done';
  assignedTo: string[];
  dueDate: string;
  hardDeadline: string;
}

interface SubProjectFormState {
  name: string;
  description: string;
  priority: '1' | '2' | '3';
}

const defaultTaskForm: TaskFormState = { title: "", description: "", priority: "2", status: "todo", assignedTo: [], dueDate: "", hardDeadline: "" };
const defaultSubProjectForm: SubProjectFormState = { name: "", description: "", priority: "2" };

export default function CTOProjectDetail() {
  // parentId is set when we're viewing a sub-project, id is always the current project
  const { id, parentId } = useParams<{ id: string; parentId?: string }>();
  const navigate = useNavigate();
  const { i18n } = useTranslation(["dashboardCommon"]);
  const isRTL = i18n.language === "ar";

  const isSubProjectView = !!parentId;

  const {
    currentProject,
    subProjects,
    tasks,
    isLoading,
    error,
    getProjectById,
    getSubProjects,
    getTasks,
    createProject,
    deleteProject,
    createTask,
    updateTask,
    deleteTask,
    declineTask,
  } = useCTOProjects();

  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [isDeclining, setIsDeclining] = useState(false);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editTask, setEditTask] = useState<InternalTask | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState<TaskFormState>(defaultTaskForm);
  const [taskAttachments, setTaskAttachments] = useState<TaskAttachment[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [showSubProjectModal, setShowSubProjectModal] = useState(false);
  const [subProjectForm, setSubProjectForm] = useState<SubProjectFormState>(defaultSubProjectForm);
  const [isSavingSubProject, setIsSavingSubProject] = useState(false);
  const [subProjectFormError, setSubProjectFormError] = useState<string | null>(null);
  const [deleteSubProjectId, setDeleteSubProjectId] = useState<string | null>(null);
  const [isDeletingSubProject, setIsDeletingSubProject] = useState(false);

  const [users, setUsers] = useState<{ _id: string; name: string }[]>([]);

  useEffect(() => {
    if (id) {
      getProjectById(id);
      if (!isSubProjectView) {
        getSubProjects(id);
        getTasks({ projectId: id, subProjectId: "none" });
      } else {
        getTasks({ projectId: parentId, subProjectId: id });
      }
    }
  }, [id, parentId, isSubProjectView]);

  useEffect(() => {
    api.get("/cto/internal/engineers")
      .then(res => setUsers(res.data.data || []))
      .catch(() => {});
  }, []);

  const filteredTasks = tasks.filter(task => {
    if (statusFilter !== "all" && task.status !== statusFilter) return false;
    if (priorityFilter !== "all" && task.priority !== parseInt(priorityFilter)) return false;
    if (userFilter !== "all" && !getAssignees(task).some(u => u._id === userFilter)) return false;
    return true;
  });

  const openCreateTaskModal = () => {
    setTaskForm(defaultTaskForm);
    setTaskAttachments([]);
    setEditTask(null);
    setFormError(null);
    setShowTaskModal(true);
  };

  const openEditTaskModal = (task: InternalTask, e: React.MouseEvent) => {
    e.stopPropagation();
    setTaskForm({
      title: task.title,
      description: task.description || "",
      priority: String(task.priority) as '1' | '2' | '3',
      // A pending_review or declined client request has no place in this dropdown —
      // normalize to "todo" so filling in the rest and saving is the approve action.
      status: (task.status === 'pending_review' || task.status === 'declined') ? 'todo' : task.status,
      assignedTo: getAssignees(task).map(u => u._id),
      dueDate: task.dueDate ? task.dueDate.slice(0, 16) : "",
      hardDeadline: task.hardDeadline ? task.hardDeadline.slice(0, 16) : "",
    });
    setTaskAttachments(task.attachments || []);
    setEditTask(task);
    setFormError(null);
    setShowDeclineForm(false);
    setDeclineReason("");
    setShowTaskModal(true);
  };

  const closeTaskModal = () => {
    setShowTaskModal(false);
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
      closeTaskModal();
      if (!isSubProjectView) {
        getTasks({ projectId: id, subProjectId: "none" });
      } else {
        getTasks({ projectId: parentId, subProjectId: id });
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to decline request");
    } finally {
      setIsDeclining(false);
    }
  };

  const handleTaskSubmit = async () => {
    if (!taskForm.title.trim()) { setFormError("Task title is required"); return; }
    if (!id) return;
    setIsSaving(true);
    setFormError(null);
    try {
      const data: Partial<CreateTaskData> & { status?: TaskStatus } = {
        title: taskForm.title.trim(),
        description: taskForm.description.trim() || undefined,
        priority: parseInt(taskForm.priority) as 1 | 2 | 3,
        assignedTo: taskForm.assignedTo.length > 0 ? taskForm.assignedTo : [],
        dueDate: taskForm.dueDate || undefined,
        hardDeadline: taskForm.hardDeadline || undefined,
      };
      if (editTask) {
        // Only the edit path carries a status — creating a task here always starts
        // at "todo" server-side (this modal never creates client requests).
        await updateTask(editTask._id, { ...data, status: taskForm.status });
      } else {
        const taskPayload: CreateTaskData = {
          ...data,
          projectId: isSubProjectView ? parentId! : id,
          subProjectId: isSubProjectView ? id : undefined,
        } as CreateTaskData;
        await createTask(taskPayload);
      }
      closeTaskModal();
      if (!isSubProjectView) {
        getTasks({ projectId: id, subProjectId: "none" });
      } else {
        getTasks({ projectId: parentId, subProjectId: id });
      }
    } catch (err: any) {
      setFormError(err.message || "Operation failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!deleteTaskId || !id) return;
    setIsDeleting(true);
    try {
      await deleteTask(deleteTaskId);
      setDeleteTaskId(null);
      if (!isSubProjectView) {
        getTasks({ projectId: id, subProjectId: "none" });
      } else {
        getTasks({ projectId: parentId, subProjectId: id });
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete task");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateSubProject = async () => {
    if (!subProjectForm.name.trim()) { setSubProjectFormError("Sub-project name is required"); return; }
    if (!id) return;
    setIsSavingSubProject(true);
    setSubProjectFormError(null);
    try {
      await createProject({
        name: subProjectForm.name.trim(),
        description: subProjectForm.description.trim() || undefined,
        priority: parseInt(subProjectForm.priority) as 1 | 2 | 3,
        assignedEngineers: [],
        parentProject: id,
      });
      setShowSubProjectModal(false);
      setSubProjectForm(defaultSubProjectForm);
      getSubProjects(id);
    } catch (err: any) {
      setSubProjectFormError(err.message || "Failed to create sub-project");
    } finally {
      setIsSavingSubProject(false);
    }
  };

  const handleDeleteSubProject = async () => {
    if (!deleteSubProjectId) return;
    setIsDeletingSubProject(true);
    try {
      await deleteProject(deleteSubProjectId);
      setDeleteSubProjectId(null);
      if (id) getSubProjects(id);
    } catch (err: any) {
      alert(err.message || "Failed to delete sub-project");
    } finally {
      setIsDeletingSubProject(false);
    }
  };

  const getAssignees = (task: InternalTask): { _id: string; name: string }[] => {
    if (!task.assignedTo) return [];
    if (Array.isArray(task.assignedTo)) return task.assignedTo;
    return [task.assignedTo as any];
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString();
  };

  if (isLoading && !currentProject) {
    return <LoadingState type="skeleton" text="Loading project..." />;
  }

  if (error && !currentProject) {
    return (
      <Alert variant="error">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold mb-1">Failed to load project</p>
            <p className="text-sm opacity-90">{error}</p>
          </div>
          <Button variant="ghost" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={() => id && getProjectById(id)}>
            Retry
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-6">
      {/* Back button + breadcrumb */}
      <motion.div variants={itemVariants}>
        {isSubProjectView ? (
          <div className={`flex items-center gap-2 mb-4 text-sm text-ink/60 ${isRTL ? "flex-row-reverse" : ""}`}>
            <Link to="/cto-internal/projects" className="hover:text-ink transition-colors">Projects</Link>
            <ChevronRight className="w-4 h-4" />
            <Link to={`/cto-internal/projects/${parentId}`} className="hover:text-ink transition-colors">
              {(currentProject as any)?.parentProject?.name || "Project"}
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-ink">{currentProject?.name}</span>
          </div>
        ) : (
          <Link to="/cto-internal/projects">
            <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />} className="mb-4">
              Back to Projects
            </Button>
          </Link>
        )}

        <div className={`flex items-start justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
          <div className={isRTL ? "text-right" : ""}>
            <div className={`flex items-center gap-3 flex-wrap mb-1 ${isRTL ? "flex-row-reverse" : ""}`}>
              {isSubProjectView && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-ink/10 text-ink">
                  Sub-project
                </span>
              )}
              <h1
                className="text-4xl font-bold inline-block"
                style={{
                  color: '#0f1f33',
                  backgroundClip: "text",
                }}
              >
                {currentProject?.name || "Project"}
              </h1>
              {currentProject && priorityBadge(currentProject.priority)}
            </div>
            {currentProject?.description && (
              <p className="text-ink/60 mt-1">{currentProject.description}</p>
            )}
            {(currentProject?.clients?.length || 0) > 0 && (
              <div className={`flex items-center gap-1.5 mt-2 flex-wrap ${isRTL ? "flex-row-reverse" : ""}`}>
                <span className="text-xs text-ink/40 font-medium">Client{currentProject!.clients!.length !== 1 ? "s" : ""}:</span>
                {currentProject!.clients!.map(c => (
                  <span key={c._id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-ink/8 text-ink/70 border border-ink/15">
                    {c.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          <Button variant="primary" leftIcon={<Plus className="w-5 h-5" />} onClick={openCreateTaskModal}>
            Create Task
          </Button>
        </div>
      </motion.div>

      {/* Sub-projects section — only on top-level project view */}
      {!isSubProjectView && (
        <motion.div variants={itemVariants}>
          <div className={`flex items-center justify-between mb-3 ${isRTL ? "flex-row-reverse" : ""}`}>
            <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
              <FolderOpen className="w-5 h-5 text-ink/50" />
              <span className="text-sm font-semibold text-ink">
                Sub-projects {subProjects.length > 0 && <span className="text-ink/40">({subProjects.length})</span>}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => { setSubProjectForm(defaultSubProjectForm); setSubProjectFormError(null); setShowSubProjectModal(true); }}
            >
              Add Sub-project
            </Button>
          </div>

          {subProjects.length === 0 ? (
            <CardComponent variant="glass">
              <CardBody>
                <div className="text-center py-6">
                  <FolderOpen className="w-10 h-10 mx-auto mb-2 text-ink/20" />
                  <p className="text-ink/50 text-sm">No sub-projects yet</p>
                </div>
              </CardBody>
            </CardComponent>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {subProjects.map(sp => (
                <CardComponent key={sp._id} variant="glass" hover>
                  <CardBody>
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => navigate(`/cto-internal/projects/${id}/sub/${sp._id}`)}
                      >
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {priorityBadge(sp.priority)}
                          <span className="font-semibold text-ink truncate">{sp.name}</span>
                        </div>
                        {sp.description && (
                          <p className="text-xs text-ink/50 mb-2 line-clamp-2">{sp.description}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-ink/40 flex-wrap">
                          <span>{sp.taskCounts?.total || 0} tasks</span>
                          {(sp.taskCounts?.done || 0) > 0 && (
                            <span className="text-green-500">{sp.taskCounts?.done} done</span>
                          )}
                          {(sp.taskCounts?.in_progress || 0) > 0 && (
                            <span className="text-blue-400">{sp.taskCounts?.in_progress} in progress</span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                        className="text-red-400 hover:bg-red-500/10 flex-shrink-0"
                        onClick={e => { e.stopPropagation(); setDeleteSubProjectId(sp._id); }}
                      />
                    </div>
                  </CardBody>
                </CardComponent>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Task filters */}
      <motion.div variants={itemVariants}>
        <div className={`flex items-center justify-between mb-3 ${isRTL ? "flex-row-reverse" : ""}`}>
          <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
            <ListTodo className="w-5 h-5 text-ink/50" />
            <span className="text-sm font-semibold text-ink">Tasks</span>
          </div>
        </div>
        <div className={`flex gap-3 flex-wrap ${isRTL ? "flex-row-reverse" : ""}`}>
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
          {users.length > 0 && (
            <Select
              value={userFilter}
              onChange={setUserFilter}
              options={[
                { value: "all", label: "All Members" },
                ...users.map(u => ({ value: u._id, label: u.name })),
              ]}
            />
          )}
        </div>
      </motion.div>

      {/* Task list */}
      {filteredTasks.length === 0 ? (
        <motion.div variants={itemVariants}>
          <CardComponent variant="glass">
            <CardBody>
              <div className="text-center py-12">
                <ListTodo className="w-16 h-16 mx-auto mb-4 text-ink/20" />
                <p className="text-ink/60 text-lg mb-2">No tasks found</p>
                <p className="text-ink/40 text-sm mb-4">
                  {statusFilter !== "all" || priorityFilter !== "all" || userFilter !== "all"
                    ? "Try adjusting filters"
                    : "Create the first task for this project"}
                </p>
                <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreateTaskModal}>
                  Create Task
                </Button>
              </div>
            </CardBody>
          </CardComponent>
        </motion.div>
      ) : (
        <motion.div variants={containerVariants} className="space-y-3">
          {filteredTasks.map(task => (
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
                        {task.source === 'client' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-ink/8 text-ink/70 border border-ink/15">
                            Client Request
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-sm text-ink/50 mb-1 line-clamp-1">{task.description}</p>
                      )}
                      <div className={`flex items-center gap-4 text-xs text-ink/40 ${isRTL ? "flex-row-reverse" : ""}`}>
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
                      <Button variant="ghost" size="sm" leftIcon={<Edit2 className="w-4 h-4" />} onClick={(e) => openEditTaskModal(task, e)}>
                        Edit
                      </Button>
                      {task.status === "todo" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Trash2 className="w-4 h-4" />}
                          className="text-red-400 hover:bg-red-500/10"
                          onClick={() => setDeleteTaskId(task._id)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                  {task.source === 'client' && <ClientRequestPanel task={task} mode="cto" />}
                </CardBody>
              </CardComponent>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Task Create/Edit Modal */}
      <Modal isOpen={showTaskModal} onClose={closeTaskModal} title={editTask ? "Edit Task" : "Create Task"} size="lg">
        <div className="space-y-4">
          {formError && <Alert variant="error"><p className="text-sm">{formError}</p></Alert>}
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Task Title *</label>
            <Input
              placeholder="e.g. Implement authentication module"
              value={taskForm.title}
              onChange={e => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Description</label>
            <textarea
              placeholder="Task description..."
              value={taskForm.description}
              onChange={e => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-ink/20 bg-white text-ink text-sm focus:outline-none focus:ring-2 focus:ring-ink/30 resize-none"
            />
          </div>
          <div className={`grid grid-cols-2 gap-4`}>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Priority</label>
              <Select
                value={taskForm.priority}
                onChange={value => setTaskForm(prev => ({ ...prev, priority: value as '1' | '2' | '3' }))}
                options={[
                  { value: "1", label: "P1 - Critical" },
                  { value: "2", label: "P2 - High" },
                  { value: "3", label: "P3 - Normal" },
                ]}
              />
            </div>
            {editTask && (
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Status</label>
                <Select
                  value={taskForm.status}
                  onChange={value => setTaskForm(prev => ({ ...prev, status: value as 'todo' | 'in_progress' | 'done' }))}
                  options={[
                    { value: "todo", label: "To Do" },
                    { value: "in_progress", label: "In Progress" },
                    { value: "done", label: "Done" },
                  ]}
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Assign To</label>
              {taskForm.assignedTo.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {taskForm.assignedTo.map(uid => {
                    const u = users.find(u => u._id === uid);
                    return (
                      <span key={uid} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-ink/10 text-ink border border-ink/15">
                        {u?.name || uid}
                        <button type="button" onClick={() => setTaskForm(prev => ({ ...prev, assignedTo: prev.assignedTo.filter(id => id !== uid) }))} className="hover:text-red-500 transition-colors ml-0.5">×</button>
                      </span>
                    );
                  })}
                </div>
              )}
              <select
                value=""
                onChange={e => {
                  const val = e.target.value;
                  if (val && !taskForm.assignedTo.includes(val)) {
                    setTaskForm(prev => ({ ...prev, assignedTo: [...prev.assignedTo, val] }));
                  }
                }}
                className="w-full px-3 py-2 rounded-lg border border-ink/20 bg-white text-ink text-sm focus:outline-none focus:ring-2 focus:ring-ink/30"
              >
                <option value="">— Add assignee —</option>
                {users.filter(u => !taskForm.assignedTo.includes(u._id)).map(u => (
                  <option key={u._id} value={u._id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Due Date <span className="text-ink/40 font-normal">(soft)</span></label>
              <input
                type="datetime-local"
                value={taskForm.dueDate}
                onChange={e => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-ink/20 bg-white text-ink text-sm focus:outline-none focus:ring-2 focus:ring-ink/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-red-600 mb-1">Hard Deadline <span className="text-red-400 font-normal">(critical)</span></label>
              <input
                type="datetime-local"
                value={taskForm.hardDeadline}
                onChange={e => setTaskForm(prev => ({ ...prev, hardDeadline: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-red-200 bg-red-50/50 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              />
              <p className="text-xs text-red-400 mt-1">Missing this is a critical problem</p>
            </div>
          </div>
          {editTask && (
            <TaskImageUpload
              taskId={editTask._id}
              images={taskAttachments}
              uploadUrl={`/cto/internal/tasks/${editTask._id}/attachments`}
              deleteUrl={pid => `/cto/internal/tasks/${editTask._id}/attachments/${pid}`}
              onChanged={setTaskAttachments}
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

          <div className={`flex justify-end gap-3 pt-2 ${isRTL ? "flex-row-reverse" : ""}`}>
            <Button variant="outline" onClick={closeTaskModal} disabled={isSaving}>Cancel</Button>
            <Button variant="primary" onClick={handleTaskSubmit} isLoading={isSaving} disabled={isSaving}>
              {editTask ? "Save Changes" : "Create Task"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Task Modal */}
      <Modal isOpen={!!deleteTaskId} onClose={() => setDeleteTaskId(null)} title="Delete Task" size="sm">
        <div className="space-y-4">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-ink font-medium mb-1">Delete this task?</p>
            <p className="text-ink/70 text-sm">This action cannot be undone.</p>
          </div>
          <div className={`flex justify-end gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
            <Button variant="outline" onClick={() => setDeleteTaskId(null)} disabled={isDeleting}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteTask} isLoading={isDeleting} disabled={isDeleting}>Delete Task</Button>
          </div>
        </div>
      </Modal>

      {/* Create Sub-project Modal */}
      <Modal isOpen={showSubProjectModal} onClose={() => setShowSubProjectModal(false)} title="Add Sub-project" size="lg">
        <div className="space-y-4">
          {subProjectFormError && <Alert variant="error"><p className="text-sm">{subProjectFormError}</p></Alert>}
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Sub-project Name *</label>
            <Input
              placeholder="e.g. Backend API"
              value={subProjectForm.name}
              onChange={e => setSubProjectForm(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Description</label>
            <textarea
              placeholder="Sub-project description..."
              value={subProjectForm.description}
              onChange={e => setSubProjectForm(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-ink/20 bg-white text-ink text-sm focus:outline-none focus:ring-2 focus:ring-ink/30 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Priority</label>
            <Select
              value={subProjectForm.priority}
              onChange={value => setSubProjectForm(prev => ({ ...prev, priority: value as '1' | '2' | '3' }))}
              options={[
                { value: "1", label: "P1 - Critical" },
                { value: "2", label: "P2 - High" },
                { value: "3", label: "P3 - Normal" },
              ]}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowSubProjectModal(false)} disabled={isSavingSubProject}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateSubProject} isLoading={isSavingSubProject} disabled={isSavingSubProject}>
              Create Sub-project
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Sub-project Modal */}
      <Modal isOpen={!!deleteSubProjectId} onClose={() => setDeleteSubProjectId(null)} title="Delete Sub-project" size="sm">
        <div className="space-y-4">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-ink font-medium mb-1">Delete this sub-project?</p>
            <p className="text-ink/70 text-sm">All tasks inside it must be deleted first.</p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteSubProjectId(null)} disabled={isDeletingSubProject}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteSubProject} isLoading={isDeletingSubProject} disabled={isDeletingSubProject}>Delete</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
