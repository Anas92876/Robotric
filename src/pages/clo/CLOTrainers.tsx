import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Plus,
  Search,
  UserCheck,
  UserX,
  Edit,
  Eye,
  RefreshCw,
  AlertCircle,
  Mail,
  Award,
  BookOpen,
} from "lucide-react";
import { useCLOTrainers } from "../../hooks";
import {
  Button,
  Badge,
  LoadingState,
  Alert,
  Input,
} from "../../components/ui";
import type { Trainer } from "../../hooks/clo/useCLOTrainers";
import TrainerModal, { type TrainerFormData } from "../../components/clo/TrainerModal";
import TrainerDetailsModal from "../../components/clo/TrainerDetailsModal";
import { useTranslation } from 'react-i18next';

export default function CLOTrainers() {
  const {
    trainers,
    isLoading,
    error,
    fetchTrainers,
    createTrainer,
    updateTrainer,
    deactivateTrainer,
  } = useCLOTrainers();
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardCLO']);
  const isRTL = i18n.language === 'ar';

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Details modal state
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedTrainerId, setSelectedTrainerId] = useState<string | null>(null);

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
    const params: any = {
      sortBy,
      order: sortOrder,
    };

    if (statusFilter !== "all") {
      params.status = statusFilter;
    }

    if (searchQuery.trim()) {
      params.search = searchQuery;
    }

    fetchTrainers(params);
  }, [searchQuery, statusFilter, sortBy, sortOrder, fetchTrainers]);

  // Modal handlers
  const handleOpenCreateModal = () => {
    setSelectedTrainer(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (trainer: Trainer) => {
    setSelectedTrainer(trainer);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTrainer(null);
  };

  const handleSubmit = async (data: TrainerFormData) => {
    try {
      setIsSubmitting(true);
      if (selectedTrainer) {
        // Update existing trainer
        await updateTrainer(selectedTrainer._id, data);
        alert(t('dashboardCLO:trainerUpdatedSuccess'));
      } else {
        // Create new trainer
        await createTrainer(data);
        alert(t('dashboardCLO:trainerCreatedSuccess'));
      }
      handleCloseModal();
      fetchTrainers(); // Refresh list
    } catch (error: any) {
      alert(error.message || t('dashboardCommon:errorMessage'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (trainerId: string, isActive: boolean) => {
    try {
      await deactivateTrainer(trainerId, isActive ? "deactivate" : "activate");
      alert(isActive ? t('dashboardCLO:trainerDeactivatedSuccess') : t('dashboardCLO:trainerActivatedSuccess'));
    } catch (err: any) {
      alert(err.message || t('dashboardCLO:trainerStatusFailed'));
    }
  };

  // Details modal handlers
  const handleOpenDetails = (trainerId: string) => {
    setSelectedTrainerId(trainerId);
    setIsDetailsModalOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDetailsModalOpen(false);
    setSelectedTrainerId(null);
  };

  if (isLoading && trainers.length === 0) {
    return <LoadingState type="skeleton" text={t('dashboardCLO:loadingTrainers')} />;
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
          <h1 className="text-3xl font-bold inline-block group-hover:scale-105 transition-transform duration-300" style={{ 
            background: 'linear-gradient(135deg, #003300 0%, #004d00 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>{t('dashboardCLO:trainers')}</h1>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={handleOpenCreateModal}
        >
          {t('dashboardCLO:addTrainer')}
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-[#003300]/10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#003300]/40" />
              <Input
                type="text"
                placeholder={t('dashboardCLO:searchTrainers')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
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
              <option value="inactive">{t('dashboardCommon:inactive')}</option>
            </select>
          </div>

          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-[#003300]/20 bg-white text-[#003300] focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            >
              <option value="createdAt">{t('dashboardCLO:newestFirst')}</option>
              <option value="name">{t('dashboardCLO:nameAZ')}</option>
              <option value="email">{t('dashboardCLO:emailAZ')}</option>
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
                onClick={() => fetchTrainers()}
              >
                {t('dashboardCommon:retry')}
              </Button>
            </div>
          </Alert>
        </motion.div>
      )}

      {/* Trainers List */}
      <div className="grid grid-cols-1 gap-4">
        {trainers.length > 0 ? (
          trainers.map((trainer: Trainer, index: number) => (
            <motion.div
              key={trainer._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <div className="bg-white rounded-xl p-6 border border-[#003300]/10 hover:border-primary/30 hover:shadow-md transition-all">
                <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  {/* Avatar */}
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white flex-shrink-0">
                    <Users className="w-8 h-8" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-semibold text-[#003300] truncate">
                            {trainer.name}
                          </h3>
                          <Badge
                            variant={
                              trainer.profile?.isActive !== false
                                ? "success"
                                : "secondary"
                            }
                            size="sm"
                          >
                            {trainer.profile?.isActive !== false
                              ? t('dashboardCommon:active')
                              : t('dashboardCommon:inactive')}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-sm text-[#003300]/60">
                          <div className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            <span>{trainer.email}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Eye className="w-4 h-4" />}
                          onClick={() => handleOpenDetails(trainer._id)}
                        >
                          {t('dashboardCLO:view')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Edit className="w-4 h-4" />}
                          onClick={() => handleOpenEditModal(trainer)}
                        >
                          {t('dashboardCommon:edit')}
                        </Button>
                        <Button
                          variant={
                            trainer.profile?.isActive !== false
                              ? "ghost"
                              : "primary"
                          }
                          size="sm"
                          leftIcon={
                            trainer.profile?.isActive !== false ? (
                              <UserX className="w-4 h-4" />
                            ) : (
                              <UserCheck className="w-4 h-4" />
                            )
                          }
                          onClick={() =>
                            handleDeactivate(
                              trainer._id,
                              trainer.profile?.isActive !== false
                            )
                          }
                        >
                          {trainer.profile?.isActive !== false
                            ? t('dashboardCLO:deactivate')
                            : t('dashboardCLO:activate')}
                        </Button>
                      </div>
                    </div>

                    {/* Stats */}
                    {trainer.stats && (
                      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#003300]/10">
                        <div>
                          <p className="text-xs text-[#003300]/60 mb-1">
                            {t('dashboardCLO:groups')}
                          </p>
                          <div className="flex items-baseline gap-1">
                            <BookOpen className="w-4 h-4 text-primary" />
                            <p className="text-lg font-semibold text-[#003300]">
                              {trainer.stats.totalGroups || 0}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-[#003300]/60 mb-1">
                            {t('dashboardCLO:students')}
                          </p>
                          <div className="flex items-baseline gap-1">
                            <Users className="w-4 h-4 text-secondary" />
                            <p className="text-lg font-semibold text-[#003300]">
                              {trainer.stats.totalStudents || 0}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-[#003300]/60 mb-1">
                            {t('dashboardCLO:avgAttendance')}
                          </p>
                          <div className="flex items-baseline gap-1">
                            <Award className="w-4 h-4 text-accent" />
                            <p className="text-lg font-semibold text-green-600">
                              {trainer.stats.avgAttendance?.toFixed(1) || 0}%
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="bg-white rounded-xl p-6 border border-[#003300]/10">
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 text-[#003300]/20" />
              <h3 className="text-lg font-semibold text-[#003300] mb-2">
                {t('dashboardCLO:noTrainers')}
              </h3>
              <p className="text-[#003300]/60 mb-4">
                {searchQuery || statusFilter !== "all"
                  ? t('dashboardCLO:tryAdjustingFilters')
                  : t('dashboardCLO:getStartedFirstTrainer')}
              </p>
              {!searchQuery && statusFilter === "all" && (
                <Button
                  variant="primary"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={handleOpenCreateModal}
                >
                  {t('dashboardCLO:addTrainer')}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Trainer Modal */}
      <TrainerModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        trainer={selectedTrainer}
        isLoading={isSubmitting}
      />

      {/* Trainer Details Modal */}
      <TrainerDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={handleCloseDetails}
        trainerId={selectedTrainerId}
      />
    </motion.div>
  );
}
