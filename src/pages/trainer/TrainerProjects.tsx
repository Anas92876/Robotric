import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FolderOpen,
  Plus,
  Search,
  AlertCircle,
  RefreshCw,
  Users,
  Filter,
  Trash2,
} from "lucide-react";
import { useTrainerProjects } from "../../hooks";
import { useTrainerGroups } from "../../hooks/trainer/useTrainerGroups";
import {
  CardComponent,
  CardBody,
  Button,
  Badge,
  LoadingState,
  Alert,
  Input,
  Select,
  Modal,
} from "../../components/ui";
import { ProjectCard } from "../../components/projects/ProjectCard";
import { useTranslation } from 'react-i18next';

export default function TrainerProjects() {
  const { projects, isLoading, error, getGroupProjects, deleteProject } = useTrainerProjects();
  const { groups } = useTrainerGroups({});
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardTrainer']);
  const isRTL = i18n.language === 'ar';
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Create a map of student IDs to student names for quick lookup
  const selectedGroupData = groups.find((g) => g._id === selectedGroup);
  const studentsMap = new Map<string, { name: string; email?: string }>();
  if (selectedGroupData?.students) {
    selectedGroupData.students.forEach((student) => {
      studentsMap.set(student._id, { name: student.name, email: student.email });
    });
  }

  useEffect(() => {
    if (selectedGroup) {
      getGroupProjects(selectedGroup);
    }
  }, [selectedGroup, getGroupProjects]);

  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async () => {
    if (!deleteProjectId) return;

    try {
      setIsDeleting(true);
      await deleteProject(deleteProjectId);
      setDeleteProjectId(null);
      if (selectedGroup) {
        await getGroupProjects(selectedGroup);
      }
    } catch (err: any) {
      console.error("Failed to delete project:", err);
      alert(err.message || "Failed to delete project");
    } finally {
      setIsDeleting(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  if (isLoading && projects.length === 0) {
    return <LoadingState type="skeleton" text={t('dashboardTrainer:loadingProjects')} />;
  }

  if (error && projects.length === 0) {
    return (
      <div className="space-y-8">
        <Alert variant="error">
          <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold mb-1">{t('dashboardTrainer:failedDeleteProject')}</p>
              <p className="text-sm opacity-90">{error}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={() => selectedGroup && getGroupProjects(selectedGroup)}
            >
              {t('dashboardCommon:retry')}
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-4xl font-bold inline-block" style={{ 
              color: '#0f1f33',
              backgroundClip: 'text'
            }}>
              {t('dashboardTrainer:projects')}
            </h1>
            <p className="mt-2 transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>
              {t('dashboardTrainer:projectsSubtitle')}
            </p>
          </div>
          <Link to="/trainer/projects/new">
            <Button variant="primary" leftIcon={<Plus className="w-5 h-5" />}>
              {t('dashboardTrainer:createProject')}
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder={t('dashboardTrainer:searchProjects')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
            className="bg-white border-ink/20 text-ink placeholder:text-ink/40"
          />
        </div>
        <Select
          value={selectedGroup}
          onChange={(value) => setSelectedGroup(value)}
          options={[
            { value: "", label: t('dashboardTrainer:selectGroup') },
            ...(groups || []).map((group) => ({
              value: group._id,
              label: group.name,
            })),
          ]}
          leftIcon={<Users className="w-4 h-4" />}
        />
        <Select
          value={statusFilter}
          onChange={(value) => setStatusFilter(value)}
          options={[
            { value: "all", label: t('dashboardCommon:allStatus') },
            { value: "in_progress", label: t('dashboardTrainer:inProgress') },
            { value: "completed", label: t('dashboardCommon:completed') },
            { value: "submitted", label: t('dashboardTrainer:submitted') },
          ]}
          leftIcon={<Filter className="w-4 h-4" />}
        />
      </motion.div>

      {/* Projects List */}
      {!selectedGroup ? (
        <motion.div variants={itemVariants}>
          <CardComponent variant="glass">
            <CardBody>
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto mb-4 text-white/20" />
                <p className="text-white/60 text-lg mb-2">{t('dashboardTrainer:selectGroupFirst')}</p>
                <p className="text-white/40 text-sm">
                  {t('dashboardTrainer:selectGroupForProjects')}
                </p>
              </div>
            </CardBody>
          </CardComponent>
        </motion.div>
      ) : filteredProjects.length === 0 ? (
        <motion.div variants={itemVariants}>
          <CardComponent variant="glass">
            <CardBody>
              <div className="text-center py-12">
                <FolderOpen className="w-16 h-16 mx-auto mb-4 text-white/20" />
                <p className="text-white/60 text-lg mb-2">{t('dashboardTrainer:noProjects')}</p>
                <p className="text-white/40 text-sm mb-4">
                  {searchQuery || statusFilter !== "all"
                    ? t('dashboardTrainer:tryAdjustingFilters')
                    : t('dashboardTrainer:noProjectsYet')}
                </p>
                <Link to="/trainer/projects/new">
                  <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
                    {t('dashboardTrainer:createFirstProject')}
                  </Button>
                </Link>
              </div>
            </CardBody>
          </CardComponent>
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredProjects.map((project) => (
            <motion.div key={project._id} variants={itemVariants} className="relative group">
              <div className="relative">
                <ProjectCard 
                  project={project} 
                  isStudent={false}
                  studentsMap={studentsMap}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDeleteProjectId(project._id);
                  }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-600/80 hover:bg-red-600 text-white z-10 shadow-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteProjectId}
        onClose={() => setDeleteProjectId(null)}
        title={t('dashboardTrainer:deleteProjectTitle')}
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-white font-medium mb-2">{t('dashboardTrainer:deleteTaskWarning')}</p>
            <p className="text-white/80 text-sm">
              {t('dashboardTrainer:deleteProjectDesc')}
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setDeleteProjectId(null)}
              disabled={isDeleting}
            >
              {t('dashboardCommon:cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={isDeleting}
              isLoading={isDeleting}
            >
              {t('dashboardTrainer:deleteProjectBtn')}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
