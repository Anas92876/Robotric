import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  UsersRound,
  Plus,
  Search,
  Eye,
  Edit,
  UserMinus,
  RefreshCw,
  AlertCircle,
  Calendar,
  User,
  BookOpen,
  Users,
  Trash2,
  LayoutDashboard,
} from "lucide-react";
import { useCLOGroups } from "../../hooks";
import { useCLOCourses } from "../../hooks/clo/useCLOCourses";
import { useCLOTrainers } from "../../hooks/clo/useCLOTrainers";
import {
  Button,
  Badge,
  LoadingState,
  Alert,
  Input,
} from "../../components/ui";
import GroupModal, { type GroupFormData } from "../../components/clo/GroupModal";
import GroupDetailsModal from "../../components/clo/GroupDetailsModal";
import type { Group } from "../../hooks/clo/useCLOGroups";
import { useTranslation } from 'react-i18next';
import { formatDate } from "../../utils/dateTime";

export default function CLOGroups() {
  const { groups, isLoading, error, fetchGroups, createGroup, updateGroup, deleteGroup, closeGroup, toggleGroupBoard } = useCLOGroups();
  const { courses, fetchCourses } = useCLOCourses();
  const { trainers, fetchTrainers } = useCLOTrainers();
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardCLO']);
  const isRTL = i18n.language === 'ar';

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Details modal state
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  useEffect(() => {
    const params: any = {};

    if (statusFilter !== "all") {
      params.status = statusFilter;
    }

    if (searchQuery.trim()) {
      params.search = searchQuery;
    }

    fetchGroups(params);
  }, [searchQuery, statusFilter, fetchGroups]);

  // Fetch courses and trainers for modal dropdowns
  useEffect(() => {
    fetchCourses({ status: 'published' });
    fetchTrainers(); // Fetch all trainers instead of filtering by status
  }, [fetchCourses, fetchTrainers]);

  // Modal handlers
  const handleOpenCreateModal = () => {
    setSelectedGroup(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (group: Group) => {
    setSelectedGroup(group);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedGroup(null);
  };

  const handleSubmit = async (data: GroupFormData) => {
    try {
      setIsSubmitting(true);
      if (selectedGroup) {
        await updateGroup(selectedGroup._id, data);
        alert("Group updated successfully!");
      } else {
        await createGroup(data);
        alert("Group created successfully!");
      }
      handleCloseModal();
      fetchGroups();
    } catch (error: any) {
      alert(error.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = async (groupId: string, status: string) => {
    try {
      await closeGroup(groupId, status === "completed" ? "reopen" : "close");
      alert(
        `Group ${status === "completed" ? "reopened" : "closed"} successfully`
      );
      fetchGroups();
    } catch (err: any) {
      alert(err.message || "Failed to update group status");
    }
  };

  const handleToggleBoard = async (groupId: string) => {
    try {
      await toggleGroupBoard(groupId);
    } catch (err: any) {
      alert(err.message || 'Failed to toggle board');
    }
  };

  const handleDelete = async (groupId: string) => {
    if (!confirm(t('dashboardCLO:deleteGroupConfirm'))) {
      return;
    }
    try {
      await deleteGroup(groupId);
      alert("Group deleted successfully!");
    } catch (err: any) {
      alert(err.message || "Failed to delete group");
    }
  };

  // Details modal handlers
  const handleOpenDetails = (groupId: string) => {
    setSelectedGroupId(groupId);
    setIsDetailsModalOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDetailsModalOpen(false);
    setSelectedGroupId(null);
  };

  if (isLoading && groups.length === 0) {
    return <LoadingState type="skeleton" text={t('dashboardCLO:loadingGroups')} />;
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
        <div className={isRTL ? 'text-right' : ''}>
          <h1 className="text-3xl font-bold text-[#003300]">{t('dashboardCLO:groups')}</h1>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={handleOpenCreateModal}
        >
          {t('dashboardCLO:createGroup')}
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-[#003300]/10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="relative">
              <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-[#003300]/40`} />
              <Input
                type="text"
                placeholder={t('dashboardCLO:searchGroups')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={isRTL ? 'pr-10' : 'pl-10'}
              />
            </div>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-[#003300]/20 bg-white text-[#003300] focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            >
              <option value="all">{t('dashboardCommon:allStatus')}</option>
              <option value="active">{t('dashboardCommon:active')}</option>
              <option value="completed">{t('dashboardCommon:completed')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <motion.div variants={itemVariants}>
          <Alert variant="error">
            <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold mb-1">{t('dashboardCommon:error')}</p>
                <p className="text-sm opacity-90">{error}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<RefreshCw className="w-4 h-4" />}
                onClick={() => fetchGroups()}
              >
                {t('dashboardCommon:retry')}
              </Button>
            </div>
          </Alert>
        </motion.div>
      )}

      {/* Groups List */}
      <div className="grid grid-cols-1 gap-4">
        {groups.length > 0 ? (
          groups.map((group, index) => (
            <motion.div
              key={group._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <div className="group relative bg-white rounded-xl p-6 border border-[#003300]/20 hover:border-[#003300]/40 hover:shadow-2xl transition-all duration-500 ease-out overflow-hidden hover:-translate-y-2">
                {/* Animated Background Gradient on Hover */}
                <div className="absolute inset-0 bg-[#003300]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl -z-10" />

                {/* Shimmer Effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-transparent rounded-xl -z-10" />

                <div className="relative z-10">
                <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  {/* Avatar */}
                  <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white flex-shrink-0">
                    <UsersRound className="w-8 h-8" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className={`flex items-start justify-between gap-4 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="flex-1 min-w-0">
                        <div className={`flex items-center gap-2 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <h3 className="text-xl font-semibold text-[#003300] truncate">
                            {group.name}
                          </h3>
                          <Badge
                            variant={
                              group.status === "active"
                                ? "success"
                                : "secondary"
                            }
                            size="sm"
                          >
                            {group.status}
                          </Badge>
                        </div>

                        <div className={`flex flex-wrap items-center gap-3 text-sm text-[#003300]/60 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <BookOpen className="w-4 h-4" />
                            <span title={JSON.stringify(group.courseId)}>
                              {group.courseId?.title || "N/A"}
                            </span>
                          </div>
                          <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <User className="w-4 h-4" />
                            <span title={JSON.stringify(group.trainerId)}>
                              {group.trainerId?.name || "N/A"}
                            </span>
                          </div>
                          {group.startDate && (
                            <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <Calendar className="w-4 h-4" />
                              <span>
                                {formatDate(group.startDate)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className={`flex items-center gap-2 flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Eye className="w-4 h-4" />}
                          onClick={() => handleOpenDetails(group._id)}
                        >
                          {t('dashboardCLO:view')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Edit className="w-4 h-4" />}
                          onClick={() => handleOpenEditModal(group)}
                        >
                          {t('dashboardCommon:edit')}
                        </Button>
                        <Button
                          variant={
                            group.status === "completed" ? "primary" : "ghost"
                          }
                          size="sm"
                          leftIcon={<UserMinus className="w-4 h-4" />}
                          onClick={() => handleClose(group._id, group.status)}
                        >
                          {group.status === "completed" ? t('dashboardCLO:reopenGroup') : t('dashboardCLO:closeGroup')}
                        </Button>
                        <Button
                          variant={group.boardEnabled ? 'primary' : 'ghost'}
                          size="sm"
                          leftIcon={<LayoutDashboard className="w-4 h-4" />}
                          onClick={() => handleToggleBoard(group._id)}
                          title={group.boardEnabled ? t('dashboardCLO:boardEnabledTooltip') : t('dashboardCLO:boardDisabledTooltip')}
                        >
                          {group.boardEnabled ? t('dashboardCLO:disableBoard') : t('dashboardCLO:enableBoard')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Trash2 className="w-4 h-4" />}
                          onClick={() => handleDelete(group._id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title={t('dashboardCommon:delete')}
                        />
                      </div>
                    </div>

                    {/* Stats */}
                    {group.stats && (
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#003300]/10">
                        <div className={isRTL ? 'text-right' : ''}>
                          <p className="text-xs text-[#003300]/60 mb-1">
                            {t('dashboardCLO:studentsLabel')}
                          </p>
                          <div className={`flex items-baseline gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <Users className="w-4 h-4 text-primary" />
                            <p className="text-lg font-semibold text-[#003300]">
                              {group.stats.studentsCount || 0}
                              {(group.maxStudents || group.maxCapacity) && (
                                <span className="text-sm font-normal text-[#003300]/60">
                                  /{group.maxStudents || group.maxCapacity}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                </div>

                {/* Corner Decoration */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-[#003300]/5 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
            </motion.div>
          ))
        ) : (
          <div className="bg-white rounded-xl p-6 border border-[#003300]/10">
            <div className="text-center py-12">
              <UsersRound className="w-16 h-16 mx-auto mb-4 text-[#003300]/20" />
              <h3 className="text-lg font-semibold text-[#003300] mb-2">
                {t('dashboardCLO:noGroupsFound')}
              </h3>
              <p className="text-[#003300]/60 mb-4">
                {searchQuery || statusFilter !== "all"
                  ? t('dashboardCLO:tryAdjustingFilters')
                  : t('dashboardCLO:getStartedFirstGroup')}
              </p>
              {!searchQuery && statusFilter === "all" && (
                <Button
                  variant="primary"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={handleOpenCreateModal}
                >
                  {t('dashboardCLO:createGroup')}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Group Modal */}
      <GroupModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        group={selectedGroup}
        courses={courses}
        trainers={trainers}
        isLoading={isSubmitting}
      />

      {/* Group Details Modal */}
      <GroupDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={handleCloseDetails}
        groupId={selectedGroupId}
      />
    </motion.div>
  );
}
