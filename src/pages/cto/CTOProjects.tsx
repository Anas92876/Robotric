import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FolderOpen,
  Plus,
  Users,
  Trash2,
  Edit2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  X,
  CornerDownRight,
} from "lucide-react";
import { useCTOProjects } from "../../hooks/cto/useCTOProjects";
import type { InternalProject, CreateProjectData } from "../../hooks/cto/useCTOProjects";
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

interface EngineerUser {
  _id: string;
  name: string;
  email: string;
}

interface ProjectFormState {
  name: string;
  description: string;
  priority: '1' | '2' | '3';
  assignedEngineers: string[];
  clients: string[];
}

const defaultForm: ProjectFormState = {
  name: "",
  description: "",
  priority: "2",
  assignedEngineers: [],
  clients: [],
};

export default function CTOProjects() {
  const navigate = useNavigate();
  const { projects, isLoading, error, getProjects, createProject, updateProject, deleteProject, moveProject } = useCTOProjects();
  const { i18n } = useTranslation(["dashboardCommon"]);
  const isRTL = i18n.language === "ar";

  const [engineers, setEngineers] = useState<EngineerUser[]>([]);
  const [engineersLoading, setEngineersLoading] = useState(false);
  const [clientUsers, setClientUsers] = useState<EngineerUser[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editProject, setEditProject] = useState<InternalProject | null>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectFormState>(defaultForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [moveProjectTarget, setMoveProjectTarget] = useState<InternalProject | null>(null);
  const [moveParentId, setMoveParentId] = useState("");
  const [isMoving, setIsMoving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  useEffect(() => {
    getProjects();
    fetchEngineers();
    fetchClients();
  }, [getProjects]);

  const fetchEngineers = useCallback(async () => {
    try {
      setEngineersLoading(true);
      const response = await api.get("/cto/internal/engineers");
      setEngineers(response.data.data || []);
    } catch {
      setEngineers([]);
    } finally {
      setEngineersLoading(false);
    }
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      setClientsLoading(true);
      const response = await api.get("/cto/internal/clients");
      setClientUsers(response.data.data || []);
    } catch {
      setClientUsers([]);
    } finally {
      setClientsLoading(false);
    }
  }, []);

  const openCreateModal = () => {
    setForm(defaultForm);
    setFormError(null);
    setEditProject(null);
    setShowCreateModal(true);
  };

  const openEditModal = (project: InternalProject, e: React.MouseEvent) => {
    e.stopPropagation();
    setForm({
      name: project.name,
      description: project.description || "",
      priority: String(project.priority) as '1' | '2' | '3',
      assignedEngineers: project.assignedEngineers.map(e => e._id),
      clients: (project.clients || []).map(c => c._id),
    });
    setFormError(null);
    setEditProject(project);
    setShowCreateModal(true);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditProject(null);
    setFormError(null);
  };

  const toggleEngineer = (id: string) => {
    setForm(prev => ({
      ...prev,
      assignedEngineers: prev.assignedEngineers.includes(id)
        ? prev.assignedEngineers.filter(e => e !== id)
        : [...prev.assignedEngineers, id],
    }));
  };

  const toggleClient = (id: string) => {
    setForm(prev => ({
      ...prev,
      clients: prev.clients.includes(id)
        ? prev.clients.filter(c => c !== id)
        : [...prev.clients, id],
    }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setFormError("Project name is required");
      return;
    }
    setIsSaving(true);
    setFormError(null);
    try {
      const data: CreateProjectData = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        priority: parseInt(form.priority) as 1 | 2 | 3,
        assignedEngineers: form.assignedEngineers,
        clients: form.clients,
      };
      if (editProject) {
        await updateProject(editProject._id, data);
      } else {
        await createProject(data);
      }
      closeModal();
      getProjects();
    } catch (err: any) {
      setFormError(err.message || "Operation failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMove = async () => {
    if (!moveProjectTarget || !moveParentId) { setMoveError("Select a target project"); return; }
    setIsMoving(true);
    setMoveError(null);
    try {
      await moveProject(moveProjectTarget._id, moveParentId);
      setMoveProjectTarget(null);
      setMoveParentId("");
      getProjects();
    } catch (err: any) {
      setMoveError(err.message || "Failed to move project");
    } finally {
      setIsMoving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteProjectId) return;
    setIsDeleting(true);
    try {
      await deleteProject(deleteProjectId);
      setDeleteProjectId(null);
    } catch (err: any) {
      alert(err.message || "Failed to delete project");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading && projects.length === 0) {
    return <LoadingState type="skeleton" text="Loading projects..." />;
  }

  if (error && projects.length === 0) {
    return (
      <div className="space-y-8">
        <Alert variant="error">
          <div className={`flex items-start gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold mb-1">Failed to load projects</p>
              <p className="text-sm opacity-90">{error}</p>
            </div>
            <Button variant="ghost" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={getProjects}>
              Retry
            </Button>
          </div>
        </Alert>
      </div>
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
                background: "linear-gradient(135deg, #003300 0%, #004d00 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Projects
            </h1>
            <p className="mt-2" style={{ color: "#003300CC" }}>
              Manage all engineering projects
            </p>
          </div>
          <Button variant="primary" leftIcon={<Plus className="w-5 h-5" />} onClick={openCreateModal}>
            Create Project
          </Button>
        </div>
      </motion.div>

      {/* Projects List */}
      {projects.length === 0 ? (
        <motion.div variants={itemVariants}>
          <CardComponent variant="glass">
            <CardBody>
              <div className="text-center py-12">
                <FolderOpen className="w-16 h-16 mx-auto mb-4 text-[#003300]/20" />
                <p className="text-[#003300]/60 text-lg mb-2">No projects yet</p>
                <p className="text-[#003300]/40 text-sm mb-4">Create your first project to get started</p>
                <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreateModal}>
                  Create Project
                </Button>
              </div>
            </CardBody>
          </CardComponent>
        </motion.div>
      ) : (
        <motion.div variants={containerVariants} className="space-y-4">
          {projects.map((project) => (
            <motion.div key={project._id} variants={itemVariants}>
              <CardComponent variant="glass" hover>
                <CardBody>
                  <div
                    className={`flex items-start gap-4 cursor-pointer ${isRTL ? "flex-row-reverse" : ""}`}
                    onClick={() => navigate(`/cto-internal/projects/${project._id}`)}
                  >
                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className={`flex items-center gap-3 mb-2 flex-wrap ${isRTL ? "flex-row-reverse" : ""}`}>
                        <h3 className="text-xl font-semibold text-[#003300]">{project.name}</h3>
                        {priorityBadge(project.priority)}
                      </div>

                      {project.description && (
                        <p className="text-sm text-[#003300]/60 mb-3 line-clamp-2">{project.description}</p>
                      )}

                      <div className={`flex items-center gap-6 flex-wrap text-sm ${isRTL ? "flex-row-reverse" : ""}`}>
                        {(project.subProjectCount || 0) > 0 && (
                          <span className="text-xs text-[#003300]/50 font-medium">
                            {project.subProjectCount} sub-project{project.subProjectCount !== 1 ? "s" : ""}
                          </span>
                        )}
                        {project.taskCounts && (
                          <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                            <span className="text-gray-400 text-xs">Todo: {project.taskCounts.todo}</span>
                            <span className="text-blue-400 text-xs">In Progress: {project.taskCounts.in_progress}</span>
                            <span className="text-green-400 text-xs">Done: {project.taskCounts.done}</span>
                          </div>
                        )}

                        <div className={`flex items-center gap-1.5 text-[#003300]/50 ${isRTL ? "flex-row-reverse" : ""}`}>
                          <Users className="w-4 h-4" />
                          <span className="text-xs">
                            {project.assignedEngineers.length > 0
                              ? project.assignedEngineers.map(e => e.name).join(", ")
                              : "No members assigned"}
                          </span>
                        </div>

                        {(project.clients?.length || 0) > 0 && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#003300]/8 text-[#003300]/70 border border-[#003300]/15">
                            {project.clients!.length} client{project.clients!.length !== 1 ? "s" : ""} linked
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div
                      className={`flex items-center gap-2 flex-shrink-0 ${isRTL ? "flex-row-reverse" : ""}`}
                      onClick={e => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Edit2 className="w-4 h-4" />}
                        onClick={(e) => openEditModal(project, e)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<CornerDownRight className="w-4 h-4" />}
                        className="text-[#003300]/60 hover:bg-[#003300]/10"
                        onClick={(e) => { e.stopPropagation(); setMoveParentId(""); setMoveError(null); setMoveProjectTarget(project); }}
                      >
                        Move
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Trash2 className="w-4 h-4" />}
                        className="text-red-400 hover:bg-red-500/10"
                        onClick={(e) => { e.stopPropagation(); setDeleteProjectId(project._id); }}
                      >
                        Delete
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        rightIcon={<ArrowRight className="w-4 h-4" />}
                        onClick={() => navigate(`/cto-internal/projects/${project._id}`)}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </CardComponent>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={closeModal}
        title={editProject ? "Edit Project" : "Create Project"}
        size="lg"
      >
        <div className="space-y-4">
          {formError && (
            <Alert variant="error">
              <p className="text-sm">{formError}</p>
            </Alert>
          )}

          <div>
            <label className="block text-sm font-medium text-[#003300] mb-1">Project Name *</label>
            <Input
              placeholder="e.g. Robot Control System"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#003300] mb-1">Description</label>
            <textarea
              placeholder="Project description..."
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-[#003300]/20 bg-white text-[#003300] text-sm focus:outline-none focus:ring-2 focus:ring-[#003300]/30 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#003300] mb-1">Priority</label>
            <Select
              value={form.priority}
              onChange={value => setForm(prev => ({ ...prev, priority: value as '1' | '2' | '3' }))}
              options={[
                { value: "1", label: "P1 - Critical" },
                { value: "2", label: "P2 - High" },
                { value: "3", label: "P3 - Normal" },
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#003300] mb-2">Assign Members</label>

            {/* Selected members as removable tags */}
            {form.assignedEngineers.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {form.assignedEngineers.map(id => {
                  const eng = engineers.find(e => e._id === id);
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#003300]/10 text-[#003300] border border-[#003300]/20"
                    >
                      {eng ? eng.name : id}
                      <button
                        type="button"
                        onClick={() => toggleEngineer(id)}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Dropdown select */}
            {engineersLoading ? (
              <p className="text-xs text-[#003300]/40 py-2">Loading users...</p>
            ) : engineers.length === 0 ? (
              <p className="text-xs text-[#003300]/40 py-2">No users found in the system</p>
            ) : (
              <select
                value=""
                onChange={e => {
                  if (e.target.value) toggleEngineer(e.target.value);
                }}
                className="w-full px-3 py-2 rounded-lg border border-[#003300]/20 bg-white text-[#003300] text-sm focus:outline-none focus:ring-2 focus:ring-[#003300]/20"
              >
                <option value="">— Select a member to add —</option>
                {engineers.map(eng => (
                  <option
                    key={eng._id}
                    value={eng._id}
                    disabled={form.assignedEngineers.includes(eng._id)}
                  >
                    {eng.name} ({eng.email}){form.assignedEngineers.includes(eng._id) ? " ✓" : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#003300] mb-2">Link Clients</label>
            <p className="text-xs text-[#003300]/40 mb-2">
              Linked clients can see this project and submit task requests on it.
            </p>

            {form.clients.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {form.clients.map(id => {
                  const client = clientUsers.find(c => c._id === id);
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#003300]/10 text-[#003300] border border-[#003300]/20"
                    >
                      {client ? client.name : id}
                      <button
                        type="button"
                        onClick={() => toggleClient(id)}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {clientsLoading ? (
              <p className="text-xs text-[#003300]/40 py-2">Loading clients...</p>
            ) : clientUsers.length === 0 ? (
              <p className="text-xs text-[#003300]/40 py-2">No client accounts found</p>
            ) : (
              <select
                value=""
                onChange={e => {
                  if (e.target.value) toggleClient(e.target.value);
                }}
                className="w-full px-3 py-2 rounded-lg border border-[#003300]/20 bg-white text-[#003300] text-sm focus:outline-none focus:ring-2 focus:ring-[#003300]/20"
              >
                <option value="">— Select a client to link —</option>
                {clientUsers.map(client => (
                  <option
                    key={client._id}
                    value={client._id}
                    disabled={form.clients.includes(client._id)}
                  >
                    {client.name} ({client.email}){form.clients.includes(client._id) ? " ✓" : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className={`flex justify-end gap-3 pt-2 ${isRTL ? "flex-row-reverse" : ""}`}>
            <Button variant="outline" onClick={closeModal} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} isLoading={isSaving} disabled={isSaving}>
              {editProject ? "Save Changes" : "Create Project"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Move to Sub-project Modal */}
      <Modal
        isOpen={!!moveProjectTarget}
        onClose={() => { setMoveProjectTarget(null); setMoveError(null); }}
        title="Move to Sub-project"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-[#003300]/5 border border-[#003300]/10 rounded-lg">
            <p className="text-xs text-[#003300]/50 mb-0.5">Moving project</p>
            <p className="text-sm font-semibold text-[#003300]">{moveProjectTarget?.name}</p>
          </div>

          {moveError && <Alert variant="error"><p className="text-sm">{moveError}</p></Alert>}

          <div>
            <label className="block text-sm font-medium text-[#003300] mb-1">Move under *</label>
            <Select
              value={moveParentId}
              onChange={setMoveParentId}
              options={[
                { value: "", label: "Select parent project..." },
                ...projects
                  .filter(p => p._id !== moveProjectTarget?._id)
                  .map(p => ({ value: p._id, label: p.name })),
              ]}
            />
            <p className="text-xs text-[#003300]/40 mt-1.5">
              All tasks inside this project will be moved along with it.
            </p>
          </div>

          <div className={`flex justify-end gap-3 pt-1 ${isRTL ? "flex-row-reverse" : ""}`}>
            <Button variant="outline" onClick={() => { setMoveProjectTarget(null); setMoveError(null); }} disabled={isMoving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleMove} isLoading={isMoving} disabled={isMoving || !moveParentId}>
              Move Project
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={!!deleteProjectId}
        onClose={() => setDeleteProjectId(null)}
        title="Delete Project"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-[#003300] font-medium mb-1">Are you sure?</p>
            <p className="text-[#003300]/70 text-sm">
              This will permanently delete the project and all its tasks. This action cannot be undone.
            </p>
          </div>
          <div className={`flex justify-end gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
            <Button variant="outline" onClick={() => setDeleteProjectId(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} isLoading={isDeleting} disabled={isDeleting}>
              Delete Project
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
