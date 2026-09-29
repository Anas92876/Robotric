import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FileText,
  Plus,
  Search,
  AlertCircle,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Users,
  Send,
} from "lucide-react";
import { useTrainerTasks } from "../../hooks";
import { useTrainerGroups } from "../../hooks/trainer/useTrainerGroups";
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

export default function TrainerTasks() {
  const { tasks, isLoading, error, getGroupTasks, deleteTask, publishTask } = useTrainerTasks();
  const { groups } = useTrainerGroups({});
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardTrainer']);
  const isRTL = i18n.language === 'ar';
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [publishingTaskId, setPublishingTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedGroup) {
      getGroupTasks(selectedGroup);
    }
  }, [selectedGroup, getGroupTasks]);

  const filteredTasks = tasks.filter((task) =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteTaskId) return;

    try {
      setIsDeleting(true);
      await deleteTask(deleteTaskId);
      setDeleteTaskId(null);
      if (selectedGroup) {
        await getGroupTasks(selectedGroup);
      }
    } catch (err) {
      console.error("Failed to delete task:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePublish = async (taskId: string) => {
    try {
      setPublishingTaskId(taskId);
      await publishTask(taskId);
    } catch (err) {
      console.error("Failed to publish task:", err);
    } finally {
      setPublishingTaskId(null);
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
    return <LoadingState type="skeleton" text={t('dashboardTrainer:loadingTasks')} />;
  }

  if (error && tasks.length === 0) {
    return (
      <div className="space-y-8">
        <Alert variant="error">
          <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold mb-1">{t('dashboardTrainer:failedLoadTasks')}</p>
              <p className="text-sm opacity-90">{error}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={() => selectedGroup && getGroupTasks(selectedGroup)}
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
            <h1 className="text-4xl font-bold inline-block group-hover:scale-105 transition-transform duration-300" style={{ 
              color: '#003300',
              backgroundClip: 'text'
            }}>
              {t('dashboardTrainer:tasks')}
            </h1>
            <p className="mt-2 transition-colors duration-300" style={{ color: '#003300' + 'CC' }}>
              {t('dashboardTrainer:tasksSubtitle')}
            </p>
          </div>
          <Link to="/trainer/tasks/new">
            <Button variant="primary" leftIcon={<Plus className="w-5 h-5" />}>
              {t('dashboardTrainer:createTask')}
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder={t('dashboardTrainer:searchTasks')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <Select
          value={selectedGroup}
          onChange={(value) => setSelectedGroup(value)}
          options={[
            { value: "", label: t('dashboardTrainer:selectAGroup') },
            ...(groups || []).map((group) => ({
              value: group._id,
              label: group.name,
            })),
          ]}
          leftIcon={<Users className="w-4 h-4" />}
        />
      </motion.div>

      {/* Tasks List */}
      {!selectedGroup ? (
        <motion.div variants={itemVariants}>
          <CardComponent variant="glass">
            <CardBody>
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto mb-4 text-white/20" />
                <p className="text-white/60 text-lg mb-2">{t('dashboardTrainer:selectAGroup')}</p>
                <p className="text-white/40 text-sm">
                  {t('dashboardTrainer:selectGroupToViewTasks')}
                </p>
              </div>
            </CardBody>
          </CardComponent>
        </motion.div>
      ) : filteredTasks.length === 0 ? (
        <motion.div variants={itemVariants}>
          <CardComponent variant="glass">
            <CardBody>
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto mb-4 text-white/20" />
                <p className="text-white/60 text-lg mb-2">{t('dashboardTrainer:noTasksFound')}</p>
                <p className="text-white/40 text-sm mb-4">
                  {searchQuery
                    ? t('dashboardTrainer:tryAdjustingSearch')
                    : t('dashboardTrainer:noTasksYet')}
                </p>
                <Link to="/trainer/tasks/new">
                  <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
                    {t('dashboardTrainer:createFirstTask')}
                  </Button>
                </Link>
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
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-[#003300]">
                          {task.title}
                        </h3>
                        <Badge
                          variant={task.status === "open" ? "success" : task.status === "draft" ? "warning" : "secondary"}
                          size="sm"
                        >
                          {task.status === "draft" ? t('dashboardTrainer:draft', 'Draft') : task.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-white/60 mb-3 line-clamp-2">
                        {task.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-white/40">
                        <span>{t('dashboardTrainer:deadline')}: {formatDate(task.deadline)}</span>
                        <span>{t('dashboardTrainer:maxScore')}: {task.maxScore}</span>
                        {task.hasQuestions && (
                          <span>{t('dashboardTrainer:questions')}: {task.hasQuestions ? t('dashboardCommon:yes') : t('dashboardCommon:no')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {task.status === 'draft' ? (
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<Send className="w-4 h-4" />}
                          onClick={() => handlePublish(task._id)}
                          isLoading={publishingTaskId === task._id}
                          disabled={publishingTaskId === task._id}
                        >
                          {t('dashboardTrainer:publish', 'Publish')}
                        </Button>
                      ) : (
                        <Link to={`/trainer/tasks/${task._id}/submissions`}>
                          <Button variant="ghost" size="sm" leftIcon={<Eye className="w-4 h-4" />}>
                            {t('dashboardTrainer:viewSubmissions')}
                          </Button>
                        </Link>
                      )}
                      <Link to={`/trainer/tasks/${task._id}/edit`}>
                        <Button variant="ghost" size="sm" leftIcon={<Edit className="w-4 h-4" />}>
                          {t('dashboardCommon:edit')}
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Trash2 className="w-4 h-4" />}
                        onClick={() => setDeleteTaskId(task._id)}
                        className="text-red-600 hover:text-red-700"
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
        title={t('dashboardTrainer:deleteTaskTitle')}
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-white font-medium mb-2">{t('dashboardTrainer:deleteTaskWarning')}</p>
            <p className="text-white/80 text-sm">
              {t('dashboardTrainer:deleteTaskDesc')}
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
              {t('dashboardTrainer:deleteTaskBtn')}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
