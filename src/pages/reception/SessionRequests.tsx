/**
 * Reception Session Requests Page
 * 
 * Manage session requests:
 * - View all session requests
 * - Approve/decline requests
 * - Auto-navigate to schedule after approval
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { formatDate, formatTime } from "../../utils/dateTime";
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  User,
  AlertCircle,
  RefreshCw,
  Filter,
  FileText,
} from 'lucide-react';
import { useAllSessionRequests } from '../../hooks';
import type { SessionRequest } from '../../services/subscription.service';
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

export default function SessionRequests() {
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardReception']);
  const isRTL = i18n.language === 'ar';
  const navigate = useNavigate();
  const {
    requests,
    isLoading,
    error,
    filters,
    setFilters,
    fetchRequests,
    approveRequest,
    declineRequest,
  } = useAllSessionRequests();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<SessionRequest | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter requests
  const filteredRequests = requests.filter((req) => {
    return statusFilter === 'all' || req.status === statusFilter;
  });

  const handleApprove = async (requestId: string) => {
    try {
      setIsSubmitting(true);
      await approveRequest(requestId);
      alert('Session request approved! Navigating to schedule...');
      // Navigate to schedule page
      navigate('/reception/schedule');
    } catch (error: any) {
      alert(error.message || 'Failed to approve request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeclineClick = (request: SessionRequest) => {
    setSelectedRequest(request);
    setIsDeclineModalOpen(true);
  };

  const handleDeclineConfirm = async () => {
    if (!selectedRequest) return;
    try {
      setIsSubmitting(true);
      await declineRequest(selectedRequest._id, declineReason || undefined);
      alert('Session request declined');
      setIsDeclineModalOpen(false);
      setSelectedRequest(null);
      setDeclineReason('');
      fetchRequests();
    } catch (error: any) {
      alert(error.message || 'Failed to decline request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setFilters({ status: status === 'all' ? undefined : status });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'approved':
        return <Badge variant="success">Approved</Badge>;
      case 'declined':
        return <Badge variant="error">Declined</Badge>;
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'no_show':
        return <Badge variant="error">No Show</Badge>;
      case 'canceled':
        return <Badge variant="default">Canceled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading && requests.length === 0) {
    return <LoadingState type="skeleton" text="Loading session requests..." />;
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
          <h1 className={`text-3xl font-bold inline-block ${isRTL ? 'text-right' : 'text-left'}`} style={{
            color: '#0f1f33',
            backgroundClip: 'text'
          }}>{t('dashboardReception:sessionRequests.title', 'Session Requests')}</h1>
          <p className={`mt-1 transition-colors duration-300 ${isRTL ? 'text-right' : 'text-left'}`} style={{ color: '#0f1f33' + 'CC' }}>{t('dashboardReception:sessionRequests.subtitle', 'Approve or decline student session requests')}</p>
        </div>
        <Button
          variant="outline"
          leftIcon={<RefreshCw className="w-4 h-4" />}
          onClick={() => fetchRequests()}
        >
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-ink/10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-ink/40" />
            <span className="text-sm text-ink/60">Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            className="px-4 py-2.5 rounded-lg border border-ink/20 bg-white text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="declined">Declined</option>
            <option value="completed">Completed</option>
            <option value="canceled">Canceled</option>
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="error" icon={<AlertCircle className="w-5 h-5" />}>
          {error}
        </Alert>
      )}

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <CardComponent>
          <CardBody className="p-12 text-center">
            <Calendar className="w-16 h-16 mx-auto text-ink/20 mb-4" />
            <h3 className="text-xl font-semibold text-ink mb-2">
              No Session Requests Found
            </h3>
            <p className="text-ink/60">
              {statusFilter !== 'all' ? 'Try adjusting your filters' : 'No requests yet'}
            </p>
          </CardBody>
        </CardComponent>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => {
            const user = typeof request.userId === 'object' && request.userId ? request.userId : null;
            const endTime = formatTime(new Date(
              new Date(`${request.date.split('T')[0]}T${request.startTime}`).getTime() +
                request.durationHours * 60 * 60 * 1000
            ));

            return (
              <CardComponent key={request._id} hoverable>
                <CardBody className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-ink text-lg">
                          {user?.name || 'Unknown User'}
                        </h3>
                        {getStatusBadge(request.status)}
                      </div>
                      {user?.email && (
                        <p className="text-sm text-ink/60 mb-4">{user.email}</p>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-ink/60 mb-1">Date</p>
                          <p className="font-semibold text-ink">
                            {formatDate(request.date)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-ink/60 mb-1">Time</p>
                          <p className="font-semibold text-ink">
                            {request.startTime} - {endTime}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-ink/60 mb-1">Duration</p>
                          <p className="font-semibold text-ink">
                            {request.durationHours} hrs
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-ink/60 mb-1">Status</p>
                          <p className="font-semibold text-ink">{request.status}</p>
                        </div>
                      </div>

                      {request.description && (
                        <div className="bg-ink/5 rounded-lg p-3 mb-4">
                          <p className="text-sm text-ink/80">{request.description}</p>
                        </div>
                      )}

                      {request.declineReason && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                          <p className="text-sm text-red-700">
                            <strong>Decline Reason:</strong> {request.declineReason}
                          </p>
                        </div>
                      )}
                    </div>

                    {request.status === 'pending' && (
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="success"
                          size="sm"
                          leftIcon={<CheckCircle className="w-4 h-4" />}
                          onClick={() => handleApprove(request._id)}
                          disabled={isSubmitting}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          leftIcon={<XCircle className="w-4 h-4" />}
                          onClick={() => handleDeclineClick(request)}
                          disabled={isSubmitting}
                        >
                          Decline
                        </Button>
                      </div>
                    )}

                    {request.status === 'approved' && (
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<FileText className="w-4 h-4" />}
                        onClick={() => navigate(`/reception/session-reports/${request._id}`)}
                      >
                        Create Report
                      </Button>
                    )}
                  </div>
                </CardBody>
              </CardComponent>
            );
          })}
        </div>
      )}

      {/* Decline Modal */}
      <Modal
        isOpen={isDeclineModalOpen}
        onClose={() => {
          setIsDeclineModalOpen(false);
          setSelectedRequest(null);
          setDeclineReason('');
        }}
        title="Decline Session Request"
      >
        <div className="space-y-4">
          <p className="text-ink">
            Are you sure you want to decline this session request?
          </p>
          <div>
            <label className="block text-sm font-medium text-ink mb-2">
              Reason (Optional)
            </label>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg border border-ink/20 bg-white text-ink placeholder-ink/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="Enter reason for declining..."
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeclineModalOpen(false);
                setSelectedRequest(null);
                setDeclineReason('');
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeclineConfirm} isLoading={isSubmitting}>
              Decline Request
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
