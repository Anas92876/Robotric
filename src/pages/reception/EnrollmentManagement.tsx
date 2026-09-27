/**
 * EnrollmentManagement Page
 *
 * Complete enrollment management interface for reception staff:
 * - View all enrollments in a table
 * - Filter by course, student, status
 * - Create new enrollments
 * - Edit enrollment status
 * - Pagination
 *
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, RefreshCw, AlertCircle, CheckCircle, XCircle, DollarSign, BookOpen, Filter, Eye, Bus, Settings, Clock } from 'lucide-react';
import { useReceptionEnrollments, useExchangeRate, type Enrollment } from '../../hooks';
import { EnrollmentList, type TransportAssignmentStatus } from '../../components/reception/EnrollmentList';
import { EnrollmentForm } from '../../components/reception/EnrollmentForm';
import BundleEnrollmentModal from '../../components/reception/BundleEnrollmentModal';
import { EnrollmentDetailsModal } from '../../components/reception/EnrollmentDetailsModal';
import { WaitingListPanel } from '../../components/reception/WaitingListPanel';
import { ExchangeRateModal } from '../../components/reception/ExchangeRateModal';
import { LoadingState, Alert, Button, Input, Modal, CardComponent, CardBody, StatsCard, ConfirmDialog, useToast } from '../../components/ui';
import { api } from '../../lib/api';
import { debounce } from '../../utils/debounce';

const EnrollmentManagement: React.FC = () => {
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardReception']);
  const isRTL = i18n.language === 'ar';
  const toast = useToast();
  
  // Get enrollments data and functions from hook
  const {
    enrollments,
    pagination,
    isLoading,
    error,
    filters,
    setFilters,
    fetchEnrollments,
    createEnrollment,
    updateEnrollment,
    updateEnrollmentStatus,
    deleteEnrollment,
    recordPayment,
    recordTransportationPayment,
    deleteTransportation,
    downloadReceipt,
    availableCourses,
    availableGroups,
    availableStudents,
    fetchAvailableCourses,
    fetchAvailableGroups,
    fetchAvailableStudents,
  } = useReceptionEnrollments();

  const { exchangeRate, updateExchangeRate } = useExchangeRate();
  const [isExchangeRateModalOpen, setIsExchangeRateModalOpen] = useState(false);
  const [isSavingExchangeRate, setIsSavingExchangeRate] = useState(false);

  const navigate = useNavigate();

  // ─── Transport-assignment status for the visible page ─────────────────────
  // For each student whose enrollment.transportation.enabled = true, we want to
  // know whether they already have an active DriverStudent record (i.e. the bus
  // side knows about them). The map is built from a single bulk-lookup call so
  // it doesn't matter how many rows are on the page.
  const [transportAssignmentByStudent, setTransportAssignmentByStudent] = useState<Record<string, TransportAssignmentStatus>>({});

  useEffect(() => {
    const studentIds = Array.from(new Set(
      enrollments
        .filter(e => e.transportation?.enabled)
        .map(e => String(e.student?._id || ''))
        .filter(Boolean)
    ));
    if (studentIds.length === 0) {
      setTransportAssignmentByStudent({});
      return;
    }
    let cancelled = false;
    api.post('/reception/transport/students/status-by-students', { studentIds })
      .then(res => {
        if (!cancelled) setTransportAssignmentByStudent(res.data?.data?.byStudent || {});
      })
      .catch(() => {/* non-critical — banner just won't appear */});
    return () => { cancelled = true; };
  }, [enrollments]);

  // Open Transport Management with the student pre-selected in the enroll form.
  // Transport is fundamentally student-based (one DriverStudent per student spans
  // all their enrollments), so we only pass studentId — not enrollmentId. This
  // keeps the domain boundary clean: Transport doesn't need to know which course
  // the student is enrolled in to assign them a bus seat.
  const handleAssignTransport = useCallback((enrollment: Enrollment) => {
    const studentId = enrollment.student?._id;
    if (!studentId) return;
    const params = new URLSearchParams({
      tab: 'students',
      enrollStudentId: String(studentId),
    });
    navigate(`/reception/transport?${params.toString()}`);
  }, [navigate]);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBundleModalOpen, setIsBundleModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
  const [detailsEnrollmentId, setDetailsEnrollmentId] = useState<string | null>(null);

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [receiptData, setReceiptData] = useState<{ receiptId: string; receiptNumber: string; downloadUrl: string } | null>(null);
  
  // Inactive reason state
  const [inactiveReason, setInactiveReason] = useState('');
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
    variant: 'danger',
    isLoading: false
  });

  // Payment modal states
  const [paymentCurrency, setPaymentCurrency] = useState<'usd' | 'sp'>('usd');
  const [selectedInstallments, setSelectedInstallments] = useState<string[]>([]);
  
  // Transportation payment modal state
  const [isTransportationPaymentModalOpen, setIsTransportationPaymentModalOpen] = useState(false);
  const [transportationPaymentEnrollment, setTransportationPaymentEnrollment] = useState<Enrollment | null>(null);
  const [transportationPaymentAmount, setTransportationPaymentAmount] = useState('');
  const [transportationPaymentMethod, setTransportationPaymentMethod] = useState('cash');
  const [transportationPaymentNotes, setTransportationPaymentNotes] = useState('');
  const [isRecordingTransportationPayment, setIsRecordingTransportationPayment] = useState(false);

  // Add Transportation modal state
  const [isAddTransportationModalOpen, setIsAddTransportationModalOpen] = useState(false);
  const [addTransportationEnrollment, setAddTransportationEnrollment] = useState<Enrollment | null>(null);
  const [transportationTotalAmount, setTransportationTotalAmount] = useState('');
  const [transportationPaidNow, setTransportationPaidNow] = useState('');
  const [transportationAddPaymentMethod, setTransportationAddPaymentMethod] = useState('cash');
  const [transportationAddNotes, setTransportationAddNotes] = useState('');
  const [transportationInstallments, setTransportationInstallments] = useState<Array<{ amount: string; dueDate: string }>>([]);
  const [isAddingTransportation, setIsAddingTransportation] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'enrollments' | 'waiting'>('enrollments');

  // Local filter states
  const [showFilters, setShowFilters] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [discountFilter, setDiscountFilter] = useState('');
  const [transportationFilter, setTransportationFilter] = useState('');

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  // Calculate stats
  const activeCount = enrollments.filter(e => e.status === 'active').length;
  const inactiveCount = enrollments.filter(e => e.status === 'inactive').length;
  const totalEnrollments = enrollments.length;

  // Payment statistics — exclude inactive enrollments
  const activeEnrollments = enrollments.filter(e => e.status === 'active');
  const totalPayments = activeEnrollments.reduce((sum, e) => sum + (e.payment?.totalAmount || 0), 0);
  const paidAmount = activeEnrollments.reduce((sum, e) => sum + (e.payment?.paidAmount || 0), 0);
  const unpaidAmount = activeEnrollments.reduce((sum, e) => sum + (e.payment?.remainingAmount || 0), 0);

  /**
   * Load courses on mount for filters
   */
  useEffect(() => {
    fetchAvailableCourses();
  }, []);

  /**
   * Load courses and students when create modal opens
   */
  useEffect(() => {
    if (isCreateModalOpen) {
      fetchAvailableCourses();
      fetchAvailableStudents();
    }
  }, [isCreateModalOpen, fetchAvailableCourses, fetchAvailableStudents]);

  /**
   * Handle search
   */
  const handleSearch = () => {
    setFilters({ ...filters, student: searchInput || undefined, page: 1 });
  };

  // Debounced search function
  const debouncedSearch = useMemo(
    () => debounce((searchTerm: string) => {
      setFilters((prev) => ({ ...prev, student: searchTerm || undefined, page: 1 }));
    }, 500),
    []
  );

  // Update filters when search input changes (with debounce)
  // Only update when searchInput actually changes, not when modal closes
  const previousSearchInputRef = useRef<string>('');
  useEffect(() => {
    // Only trigger search if searchInput actually changed (not just modal state)
    if (searchInput !== undefined && searchInput !== previousSearchInputRef.current && !isDetailsModalOpen) {
      debouncedSearch(searchInput);
      previousSearchInputRef.current = searchInput;
    }
  }, [searchInput, debouncedSearch, isDetailsModalOpen]);


  /**
   * Handle status filter change
   */
  const handleStatusFilterChange = (status: string) => {
    if (isDetailsModalOpen) return; // Don't change filters when details modal is open
    setStatusFilter(status);
    setFilters({ ...filters, status: status || undefined, page: 1 });
  };

  const handleCourseFilterChange = (course: string) => {
    if (isDetailsModalOpen) return; // Don't change filters when details modal is open
    setCourseFilter(course);
    setFilters({ ...filters, course, page: 1 });
  };

  const handlePaymentFilterChange = (paymentStatus: any) => {
    if (isDetailsModalOpen) return; // Don't change filters when details modal is open
    setPaymentFilter(paymentStatus);
    setFilters({ ...filters, paymentStatus, page: 1 });
  };

  const handleDiscountFilterChange = (hasDiscount: any) => {
    if (isDetailsModalOpen) return; // Don't change filters when details modal is open
    setDiscountFilter(hasDiscount);
    setFilters({ ...filters, hasDiscount, page: 1 });
  };

  const handleTransportationFilterChange = (transportationFilter: any) => {
    if (isDetailsModalOpen) return; // Don't change filters when details modal is open
    setTransportationFilter(transportationFilter);
    setFilters({ ...filters, transportationFilter, page: 1 });
  };

  const handleClearFilters = () => {
    if (isDetailsModalOpen) return; // Don't clear filters when details modal is open
    setSearchInput('');
    setStatusFilter('');
    setCourseFilter('');
    setPaymentFilter('');
    setDiscountFilter('');
    setTransportationFilter('');
    setFilters({ page: 1 });
  };

  /**
   * Handle create enrollment
   */
  /**
   * Handle create enrollment with optional initial payment
   */
  const handleCreate = async (data: any) => {
    try {
      // Extract payment data separate from enrollment data
      const { paidNow, ...enrollmentData } = data;
      
      // 1. Create enrollment
      const newEnrollment = await createEnrollment(enrollmentData);
      
      // 2. Record payment (even if $0 for 100% discount) to generate receipt
      const paymentAmount = paidNow ? parseFloat(paidNow) : 0;
      const totalAmount = parseFloat(enrollmentData.totalAmount) || 0;
      
      // Record payment if there's an amount to pay OR if total is 0 (100% discount - still need receipt)
      if (newEnrollment?._id && (paymentAmount > 0 || totalAmount === 0)) {
        try {
          const receipt = await recordPayment(
            newEnrollment._id, 
            paymentAmount, 
            'cash', // Default to cash for initial payment
            totalAmount === 0 ? '100% discount - Full scholarship' : 'Initial payment at enrollment'
          );
          
          if (receipt) {
            // Auto-download receipt
            await downloadReceipt(receipt.receiptId, receipt.receiptNumber);
            if (totalAmount === 0) {
              toast.success('Enrollment Created', 'Enrollment created with 100% discount! Receipt downloaded.');
            } else {
              toast.success('Enrollment Created', `Enrollment created and initial payment of $${paymentAmount} recorded successfully! Receipt downloaded.`);
            }
          } else {
            if (totalAmount === 0) {
              toast.success('Enrollment Created', 'Enrollment created with 100% discount!');
            } else {
              toast.success('Enrollment Created', `Enrollment created and initial payment of $${paymentAmount} recorded successfully!`);
            }
          }
        } catch (paymentError: any) {
          console.error('Error recording payment:', paymentError);
          if (totalAmount === 0) {
            toast.warning('Receipt Generation Failed', `Enrollment created successfully, but receipt generation failed: ${paymentError.message}. Please contact support.`);
          } else {
            toast.warning('Payment Recording Failed', `Enrollment created successfully, but initial payment failed: ${paymentError.message}. Please record payment manually.`);
          }
        }
      } else {
        toast.success('Enrollment Created', 'Enrollment created successfully!');
      }
      
      setIsCreateModalOpen(false);
    } catch (err: any) {
      // Error handled in hook/form usually, but double check
      console.error('Error in handleCreate:', err);
    }
  };

  /**
   * Handle status enrollment button click
   */
  const handleStatusClick = (enrollment: Enrollment) => {
    setSelectedEnrollment(enrollment);
    setIsEditModalOpen(true);
  };

  /**
   * Handle edit enrollment button click (kept for backward compatibility)
   */
  const handleEditClick = handleStatusClick;

  /**
   * Handle view enrollment details
   */
  const handleViewDetails = (enrollment: Enrollment) => {
    // Set enrollment ID and open modal
    // The modal will fetch fresh data from the server
    setDetailsEnrollmentId(enrollment._id);
    setIsDetailsModalOpen(true);
  };

  /**
   * Handle edit enrollment status
   */
  const handleEdit = async (newStatus: string) => {
    if (selectedEnrollment) {
      // Validate reason for inactive status
      if (newStatus === 'inactive' && !inactiveReason.trim()) {
        toast.warning('Reason Required', 'Please provide a reason for marking this enrollment as inactive');
        return;
      }
      
      try {
        await updateEnrollmentStatus(
          selectedEnrollment._id, 
          newStatus as any,
          newStatus === 'inactive' ? inactiveReason : undefined
        );
        setIsEditModalOpen(false);
        setSelectedEnrollment(null);
        setInactiveReason('');
      } catch (err: any) {
        toast.error('Update Failed', err.message || 'Failed to update enrollment status');
      }
    }
  };

  /**
   * Handle delete enrollment
   */
  const handleDelete = async (enrollmentId: string) => {
    // Find the enrollment to check payment status
    const enrollment = enrollments.find(e => e._id === enrollmentId);
    
    // Allow deletion if student is unknown (invalid enrollment)
    const isUnknownStudent = !enrollment?.student?.name || enrollment?.student?.name === 'Unknown Student';
    
    // Prevent deletion if payment is complete AND student is valid
    if (!isUnknownStudent && enrollment?.payment?.remainingAmount === 0) {
      toast.error('Cannot Delete Enrollment', 'Enrollment with completed payment cannot be deleted. The enrollment is locked.');
      return;
    }
    
    const confirmTitle = isUnknownStudent
      ? 'Delete Invalid Enrollment?'
      : 'Delete Enrollment?';
    
    const confirmDescription = isUnknownStudent
      ? `Are you sure you want to delete this invalid enrollment (Unknown Student)? This action cannot be undone.`
      : `Are you sure you want to delete the enrollment for ${enrollment?.student?.name || 'this student'}? This action cannot be undone.`;
    
    setConfirmDialog({
      isOpen: true,
      title: confirmTitle,
      description: confirmDescription,
      variant: 'danger',
      isLoading: false,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isLoading: true }));
        try {
          await deleteEnrollment(enrollmentId);
          toast.success('Enrollment Deleted', 'The enrollment has been deleted successfully.');
          setConfirmDialog(prev => ({ ...prev, isOpen: false, isLoading: false }));
        } catch (err: any) {
          toast.error('Delete Failed', err.message || 'Failed to delete enrollment');
          setConfirmDialog(prev => ({ ...prev, isOpen: false, isLoading: false }));
        }
      }
    });
  };

  /**
   * Handle record payment button click
   */
  const handleRecordPaymentClick = (enrollment: Enrollment) => {
    setSelectedEnrollment(enrollment);
    setPaymentAmount('');
    setPaymentMethod('cash');
    setPaymentNotes('');
    setReceiptData(null);
    setPaymentCurrency('usd');
    setSelectedInstallments([]);
    setIsPaymentModalOpen(true);
  };

  /**
   * Handle transportation button click - unified handler
   */
  const handleTransportationClick = (enrollment: Enrollment) => {
    // Check if transportation exists and is enabled
    if (enrollment.transportation?.enabled) {
      // Transportation exists - open payment modal
      setTransportationPaymentEnrollment(enrollment);
      setTransportationPaymentAmount('');
      setTransportationPaymentMethod('cash');
      setTransportationPaymentNotes('');
      setIsTransportationPaymentModalOpen(true);
    } else {
      // Transportation doesn't exist - open add transportation modal
      setAddTransportationEnrollment(enrollment);
      setTransportationTotalAmount('');
      setTransportationPaidNow('');
      setTransportationInstallments([]);
      setIsAddTransportationModalOpen(true);
    }
  };

  /**
   * Handle record transportation payment button click (kept for backward compatibility)
   */
  const handleRecordTransportationPaymentClick = handleTransportationClick;

  /**
   * Handle record transportation payment
   */
  const handleRecordTransportationPayment = async () => {
    if (!transportationPaymentEnrollment || !transportationPaymentAmount) {
      toast.warning('Payment Amount Required', 'Please enter a payment amount');
      return;
    }

    const amount = parseFloat(transportationPaymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.warning('Invalid Amount', 'Please enter a valid payment amount');
      return;
    }

    if (transportationPaymentEnrollment.transportation && 
        amount > transportationPaymentEnrollment.transportation.remainingAmount) {
      toast.error('Amount Exceeds Balance', `Payment amount exceeds remaining balance. Remaining: ${transportationPaymentEnrollment.transportation.remainingAmount.toLocaleString()} S.P.`);
      return;
    }

    try {
      setIsRecordingTransportationPayment(true);
      const receipt = await recordTransportationPayment(
        transportationPaymentEnrollment._id,
        amount,
        transportationPaymentMethod,
        transportationPaymentNotes
      );

      if (receipt) {
        await downloadReceipt(receipt.receiptId, receipt.receiptNumber);
        toast.success('Payment Recorded', `Transportation payment of ${amount.toLocaleString()} S.P. recorded successfully! Receipt downloaded.`);
      } else {
        toast.success('Payment Recorded', `Transportation payment of ${amount.toLocaleString()} S.P. recorded successfully!`);
      }

      setIsTransportationPaymentModalOpen(false);
      setTransportationPaymentEnrollment(null);
      setTransportationPaymentAmount('');
      setTransportationPaymentMethod('cash');
      setTransportationPaymentNotes('');
    } catch (err: any) {
      toast.error('Payment Failed', err.message || 'Failed to record transportation payment');
    } finally {
      setIsRecordingTransportationPayment(false);
    }
  };

  /**
   * Handle add transportation to enrollment
   */
  const handleAddTransportation = async () => {
    if (!addTransportationEnrollment || !transportationTotalAmount) {
      toast.warning('Total Amount Required', 'Please enter a transportation total amount');
      return;
    }

    const total = parseFloat(transportationTotalAmount);
    const paid = parseFloat(transportationPaidNow || '0');

    if (isNaN(total) || total <= 0) {
      toast.warning('Invalid Amount', 'Please enter a valid transportation total amount');
      return;
    }

    if (paid < 0) {
      toast.warning('Invalid Payment', 'Payment amount cannot be negative');
      return;
    }

    if (paid > total) {
      toast.warning('Invalid Payment', 'Payment amount cannot exceed total amount');
      return;
    }

    const remaining = total - paid;

    // Validate installments if there's a remaining balance
    if (remaining > 0) {
      if (transportationInstallments.length === 0) {
        toast.warning('Installments Required', `Please add installments for the remaining balance of ${Math.round(remaining).toLocaleString()} S.P.`);
        return;
      }

      // Validate all installments have values
      const hasEmptyFields = transportationInstallments.some(inst => !inst.amount || !inst.dueDate);
      if (hasEmptyFields) {
        toast.warning('Installments Required', 'Please fill in all installment fields');
        return;
      }

      // Validate installment sum equals remaining balance
      const installmentSum = transportationInstallments.reduce((sum, inst) => sum + parseFloat(inst.amount || '0'), 0);
      if (Math.abs(installmentSum - remaining) > 0) {
        toast.warning('Installment Mismatch', `Installments must equal remaining balance (${Math.round(remaining).toLocaleString()} S.P.). Current sum: ${Math.round(installmentSum).toLocaleString()} S.P.`);
        return;
      }
    }

    try {
      setIsAddingTransportation(true);

      // Prepare transportation data
      const transportationData: any = {
        enabled: true,
        totalAmount: total
      };

      if (paid > 0) {
        transportationData.paidNow = paid;
        transportationData.paymentMethod = transportationAddPaymentMethod;
        transportationData.notes = transportationAddNotes;
      }

      if (remaining > 0 && transportationInstallments.length > 0) {
        transportationData.installments = transportationInstallments.map(inst => ({
          amount: parseFloat(inst.amount),
          dueDate: new Date(inst.dueDate).toISOString()
        }));
      }

      // Update enrollment with transportation
      await updateEnrollment(addTransportationEnrollment._id, {
        transportation: transportationData
      });

      // Refresh enrollment list to show updated data
      await fetchEnrollments();

      // Modal will automatically refresh enrollment data if it's open

      toast.success('Transportation Added', 'Transportation has been successfully added to the enrollment!');
      
      setIsAddTransportationModalOpen(false);
      setAddTransportationEnrollment(null);
      setTransportationTotalAmount('');
      setTransportationPaidNow('');
      setTransportationAddPaymentMethod('cash');
      setTransportationAddNotes('');
      setTransportationInstallments([]);
    } catch (err: any) {
      toast.error('Failed to Add Transportation', err.message || 'Failed to add transportation to enrollment');
    } finally {
      setIsAddingTransportation(false);
    }
  };

  /**
   * Handle record payment
   */
  const handleRecordPayment = async () => {
    if (!selectedEnrollment || !paymentAmount) {
      toast.warning('Payment Amount Required', 'Please enter a payment amount');
      return;
    }

    let amountInUSD = parseFloat(paymentAmount);
    
    // Convert S.P. to USD if needed
    if (paymentCurrency === 'sp') {
      amountInUSD = amountInUSD / exchangeRate;
    }

    if (isNaN(amountInUSD) || amountInUSD <= 0) {
      toast.warning('Invalid Amount', 'Please enter a valid payment amount');
      return;
    }

    if (amountInUSD > (selectedEnrollment.payment?.remainingAmount || 0)) {
      const remainingDisplay = paymentCurrency === 'usd'
        ? `$${selectedEnrollment.payment?.remainingAmount || 0}`
        : `${((selectedEnrollment.payment?.remainingAmount || 0) * exchangeRate).toFixed(0)} S.P.`;
      toast.error('Amount Exceeds Balance', `Payment amount cannot exceed remaining balance: ${remainingDisplay}`);
      return;
    }

    try {
      setIsRecordingPayment(true);
      const receipt = await recordPayment(
        selectedEnrollment._id,
        amountInUSD,
        paymentMethod,
        paymentNotes,
        paymentCurrency === 'sp' ? { paymentCurrency: 'sp', amountInSP: parseFloat(paymentAmount) } : undefined
      );

      if (receipt) {
        // Payment successful with receipt
        setReceiptData(receipt);
        // Auto-download receipt
        await downloadReceipt(receipt.receiptId, receipt.receiptNumber);
        toast.success('Payment Recorded', `Payment of $${amountInUSD.toFixed(2)} recorded successfully! Receipt downloaded.`);
        
        // Auto-close modal after 2 seconds
        setTimeout(() => {
          handleClosePaymentModal();
        }, 2000);
      } else {
        // Payment recorded but no receipt (shouldn't happen)
        toast.success('Payment Recorded', 'Payment recorded successfully!');
        setIsPaymentModalOpen(false);
        setSelectedEnrollment(null);
      }
    } catch (err: any) {
      toast.error('Payment Failed', err.message || 'Failed to record payment');
    } finally {
      setIsRecordingPayment(false);
    }
  };

  /**
   * Handle download receipt again
   */
  const handleDownloadReceipt = async () => {
    if (!receiptData) return;

    try {
      await downloadReceipt(receiptData.receiptId, receiptData.receiptNumber);
      toast.success('Receipt Downloaded', 'Receipt downloaded successfully');
    } catch (err: any) {
      toast.error('Download Failed', err.message || 'Failed to download receipt');
    }
  };

  /**
   * Handle download full receipt for completed enrollment
   */
  const handleDownloadFullReceipt = async (enrollmentId: string) => {
    try {
      // Fetch all receipts for this enrollment
      const response = await api.get(`/reception/receipts/enrollment/${enrollmentId}`);

      // ✅ البيانات في response.data.data
      const receipts = response.data.data;

      if (!receipts || receipts.length === 0) {
        toast.warning('No Receipt Found', 'No receipt found for this enrollment');
        return;
      }

      // Download the latest receipt
      const latestReceipt = receipts[0]; // Receipts are sorted by createdAt desc
      await downloadReceipt(latestReceipt._id, latestReceipt.receiptNumber);
      toast.success('Receipt Downloaded', 'Receipt downloaded successfully');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 
                          err.response?.data?.message || 
                          'Failed to download receipt';
      toast.error('Download Failed', errorMessage);
      console.error('Error downloading receipt:', err);
    }
  };

  /**
   * Close payment modal after receipt downloaded
   */
  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setSelectedEnrollment(null);
    setReceiptData(null);
  };

  /**
   * Handle page change
   */
  const handlePageChange = (newPage: number) => {
    setFilters({ ...filters, page: newPage });
  };

  /**
   * Handle course select in form
   */
  const handleCourseSelect = (courseId: string) => {
    fetchAvailableGroups(courseId);
  };

  /**
   * Handle student search in form
   */
  const handleStudentSearch = (courseId?: string) => {
    fetchAvailableStudents(courseId);
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-8"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div>
          <h1 className={`text-4xl font-bold inline-block group-hover:scale-105 transition-transform duration-300 ${isRTL ? 'text-right' : 'text-left'}`} style={{
            background: 'linear-gradient(135deg, #003300 0%, #004d00 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            {t('dashboardReception:enrollmentManagement.title', 'Enrollment Management')}
          </h1>
          <p className={`mt-2 transition-colors duration-300 ${isRTL ? 'text-right' : 'text-left'}`} style={{ color: '#003300' + 'CC' }}>
            {t('dashboardReception:enrollmentManagement.subtitle', 'Register students in courses and manage enrollments')}
          </p>
        </div>

        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Button
            variant="outline"
            leftIcon={<Settings className="w-5 h-5" />}
            onClick={() => setIsExchangeRateModalOpen(true)}
            className="border-primary/30 hover:bg-primary/5 text-[#003300]"
          >
            Exchange Rate
          </Button>
          <Button
            variant="ghost"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsBundleModalOpen(true)}
            className="border border-violet-300 text-violet-700 hover:bg-violet-50"
          >
            Bundle Enrollment
          </Button>
          <Button
            variant="primary"
            leftIcon={<Plus className="w-5 h-5" />}
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
          >
            New Enrollment
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <StatsCard
          label="Total Enrollments"
          value={totalEnrollments}
          icon={<BookOpen className="w-6 h-6" />}
        />
        <StatsCard
          label="Active"
          value={activeCount}
          icon={<CheckCircle className="w-6 h-6" />}
        />
        <StatsCard
          label="Inactive"
          value={inactiveCount}
          icon={<XCircle className="w-6 h-6" />}
        />
        <StatsCard
          label="Total Payments"
          value={`$${totalPayments.toFixed(2)}`}
          icon={<DollarSign className="w-6 h-6" />}
        />
        <StatsCard
          label="Paid"
          value={`$${paidAmount.toFixed(2)}`}
          icon={<CheckCircle className="w-6 h-6" />}
        />
        <StatsCard
          label="Unpaid"
          value={`$${unpaidAmount.toFixed(2)}`}
          icon={<XCircle className="w-6 h-6" />}
        />
      </motion.div>

      {/* Filters and Search */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/60 group-hover:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Search by student name or email..."
                value={searchInput}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchInput(value);
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-primary/20 rounded-xl text-[#003300] placeholder-[#003300]/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 hover:border-primary/30 shadow-sm"
              />
            </div>
          </div>

          {/* Search Button */}
          <Button
            variant="primary"
            leftIcon={<Search className="w-4 h-4" />}
            onClick={handleSearch}
            className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 px-6 shadow-sm"
          >
            Search
          </Button>

          {/* Filter Toggle Button */}
          <Button
            variant={showFilters ? 'primary' : 'outline'}
            leftIcon={<Filter className="w-4 h-4" />}
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 shadow-sm ${showFilters ? 'bg-primary border-primary text-white' : 'border-primary/30 hover:bg-primary/5 text-[#003300]'}`}
          >
            Filters
          </Button>

          {/* Refresh Button */}
          <Button
            variant="ghost"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={fetchEnrollments}
            className="text-[#003300]/70 hover:text-[#003300] hover:bg-primary/5 px-4"
          >
            <span className="hidden lg:inline">Refresh</span>
          </Button>
        </div>

        {/* Filters Grid */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 w-full pt-4">
                
                {/* Course Filter */}
                <div className="relative">
                  <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/60 pointer-events-none" />
                  <select
                    value={courseFilter}
                    onChange={(e) => handleCourseFilterChange(e.target.value)}
                    className="w-full pl-12 pr-10 py-3.5 bg-white border border-primary/20 rounded-xl text-[#003300] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 hover:border-primary/30 appearance-none cursor-pointer shadow-sm"
                  >
                    <option value="" className="bg-white">All Courses</option>
                    {/* Single courses */}
                    {availableCourses.filter(c => c.type !== 'bundle').map(course => (
                      <option key={course._id} value={course._id} className="bg-white">
                        {course.title}
                      </option>
                    ))}
                    {/* Bundle courses — shown separately so reception can filter by bundle name */}
                    {availableCourses.filter(c => c.type === 'bundle').length > 0 && (
                      <option disabled>── Bundles ──</option>
                    )}
                    {availableCourses.filter(c => c.type === 'bundle').map(course => (
                      <option key={course._id} value={course._id} className="bg-white">
                        📦 {course.title}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-[#003300]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Status Filter */}
                <div className="relative">
                  <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/60 pointer-events-none" />
                  <select
                    value={statusFilter}
                    onChange={(e) => handleStatusFilterChange(e.target.value)}
                    className="w-full pl-12 pr-10 py-3.5 bg-white border border-primary/20 rounded-xl text-[#003300] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 hover:border-primary/30 appearance-none cursor-pointer shadow-sm"
                  >
                    <option value="" className="bg-white">All Status</option>
                    <option value="active" className="bg-white">Active</option>
                    <option value="inactive" className="bg-white">Inactive</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-[#003300]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Payment Filter */}
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/60 pointer-events-none" />
                  <select
                    value={paymentFilter}
                    onChange={(e) => handlePaymentFilterChange(e.target.value)}
                    className="w-full pl-12 pr-10 py-3.5 bg-white border border-primary/20 rounded-xl text-[#003300] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 hover:border-primary/30 appearance-none cursor-pointer shadow-sm"
                  >
                    <option value="" className="bg-white">All Payments</option>
                    <option value="paid" className="bg-white">Paid In Full</option>
                    <option value="partial" className="bg-white">Partial Payment</option>
                    <option value="unpaid" className="bg-white">Unpaid</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-[#003300]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Discount Filter */}
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/60 font-bold text-lg pointer-events-none">%</span>
                  <select
                    value={discountFilter}
                    onChange={(e) => handleDiscountFilterChange(e.target.value)}
                    className="w-full pl-12 pr-10 py-3.5 bg-white border border-primary/20 rounded-xl text-[#003300] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 hover:border-primary/30 appearance-none cursor-pointer shadow-sm"
                  >
                    <option value="" className="bg-white">All Discounts</option>
                    <option value="true" className="bg-white">Discounted</option>
                    <option value="false" className="bg-white">Standard Price</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-[#003300]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Transportation Filter */}
                <div className="relative">
                  <Bus className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/60 pointer-events-none" />
                  <select
                    value={transportationFilter}
                    onChange={(e) => handleTransportationFilterChange(e.target.value)}
                    className="w-full pl-12 pr-10 py-3.5 bg-white border border-primary/20 rounded-xl text-[#003300] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 hover:border-primary/30 appearance-none cursor-pointer shadow-sm"
                  >
                    <option value="" className="bg-white">All Transportation</option>
                    <option value="enabled" className="bg-white">With Transportation</option>
                    <option value="disabled" className="bg-white">Without Transportation</option>
                    <option value="paid" className="bg-white">Transportation Paid</option>
                    <option value="pending" className="bg-white">Transportation Pending</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-[#003300]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

              </div>

              {/* Clear Filters Button */}
              {(courseFilter || statusFilter || paymentFilter || discountFilter || transportationFilter || searchInput) && (
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleClearFilters}
                    className="text-sm text-[#003300]/60 hover:text-[#003300] transition-colors flex items-center gap-2 hover:bg-primary/5 px-3 py-1.5 rounded-lg"
                  >
                    <XCircle className="w-4 h-4" />
                    Clear All Filters
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Error Alert */}
      {error && (
        <motion.div variants={itemVariants}>
          <Alert variant="error">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold mb-1">Error Loading Enrollments</p>
                <p className="text-sm opacity-90">{error}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<RefreshCw className="w-4 h-4" />}
                onClick={fetchEnrollments}
              >
                Retry
              </Button>
            </div>
          </Alert>
        </motion.div>
      )}

      {/* Tab switcher */}
      <motion.div variants={itemVariants}>
        <div className="flex gap-1 p-1 bg-white rounded-xl border border-primary/15 shadow-sm w-fit">
          <button
            onClick={() => setActiveTab('enrollments')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'enrollments'
                ? 'bg-[#003300] text-white shadow-sm'
                : 'text-[#003300]/70 hover:text-[#003300] hover:bg-[#003300]/5'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Enrollments
          </button>
          <button
            onClick={() => setActiveTab('waiting')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'waiting'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
            }`}
          >
            <Clock className="w-4 h-4" />
            Waiting List
          </button>
        </div>
      </motion.div>

      {/* Waiting List Panel */}
      {activeTab === 'waiting' && (
        <motion.div variants={itemVariants}>
          <CardComponent variant="glass" hover>
            <CardBody className="p-4">
              <WaitingListPanel />
            </CardBody>
          </CardComponent>
        </motion.div>
      )}

      {/* Enrollments Table */}
      {activeTab === 'enrollments' && (
      <motion.div variants={itemVariants}>
        <CardComponent variant="glass" hover>
          <CardBody className="p-0">
            {isLoading ? (
              <div className="p-8">
                <LoadingState type="skeleton" text="Loading enrollments..." />
              </div>
            ) : (
              <>
                <EnrollmentList
                  enrollments={enrollments.filter(e => e.enrollmentSource !== 'bundle')}
                  onViewDetails={handleViewDetails}
                  onEdit={handleEditClick}
                  onRecordPayment={handleRecordPaymentClick}
                  onRecordTransportationPayment={handleTransportationClick}
                  onDeleteTransportation={(enrollmentId) => {
                    setConfirmDialog({
                      isOpen: true,
                      title: 'Remove Transportation',
                      description: 'This will permanently remove transportation from this enrollment and delete all related transportation receipts. This action cannot be undone.',
                      variant: 'danger',
                      isLoading: false,
                      onConfirm: async () => {
                        setConfirmDialog(prev => ({ ...prev, isLoading: true }));
                        try {
                          await deleteTransportation(enrollmentId);
                          await fetchEnrollments();
                          setConfirmDialog(prev => ({ ...prev, isOpen: false, isLoading: false }));
                        } catch (err: any) {
                          toast.error('Remove Failed', err.message || 'Failed to remove transportation');
                          setConfirmDialog(prev => ({ ...prev, isOpen: false, isLoading: false }));
                        }
                      }
                    });
                  }}
                  onDownloadReceipt={handleDownloadFullReceipt}
                  onDelete={handleDelete}
                  onAssignTransport={handleAssignTransport}
                  transportAssignmentByStudent={transportAssignmentByStudent}
                  isLoading={isLoading}
                />

                {/* Pagination */}
                {pagination && pagination.pages > 1 && (
                  <div className={`flex items-center justify-between px-6 py-4 border-t transition-colors duration-300 ${isRTL ? 'flex-row-reverse' : ''}`} style={{ borderColor: '#003300' + '20' }}>
                    <p className="text-sm transition-colors duration-300" style={{ color: '#003300' + 'CC' }}>
                      Showing {enrollments.length} of {pagination.total} enrollments
                    </p>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="border-[#003300]/20 hover:border-[#003300]/50 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ color: '#003300' }}
                      >
                        Previous
                      </Button>

                      <span className="text-sm px-4 transition-colors duration-300" style={{ color: '#003300' + 'CC' }}>
                        Page {pagination.page} of {pagination.pages}
                      </span>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.pages}
                        className="border-[#003300]/20 hover:border-[#003300]/50 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ color: '#003300' }}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardBody>
        </CardComponent>
      </motion.div>
      )}

      {/* Exchange Rate Modal */}
      <ExchangeRateModal
        isOpen={isExchangeRateModalOpen}
        onClose={() => setIsExchangeRateModalOpen(false)}
        exchangeRate={exchangeRate}
        onSave={async (newRate) => {
          setIsSavingExchangeRate(true);
          try {
            await updateExchangeRate(newRate);
          } finally {
            setIsSavingExchangeRate(false);
          }
        }}
        isSaving={isSavingExchangeRate}
      />

      {/* Create Enrollment Modal */}
      <EnrollmentForm
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreate}
        availableCourses={availableCourses}
        availableGroups={availableGroups}
        availableStudents={availableStudents}
        onCourseSelect={handleCourseSelect}
        onStudentSearch={handleStudentSearch}
        exchangeRate={exchangeRate}
      />

      {/* Bundle Enrollment Modal */}
      <BundleEnrollmentModal
        isOpen={isBundleModalOpen}
        onClose={() => setIsBundleModalOpen(false)}
        onSuccess={() => { setIsBundleModalOpen(false); fetchEnrollments(); }}
      />

      {/* Edit Enrollment Status Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedEnrollment(null);
        }}
        title="Update Enrollment Status"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-white/60">
            Change enrollment status for <strong className="text-white">{selectedEnrollment?.student?.name || 'Student'}</strong>
          </p>

          <div className="space-y-2">
            <button
              onClick={() => handleEdit('active')}
              className="w-full p-3 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 hover:border-green-500/40 rounded-lg text-green-400 font-medium transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              Mark as Active
            </button>
            <button
              onClick={() => handleEdit('inactive')}
              className="w-full p-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 rounded-lg text-red-400 font-medium transition-all flex items-center justify-center gap-2"
            >
              <XCircle className="w-5 h-5" />
              Mark as Inactive
            </button>
          </div>

          {/* Reason input for inactive status */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/80">
              Reason for Inactive Status <span className="text-red-400">*</span>
            </label>
            <textarea
              value={inactiveReason}
              onChange={(e) => setInactiveReason(e.target.value)}
              placeholder="Enter reason for marking as inactive..."
              rows={3}
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
            />
            <p className="text-xs text-white/50">
              Required when changing status to inactive
            </p>
          </div>

          <div className="flex justify-end pt-4 border-t border-white/10">
            <Button
              variant="ghost"
              onClick={() => {
                setIsEditModalOpen(false);
                setSelectedEnrollment(null);
              }}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={handleClosePaymentModal}
        title={receiptData ? "Payment Successful!" : "Record Payment"}
        size="md"
      >
        <div className="space-y-6">
          {/* Student and Balance Info */}
          <div className="bg-white p-6 rounded-xl border-2 border-zinc-200 shadow-lg">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-zinc-200">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-lg shadow-md">
                {selectedEnrollment?.student?.name?.charAt(0).toUpperCase() || 'S'}
              </div>
              <div>
                <p className="font-bold text-zinc-900 text-lg">{selectedEnrollment?.student?.name}</p>
                <p className="text-sm text-zinc-600 font-medium">{selectedEnrollment?.course?.title || 'Course'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <p className="text-sm font-semibold text-zinc-700">Total Course Fee</p>
                <p className="font-bold text-zinc-900 text-lg">${selectedEnrollment?.payment?.totalAmount || 0}</p>
              </div>
              <div className="flex items-center justify-between py-2">
                <p className="text-sm font-semibold text-zinc-700">Amount Paid</p>
                <p className="font-bold text-green-600 text-lg">${selectedEnrollment?.payment?.paidAmount || 0}</p>
              </div>
              <div className="flex items-center justify-between pt-4 border-t-2 border-zinc-200">
                <p className="text-base font-bold text-zinc-900">Balance Due</p>
                <p className="text-3xl font-bold text-red-600">
                  ${selectedEnrollment?.payment?.remainingAmount || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Currency Switch */}
          <div className="flex items-center justify-between p-4 bg-white rounded-xl border-2 border-zinc-200">
            <label className="text-sm font-bold text-zinc-900">Currency</label>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium ${paymentCurrency === 'usd' ? 'text-primary' : 'text-zinc-500'}`}>USD</span>
              <button
                type="button"
                onClick={() => setPaymentCurrency(paymentCurrency === 'usd' ? 'sp' : 'usd')}
                className={`relative w-14 h-7 rounded-full transition-colors ${paymentCurrency === 'usd' ? 'bg-zinc-300' : 'bg-primary'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${paymentCurrency === 'sp' ? 'translate-x-7' : ''}`} />
              </button>
              <span className={`text-sm font-medium ${paymentCurrency === 'sp' ? 'text-primary' : 'text-zinc-500'}`}>S.P.</span>
            </div>
          </div>

          {/* Installments Selection */}
          {selectedEnrollment?.payment?.installments && selectedEnrollment.payment.installments.length > 0 && (
            <div className="space-y-3">
              <label className="block text-sm font-bold text-zinc-900">Select Installments to Pay</label>
              <div className="bg-white p-4 rounded-xl border-2 border-zinc-200 space-y-2 max-h-60 overflow-y-auto">
                {selectedEnrollment.payment.installments.map((installment: any, index: number) => (
                  <label
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedInstallments.includes(index.toString())
                        ? 'bg-primary/10 border-primary'
                        : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedInstallments.includes(index.toString())}
                        onChange={(e) => {
                          let newSelected: string[];
                          if (e.target.checked) {
                            newSelected = [...selectedInstallments, index.toString()];
                          } else {
                            newSelected = selectedInstallments.filter(id => id !== index.toString());
                          }
                          setSelectedInstallments(newSelected);
                          
                          // Calculate total of all selected installments
                          const total = newSelected.reduce((sum, installmentIndex) => {
                            const inst = selectedEnrollment.payment.installments[parseInt(installmentIndex)];
                            return sum + (inst?.amount || 0);
                          }, 0);
                          
                          // Set payment amount in the selected currency
                          if (total > 0) {
                            const displayAmount = paymentCurrency === 'usd' ? total : total * exchangeRate;
                            setPaymentAmount(displayAmount.toString());
                          } else {
                            setPaymentAmount('');
                          }
                        }}
                        className="w-5 h-5 text-primary border-zinc-300 rounded focus:ring-primary"
                      />
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">Installment #{index + 1}</p>
                        <p className="text-xs text-zinc-600">Due: {new Date(installment.dueDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-zinc-900">
                        {paymentCurrency === 'usd'
                          ? `$${installment.amount.toFixed(2)}`
                          : `${(installment.amount * exchangeRate).toFixed(0)} S.P.`
                        }
                      </p>
                      <p className={`text-xs font-medium ${
                        installment.status === 'paid' ? 'text-green-600' :
                        installment.status === 'overdue' ? 'text-red-600' :
                        'text-yellow-600'
                      }`}>
                        {installment.status === 'paid' ? 'Paid' :
                         installment.status === 'overdue' ? 'Overdue' :
                         'Pending'
                        }
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Show either form or success message */}
          {!receiptData ? (
            <>
              {/* Payment Form */}
              <div className="space-y-6">
                {/* Amount Input */}
                <div>
                  <label className="block text-sm font-bold text-zinc-900 mb-3 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-primary" />
                    Payment Amount *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 text-xl font-bold">
                      {paymentCurrency === 'usd' ? '$' : 'S.P.'}
                    </span>
                    <input
                      type="number"
                      step={paymentCurrency === 'usd' ? '0.01' : '1'}
                      min="0"
                      max={paymentCurrency === 'usd'
                        ? selectedEnrollment?.payment?.remainingAmount || 0
                        : (selectedEnrollment?.payment?.remainingAmount || 0) * exchangeRate
                      }
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                      placeholder={paymentCurrency === 'usd' ? '0.00' : '0'}
                      className="w-full pl-20 pr-4 py-4 bg-white border-2 border-zinc-300 rounded-xl text-zinc-900 text-xl font-bold placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-xs text-zinc-600 font-medium">
                      Maximum: {paymentCurrency === 'usd'
                        ? `$${(selectedEnrollment?.payment?.remainingAmount || 0).toFixed(2)}`
                        : `${((selectedEnrollment?.payment?.remainingAmount || 0) * exchangeRate).toFixed(0)} S.P.`
                      }
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const maxAmount = paymentCurrency === 'usd'
                          ? selectedEnrollment?.payment?.remainingAmount || 0
                          : (selectedEnrollment?.payment?.remainingAmount || 0) * exchangeRate;
                        setPaymentAmount(maxAmount.toString());
                      }}
                      className="text-xs text-primary hover:text-primary/80 font-bold transition-colors px-3 py-1 bg-primary/10 rounded-lg hover:bg-primary/20"
                    >
                      Pay Full Amount
                    </button>
                  </div>
                </div>

                {/* Payment Summary Card */}
                {paymentAmount && !isNaN(parseFloat(paymentAmount)) && parseFloat(paymentAmount) > 0 && (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 space-y-2">
                    <p className="text-sm font-semibold text-green-800 mb-2">Payment Summary</p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-700">Current Remaining:</span>
                      <span className="text-sm font-bold text-green-800">
                        {paymentCurrency === 'usd'
                          ? `$${(selectedEnrollment?.payment?.remainingAmount || 0).toFixed(2)}`
                          : `${((selectedEnrollment?.payment?.remainingAmount || 0) * exchangeRate).toFixed(0)} S.P.`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-700">Payment Amount:</span>
                      <span className="text-sm font-bold text-green-800">
                        {paymentCurrency === 'usd'
                          ? `$${parseFloat(paymentAmount).toFixed(2)}`
                          : `${parseFloat(paymentAmount).toFixed(0)} S.P.`}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-green-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-green-800">After Payment:</span>
                        <span className={`text-sm font-bold ${
                          (() => {
                            const currentRemaining = selectedEnrollment?.payment?.remainingAmount || 0;
                            const paymentInUSD = paymentCurrency === 'usd' 
                              ? parseFloat(paymentAmount) 
                              : parseFloat(paymentAmount) / exchangeRate;
                            const newRemaining = currentRemaining - paymentInUSD;
                            return newRemaining <= 0 ? 'text-green-600' : 'text-green-800';
                          })()
                        }`}>
                          {(() => {
                            const currentRemaining = selectedEnrollment?.payment?.remainingAmount || 0;
                            const paymentInUSD = paymentCurrency === 'usd' 
                              ? parseFloat(paymentAmount) 
                              : parseFloat(paymentAmount) / exchangeRate;
                            const newRemaining = Math.max(0, currentRemaining - paymentInUSD);
                            return paymentCurrency === 'usd'
                              ? `$${newRemaining.toFixed(2)}`
                              : `${(newRemaining * exchangeRate).toFixed(0)} S.P.`;
                          })()}
                        </span>
                      </div>
                      {(selectedEnrollment?.payment?.remainingAmount || 0) - (paymentCurrency === 'usd' 
                        ? parseFloat(paymentAmount) 
                        : parseFloat(paymentAmount) / exchangeRate) <= 0 && (
                        <p className="text-xs text-green-600 mt-1 font-medium">✓ Payment will be completed!</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-sm font-bold text-zinc-900 mb-3">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Add transaction reference, receipt number, or any additional notes..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white border-2 border-zinc-300 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/20 transition-all resize-none shadow-sm"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-4 pt-6 border-t-2 border-zinc-200">
                <Button
                  variant="ghost"
                  onClick={handleClosePaymentModal}
                  disabled={isRecordingPayment}
                  className="flex-1 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 border-2 border-zinc-300 py-3 font-bold"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleRecordPayment}
                  disabled={isRecordingPayment || !paymentAmount}
                  leftIcon={<CheckCircle className="w-5 h-5" />}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3 shadow-xl"
                >
                  {isRecordingPayment ? 'Processing...' : 'Record Payment'}
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Success Message with Receipt Info */}
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-green-400" />
                </div>

                <h3 className="text-xl font-bold text-white mb-2">
                  Payment Recorded Successfully!
                </h3>

                <p className="text-white/60 mb-4">
                  Receipt #{receiptData.receiptNumber} has been generated
                </p>

                <div className="bg-white/5 p-4 rounded-lg border border-white/10 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">Amount Paid</span>
                    <span className="font-bold text-green-400">${paymentAmount}</span>
                  </div>
                </div>

                <p className="text-sm text-white/50 mb-4">
                  The receipt has been downloaded automatically. You can download it again if needed.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-3 pt-4 border-t border-white/10">
                <Button
                  variant="outline"
                  onClick={handleDownloadReceipt}
                  leftIcon={<DollarSign className="w-4 h-4" />}
                  className="border-white/10 hover:border-primary/50 text-white"
                >
                  Download Receipt Again
                </Button>
                <Button
                  variant="primary"
                  onClick={handleClosePaymentModal}
                  className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white"
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Transportation Payment Modal */}
      <Modal
        isOpen={isTransportationPaymentModalOpen}
        onClose={() => {
          setIsTransportationPaymentModalOpen(false);
          setTransportationPaymentEnrollment(null);
          setTransportationPaymentAmount('');
          setTransportationPaymentMethod('cash');
          setTransportationPaymentNotes('');
        }}
        title="Record Transportation Payment"
        size="md"
      >
        {transportationPaymentEnrollment && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-[#003300]/70">
                <span className="font-semibold">Student:</span> {transportationPaymentEnrollment.student?.name}
              </p>
              <p className="text-sm text-[#003300]/70">
                <span className="font-semibold">Course:</span> {transportationPaymentEnrollment.course?.title}
              </p>
              {transportationPaymentEnrollment.transportation && (
                <div className="mt-2 pt-2 border-t border-blue-200">
                  <p className="text-sm text-[#003300]/70">
                    <span className="font-semibold">Transportation Total:</span> {transportationPaymentEnrollment.transportation.totalAmount.toLocaleString()} S.P.
                  </p>
                  <p className="text-sm text-[#003300]/70">
                    <span className="font-semibold">Paid:</span> {transportationPaymentEnrollment.transportation.paidAmount.toLocaleString()} S.P.
                  </p>
                  <p className="text-sm text-[#003300]/70">
                    <span className="font-semibold">Remaining:</span> {transportationPaymentEnrollment.transportation.remainingAmount.toLocaleString()} S.P.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#003300] mb-2">
                Payment Amount (S.P.) <span className="text-red-400">*</span>
              </label>
              <Input
                type="number"
                step="1"
                min="0"
                value={transportationPaymentAmount}
                onChange={(e) => setTransportationPaymentAmount(e.target.value)}
                placeholder="0"
                disabled={isRecordingTransportationPayment}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#003300] mb-2">
                Payment Method <span className="text-red-400">*</span>
              </label>
              <select
                value={transportationPaymentMethod}
                onChange={(e) => setTransportationPaymentMethod(e.target.value)}
                disabled={isRecordingTransportationPayment}
                className="w-full px-4 py-2 rounded-lg bg-white border border-primary/20 text-[#003300] focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="check">Check</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#003300] mb-2">
                Notes <span className="text-[#003300]/50 text-xs">(Optional)</span>
              </label>
              <textarea
                value={transportationPaymentNotes}
                onChange={(e) => setTransportationPaymentNotes(e.target.value)}
                placeholder="Any notes about this payment..."
                disabled={isRecordingTransportationPayment}
                rows={3}
                className="w-full px-4 py-2 rounded-lg bg-white border border-primary/20 text-[#003300] focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsTransportationPaymentModalOpen(false);
                  setTransportationPaymentEnrollment(null);
                  setTransportationPaymentAmount('');
                  setTransportationPaymentMethod('cash');
                  setTransportationPaymentNotes('');
                }}
                disabled={isRecordingTransportationPayment}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleRecordTransportationPayment}
                disabled={isRecordingTransportationPayment || !transportationPaymentAmount}
                className="flex-1"
              >
                {isRecordingTransportationPayment ? 'Processing...' : 'Record Payment'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Transportation Modal */}
      <Modal
        isOpen={isAddTransportationModalOpen}
        onClose={() => {
          setIsAddTransportationModalOpen(false);
          setAddTransportationEnrollment(null);
          setTransportationTotalAmount('');
          setTransportationPaidNow('');
          setTransportationInstallments([]);
        }}
        title="Add Transportation"
        size="md"
      >
        {addTransportationEnrollment && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-[#003300]/70">
                <span className="font-semibold">Student:</span> {addTransportationEnrollment.student?.name}
              </p>
              <p className="text-sm text-[#003300]/70">
                <span className="font-semibold">Course:</span> {addTransportationEnrollment.course?.title}
              </p>
            </div>

            {/* Transportation Total Amount */}
            <div>
              <label className="block text-sm font-medium text-[#003300] mb-2">
                Transportation Total Amount (S.P.) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500 font-bold">S.P.</span>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={transportationTotalAmount}
                  onChange={(e) => setTransportationTotalAmount(e.target.value)}
                  placeholder="0"
                  disabled={isAddingTransportation}
                  className="pl-12"
                />
              </div>
            </div>

            {/* Transportation Paid Now */}
            <div>
              <label className="block text-sm font-medium text-[#003300] mb-2">
                Transportation Paid Now (S.P.) <span className="text-[#003300]/50 text-xs">(Optional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500 font-bold">S.P.</span>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={transportationPaidNow}
                  onChange={(e) => setTransportationPaidNow(e.target.value)}
                  placeholder="0"
                  disabled={isAddingTransportation}
                  className="pl-12"
                />
              </div>
            </div>

            {/* Payment Method and Notes (only show if paid > 0) */}
            {parseFloat(transportationPaidNow || '0') > 0 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-[#003300] mb-2">
                    Payment Method <span className="text-[#003300]/50 text-xs">(Optional)</span>
                  </label>
                  <select
                    value={transportationAddPaymentMethod}
                    onChange={(e) => setTransportationAddPaymentMethod(e.target.value)}
                    disabled={isAddingTransportation}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="check">Check</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#003300] mb-2">
                    Notes <span className="text-[#003300]/50 text-xs">(Optional)</span>
                  </label>
                  <textarea
                    value={transportationAddNotes}
                    onChange={(e) => setTransportationAddNotes(e.target.value)}
                    placeholder="Add any notes about this payment..."
                    disabled={isAddingTransportation}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
                  />
                </div>
              </>
            )}

            {/* Transportation Installments */}
            {(() => {
              const total = parseFloat(transportationTotalAmount || '0');
              const paid = parseFloat(transportationPaidNow || '0');
              const remaining = Math.max(0, total - paid);
              return remaining > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-[#003300]">
                      Transportation Installments ({Math.round(remaining).toLocaleString()} S.P.) <span className="text-red-400">*</span>
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setTransportationInstallments([
                          ...transportationInstallments,
                          { amount: '', dueDate: '' }
                        ]);
                      }}
                      className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50"
                      disabled={isAddingTransportation}
                    >
                      + Add Installment
                    </Button>
                  </div>

                  {transportationInstallments.map((inst, index) => (
                    <div key={index} className="flex gap-3 items-start">
                      <div className="flex-1">
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-gray-500 font-bold">S.P.</span>
                          <Input
                            type="number"
                            step="1"
                            min="0"
                            value={inst.amount}
                            onChange={(e) => {
                              const newInstallments = [...transportationInstallments];
                              newInstallments[index].amount = e.target.value;
                              setTransportationInstallments(newInstallments);
                            }}
                            placeholder="Amount"
                            className="pl-12"
                            disabled={isAddingTransportation}
                          />
                        </div>
                      </div>
                      <div className="flex-1">
                        <Input
                          type="date"
                          value={inst.dueDate}
                          onChange={(e) => {
                            const newInstallments = [...transportationInstallments];
                            newInstallments[index].dueDate = e.target.value;
                            setTransportationInstallments(newInstallments);
                          }}
                          className="w-full"
                          disabled={isAddingTransportation}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setTransportationInstallments(transportationInstallments.filter((_, i) => i !== index));
                        }}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        disabled={isAddingTransportation}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              ) : total > 0 && paid >= total ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
                  <span className="font-bold">✓</span> Full Transportation Payment. No installments required.
                </div>
              ) : null;
            })()}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsAddTransportationModalOpen(false);
                  setAddTransportationEnrollment(null);
                  setTransportationTotalAmount('');
                  setTransportationPaidNow('');
                  setTransportationInstallments([]);
                }}
                disabled={isAddingTransportation}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleAddTransportation}
                disabled={isAddingTransportation || !transportationTotalAmount}
                className="flex-1"
              >
                {isAddingTransportation ? 'Adding...' : 'Add Transportation'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Enrollment Details Modal */}
      <EnrollmentDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setDetailsEnrollmentId(null);
        }}
        enrollmentId={detailsEnrollmentId}
        onDeleteTransportation={async (enrollmentId: string) => {
          await deleteTransportation(enrollmentId);
          // Refresh the enrollment list
          await fetchEnrollments();
          // Modal will automatically refresh enrollment data
        }}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => { if (!confirmDialog.isLoading) setConfirmDialog({ ...confirmDialog, isOpen: false }); }}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        isLoading={confirmDialog.isLoading}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </motion.div>
  );
};

export default EnrollmentManagement;
