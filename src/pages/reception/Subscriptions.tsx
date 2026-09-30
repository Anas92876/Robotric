/**
 * Reception Subscriptions Page
 * 
 * Manage user subscriptions:
 * - View all user subscriptions
 * - Assign student to subscription
 * - Update subscription
 * - Cancel subscription
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  Edit,
  XCircle,
  Users,
  Clock,
  DollarSign,
} from 'lucide-react';
import { useUserSubscriptions } from '../../hooks';
import { useReceptionUsers } from '../../hooks';
import type { UserSubscription } from '../../services/subscription.service';
import {
  Button,
  Badge,
  LoadingState,
  Alert,
  Input,
  Modal,
  CardComponent,
  CardBody,
  StatsCard,
} from '../../components/ui';
import UserSubscriptionModal from '../../components/reception/UserSubscriptionModal';

export default function Subscriptions() {
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardReception']);
  const isRTL = i18n.language === 'ar';

  const {
    subscriptions,
    activePlans,
    isLoading,
    error,
    filters,
    setFilters,
    fetchSubscriptions,
    createSubscription,
    updateSubscription,
    cancelSubscription,
  } = useUserSubscriptions();

  const { users } = useReceptionUsers();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<UserSubscription | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [subscriptionToCancel, setSubscriptionToCancel] = useState<UserSubscription | null>(null);

  // Filter subscriptions
  const filteredSubscriptions = subscriptions.filter((sub) => {
    const user = typeof sub.userId === 'object' ? sub.userId : null;
    const userName = user?.name || '';
    const userEmail = user?.email || '';

    const matchesSearch =
      !searchQuery ||
      userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      userEmail.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || sub.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const activeCount = subscriptions.filter((s) => s.status === 'active').length;
  const expiredCount = subscriptions.filter((s) => s.status === 'expired').length;
  const canceledCount = subscriptions.filter((s) => s.status === 'canceled').length;

  const handleOpenCreateModal = () => {
    setSelectedSubscription(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (subscription: UserSubscription) => {
    setSelectedSubscription(subscription);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSubscription(null);
  };

  const handleSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      if (selectedSubscription) {
        await updateSubscription(selectedSubscription._id, data);
        alert('Subscription updated successfully!');
      } else {
        await createSubscription(data);
        alert('Subscription assigned successfully!');
      }
      handleCloseModal();
      fetchSubscriptions();
    } catch (error: any) {
      alert(error.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelClick = (subscription: UserSubscription) => {
    setSubscriptionToCancel(subscription);
    setIsCancelModalOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!subscriptionToCancel) return;
    try {
      await cancelSubscription(subscriptionToCancel._id);
      alert('Subscription canceled successfully!');
      setIsCancelModalOpen(false);
      setSubscriptionToCancel(null);
      fetchSubscriptions();
    } catch (error: any) {
      alert(error.message || 'Failed to cancel subscription');
    }
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setFilters({ ...filters, status: status === 'all' ? undefined : status });
  };

  if (isLoading && subscriptions.length === 0) {
    return <LoadingState type="skeleton" text="Loading subscriptions..." />;
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
          <h1 className={`text-3xl font-bold inline-block group-hover:scale-105 transition-transform duration-300 ${isRTL ? 'text-right' : 'text-left'}`} style={{
            color: '#0f1f33',
            backgroundClip: 'text'
          }}>{t('dashboardReception:subscriptions.title', 'User Subscriptions')}</h1>
          <p className={`mt-1 transition-colors duration-300 ${isRTL ? 'text-right' : 'text-left'}`} style={{ color: '#0f1f33' + 'CC' }}>{t('dashboardReception:subscriptions.subtitle', 'Manage student subscriptions')}</p>
        </div>
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Button
            variant="outline"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={() => fetchSubscriptions()}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={handleOpenCreateModal}
          >
            Assign Subscription
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          label="Active Subscriptions"
          value={activeCount}
          icon={<CreditCard className="w-6 h-6" />}
        />
        <StatsCard
          label="Expired"
          value={expiredCount}
          icon={<Clock className="w-6 h-6" />}
        />
        <StatsCard
          label="Canceled"
          value={canceledCount}
          icon={<XCircle className="w-6 h-6" />}
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-ink/10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
              <Input
                type="text"
                placeholder="Search by student name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-ink/20 bg-white text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="canceled">Canceled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="error" icon={<AlertCircle className="w-5 h-5" />}>
          {error}
        </Alert>
      )}

      {/* Subscriptions List */}
      {filteredSubscriptions.length === 0 ? (
        <CardComponent>
          <CardBody className="p-12 text-center">
            <CreditCard className="w-16 h-16 mx-auto text-ink/20 mb-4" />
            <h3 className="text-xl font-semibold text-ink mb-2">
              No Subscriptions Found
            </h3>
            <p className="text-ink/60 mb-6">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by assigning a subscription to a student'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button variant="primary" onClick={handleOpenCreateModal}>
                Assign Subscription
              </Button>
            )}
          </CardBody>
        </CardComponent>
      ) : (
        <div className="space-y-4">
          {filteredSubscriptions.map((subscription) => {
            const user = typeof subscription.userId === 'object' ? subscription.userId : null;
            const plan = typeof subscription.planId === 'object' ? subscription.planId : null;

            return (
              <CardComponent key={subscription._id} hoverable>
                <CardBody className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-ink text-lg">
                          {user?.name || 'Unknown User'}
                        </h3>
                        <Badge
                          variant={
                            subscription.status === 'active'
                              ? 'success'
                              : subscription.status === 'expired'
                              ? 'warning'
                              : 'default'
                          }
                        >
                          {subscription.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-ink/60 mb-4">{user?.email}</p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-ink/60 mb-1">Plan</p>
                          <p className="font-semibold text-ink">{plan?.name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-ink/60 mb-1">Remaining Hours</p>
                          <p className="font-semibold text-ink">
                            {subscription.remainingHours} hrs
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-ink/60 mb-1">Start Date</p>
                          <p className="font-semibold text-ink">
                            {new Date(subscription.startsAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-ink/60 mb-1">End Date</p>
                          <p className="font-semibold text-ink">
                            {new Date(subscription.endsAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {subscription.status === 'active' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Edit className="w-4 h-4" />}
                            onClick={() => handleOpenEditModal(subscription)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<XCircle className="w-4 h-4" />}
                            onClick={() => handleCancelClick(subscription)}
                            className="text-red-500 hover:text-red-600"
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardBody>
              </CardComponent>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <UserSubscriptionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        subscription={selectedSubscription}
        activePlans={activePlans}
        users={users}
        isSubmitting={isSubmitting}
      />

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false);
          setSubscriptionToCancel(null);
        }}
        title="Cancel Subscription"
      >
        <div className="space-y-4">
          <p className="text-ink">
            Are you sure you want to cancel this subscription?
          </p>
          {subscriptionToCancel && (
            <div className="bg-ink/5 rounded-lg p-4">
              <p className="text-sm text-ink/60">
                User: {typeof subscriptionToCancel.userId === 'object' ? subscriptionToCancel.userId.name : 'N/A'}
              </p>
              <p className="text-sm text-ink/60">
                Remaining Hours: {subscriptionToCancel.remainingHours}
              </p>
            </div>
          )}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsCancelModalOpen(false);
                setSubscriptionToCancel(null);
              }}
            >
              No, Keep It
            </Button>
            <Button variant="danger" onClick={handleCancelConfirm}>
              Yes, Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
