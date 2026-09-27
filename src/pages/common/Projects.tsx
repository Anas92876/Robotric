import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Package,
  AlertCircle,
  RefreshCw,
  Filter,
  ChevronDown,
  Briefcase,
  CheckCircle,
  Clock,
  Archive,
  X
} from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import {
  useProjectsData,
  type Project,
  type Part,
  type ProjectPart
} from '../../hooks';
import { LoadingState, Alert, Button, Badge, CardComponent } from '../../components/ui';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

type StatusFilter = 'all' | 'planning' | 'active' | 'completed' | 'archived';

/**
 * Premium Projects Management Page
 */
export default function Projects() {
  const { i18n } = useTranslation(['dashboardCommon', 'dashboardAdmin']);
  const isRTL = i18n.language === 'ar';
  const { user } = useAuth();
  const { projects, parts, stats, isLoading, error, refetch, actions } = useProjectsData();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [managingParts, setManagingParts] = useState<Project | null>(null);

  const canManageProjects = user?.role === 'admin' || user?.role === 'superadmin';

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesSearch = !searchQuery ||
        project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || project.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, statusFilter]);

  // Handle project actions
  const handleDelete = async (projectId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) return;
    const result = await actions.delete(projectId);
    if (!result.success && result.error) {
      alert(result.error);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Get status badge variant
  const getStatusVariant = (status?: string): 'primary' | 'secondary' | 'error' | 'warning' | 'success' | 'info' => {
    switch (status) {
      case 'planning': return 'warning';
      case 'active': return 'primary';
      case 'completed': return 'success';
      case 'archived': return 'info';
      default: return 'secondary';
    }
  };

  // Get status icon
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'planning': return <Clock className="w-4 h-4" />;
      case 'active': return <Briefcase className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'archived': return <Archive className="w-4 h-4" />;
      default: return <Briefcase className="w-4 h-4" />;
    }
  };

  // Show loading state
  if (isLoading) {
    return <LoadingState type="skeleton" text="Loading projects..." />;
  }

  // Show error state
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        <Alert variant="error">
          <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold mb-1">Failed to load projects</p>
              <p className="text-sm opacity-90">{error}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={refetch}
            >
              Retry
            </Button>
          </div>
        </Alert>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div>
          <h1 className="text-3xl font-bold text-primary">Projects</h1>
          <p className="text-gray-400 mt-1">
            Manage robotics projects and component requirements
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={refetch}
          >
            Refresh
          </Button>

          {canManageProjects && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setShowCreateModal(true)}
            >
              New Project
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <CardComponent variant="glass" className="p-4">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div>
                <p className="text-gray-400 text-xs mb-1">Total Projects</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <Briefcase className="w-8 h-8 text-primary/50" />
            </div>
          </CardComponent>

          <CardComponent variant="glass" className="p-4">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div>
                <p className="text-gray-400 text-xs mb-1">Planning</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.planning}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400/50" />
            </div>
          </CardComponent>

          <CardComponent variant="glass" className="p-4">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div>
                <p className="text-gray-400 text-xs mb-1">Active</p>
                <p className="text-2xl font-bold text-primary">{stats.active}</p>
              </div>
              <Briefcase className="w-8 h-8 text-primary/50" />
            </div>
          </CardComponent>

          <CardComponent variant="glass" className="p-4">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div>
                <p className="text-gray-400 text-xs mb-1">Completed</p>
                <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400/50" />
            </div>
          </CardComponent>

          <CardComponent variant="glass" className="p-4">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div>
                <p className="text-gray-400 text-xs mb-1">Total Parts</p>
                <p className="text-2xl font-bold text-secondary">{stats.totalParts}</p>
              </div>
              <Package className="w-8 h-8 text-secondary/50" />
            </div>
          </CardComponent>
        </div>
      )}

      {/* Search and Filter Bar */}
      <CardComponent variant="glass" className="p-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search projects by title or description..."
              className="input pl-12 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              className="select min-w-[150px]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <option value="all">All Status</option>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-sm text-gray-400">
            Showing <span className="text-white font-semibold">{filteredProjects.length}</span> of{' '}
            <span className="text-white font-semibold">{projects.length}</span> projects
          </p>
        </div>
      </CardComponent>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <CardComponent variant="glass" className="p-12 text-center">
          <Briefcase className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-300 mb-2">No projects found</h3>
          <p className="text-gray-400 mb-6">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by creating your first project.'}
          </p>
          {canManageProjects && !searchQuery && statusFilter === 'all' && (
            <Button
              variant="primary"
              leftIcon={<Plus className="w-5 h-5" />}
              onClick={() => setShowCreateModal(true)}
            >
              Create First Project
            </Button>
          )}
        </CardComponent>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project._id}
                project={project}
                parts={parts}
                expanded={expandedProject === project._id}
                onToggle={() => setExpandedProject(expandedProject === project._id ? null : project._id)}
                canManage={canManageProjects}
                onEdit={() => setEditingProject(project)}
                onDelete={() => handleDelete(project._id, project.title)}
                onManageParts={() => setManagingParts(project)}
                formatDate={formatDate}
                getStatusVariant={getStatusVariant}
                getStatusIcon={getStatusIcon}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreate={actions.create}
          onSuccess={() => {
            setShowCreateModal(false);
            refetch();
          }}
        />
      )}

      {editingProject && (
        <EditProjectModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onUpdate={actions.update}
          onSuccess={() => {
            setEditingProject(null);
            refetch();
          }}
        />
      )}

      {managingParts && (
        <ManagePartsModal
          project={managingParts}
          parts={parts}
          onClose={() => setManagingParts(null)}
          onUpdate={actions.updateParts}
          onSuccess={() => {
            setManagingParts(null);
            refetch();
          }}
        />
      )}
    </motion.div>
  );
}

