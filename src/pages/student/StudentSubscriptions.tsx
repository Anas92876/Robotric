/**
 * Student Subscriptions Page
 *
 * Student view of their subscription:
 * - View subscription status
 * - View remaining hours
 * - Request sessions
 * - View my session requests
 * - Cancel session requests
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Clock,
  Calendar,
  Plus,
  XCircle,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { useMySubscription, useMySessionRequests } from '../../hooks';
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
  useToast,
} from '../../components/ui';
import SessionRequestModal from '../../components/student/SessionRequestModal';
import { useTranslation } from 'react-i18next';

export default function StudentSubscriptions() {
  const {
    hasActiveSubscription,
    subscription,
    isLoading: subscriptionLoading,
    error: subscriptionError,
    fetchSubscription,
  } = useMySubscription();

  const {
    requests,
    isLoading: requestsLoading,
    error: requestsError,
    fetchRequests,
    createRequest,
    cancelRequest,
  } = useMySessionRequests();
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardStudent']);
  const isRTL = i18n.language === 'ar';

  const toast = useToast();
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [requestToCancel, setRequestToCancel] = useState<string | null>(null);

  const handleCreateRequest = async (data: any) => {
    try {
      setIsSubmitting(true);
      await createRequest(data);
      toast.success(t('dashboardCommon:successMessage'), 'Session request created successfully!');
      setIsRequestModalOpen(false);
      fetchRequests();
    } catch (error: any) {
      toast.error(t('dashboardCommon:error'), error.message || t('dashboardCommon:errorMessage'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelClick = (requestId: string) => {
    setRequestToCancel(requestId);
    setIsCancelModalOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!requestToCancel) return;
    try {
      setIsSubmitting(true);
      await cancelRequest(requestToCancel);
      toast.success(t('dashboardCommon:successMessage'), 'Session request canceled successfully');
      setIsCancelModalOpen(false);
      setRequestToCancel(null);
      fetchRequests();
    } catch (error: any) {
      toast.error(t('dashboardCommon:error'), error.message || t('dashboardCommon:errorMessage'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = subscriptionLoading || requestsLoading;
  const error = subscriptionError || requestsError;

  if (isLoading && !subscription) {
    return <LoadingState type="skeleton" text={t('dashboardStudent:loadingSubscription')} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className={`flex items-center justify-between`}>
        <div >
          <h1 className="text-2xl sm:text-3xl font-bold text-[#003300]">{t('dashboardStudent:mySubscription')}</h1>
          <p className="text-[#003300]/60 mt-1">{t('dashboardStudent:manageSubscription')}</p>
        </div>
        <Button
          variant="outline"
          leftIcon={<RefreshCw className="w-4 h-4" />}
          onClick={() => {
            fetchSubscription();
            fetchRequests();
          }}
        >
          {t('dashboardCommon:refresh')}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="error" icon={<AlertCircle className="w-5 h-5" />}>
          {error}
        </Alert>
      )}

      {/* Subscription Status */}
      {!hasActiveSubscription ? (
        <CardComponent>
          <CardBody className="p-12 text-center">
            <CreditCard className="w-16 h-16 mx-auto text-[#003300]/20 mb-4" />
            <h3 className="text-xl font-semibold text-[#003300] mb-2">
              {t('dashboardStudent:noActiveSubscription')}
            </h3>
            <p className="text-[#003300]/60 mb-6">
              {t('dashboardStudent:noActiveSubscriptionDesc')}
            </p>
          </CardBody>
        </CardComponent>
      ) : (
        <>
          {/* Subscription Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            <StatsCard
              label={t('dashboardStudent:remainingHours')}
              value={subscription?.remainingHours || 0}
              icon={<Clock className="w-6 h-6" />}
            />
            <StatsCard
              label={t('dashboardStudent:plan')}
              value={typeof subscription?.planId === 'object' ? subscription.planId.name : 'N/A'}
              icon={<CreditCard className="w-6 h-6" />}
            />
            <StatsCard
              label={t('dashboardCommon:status')}
              value={subscription?.status || 'N/A'}
              icon={<CheckCircle className="w-6 h-6" />}
            />
          </div>

          <CardComponent>
            <CardBody className="p-6">
              <div className={`grid grid-cols-2 gap-4`}>
                <div>
                  <p className="text-sm text-[#003300]/60 mb-1">{t('dashboardCommon:startDate')}</p>
                  <p className="font-semibold text-[#003300]">
                    {subscription?.startsAt
                      ? new Date(subscription.startsAt).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#003300]/60 mb-1">{t('dashboardCommon:endDate')}</p>
                  <p className="font-semibold text-[#003300]">
                    {subscription?.endsAt
                      ? new Date(subscription.endsAt).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </CardBody>
          </CardComponent>

          {/* Request Session Button */}
          <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'}`}>
            <Button
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsRequestModalOpen(true)}
            >
              {t('dashboardStudent:requestSessionBtn')}
            </Button>
          </div>
        </>
      )}

      {/* My Session Requests */}
      <div>
        <h2 className={`text-xl font-semibold text-[#003300] mb-4`}>
          {t('dashboardStudent:mySessionRequests')}
        </h2>
        {requestsLoading ? (
          <LoadingState type="skeleton" text={t('dashboardStudent:loadingRequests')} />
        ) : requests.length === 0 ? (
          <CardComponent>
            <CardBody className="p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto text-[#003300]/20 mb-4" />
              <h3 className="text-xl font-semibold text-[#003300] mb-2">
                {t('dashboardStudent:noSessionRequests')}
              </h3>
              <p className="text-[#003300]/60 mb-6">
                {hasActiveSubscription
                  ? t('dashboardStudent:noSessionRequestsDesc')
                  : t('dashboardStudent:noActiveSubRequestDesc')}
              </p>
              {hasActiveSubscription && (
                <Button variant="primary" onClick={() => setIsRequestModalOpen(true)}>
                  {t('dashboardStudent:requestSessionBtn')}
                </Button>
              )}
            </CardBody>
          </CardComponent>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => {
              const endTime = new Date(
                new Date(`${request.date.split('T')[0]}T${request.startTime}`).getTime() +
                  request.durationHours * 60 * 60 * 1000
              ).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

              return (
                <CardComponent key={request._id} hoverable>
                  <CardBody className="p-6">
                    <div className={`flex items-start justify-between`}>
                      <div className="flex-1">
                        <div className={`flex items-center gap-3 mb-2`}>
                          <h3 className="font-semibold text-[#003300] text-lg">
                            {new Date(request.date).toLocaleDateString()}
                          </h3>
                          <Badge
                            variant={
                              request.status === 'approved'
                                ? 'success'
                                : request.status === 'declined' || request.status === 'no_show'
                                ? 'error'
                                : request.status === 'pending'
                                ? 'warning'
                                : 'default'
                            }
                          >
                            {request.status}
                          </Badge>
                        </div>

                        <div className={`grid grid-cols-2 md:grid-cols-3 gap-4 mb-4`}>
                          <div>
                            <p className="text-xs text-[#003300]/60 mb-1">{t('dashboardCommon:time')}</p>
                            <p className="font-semibold text-[#003300]">
                              {request.startTime} - {endTime}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[#003300]/60 mb-1">{t('dashboardStudent:duration')}</p>
                            <p className="font-semibold text-[#003300]">
                              {request.durationHours} hrs
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[#003300]/60 mb-1">{t('dashboardCommon:status')}</p>
                            <p className="font-semibold text-[#003300]">{request.status}</p>
                          </div>
                        </div>

                        {request.description && (
                          <div className="bg-[#003300]/5 rounded-lg p-3 mb-4">
                            <p dir="auto" className={`text-sm text-[#003300]/80`}>{request.description}</p>
                          </div>
                        )}

                        {request.declineReason && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className={`text-sm text-red-700`}>
                              <strong>{t('dashboardStudent:declineReason')}</strong> {request.declineReason}
                            </p>
                          </div>
                        )}
                      </div>

                      {request.status === 'pending' && (
                        <Button
                          variant="danger"
                          size="sm"
                          leftIcon={<XCircle className="w-4 h-4" />}
                          onClick={() => handleCancelClick(request._id)}
                          disabled={isSubmitting}
                        >
                          {t('dashboardCommon:cancel')}
                        </Button>
                      )}
                    </div>
                  </CardBody>
                </CardComponent>
              );
            })}
          </div>
        )}
      </div>

      {/* Request Session Modal */}
      {hasActiveSubscription && (
        <SessionRequestModal
          isOpen={isRequestModalOpen}
          onClose={() => setIsRequestModalOpen(false)}
          onSubmit={handleCreateRequest}
          remainingHours={subscription?.remainingHours || 0}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false);
          setRequestToCancel(null);
        }}
        title={t('dashboardStudent:cancelSessionRequestTitle')}
      >
        <div className="space-y-4">
          <p className={`text-[#003300]`}>
            {t('dashboardStudent:cancelRequestConfirm')}
          </p>
          <p className={`text-sm text-[#003300]/60`}>
            {t('dashboardStudent:cancelRequestNote')}
          </p>
          <div className={`flex items-center justify-end gap-3 pt-4`}>
            <Button
              variant="outline"
              onClick={() => {
                setIsCancelModalOpen(false);
                setRequestToCancel(null);
              }}
              disabled={isSubmitting}
            >
              {t('dashboardStudent:noKeepIt')}
            </Button>
            <Button variant="danger" onClick={handleCancelConfirm} isLoading={isSubmitting}>
              {t('dashboardStudent:yesCancel')}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
