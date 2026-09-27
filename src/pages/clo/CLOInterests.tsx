import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Tag,
  Plus,
  Search,
  Edit,
  Archive,
  RefreshCw,
  AlertCircle,
  Trash2,
  ArchiveRestore,
} from "lucide-react";
import { useCLOInterests } from "../../hooks";
import {
  Button,
  Badge,
  LoadingState,
  Alert,
  Input,
  Modal,
} from "../../components/ui";
import type { Interest } from "../../hooks/clo/useCLOInterests";
import { useTranslation } from 'react-i18next';

export default function CLOInterests() {
  const { interests, isLoading, error, fetchInterests, createInterest, updateInterest, deleteInterest, archiveInterest } =
    useCLOInterests();
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardCLO']);
  const isRTL = i18n.language === 'ar';

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInterest, setSelectedInterest] = useState<Interest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [formErrors, setFormErrors] = useState<{ name?: string }>({});

  useEffect(() =>{
    const params: any = {};

    if (statusFilter !== "all") {
      params.status = statusFilter;
    }

    if (searchQuery.trim()) {
      params.search = searchQuery;
    }

    fetchInterests(params);
  }, [searchQuery, statusFilter, fetchInterests]);

  // Modal handlers
  const handleOpenCreateModal = () => {
    setSelectedInterest(null);
    setFormData({ name: "", description: "" });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (interest: Interest) => {
    setSelectedInterest(interest);
    setFormData({ name: interest.name, description: interest.description || "" });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedInterest(null);
    setFormData({ name: "", description: "" });
    setFormErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setFormErrors({ name: t('dashboardCLO:interestNameRequired') });
      return;
    }

    try {
      setIsSubmitting(true);
      if (selectedInterest) {
        await updateInterest(selectedInterest._id, formData);
        alert("Interest updated successfully!");
      } else {
        await createInterest(formData);
        alert("Interest created successfully!");
      }
      handleCloseModal();
      fetchInterests();
    } catch (error: any) {
      alert(error.response?.data?.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async (interestId: string) => {
    try {
      await archiveInterest(interestId);
      alert("Interest archived successfully!");
      fetchInterests();
    } catch (err: any) {
      alert(err.message || "Failed to archive interest");
    }
  };

  const handleUnarchive = async (interestId: string) => {
    try {
      await updateInterest(interestId, { status: "active" });
      alert("Interest restored!");
      fetchInterests();
    } catch (err: any) {
      alert(err.message || "Failed to restore interest");
    }
  };

  const handleDelete = async (interestId: string) => {
    if (!confirm("Are you sure you want to delete this interest? This action cannot be undone.")) {
      return;
    }
    try {
      await deleteInterest(interestId);
      alert("Interest deleted successfully!");
    } catch (err: any) {
      alert(err.message || "Failed to delete interest");
    }
  };

  if (isLoading && interests.length === 0) {
    return <LoadingState type="skeleton" text={t('dashboardCLO:loadingInterests')} />;
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
          <h1 className="text-3xl font-bold inline-block group-hover:scale-105 transition-transform duration-300" style={{
            background: 'linear-gradient(135deg, #003300 0%, #004d00 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>{t('dashboardCLO:interests')}</h1>
          <p className="mt-1 transition-colors duration-300" style={{ color: '#003300' + 'CC' }}>{t('dashboardCLO:manageInterestFields')}</p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={handleOpenCreateModal}
        >
          {t('dashboardCLO:addInterest')}
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
                placeholder={t('dashboardCLO:searchInterests')}
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
              <option value="archived">{t('dashboardCLO:archived')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
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
              onClick={() => fetchInterests()}
            >
              {t('dashboardCommon:retry')}
            </Button>
          </div>
        </Alert>
      )}

      {/* Interests Table */}
      <div className="bg-white rounded-xl border border-[#003300]/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-primary/5 border-b border-[#003300]/10">
              <tr>
                <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-semibold text-[#003300] uppercase tracking-wider`}>
                  {t('dashboardCommon:name')}
                </th>
                <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-semibold text-[#003300] uppercase tracking-wider`}>
                  {t('dashboardCLO:descriptionLabel')}
                </th>
                <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-semibold text-[#003300] uppercase tracking-wider`}>
                  {t('dashboardCommon:status')}
                </th>
                <th className={`px-6 py-3 ${isRTL ? 'text-left' : 'text-right'} text-xs font-semibold text-[#003300] uppercase tracking-wider`}>
                  {t('dashboardCommon:actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#003300]/10">
              {interests.length > 0 ? (
                interests.map((interest) => (
                  <tr key={interest._id} className="hover:bg-primary/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
                          <Tag className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-medium text-[#003300]">{interest.name}</span>
                      </div>
                    </td>
                    <td className={`px-6 py-4 text-sm text-[#003300]/60 ${isRTL ? 'text-right' : ''}`}>
                      {interest.description || t('dashboardCLO:noDescription')}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={interest.status === "active" ? "success" : "secondary"}
                        size="sm"
                      >
                        {interest.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`flex items-center ${isRTL ? 'justify-start' : 'justify-end'} gap-2`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Edit className="w-4 h-4" />}
                          onClick={() => handleOpenEditModal(interest)}
                          title={t('dashboardCLO:editInterest')}
                        />

                        {interest.status === "active" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Archive className="w-4 h-4" />}
                            onClick={() => handleArchive(interest._id)}
                            title={t('dashboardCLO:archived')}
                            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          />
                        )}

                        {interest.status === "archived" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<ArchiveRestore className="w-4 h-4" />}
                            onClick={() => handleUnarchive(interest._id)}
                            title={t('dashboardCommon:restore')}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          />
                        )}

                        {interest.status === "active" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Trash2 className="w-4 h-4" />}
                            onClick={() => handleDelete(interest._id)}
                            title={t('dashboardCommon:delete')}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12">
                    <div className="text-center">
                      <Tag className="w-16 h-16 mx-auto mb-4 text-[#003300]/20" />
                      <h3 className="text-lg font-semibold text-[#003300] mb-2">
                        {t('dashboardCLO:noInterests')}
                      </h3>
                      <p className="text-[#003300]/60 mb-4">
                        {searchQuery || statusFilter !== "all"
                          ? t('dashboardCLO:tryAdjustingFilters')
                          : t('dashboardCLO:getStartedFirstInterest')}
                      </p>
                      {!searchQuery && statusFilter === "all" && (
                        <Button
                          variant="primary"
                          leftIcon={<Plus className="w-4 h-4" />}
                          onClick={handleOpenCreateModal}
                        >
                          {t('dashboardCLO:addInterest')}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interest Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedInterest ? t('dashboardCLO:editInterest') : t('dashboardCLO:addNewInterest')}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium text-[#003300] mb-2 ${isRTL ? 'text-right' : ''}`}>
              {t('dashboardCLO:interestNameLabel')} <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Robotics, Programming, AI"
              className={formErrors.name ? "border-red-500" : ""}
            />
            {formErrors.name && (
              <p className={`text-red-500 text-sm mt-1 ${isRTL ? 'text-right' : ''}`}>{formErrors.name}</p>
            )}
          </div>

          <div>
            <label className={`block text-sm font-medium text-[#003300] mb-2 ${isRTL ? 'text-right' : ''}`}>
              {t('dashboardCLO:descriptionLabel')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('dashboardCLO:optionalDescPlaceholder')}
              rows={3}
              className={`w-full px-4 py-2 rounded-lg border border-[#003300]/20 bg-white text-[#003300] focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none ${isRTL ? 'text-right' : ''}`}
            />
          </div>

          <div className={`flex justify-end gap-3 pt-4 border-t border-[#003300]/10 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button
              type="button"
              variant="ghost"
              onClick={handleCloseModal}
              disabled={isSubmitting}
            >
              {t('dashboardCommon:cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? selectedInterest
                  ? t('dashboardCLO:updating')
                  : t('dashboardCLO:creating')
                : selectedInterest
                ? t('dashboardCLO:updateInterest')
                : t('dashboardCLO:createInterestBtn')}
            </Button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}
