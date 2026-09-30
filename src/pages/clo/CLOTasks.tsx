import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Send,
  Search,
  Filter,
  AlertCircle,
  RefreshCw,
  BarChart3,
  Copy,
} from "lucide-react";
import { useCLOTasks } from "../../hooks/clo/useCLOTasks";
import { useCLOCourses } from "../../hooks/clo/useCLOCourses";
import { useCLOGroups } from "../../hooks/clo/useCLOGroups";
import { useTranslation } from 'react-i18next';
import { formatDate } from "../../utils/dateTime";
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

export default function CLOTasks() {
  const { tasks, isLoading, error, getAllTasks, deleteTask, publishTask, duplicateTask } = useCLOTasks();
  const { courses } = useCLOCourses();
  const { groups } = useCLOGroups();
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardCLO']);
  const isRTL = i18n.language === 'ar';
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [publishingTaskId, setPublishingTaskId] = useState<string | null>(null);
  const [duplicatingTaskId, setDuplicatingTaskId] = useState<string | null>(null);

  useEffect(() => {
    getAllTasks({
      courseId: courseFilter !== "all" ? courseFilter : undefined,
      groupId: groupFilter !== "all" ? groupFilter : undefined,
      status: statusFilter !== "all" ? (statusFilter as "open" | "closed") : undefined,
      page: 1,
      limit: 20,
    });
  }, [courseFilter, groupFilter, statusFilter, getAllTasks]);

  const filteredTasks = tasks.filter((task) =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteTaskId) return;

    try {
      setIsDeleting(true);
      await deleteTask(deleteTaskId);
      setDeleteTaskId(null);
    } catch (err) {
      console.error("Failed to delete task:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      setPublishingTaskId(id);
      await publishTask(id);
    } catch (err) {
      console.error("Failed to publish task:", err);
    } finally {
      setPublishingTaskId(null);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      setDuplicatingTaskId(id);
      const newTask = await duplicateTask(id);
      navigate(`/clo/tasks/${newTask._id}/edit`);
    } catch (err) {
      console.error("Failed to duplicate task:", err);
    } finally {
      setDuplicatingTaskId(null);
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

  if (isLoading && tasks.length === 0) {
    return <LoadingState type="skeleton" text={t('dashboardCLO:loadingTasks')} />;
  }

  if (error && tasks.length === 0) {
    return (
      <div className="space-y-8">
        <Alert variant="error">
          <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold mb-1">{t('dashboardCLO:failedToLoadTasks')}</p>
              <p className="text-sm opacity-90">{error}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={() => getAllTasks()}
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
        <div className={`flex items-center justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={isRTL ? 'text-right' : ''}>
            <h1 className="text-4xl font-bold inline-block mb-2" style={{
              color: '#0f1f33',
              backgroundClip: 'text'
            }}>{t('dashboardCLO:allTasks')}</h1>
            <p className="transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>
              {t('dashboardCLO:overviewAllTasks')}
            </p>
          </div>
          <Link to="/clo/tasks/new">
            <Button variant="primary" leftIcon={<Plus className="w-5 h-5" />}>
              {t('dashboardCLO:createTask')}
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className={`flex gap-4 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder={t('dashboardCLO:searchTasks')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <Select
          value={courseFilter}
          onChange={(value) => setCourseFilter(value)}
          options={[
            { value: "all", label: t('dashboardCLO:allCourses') },
            ...(courses || []).map((course) => ({
              value: course._id,
              label: course.title,
            })),
          ]}
        />
        <Select
          value={groupFilter}
          onChange={(value) => setGroupFilter(value)}
          options={[
            { value: "all", label: t('dashboardCLO:allGroups') },
            ...(groups || []).map((group) => ({
              value: group._id,
              label: group.name,
            })),
          ]}
        />
        <Select
          value={statusFilter}
          onChange={(value) => setStatusFilter(value)}
          options={[
            { value: "all", label: t('dashboardCommon:allStatus') },
            { value: "open", label: t('dashboardCommon:open') },
            { value: "closed", label: t('dashboardCommon:closed') },
          ]}
          leftIcon={<Filter className="w-4 h-4" />}
        />
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <CardComponent variant="glass" hover>
          <CardBody>
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : ''}>
                <p className="text-sm text-ink/60 mb-1">{t('dashboardCLO:totalTasks')}</p>
                <p className="text-2xl font-bold text-ink">{tasks.length}</p>
              </div>
              <FileText className="w-8 h-8 text-primary" />
            </div>
          </CardBody>
        </CardComponent>
        <CardComponent variant="glass" hover>
          <CardBody>
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : ''}>
                <p className="text-sm text-ink/60 mb-1">{t('dashboardCLO:openTasks')}</p>
                <p className="text-2xl font-bold text-ink">
                  {tasks.filter((t) => t.status === "open").length}
                </p>
              </div>
              <FileText className="w-8 h-8 text-accent" />
            </div>
          </CardBody>
        </CardComponent>
        <CardComponent variant="glass" hover>
          <CardBody>
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : ''}>
                <p className="text-sm text-ink/60 mb-1">{t('dashboardCLO:closedTasks')}</p>
                <p className="text-2xl font-bold text-ink">
                  {tasks.filter((t) => t.status === "closed").length}
                </p>
              </div>
              <FileText className="w-8 h-8 text-secondary" />
            </div>
          </CardBody>
        </CardComponent>
        <CardComponent variant="glass" hover>
          <CardBody>
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : ''}>
                <p className="text-sm text-ink/60 mb-1">{t('dashboardCLO:withQuestions')}</p>
                <p className="text-2xl font-bold text-ink">
                  {tasks.filter((t) => t.hasQuestions).length}
                </p>
              </div>
              <FileText className="w-8 h-8 text-success" />
            </div>
          </CardBody>
        </CardComponent>
      </motion.div>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <motion.div variants={itemVariants}>
          <CardComponent variant="glass">
            <CardBody>
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto mb-4 text-ink/20" />
                <p className="text-ink/60 text-lg mb-2">{t('dashboardCLO:noTasksFound')}</p>
                <p className="text-ink/40 text-sm">
                  {searchQuery || courseFilter !== "all" || groupFilter !== "all"
                    ? t('dashboardCLO:tryAdjustingFilters')
                    : t('dashboardCLO:noTasksCreated')}
                </p>
              </div>
            </CardBody>
          </CardComponent>
        </motion.div>
      ) : (
        <motion.div variants={containerVariants} className="space-y-4">
          {filteredTasks.map((task) => (
            <motion.div key={task._id} variants={itemVariants}>
              <CardComponent variant="glass" hover>
                <CardBody>
                  <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                      <div className={`flex items-center gap-3 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <h3 className="text-lg font-semibold text-ink">
                          {task.title}
                        </h3>
                        <Badge
                          variant={task.status === "open" ? "success" : "secondary"}
                          size="sm"
                        >
                          {task.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-ink/60 mb-3 line-clamp-2">
                        {task.description}
                      </p>
                      <div className={`flex items-center gap-4 text-xs text-ink/40 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span>
                          {t('dashboardCLO:taskGroupsLabel')}{' '}
                          {task.groupIds && task.groupIds.length > 0
                            ? task.groupIds.map((g) => g.name).join(', ')
                            : task.groupId?.name || 'Deleted Group'}
                        </span>
                        {((task.courseIds && task.courseIds.length > 0) || task.courseId) && (
                          <span>
                            {t('dashboardCLO:taskCourseLabel')}{' '}
                            {task.courseIds && task.courseIds.length > 0
                              ? task.courseIds.map((c) => c.title).join(', ')
                              : task.courseId?.title || 'Deleted Course'}
                          </span>
                        )}
                        {((task.sessionIds && task.sessionIds.length > 0) || task.sessionId) && (
                          <span>
                            {t('dashboardCLO:taskSessionsLabel')}{' '}
                            {task.sessionIds && task.sessionIds.length > 0
                              ? task.sessionIds.map((s) => s.title).join(', ')
                              : task.sessionId?.title || 'Deleted Session'}
                          </span>
                        )}
                        <span>{t('dashboardCLO:taskDeadlineLabel')} {formatDate(task.deadline)}</span>
                        <span>{t('dashboardCLO:taskMaxScoreLabel')} {task.maxScore}</span>
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 flex-wrap ${isRTL ? 'mr-4' : 'ml-4'}`}>
                      {task.status === 'draft' ? (
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<Send className="w-4 h-4" />}
                          onClick={() => handlePublish(task._id)}
                          isLoading={publishingTaskId === task._id}
                          disabled={publishingTaskId === task._id}
                        >
                          {t('dashboardCLO:publish')}
                        </Button>
                      ) : (
                        <Link to={`/clo/tasks/${task._id}/results`}>
                          <Button variant="primary" size="sm" leftIcon={<BarChart3 className="w-4 h-4" />}>
                            {t('dashboardCLO:viewResults')}
                          </Button>
                        </Link>
                      )}
                      <Link to={`/clo/tasks/${task._id}/edit`}>
                        <Button variant="ghost" size="sm" leftIcon={<Edit className="w-4 h-4" />}>
                          {t('dashboardCommon:edit')}
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Copy className="w-4 h-4" />}
                        onClick={() => handleDuplicate(task._id)}
                        isLoading={duplicatingTaskId === task._id}
                        disabled={duplicatingTaskId === task._id}
                      >
                        {t('dashboardCLO:duplicateTask')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Trash2 className="w-4 h-4" />}
                        onClick={() => setDeleteTaskId(task._id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                      >
                        {t('dashboardCommon:delete')}
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </CardComponent>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTaskId}
        onClose={() => setDeleteTaskId(null)}
        title={t('dashboardCLO:deleteTaskTitle')}
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-white font-medium mb-2">{t('dashboardCLO:deleteTaskWarning')}</p>
            <p className="text-white/80 text-sm">
              {t('dashboardCLO:deleteTaskDesc')}
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setDeleteTaskId(null)}
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
              {t('dashboardCLO:deleteTaskBtn')}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