/**
 * Project Card Component
 */
interface ProjectCardProps {
  project: Project;
  parts: Part[];
  expanded: boolean;
  onToggle: () => void;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onManageParts: () => void;
  formatDate: (date: string) => string;
  getStatusVariant: (status?: string) => 'primary' | 'secondary' | 'error' | 'warning' | 'success' | 'info';
  getStatusIcon: (status?: string) => React.ReactNode;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  parts,
  expanded,
  onToggle,
  canManage,
  onEdit,
  onDelete,
  onManageParts,
  formatDate,
  getStatusVariant,
  getStatusIcon
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <CardComponent
        variant="glass"
        hover
        className="p-6 cursor-pointer h-full flex flex-col"
        onClick={onToggle}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white mb-2 truncate">
              {project.title}
            </h3>
            {project.status && (
              <Badge variant={getStatusVariant(project.status)} size="sm">
                <div className="flex items-center gap-1">
                  {getStatusIcon(project.status)}
                  {project.status}
                </div>
              </Badge>
            )}
          </div>
          <ChevronDown
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 flex-shrink-0 ml-2 ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        </div>

        {/* Description */}
        {project.description && (
          <p className="text-sm text-gray-400 mb-4 line-clamp-2">
            {project.description}
          </p>
        )}

        {/* Parts Count */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
          <Package className="w-4 h-4" />
          <span>{project.parts?.length || 0} parts</span>
        </div>

        {/* Expanded Content */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="pt-4 border-t border-gray-700 space-y-4">
                {/* Parts List */}
                {project.parts && project.parts.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-2">Required Parts:</h4>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {project.parts.map((item, idx) => {
                        const partId = typeof item.partId === 'string' ? item.partId : item.partId._id;
                        const partName = typeof item.partId === 'string'
                          ? parts.find(p => p._id === partId)?.name || 'Unknown Part'
                          : item.partId.name;

                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 bg-gray-800/50 rounded text-sm"
                          >
                            <span className="text-gray-300">{partName}</span>
                            <span className="text-primary font-semibold">× {item.qty}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {canManage && (
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Package className="w-4 h-4" />}
                      onClick={onManageParts}
                    >
                      Manage Parts
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Edit2 className="w-4 h-4" />}
                      onClick={onEdit}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Trash2 className="w-4 h-4" />}
                      onClick={onDelete}
                      className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                    >
                      Delete
                    </Button>
                  </div>
                )}

                {/* Metadata */}
                <div className="text-xs text-gray-500 pt-2 border-t border-gray-700/50">
                  Created {formatDate(project.createdAt)}
                  {project.createdBy && ` by ${project.createdBy.name}`}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardComponent>
    </motion.div>
  );
};

/**
 * Create Project Modal
 */
