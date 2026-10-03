/**
 * EnrollmentDetailsModal Component
 *
 * Displays comprehensive enrollment information including payment history
 */

import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Tabs, LoadingState, useToast, Button, ConfirmDialog } from '../ui';
import { User, BookOpen, Calendar, DollarSign, CreditCard, FileText, AlertCircle, CheckCircle, Clock, Bus, Download, Trash2, UserPlus, AlertTriangle } from 'lucide-react';
import type { Enrollment } from '../../hooks';
import { useReceptionEnrollments } from '../../hooks/reception/useReceptionEnrollments';
import { api } from '../../lib/api';

interface EnrollmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  enrollmentId: string | null;
  onDeleteTransportation?: (enrollmentId: string) => Promise<void>;
  onRefresh?: () => void;
}

interface TransportationReceipt {
  _id: string;
  receiptNumber: string;
  payment: {
    amount: number;
    method: string;
    date: Date;
    notes?: string;
  };
  billing: {
    totalAmount: number;
    paidBefore: number;
    paidNow: number;
    remainingBalance: number;
  };
  issuedBy: {
    name: string;
  };
  createdAt: string;
  pdfPath: string;
}

export const EnrollmentDetailsModal: React.FC<EnrollmentDetailsModalProps> = ({
  isOpen,
  onClose,
  enrollmentId,
  onDeleteTransportation,
  onRefresh
}) => {
  const { t: tConfirm } = useTranslation('dashboardCommon');
  const toast = useToast();
  const { getEnrollmentById } = useReceptionEnrollments();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transportationReceipts, setTransportationReceipts] = useState<TransportationReceipt[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(false);
  const [isDeletingTransportation, setIsDeletingTransportation] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Transport-assignment lookup — same idea as the list page: tells us whether
  // the student already has an active DriverStudent (their bus seat). Lets us
  // render a "Transport pending" banner with a deep-link to Transport Management.
  const [transportAssignment, setTransportAssignment] = useState<{ assigned: boolean; driverName?: string | null } | null>(null);

  // Track previous enrollmentId to prevent unnecessary data clearing
  const previousEnrollmentIdRef = useRef<string | null>(null);
  const previousIsOpenRef = useRef<boolean>(false);

  const navigate = useNavigate();

  // Fetch enrollment data when modal opens or enrollmentId changes
  useEffect(() => {
    const enrollmentIdChanged = previousEnrollmentIdRef.current !== enrollmentId;
    const modalJustClosed = previousIsOpenRef.current && !isOpen;
    const modalJustOpened = !previousIsOpenRef.current && isOpen;

    if (isOpen && enrollmentId) {
      // Only fetch if enrollmentId changed or modal just opened
      if (enrollmentIdChanged || modalJustOpened) {
        const fetchEnrollment = async () => {
          try {
            setLoading(true);
            setError(null);
            const data = await getEnrollmentById(enrollmentId);
            setEnrollment(data);
          } catch (err: any) {
            setError(err.message || 'Failed to load enrollment details');
            toast.error('Load Failed', err.message || 'Failed to load enrollment details');
          } finally {
            setLoading(false);
          }
        };
        fetchEnrollment();
      }
      // If enrollmentId is the same and modal is still open, preserve existing data
    } else if (modalJustClosed && !enrollmentId) {
      // Only clear data when modal actually closes AND enrollmentId is null
      // This prevents clearing data during brief state changes
      setEnrollment(null);
      setError(null);
      setTransportationReceipts([]);
    }
    // Update refs
    previousEnrollmentIdRef.current = enrollmentId;
    previousIsOpenRef.current = isOpen;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, enrollmentId]);

  // Use fetched enrollment as display enrollment
  const displayEnrollment = enrollment;

  // Define fetchTransportationReceipts with useCallback before useEffect that uses it
  const fetchTransportationReceipts = useCallback(async () => {
    if (!enrollment?._id) return;
    
    try {
      setLoadingReceipts(true);
      const response = await api.get(`/reception/enrollments/${enrollment._id}/transportation-receipts`);
      setTransportationReceipts(response.data.data || []);
    } catch (error) {
      console.error('Error fetching transportation receipts:', error);
      setTransportationReceipts([]);
    } finally {
      setLoadingReceipts(false);
    }
  }, [enrollment?._id]);

  useEffect(() => {
    if (isOpen && enrollment?._id && enrollment?.transportation?.enabled) {
      fetchTransportationReceipts();
    } else {
      setTransportationReceipts([]);
    }
  }, [isOpen, enrollment?._id, enrollment?.transportation?.enabled, fetchTransportationReceipts]);

  // Look up transport-assignment status for this student. Only relevant when
  // transportation is enabled on this enrollment; otherwise we skip the call.
  useEffect(() => {
    const studentId = enrollment?.student?._id;
    if (!isOpen || !studentId || !enrollment?.transportation?.enabled) {
      setTransportAssignment(null);
      return;
    }
    let cancelled = false;
    api.post('/reception/transport/students/status-by-students', { studentIds: [studentId] })
      .then(res => {
        if (cancelled) return;
        const status = res.data?.data?.byStudent?.[String(studentId)];
        setTransportAssignment(status || { assigned: false });
      })
      .catch(() => { if (!cancelled) setTransportAssignment({ assigned: false }); });
    return () => { cancelled = true; };
  }, [isOpen, enrollment?.student?._id, enrollment?.transportation?.enabled]);

  /** Open Transport Management with this student pre-selected. Transport is
   *  student-based (one bus seat covers all the student's courses), so we don't
   *  pass enrollmentId — the Transport page doesn't need it. */
  const handleAssignTransport = useCallback(() => {
    const studentId = enrollment?.student?._id;
    if (!studentId) return;
    const params = new URLSearchParams({
      tab: 'students',
      enrollStudentId: String(studentId),
      enrollStudentName: enrollment?.student?.name ?? '',
      enrollStudentEmail: enrollment?.student?.email ?? '',
    });
    onClose();
    navigate(`/reception/transport?${params.toString()}`);
  }, [enrollment?.student?._id, navigate, onClose]);

  const handleDownloadReceipt = async (receiptId: string, receiptNumber: string) => {
    try {
      const response = await api.get(`/reception/receipts/${receiptId}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${receiptNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toast.error('Download Failed', 'Failed to download receipt');
    }
  };

  const handleDeleteTransportation = async () => {
    if (!enrollmentId || !onDeleteTransportation) return;

    try {
      setIsDeletingTransportation(true);
      await onDeleteTransportation(enrollmentId);
      toast.success('Transportation Deleted', 'All transportation data has been removed successfully.');
      setShowDeleteConfirm(false);
      
      // Refresh enrollment data
      if (enrollmentId) {
        const refreshedData = await getEnrollmentById(enrollmentId);
        setEnrollment(refreshedData);
      }
      
      // Refresh receipts list
      setTransportationReceipts([]);
    } catch (error: any) {
      console.error('Error deleting transportation:', error);
      toast.error('Delete Failed', error.message || 'Failed to delete transportation');
    } finally {
      setIsDeletingTransportation(false);
    }
  };

  // Helper functions (defined before tabsItems to avoid initialization issues)
  const formatDate = (date?: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (date?: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-green-500/10 text-green-400 border-green-500/20',
      completed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      dropped: 'bg-red-500/10 text-red-400 border-red-500/20',
      suspended: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      inactive: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
    };
    return variants[status as keyof typeof variants] || variants.active;
  };

  const getInstallmentStatusBadge = (status: string) => {
    const variants = {
      paid: 'bg-green-500/10 text-green-400 border-green-500/20',
      pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      overdue: 'bg-red-500/10 text-red-400 border-red-500/20'
    };
    return variants[status as keyof typeof variants] || variants.pending;
  };

  const getInstallmentIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4" />;
      case 'overdue':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  // Build tabs array with useMemo to prevent recreation issues
  // IMPORTANT: All hooks must be called before any conditional returns
  const tabsItems = useMemo(() => {
    // Ensure displayEnrollment exists and has required structure before building tabs
    if (!displayEnrollment || !displayEnrollment.student || !displayEnrollment.course) {
      return [];
    }

    const items = [
      {
        label: 'Overview',
        icon: <User className="w-4 h-4" />,
        content: (
          <div className="space-y-6 max-h-[60vh] overflow-y-auto" style={{ color: '#0f1f33', position: 'relative', zIndex: 1, opacity: 1, visibility: 'visible' }}>
        {/* Course Information */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-ink flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Course Information
          </h3>
          <div className="bg-primary/5 rounded-lg p-4 space-y-3">
            <div>
              <p className="text-ink/60 text-sm">Course Title</p>
                <p className="text-ink font-semibold">{displayEnrollment.course?.title || 'Course'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-ink/60 text-sm">Enrolled Date</p>
                <p className="text-ink flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                    {formatDate(displayEnrollment.enrolledAt)}
                </p>
              </div>
              <div>
                <p className="text-ink/60 text-sm">Course Price</p>
                  <p className="text-ink font-semibold">${displayEnrollment.course?.price?.toFixed(2) || '0.00'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        )
      },
      {
        label: 'Payments',
        icon: <DollarSign className="w-4 h-4" />,
        content: (
          <div className="space-y-6 max-h-[60vh] overflow-y-auto" style={{ color: '#0f1f33', position: 'relative', zIndex: 1, opacity: 1, visibility: 'visible' }}>
        {/* Payment Summary */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-ink flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Payment Summary
          </h3>
          <div className="bg-primary/5 rounded-lg p-4">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-ink/60 text-sm">Total Amount</p>
                  <p className="text-ink font-bold text-xl">${displayEnrollment.payment?.totalAmount?.toFixed(2) || '0.00'}</p>
              </div>
              <div>
                <p className="text-ink/60 text-sm">Paid Amount</p>
                  <p className="text-green-600 font-bold text-xl">${displayEnrollment.payment?.paidAmount?.toFixed(2) || '0.00'}</p>
              </div>
              <div>
                <p className="text-ink/60 text-sm">Remaining</p>
                  <p className="text-red-600 font-bold text-xl">${displayEnrollment.payment?.remainingAmount?.toFixed(2) || '0.00'}</p>
              </div>
            </div>

            {/* Payment Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-ink/60">Payment Progress</span>
                <span className="text-ink font-semibold">
                    {displayEnrollment.payment?.totalAmount
                      ? Math.round((displayEnrollment.payment.paidAmount / displayEnrollment.payment.totalAmount) * 100)
                    : 0}%
                </span>
              </div>
              <div className="w-full bg-white/50 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all"
                  style={{
                      width: `${displayEnrollment.payment?.totalAmount
                        ? Math.min((displayEnrollment.payment.paidAmount / displayEnrollment.payment.totalAmount) * 100, 100)
                      : 0}%`
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Installments / Payment History */}
          {displayEnrollment.payment?.installments && displayEnrollment.payment.installments.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-ink flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
                Payment History ({displayEnrollment.payment.installments.length} Installments)
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
                {displayEnrollment.payment.installments.map((installment: any, index: number) => (
                <div
                  key={index}
                  className="bg-primary/5 rounded-lg p-4 border border-primary/10 hover:border-primary/20 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getInstallmentStatusBadge(installment.status)}`}>
                        {getInstallmentIcon(installment.status)}
                      </div>
                      <div>
                        <p className="text-ink font-semibold">Installment #{index + 1}</p>
                        <p className="text-ink/60 text-sm">
                          Due: {formatDate(installment.dueDate)}
                        </p>
                        {installment.paidDate && (
                          <p className="text-green-600 text-xs">
                            Paid: {formatDate(installment.paidDate)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-ink font-bold text-lg">${installment.amount?.toFixed(2) || '0.00'}</p>
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs ${getInstallmentStatusBadge(installment.status)}`}>
                        {installment.status.charAt(0).toUpperCase() + installment.status.slice(1)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
          </div>
        )
      }
    ];

    // Add Transportation tab if enabled
    if (displayEnrollment?.transportation?.enabled) {
      items.push({
        label: 'Transportation',
        icon: <Bus className="w-4 h-4" />,
        content: loadingReceipts ? (
          <div className="space-y-6 max-h-[60vh] overflow-y-auto">
            <LoadingState message="Loading transportation receipts..." />
          </div>
        ) : (
          <div className="space-y-6 max-h-[60vh] overflow-y-auto" style={{ color: '#0f1f33', position: 'relative', zIndex: 1, opacity: 1, visibility: 'visible' }}>
            {/* Driver-assignment banner — appears when transport is enabled on the
                 enrollment but no DriverStudent exists for this student yet. The
                 student is paid up, but the bus side doesn't know about them. */}
            {transportAssignment && !transportAssignment.assigned && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-yellow-900">No driver assigned yet</p>
                  <p className="text-sm text-yellow-800 mt-0.5">
                    This student is paid up for transport but has no bus seat. Assign a driver in Transport Management so they appear on a route.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  leftIcon={<UserPlus className="w-4 h-4" />}
                  onClick={handleAssignTransport}
                  className="shrink-0"
                >
                  Assign driver
                </Button>
              </div>
            )}

            {/* Confirmation chip when the student IS assigned — small, informational only. */}
            {transportAssignment?.assigned && transportAssignment.driverName && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                <span className="text-green-800">
                  Assigned to driver <span className="font-semibold">{transportAssignment.driverName}</span>
                </span>
              </div>
            )}

            <div>
              {/* Transportation Payment Summary */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-ink flex items-center gap-2">
                  <Bus className="w-5 h-5 text-orange-500" />
                  Transportation Payment Summary
                </h3>
                <div className="bg-orange-500/5 rounded-lg p-4 border border-orange-500/20">
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-ink/60 text-sm">Total Amount</p>
                      <p className="text-ink font-bold text-xl">{displayEnrollment?.transportation?.totalAmount?.toLocaleString() || '0'} S.P.</p>
                    </div>
                    <div>
                      <p className="text-ink/60 text-sm">Paid Amount</p>
                      <p className="text-green-600 font-bold text-xl">{displayEnrollment?.transportation?.paidAmount?.toLocaleString() || '0'} S.P.</p>
                    </div>
                    <div>
                      <p className="text-ink/60 text-sm">Remaining</p>
                      <p className="text-red-600 font-bold text-xl">{displayEnrollment?.transportation?.remainingAmount?.toLocaleString() || '0'} S.P.</p>
                    </div>
                  </div>

                  {/* Transportation Payment Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-ink/60">Payment Progress</span>
                      <span className="text-ink font-semibold">
                        {displayEnrollment?.transportation?.totalAmount
                          ? Math.round((displayEnrollment?.transportation?.paidAmount || 0) / (displayEnrollment?.transportation?.totalAmount || 1) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-white/50 rounded-full h-3">
                      <div
                        className="bg-orange-500 h-3 rounded-full transition-all"
                        style={{
                          width: `${displayEnrollment?.transportation?.totalAmount
                            ? Math.min(((displayEnrollment?.transportation?.paidAmount || 0) / (displayEnrollment?.transportation?.totalAmount || 1)) * 100, 100)
                            : 0}%`
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Transportation Installments */}
                {displayEnrollment?.transportation?.installments && displayEnrollment?.transportation?.installments.length > 0 && (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    <h4 className="text-sm font-semibold text-ink">Transportation Installments ({displayEnrollment?.transportation?.installments?.length || 0})</h4>
                    {displayEnrollment?.transportation?.installments?.map((installment: any, index: number) => (
                      <div
                        key={index}
                        className="bg-orange-500/5 rounded-lg p-4 border border-orange-500/10 hover:border-orange-500/20 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${getInstallmentStatusBadge(installment.status)}`}>
                              {getInstallmentIcon(installment.status)}
                            </div>
                            <div>
                              <p className="text-ink font-semibold">Transportation Installment #{index + 1}</p>
                              <p className="text-ink/60 text-sm">
                                Due: {formatDate(installment.dueDate)}
                              </p>
                              {installment.paidDate && (
                                <p className="text-green-600 text-xs">
                                  Paid: {formatDate(installment.paidDate)}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-ink font-bold text-lg">{installment.amount?.toLocaleString() || '0'} S.P.</p>
                            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs ${getInstallmentStatusBadge(installment.status)}`}>
                              {installment.status.charAt(0).toUpperCase() + installment.status.slice(1)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Transportation Receipts */}
                {transportationReceipts.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-ink flex items-center gap-2">
                      <FileText className="w-5 h-5 text-orange-500" />
                      Transportation Receipts ({transportationReceipts.length})
                    </h3>
                    <div className="space-y-2">
                      {transportationReceipts.map((receipt) => (
                        <div
                          key={receipt._id}
                          className="bg-orange-500/5 rounded-lg p-4 border border-orange-500/10 hover:border-orange-500/20 transition-all flex items-center justify-between"
                        >
                          <div>
                            <p className="text-ink font-semibold">Receipt #{receipt.receiptNumber}</p>
                            <p className="text-ink/60 text-sm">
                              Amount: {receipt.payment.amount.toLocaleString()} S.P. | {formatDateTime(receipt.createdAt)}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDownloadReceipt(receipt._id, receipt.receiptNumber)}
                            className="p-2 text-orange-600 hover:bg-orange-500/10 rounded-lg transition-colors"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Delete Transportation Button */}
                {onDeleteTransportation && (
                  <div className="pt-4 border-t border-orange-500/20">
                    <Button
                      variant="ghost"
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={isDeletingTransportation}
                      className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200"
                      leftIcon={<Trash2 className="w-4 h-4" />}
                    >
                      {isDeletingTransportation ? 'Deleting...' : 'Delete Transportation'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      });
    }

    // Add History tab
    items.push({
      label: 'History',
      icon: <FileText className="w-4 h-4" />,
      content: (
        <div className="space-y-6 max-h-[60vh] overflow-y-auto" style={{ color: '#0f1f33', position: 'relative', zIndex: 1, opacity: 1, visibility: 'visible' }}>
          {/* Inactive Reason */}
          {(displayEnrollment.status === 'inactive' || displayEnrollment.status === 'dropped' || displayEnrollment.status === 'suspended') && displayEnrollment.notes && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-ink flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
                {displayEnrollment.status === 'inactive' ? 'Inactive Reason' :
                 displayEnrollment.status === 'dropped' ? 'Dropped Reason' :
               'Suspended Reason'}
            </h3>
            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
                <p className="text-ink whitespace-pre-wrap">{displayEnrollment.notes}</p>
            </div>
          </div>
        )}

        {/* General Notes */}
          {displayEnrollment.notes && displayEnrollment.status === 'active' && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-ink flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Notes
            </h3>
            <div className="bg-primary/5 rounded-lg p-4">
                <p className="text-ink whitespace-pre-wrap">{displayEnrollment.notes}</p>
              </div>
            </div>
          )}
        </div>
      )
    });

    return items;
  }, [displayEnrollment, loadingReceipts, transportationReceipts, isDeletingTransportation, onDeleteTransportation, handleDeleteTransportation]);

  // Early return AFTER all hooks have been called (React Rules of Hooks)
  // Only return null if modal is closed
  if (!isOpen) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Enrollment Details"
      size="xl"
      closeOnOverlayClick={false}
    >
      {loading ? (
        <LoadingState message="Loading enrollment details..." />
      ) : error ? (
        <div className="p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-ink font-semibold mb-2">Failed to load enrollment details</p>
          <p className="text-ink/60 text-sm mb-4">{error}</p>
          {enrollmentId && (
            <Button
              onClick={async () => {
                try {
                  setLoading(true);
                  setError(null);
                  const data = await getEnrollmentById(enrollmentId);
                  setEnrollment(data);
                } catch (err: any) {
                  setError(err.message || 'Failed to load enrollment details');
                } finally {
                  setLoading(false);
                }
              }}
            >
              Retry
            </Button>
          )}
        </div>
      ) : displayEnrollment ? (
        <div className="space-y-6">
          {/* Header with Status */}
          <div className="flex items-center justify-between pb-4 border-b border-primary/20">
            <div>
              <h2 className="text-2xl font-bold text-ink">{displayEnrollment?.student?.name || 'Student'}</h2>
              <p className="text-ink/60 mt-1">{displayEnrollment?.student?.email || 'N/A'}</p>
            </div>
            <div className={`px-4 py-2 rounded-lg border ${getStatusBadge(displayEnrollment?.status || 'active')}`}>
              {(displayEnrollment?.status || 'active').charAt(0).toUpperCase() + (displayEnrollment?.status || 'active').slice(1)}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ color: '#0f1f33', position: 'relative' }}>
            <Tabs items={tabsItems} />
          </div>
        </div>
      ) : (
        <LoadingState message="Loading enrollment details..." />
      )}

      {/* Delete Transportation Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteTransportation}
        title={tConfirm('trDel.title')}
        description={
          <>
            {tConfirm('trDel.text')}
            {displayEnrollment?.transportation?.paidAmount && displayEnrollment.transportation.paidAmount > 0 ? (
              <span className="mt-2 block font-semibold text-danger">{tConfirm('trDel.paid', { amount: displayEnrollment.transportation.paidAmount.toLocaleString('en-US') })}</span>
            ) : null}
          </>
        }
        variant="danger"
        confirmText={tConfirm('trDel.confirm')}
        cancelText={tConfirm('cto.cancel')}
      />
    </Modal>
  );
};
