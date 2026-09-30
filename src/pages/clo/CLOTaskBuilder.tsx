import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Save, FileText, AlertCircle } from "lucide-react";
import { useCLOTasks, type CreateCLOTaskData, type GroupSession } from "../../hooks/clo/useCLOTasks";
import { useCLOGroups } from "../../hooks/clo/useCLOGroups";
import { QuestionBuilder } from "../../components/tasks/QuestionBuilder";
import { type Question } from "../../hooks/student/useTasks";
import { useTranslation } from 'react-i18next';
import { formatDate } from "../../utils/dateTime";
import {
  Button,
  Input,
  LoadingState,
  Alert,
  CardComponent,
  CardBody,
} from "../../components/ui";

export default function CLOTaskBuilder() {
  const navigate = useNavigate();
  const { taskId } = useParams<{ taskId: string }>();
  const isEditing = !!taskId;

  const {
    createTask,
    updateTask,
    getTaskDetails,
    isLoading: tasksLoading,
    error: tasksError,
    taskDetails,
    getGroupSessions,
  } = useCLOTasks();
  const [saveMode, setSaveMode] = useState<'draft' | 'publish'>('publish');
  const { groups, fetchGroups } = useCLOGroups();

  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingTask, setIsLoadingTask] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [sessionsByGroup, setSessionsByGroup] = useState<Record<string, GroupSession[]>>({});
  const [deadline, setDeadline] = useState("");
  const [maxScore, setMaxScore] = useState(100);
  const [allowLateSubmission, setAllowLateSubmission] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);

  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardCLO']);
  const isRTL = i18n.language === 'ar';

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // Load task data when editing
  useEffect(() => {
    const loadTaskData = async () => {
      if (isEditing && taskId) {
        try {
          setIsLoadingTask(true);
          setError(null);
          await getTaskDetails(taskId);
        } catch (err: any) {
          setError(err.message || 'Failed to load task data');
          console.error('Error loading task:', err);
        } finally {
          setIsLoadingTask(false);
        }
      }
    };

    loadTaskData();
  }, [taskId, isEditing, getTaskDetails]);

  // Populate form when task details are loaded
  useEffect(() => {
    if (taskDetails && isEditing) {
      const task = taskDetails as any;

      setTitle(task.title || "");
      setTitleAr(task.titleAr || "");
      setDescription(task.description || "");
      setDescriptionAr(task.descriptionAr || "");

      const derivedGroups: { _id: string }[] = task.groupIds && task.groupIds.length > 0
        ? task.groupIds
        : (task.groupId ? [task.groupId] : []);
      const derivedSessions: { _id: string }[] = task.sessionIds && task.sessionIds.length > 0
        ? task.sessionIds
        : (task.sessionId ? [task.sessionId] : []);

      const groupIds = derivedGroups.map((g) => g._id);
      setSelectedGroupIds(groupIds);
      setSelectedSessionIds(derivedSessions.map((s) => s._id));

      groupIds.forEach((gid) => {
        getGroupSessions(gid).then((sessions) => {
          setSessionsByGroup((prev) => ({ ...prev, [gid]: sessions }));
        });
      });

      if (task.deadline) {
        const deadlineDate = new Date(task.deadline);
        const year = deadlineDate.getFullYear();
        const month = String(deadlineDate.getMonth() + 1).padStart(2, '0');
        const day = String(deadlineDate.getDate()).padStart(2, '0');
        const hours = String(deadlineDate.getHours()).padStart(2, '0');
        const minutes = String(deadlineDate.getMinutes()).padStart(2, '0');
        setDeadline(`${year}-${month}-${day}T${hours}:${minutes}`);
      }

      setMaxScore(task.maxScore || 100);
      setAllowLateSubmission(task.allowLateSubmission || false);

      if (task.questions && Array.isArray(task.questions)) {
        setQuestions(task.questions);
      }
    }
  }, [taskDetails, isEditing, getGroupSessions]);

  const groupNameById = useMemo(() => {
    const map: Record<string, string> = {};
    (groups || []).forEach((g) => { map[g._id] = g.name; });
    return map;
  }, [groups]);

  const availableSessions = useMemo(() => {
    return selectedGroupIds.flatMap((gid) =>
      (sessionsByGroup[gid] || []).map((s) => ({
        ...s,
        _groupId: gid,
        _groupName: groupNameById[gid] || '',
      }))
    );
  }, [selectedGroupIds, sessionsByGroup, groupNameById]);

  const handleToggleGroup = (groupId: string) => {
    if (selectedGroupIds.includes(groupId)) {
      const removedSessionIds = new Set((sessionsByGroup[groupId] || []).map((s) => s._id));
      setSelectedGroupIds((prev) => prev.filter((id) => id !== groupId));
      setSessionsByGroup((prev) => {
        const next = { ...prev };
        delete next[groupId];
        return next;
      });
      setSelectedSessionIds((prev) => prev.filter((id) => !removedSessionIds.has(id)));
    } else {
      setSelectedGroupIds((prev) => [...prev, groupId]);
      getGroupSessions(groupId).then((sessions) => {
        setSessionsByGroup((prev) => ({ ...prev, [groupId]: sessions }));
      });
    }
  };

  const handleToggleSession = (sessionId: string) => {
    setSelectedSessionIds((prev) =>
      prev.includes(sessionId) ? prev.filter((id) => id !== sessionId) : [...prev, sessionId]
    );
  };

  const handleSubmit = async (e: React.FormEvent, mode: 'draft' | 'publish' = saveMode) => {
    e.preventDefault();
    setError(null);

    if (selectedSessionIds.length === 0) {
      setError(t('dashboardCLO:validationSelectSession'));
      return;
    }

    if (mode === 'publish' && questions.length === 0) {
      setError(t('dashboardCLO:validationAddQuestion'));
      return;
    }

    for (const question of questions) {
      if (!question.questionText.trim()) {
        setError(t('dashboardCLO:validationQuestionMissingText'));
        return;
      }

      if (question.answerType === "mcq") {
        if (!question.options || question.options.length < 2) {
          setError(t('dashboardCLO:validationQuestionNeedsOptions'));
          return;
        }
      }
    }

    try {
      setIsSaving(true);
      setSaveMode(mode);

      const cleanedQuestions = questions.map(({ _id, ...question }) => question);

      const taskData: CreateCLOTaskData = {
        sessionIds: selectedSessionIds,
        title,
        titleAr: titleAr || undefined,
        description,
        descriptionAr: descriptionAr || undefined,
        deadline: new Date(deadline).toISOString(),
        maxScore,
        questions: cleanedQuestions,
        allowLateSubmission,
        status: mode === 'draft' ? 'draft' : 'open',
      };

      if (isEditing && taskId) {
        await updateTask(taskId, taskData);
      } else {
        await createTask(taskData);
      }

      navigate("/clo/tasks");
    } catch (err: any) {
      setError(err.message || "Failed to save task");
    } finally {
      setIsSaving(false);
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

  if (isLoadingTask && isEditing) {
    return <LoadingState type="skeleton" text={t('dashboardCLO:loadingTaskBuilder')} />;
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate("/clo/tasks")}
        >
          {t('dashboardCommon:back')}
        </Button>
        <div className={isRTL ? 'text-right' : ''}>
          <h1 className="text-3xl font-bold inline-block group-hover:scale-105 transition-transform duration-300" style={{
            color: '#0f1f33',
            backgroundClip: 'text'
          }}>
            {isEditing ? t('dashboardCLO:editTask') : t('dashboardCLO:createTask')}
          </h1>
          <p className="mt-1 transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>
            {isEditing ? t('dashboardCLO:editTaskSubtitle') : t('dashboardCLO:createTaskSubtitle')}
          </p>
        </div>
      </motion.div>

      {/* Error Alert */}
      {(error || tasksError) && (
        <motion.div variants={itemVariants}>
          <Alert variant="error">
            <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold mb-1">{t('dashboardCommon:error')}</p>
                <p className="text-sm opacity-90">{error || tasksError}</p>
              </div>
            </div>
          </Alert>
        </motion.div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Basic Information */}
          <motion.div variants={itemVariants}>
            <CardComponent variant="glass">
              <CardBody>
                <h2 className="text-xl font-semibold text-white mb-4">{t('dashboardCLO:basicInfo')}</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className={`flex items-center justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <label className="block text-sm font-medium text-white/80">
                          {t('dashboardCLO:selectGroups')} *
                        </label>
                        {selectedGroupIds.length > 0 && (
                          <span className="text-xs text-white/50">{selectedGroupIds.length}</span>
                        )}
                      </div>
                      <div className="border border-white/20 rounded-lg bg-white/5 max-h-48 overflow-y-auto p-2 space-y-1">
                        {(groups || []).length === 0 ? (
                          <p className="text-sm text-white/40 p-2">{t('dashboardCLO:noGroupsAvailable')}</p>
                        ) : (
                          (groups || []).map((group) => {
                            const isChecked = selectedGroupIds.includes(group._id);
                            return (
                              <label
                                key={group._id}
                                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${isRTL ? 'flex-row-reverse' : ''} ${
                                  isChecked ? 'bg-primary/10 border border-primary/40' : 'border border-transparent hover:bg-white/5'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleGroup(group._id)}
                                  className="w-4 h-4 flex-shrink-0"
                                />
                                <span className="text-sm text-white/90 truncate">
                                  {group.name} — {group.courseId?.title || ''}
                                </span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                    <div>
                      <div className={`flex items-center justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <label className="block text-sm font-medium text-white/80">
                          {t('dashboardCLO:selectSessions')} *
                        </label>
                        {selectedSessionIds.length > 0 && (
                          <span className="text-xs text-white/50">{selectedSessionIds.length}</span>
                        )}
                      </div>
                      <div className="border border-white/20 rounded-lg bg-white/5 max-h-48 overflow-y-auto p-2 space-y-1">
                        {selectedGroupIds.length === 0 ? (
                          <p className="text-sm text-white/40 p-2">{t('dashboardCLO:selectGroupFirst')}</p>
                        ) : availableSessions.length === 0 ? (
                          <p className="text-sm text-white/40 p-2">{t('dashboardCLO:noSessionsAvailable')}</p>
                        ) : (
                          availableSessions.map((session) => {
                            const isChecked = selectedSessionIds.includes(session._id);
                            return (
                              <label
                                key={session._id}
                                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${isRTL ? 'flex-row-reverse' : ''} ${
                                  isChecked ? 'bg-primary/10 border border-primary/40' : 'border border-transparent hover:bg-white/5'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleSession(session._id)}
                                  className="w-4 h-4 flex-shrink-0"
                                />
                                <span className="text-sm text-white/90 truncate">
                                  [{session._groupName}] {session.sessionNumber ? `#${session.sessionNumber} — ` : ''}{session.title}
                                  {session.scheduledDate ? ` (${formatDate(session.scheduledDate)})` : ''}
                                </span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      {t('dashboardCLO:taskTitle')} *
                    </label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={t('dashboardCLO:taskTitlePlaceholder')}
                      required
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      {t('dashboardCLO:taskTitleArOptional')}
                    </label>
                    <Input
                      value={titleAr}
                      onChange={(e) => setTitleAr(e.target.value)}
                      placeholder={t('dashboardCLO:taskTitleArPlaceholder')}
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      {t('dashboardCLO:taskDescription')} *
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={t('dashboardCLO:taskDescriptionPlaceholder')}
                      required
                      rows={4}
                      className="w-full px-4 py-3 rounded-lg border border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      {t('dashboardCLO:taskDescriptionArOptional')}
                    </label>
                    <textarea
                      value={descriptionAr}
                      onChange={(e) => setDescriptionAr(e.target.value)}
                      placeholder={t('dashboardCLO:taskDescriptionArPlaceholder')}
                      rows={4}
                      className="w-full px-4 py-3 rounded-lg border border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">
                        {t('dashboardCLO:taskDeadlineLabel')} *
                      </label>
                      <Input
                        type="datetime-local"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        required
                        className="bg-white/5 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">
                        {t('dashboardCLO:taskMaxScoreLabel')}
                      </label>
                      <Input
                        type="number"
                        value={maxScore}
                        onChange={(e) => setMaxScore(parseInt(e.target.value) || 100)}
                        min="0"
                        className="bg-white/5 border-white/20 text-white"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allowLateSubmission}
                          onChange={(e) => setAllowLateSubmission(e.target.checked)}
                          className="w-4 h-4 text-primary"
                        />
                        <span className="text-sm text-white/80">{t('dashboardCLO:allowLateSubmission')}</span>
                      </label>
                    </div>
                  </div>
                </div>
              </CardBody>
            </CardComponent>
          </motion.div>

          {/* Questions */}
          <motion.div variants={itemVariants}>
            <CardComponent variant="glass">
              <CardBody>
                <QuestionBuilder questions={questions} onChange={setQuestions} />
              </CardBody>
            </CardComponent>
          </motion.div>

          {/* Actions */}
          <motion.div variants={itemVariants} className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/clo/tasks")}
              disabled={isSaving}
            >
              {t('dashboardCommon:cancel')}
            </Button>
            {/* Save as Draft — always available */}
            <Button
              type="button"
              variant="outline"
              leftIcon={<FileText className="w-5 h-5" />}
              disabled={isSaving || tasksLoading}
              isLoading={isSaving && saveMode === 'draft'}
              onClick={(e) => handleSubmit(e as any, 'draft')}
            >
              {t('dashboardCLO:saveAsDraft')}
            </Button>
            {/* Publish */}
            <Button
              type="submit"
              variant="primary"
              leftIcon={<Save className="w-5 h-5" />}
              disabled={isSaving || tasksLoading}
              isLoading={isSaving && saveMode === 'publish'}
              onClick={() => setSaveMode('publish')}
            >
              {isEditing ? t('dashboardCLO:updateTask') : t('dashboardCLO:publishTask')}
            </Button>
          </motion.div>
        </div>
      </form>
    </motion.div>
  );
}
