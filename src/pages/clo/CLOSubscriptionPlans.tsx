/**
 * CLO Subscription Plans Page
 *
 * Manage subscription plans:
 * - View all plans
 * - Create new plan
 * - Update existing plan
 * - Delete plan
 * - Toggle active/inactive status
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Plus,
  Search,
  Edit,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useSubscriptionPlans } from '../../hooks';
import type { SubscriptionPlan } from '../../services/subscription.service';
import {
  Button,
  Badge,
  LoadingState,
  Alert,
  Input,
  Modal,
  CardComponent,
  CardBody,
} from '../../components/ui';
import SubscriptionPlanModal from '../../components/clo/SubscriptionPlanModal';
import { useTranslation } from 'react-i18next';

export default function CLOSubscriptionPlans() {
  const {
    plans,
    isLoading,
    error,
    fetchPlans,
    createPlan,
    updatePlan,
    deletePlan,
  } = useSubscriptionPlans();
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardCLO']);
  const isRTL = i18n.language === 'ar';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<SubscriptionPlan | null>(null);

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

  // Filter plans
  const filteredPlans = plans.filter((plan) => {
    const matchesSearch =
      !searchQuery ||
      plan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && plan.isActive) ||
      (statusFilter === 'inactive' && !plan.isActive);

    return matchesSearch && matchesStatus;
  });

  // Modal handlers
  const handleOpenCreateModal = () => {
    setSelectedPlan(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPlan(null);
  };

  const handleSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      if (selectedPlan) {
        await updatePlan(selectedPlan._id, data);
        alert('Subscription plan updated successfully!');
      } else {
        await createPlan(data);
        alert('Subscription plan created successfully!');
      }
      handleCloseModal();
      fetchPlans();
    } catch (error: any) {
      alert(error.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (plan: SubscriptionPlan) => {
    setPlanToDelete(plan);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!planToDelete) return;

    try {
      await deletePlan(planToDelete._id);
      alert('Subscription plan deleted successfully!');
      setIsDeleteModalOpen(false);
      setPlanToDelete(null);
      fetchPlans();
    } catch (error: any) {
      alert(error.message || 'Failed to delete subscription plan');
    }
  };

  const handleToggleActive = async (plan: SubscriptionPlan) => {
    try {
      await updatePlan(plan._id, { isActive: !plan.isActive });
      fetchPlans();
    } catch (error: any) {
      alert(error.message || 'Failed to update subscription plan');
    }
  };

  if (isLoading && plans.length === 0) {
    return <LoadingState type="skeleton" text={t('dashboardCLO:loadingSubPlans')} />;
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
          }}>{t('dashboardCLO:subscriptionPlans')}</h1>
          <p className="mt-1 transition-colors duration-300" style={{ color: '#003300' + 'CC' }}>{t('dashboardCLO:manageSubPlans')}</p>
        </div>
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Button
            variant="outline"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={() => fetchPlans()}
          >
            {t('dashboardCommon:refresh')}
          </Button>
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={handleOpenCreateModal}
          >
            {t('dashboardCLO:addPlan')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-[#003300]/10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="relative">
              <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-[#003300]/40`} />
              <Input
                type="text"
                placeholder={t('dashboardCLO:searchPlans')}
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
              className="w-full px-4 py-2.5 rounded-lg border border-[#003300]/20 bg-white text-[#003300] focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            >
              <option value="all">{t('dashboardCommon:allStatus')}</option>
              <option value="active">{t('dashboardCommon:active')}</option>
              <option value="inactive">{t('dashboardCommon:inactive')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <motion.div variants={itemVariants}>
          <Alert variant="error" icon={<AlertCircle className="w-5 h-5" />}>
            {error}
          </Alert>
        </motion.div>
      )}

      {/* Plans Grid */}
      {filteredPlans.length === 0 ? (
        <motion.div variants={itemVariants}>
          <CardComponent>
            <CardBody className="p-12 text-center">
              <CreditCard className="w-16 h-16 mx-auto text-[#003300]/20 mb-4" />
              <h3 className="text-xl font-semibold text-[#003300] mb-2">
                {t('dashboardCLO:noPlans')}
              </h3>
              <p className="text-[#003300]/60 mb-6">
                {searchQuery || statusFilter !== 'all'
                  ? t('dashboardCLO:tryAdjustingFilters')
                  : t('dashboardCLO:getStartedFirstPlan')}
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Button variant="primary" onClick={handleOpenCreateModal}>
                  {t('dashboardCLO:createPlan')}
                </Button>
              )}
            </CardBody>
          </CardComponent>
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredPlans.map((plan) => (
            <motion.div key={plan._id} variants={itemVariants}>
              <CardComponent hoverable className="h-full">
                <CardBody className="p-6">
                  <div className={`flex items-start justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                      <h3 className="font-semibold text-[#003300] text-lg mb-1">
                        {plan.name}
                      </h3>
                      <Badge
                        variant={plan.isActive ? 'success' : 'default'}
                        className="text-xs"
                      >
                        {plan.isActive ? (
                          <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <CheckCircle className="w-3 h-3" />
                            {t('dashboardCommon:active')}
                          </div>
                        ) : (
                          <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <XCircle className="w-3 h-3" />
                            {t('dashboardCommon:inactive')}
                          </div>
                        )}
                      </Badge>
                    </div>
                  </div>

                  {plan.description && (
                    <p className={`text-[#003300]/60 text-sm mb-4 line-clamp-2 ${isRTL ? 'text-right' : ''}`}>
                      {plan.description}
                    </p>
                  )}

                  <div className="space-y-2 mb-4">
                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="text-sm text-[#003300]/60">{t('dashboardCLO:monthlyHours')}</span>
                      <span className="font-semibold text-[#003300]">
                        {plan.monthlyHours} hrs
                      </span>
                    </div>
                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="text-sm text-[#003300]/60">{t('dashboardCLO:priceLabel')}</span>
                      <span className="font-semibold text-[#003300]">
                        ${plan.price}
                      </span>
                    </div>
                  </div>

                  <div className={`flex items-center gap-2 pt-4 border-t border-[#003300]/10 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Edit className="w-4 h-4" />}
                      onClick={() => handleOpenEditModal(plan)}
                      className="flex-1"
                    >
                      {t('dashboardCommon:edit')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(plan)}
                      className="flex-1"
                    >
                      {plan.isActive ? t('dashboardCLO:deactivate') : t('dashboardCLO:activate')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Trash2 className="w-4 h-4" />}
                      onClick={() => handleDeleteClick(plan)}
                      className="text-red-500 hover:text-red-600"
                    >
                      {t('dashboardCommon:delete')}
                    </Button>
                  </div>
                </CardBody>
              </CardComponent>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Create/Edit Modal */}
      <SubscriptionPlanModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        plan={selectedPlan}
        isSubmitting={isSubmitting}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setPlanToDelete(null);
        }}
        title={t('dashboardCLO:deleteSubPlanTitle')}
      >
        <div className="space-y-4">
          <p className={`text-[#003300] ${isRTL ? 'text-right' : ''}`}>
            {t('dashboardCLO:deleteSubPlanConfirm', { name: planToDelete?.name })}
          </p>
          <p className={`text-sm text-[#003300]/60 ${isRTL ? 'text-right' : ''}`}>
            {t('dashboardCLO:deleteSubPlanNote')}
          </p>
          <div className={`flex items-center justify-end gap-3 pt-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setPlanToDelete(null);
              }}
            >
              {t('dashboardCommon:cancel')}
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm}>
              {t('dashboardCommon:delete')}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