interface CreateProjectModalProps {
  onClose: () => void;
  onCreate: (data: { title: string; description?: string }) => Promise<{ success: boolean; error?: string }>;
  onSuccess: () => void;
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ onClose, onCreate, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!title.trim() || title.trim().length < 3) {
      setError('Title must be at least 3 characters');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await onCreate({ title: title.trim(), description: description.trim() || undefined });

    if (result.success) {
      onSuccess();
    } else {
      setError(result.error || 'Failed to create project');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-gray-700 rounded-2xl p-6 max-w-lg w-full"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-primary">Create New Project</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Project Title *
            </label>
            <input
              type="text"
              className="input w-full"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter project title"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              className="input w-full"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter project description (optional)"
              disabled={loading}
            />
          </div>

          {error && (
            <Alert variant="error">
              <p className="text-sm">{error}</p>
            </Alert>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={loading || !title.trim()}>
            {loading ? 'Creating...' : 'Create Project'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

/**
 * Edit Project Modal
 */
interface EditProjectModalProps {
  project: Project;
  onClose: () => void;
  onUpdate: (projectId: string, data: Partial<Project>) => Promise<{ success: boolean; error?: string }>;
  onSuccess: () => void;
}

const EditProjectModal: React.FC<EditProjectModalProps> = ({ project, onClose, onUpdate, onSuccess }) => {
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description || '');
  const [status, setStatus] = useState(project.status || 'planning');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!title.trim() || title.trim().length < 3) {
      setError('Title must be at least 3 characters');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await onUpdate(project._id, {
      title: title.trim(),
      description: description.trim() || undefined,
      status: status as any
    });

    if (result.success) {
      onSuccess();
    } else {
      setError(result.error || 'Failed to update project');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-gray-700 rounded-2xl p-6 max-w-lg w-full"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-primary">Edit Project</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Project Title *
            </label>
            <input
              type="text"
              className="input w-full"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              className="input w-full"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Status
            </label>
            <select
              className="select w-full"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              disabled={loading}
            >
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {error && (
            <Alert variant="error">
              <p className="text-sm">{error}</p>
            </Alert>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={loading || !title.trim()}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

/**
 * Manage Parts Modal
 */
interface ManagePartsModalProps {
  project: Project;
  parts: Part[];
  onClose: () => void;
  onUpdate: (projectId: string, parts: ProjectPart[]) => Promise<{ success: boolean; error?: string }>;
  onSuccess: () => void;
}

const ManagePartsModal: React.FC<ManagePartsModalProps> = ({ project, parts, onClose, onUpdate, onSuccess }) => {
  const [items, setItems] = useState<ProjectPart[]>(
    project.parts.map(p => ({
      partId: typeof p.partId === 'string' ? p.partId : p.partId._id,
      qty: p.qty
    }))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = () => {
    if (parts.length === 0) {
      setError('No parts available. Please create parts first.');
      return;
    }
    setItems([...items, { partId: parts[0]._id, qty: 1 }]);
  };

  const handleRemove = (index: number) => {
    const newItems = items.slice();
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleUpdate = (index: number, field: 'partId' | 'qty', value: string | number) => {
    const newItems = items.slice();
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async () => {
    if (items.some(it => !it.partId || it.qty <= 0)) {
      setError('Each part must have a quantity greater than 0');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await onUpdate(project._id, items);

    if (result.success) {
      onSuccess();
    } else {
      setError(result.error || 'Failed to update parts');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-gray-700 rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-primary">Manage Parts - {project.title}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 mb-4">
          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No parts added yet</p>
            </div>
          ) : (
            items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-7">
                  <select
                    className="select w-full"
                    value={item.partId as string}
                    onChange={(e) => handleUpdate(idx, 'partId', e.target.value)}
                    disabled={loading}
                  >
                    {parts.map(p => (
                      <option key={p._id} value={p._id}>
                        {p.name} {p.sku && `(${p.sku})`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-3">
                  <input
                    type="number"
                    className="input w-full"
                    value={item.qty}
                    onChange={(e) => handleUpdate(idx, 'qty', Number(e.target.value))}
                    min="1"
                    disabled={loading}
                  />
                </div>
                <div className="col-span-2 flex justify-end">
                  <button
                    className="btn-outline text-red-400 hover:bg-red-400/10"
                    onClick={() => handleRemove(idx)}
                    disabled={loading}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}

          <Button
            variant="ghost"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={handleAdd}
            disabled={loading || parts.length === 0}
          >
            Add Part
          </Button>
        </div>

        {error && (
          <Alert variant="error" className="mb-4">
            <p className="text-sm">{error}</p>
          </Alert>
        )}

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-700">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Close
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : 'Save Parts'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
