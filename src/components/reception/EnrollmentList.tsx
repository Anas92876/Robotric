/**
 * EnrollmentList Component
 *
 * Displays a table of enrollments with:
 * - Student and course information
 * - Payment status and progress
 * - Enrollment status badges
 * - Action buttons
 *
 * UPDATED: Light mode with brand colors (dark green & cream)
 */

import React, { useState, useCallback } from 'react';
import { Calendar, DollarSign, Edit2, BookOpen, Download, Trash2, Eye, Bus, MoreVertical, UserPlus, AlertTriangle, Layers, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Badge, Button, Dropdown } from '../ui';
import type { Enrollment, SubEnrollmentBrief } from '../../hooks';
import { api } from '../../lib/api';

/**
 * Per-student transport-assignment status, keyed by studentId.
 * Source: POST /api/reception/transport/students/status-by-students
 *
 * A student has at most one active DriverStudent record (their bus seat),
 * shared across all their transport-enabled enrollments. So if `assigned: true`
 * here, every enrollment.transportation row for this student is considered
 * "operationalized" — the bus knows about them.
 */
export interface TransportAssignmentStatus {
  assigned: boolean;
  driverStudentId?: string;
  driverId?: string;
  driverName?: string | null;
  hasLocation?: boolean;
}

/**
 * Props for EnrollmentList component
 */
interface EnrollmentListProps {
  enrollments: Enrollment[];
  onViewDetails?: (enrollment: Enrollment) => void;
  onEdit?: (enrollment: Enrollment) => void;
  onRecordPayment?: (enrollment: Enrollment) => void;
  onRecordTransportationPayment?: (enrollment: Enrollment) => void;
  onDeleteTransportation?: (enrollmentId: string) => void;
  onDownloadReceipt?: (enrollmentId: string) => void;
  onDelete?: (enrollmentId: string) => void;
  /** Open the Transport Management page with this enrollment's student pre-selected. */
  onAssignTransport?: (enrollment: Enrollment) => void;
  /** Map of studentId → assignment status. Missing entry = treat as unassigned. */
  transportAssignmentByStudent?: Record<string, TransportAssignmentStatus>;
  isLoading?: boolean;
}

/**
 * Get badge variant based on enrollment status
 */
const getStatusBadgeVariant = (status: string): 'default' | 'success' | 'warning' | 'error' => {
  switch (status) {
    case 'active':
      return 'success';
    case 'inactive':
      return 'error';
    default:
      return 'default';
  }
};

/**
 * Get payment status badge variant
 */
const getPaymentBadgeVariant = (paidAmount: number, totalAmount: number): 'default' | 'success' | 'warning' | 'error' => {
  const percentage = (paidAmount / totalAmount) * 100;
  if (percentage >= 100) return 'success';
  if (percentage >= 50) return 'warning';
  if (percentage > 0) return 'default';
  return 'error';
};

/**
 * Format date to readable string
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// ─── Bundle Expand Row ────────────────────────────────────────────────────────

function BundleExpandRow({ enrollmentId, colSpan }: { enrollmentId: string; colSpan: number }) {
  const [subEnrollments, setSubEnrollments] = useState<SubEnrollmentBrief[] | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSubs = useCallback(async () => {
    if (subEnrollments) return; // already loaded
    setLoading(true);
    try {
      const res = await api.get(`/reception/enrollments/${enrollmentId}/sub-enrollments`);
      setSubEnrollments(res.data.data || []);
    } catch {
      setSubEnrollments([]);
    } finally {
      setLoading(false);
    }
  }, [enrollmentId, subEnrollments]);

  // Trigger fetch on mount
  React.useEffect(() => { fetchSubs(); }, [fetchSubs]);

  return (
    <tr className="bg-violet-50/40 border-b border-violet-100">
      <td colSpan={colSpan} className="px-6 pb-3 pt-1">
        {loading ? (
          <div className="flex items-center gap-2 py-2 text-violet-500 text-xs">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Loading courses…
          </div>
        ) : !subEnrollments || subEnrollments.length === 0 ? (
          <p className="text-xs text-violet-400 py-2">No sub-courses found for this bundle.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {subEnrollments.map((se) => (
              <div key={se._id} className="flex items-center gap-3 py-1.5 px-2 rounded-lg bg-white border border-violet-100 text-xs">
                <div className="w-6 h-6 rounded-md bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-3 h-3 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#003300] truncate">{se.course?.title}</p>
                  {se.course?.level && <span className="text-[#003300]/45 capitalize text-[10px]">{se.course.level}</span>}
                </div>
                {se.group ? (
                  <span className="text-[10px] text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                    {se.group.name} · {se.group.enrolledCount}/{se.group.maxStudents}
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                    No group
                  </span>
                )}
                <Badge
                  variant={se.status === 'active' ? 'success' : se.status === 'completed' ? 'default' : 'error'}
                  size="sm"
                >
                  {se.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </td>
    </tr>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

/**
 * EnrollmentList Component
 */
export const EnrollmentList: React.FC<EnrollmentListProps> = ({
  enrollments,
  onViewDetails,
  onEdit,
  onRecordPayment,
  onRecordTransportationPayment,
  onDeleteTransportation,
  onDownloadReceipt,
  onDelete,
  onAssignTransport,
  transportAssignmentByStudent = {},
  isLoading = false,
}) => {
  /**
   * Empty state
   */
  if (!isLoading && enrollments.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="w-16 h-16 text-primary/30 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-[#003300] mb-2">No enrollments found</h3>
        <p className="text-[#003300]/60">
          Try adjusting your filters or create a new enrollment
        </p>
      </div>
    );
  }

  const [expandedBundles, setExpandedBundles] = useState<Set<string>>(new Set());
  const toggleBundle = (id: string) => setExpandedBundles(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const hasActions = !!(onViewDetails || onEdit || onRecordPayment || onRecordTransportationPayment || onDeleteTransportation || onDownloadReceipt || onDelete);
  // Transportation column + Actions column
  const totalCols = 6 + (hasActions ? 1 : 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        {/* Table Header */}
        <thead>
          <tr className="border-b border-primary/10 bg-[#f9fafb]">
            <th className="text-left py-4 px-4 text-sm font-semibold text-[#003300]/70 uppercase tracking-wider">
              Student
            </th>
            <th className="text-left py-4 px-4 text-sm font-semibold text-[#003300]/70 uppercase tracking-wider">
              Course
            </th>
            <th className="text-left py-4 px-4 text-sm font-semibold text-[#003300]/70 uppercase tracking-wider">
              Status
            </th>
            <th className="text-left py-4 px-4 text-sm font-semibold text-[#003300]/70 uppercase tracking-wider">
              Payment
            </th>
            <th className="text-left py-4 px-4 text-sm font-semibold text-[#003300]/70 uppercase tracking-wider">
              Enrolled
            </th>
            {hasActions && (
              <th className="text-right py-4 px-4 text-sm font-semibold text-[#003300]/70 uppercase tracking-wider">
                Actions
              </th>
            )}
          </tr>
        </thead>

        {/* Table Body */}
        <tbody className="divide-y divide-primary/5">
          {enrollments.map((enrollment) => {
            const isBundle = enrollment.course?.type === 'bundle';
            const isExpanded = expandedBundles.has(enrollment._id);
            return (
            <React.Fragment key={enrollment._id}>
            <tr
              className={`transition-colors duration-150 ${isBundle ? 'bg-violet-50/30 hover:bg-violet-50/60 border-l-4 border-l-violet-400' : 'hover:bg-primary/5'}`}
            >
              {/* Student Column */}
              <td className="py-4 px-4">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-[#004d00] flex items-center justify-center text-[#ffffcc] font-semibold shadow-md">
                    {enrollment.student?.name?.charAt(0).toUpperCase() || '?'}
                  </div>

                  {/* Name and Email */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-[#003300]">{enrollment.student?.name || 'Unknown Student'}</p>
                      {enrollment.transportation?.enabled && (
                        <Badge 
                          variant={
                            enrollment.transportation.remainingAmount === 0 
                              ? 'success' 
                              : enrollment.transportation.remainingAmount > 0 
                              ? 'warning' 
                              : 'default'
                          }
                          size="sm"
                          className="text-xs"
                        >
                          {enrollment.transportation.remainingAmount === 0 
                            ? 'Transport Paid' 
                            : 'Transport'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-[#003300]/50">{enrollment.student?.email || 'No email'}</p>
                  </div>
                </div>
              </td>

              {/* Course Column */}
              <td className="py-4 px-4">
                <div className="flex items-start gap-2">
                  {isBundle && (
                    <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Layers className="w-3.5 h-3.5 text-violet-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[#003300] font-medium leading-snug">{enrollment.course?.title || 'Unknown Course'}</p>
                      {isBundle && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200 flex-shrink-0">
                          Bundle
                        </span>
                      )}
                    </div>
                    {enrollment.payment?.totalAmount !== undefined && (
                      <p className="text-sm text-[#003300]/50">
                        ${isBundle ? (enrollment.course.bundlePrice ?? enrollment.payment.totalAmount) : enrollment.payment.totalAmount}
                        {isBundle && ' (bundle price)'}
                      </p>
                    )}
                    {isBundle && (
                      <button
                        onClick={() => toggleBundle(enrollment._id)}
                        className="flex items-center gap-1 mt-1 text-[10px] font-semibold text-violet-600 hover:text-violet-800 transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {isExpanded ? 'Hide courses' : 'Show courses'}
                      </button>
                    )}
                  </div>
                </div>
              </td>

              {/* Status Column */}
              <td className="py-4 px-4">
                <Badge variant={getStatusBadgeVariant(enrollment.status)}>
                  {enrollment.status.charAt(0).toUpperCase() + enrollment.status.slice(1)}
                </Badge>
              </td>

              {/* Payment Column */}
              <td className="py-4 px-4">
                  <div className="space-y-1">
                    {enrollment.payment ? (
                      <>
                        <div className="flex items-center gap-2 text-[#003300]/70">
                          <DollarSign className="w-4 h-4 text-primary/50" />
                          <span className="text-sm">
                            ${enrollment.payment.paidAmount} / ${enrollment.payment.totalAmount}
                          </span>
                        </div>
                        <Badge variant={getPaymentBadgeVariant(enrollment.payment.paidAmount, enrollment.payment.totalAmount)} size="sm">
                          {enrollment.payment.remainingAmount > 0
                            ? `$${enrollment.payment.remainingAmount} remaining`
                            : 'Paid in full'}
                        </Badge>
                      </>
                    ) : (
                      <span className="text-sm text-[#003300]/50">No payment info</span>
                    )}
                  </div>
              </td>

              {/* Transportation Column */}
              <td className="py-4 px-4">
                {enrollment.transportation?.enabled ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[#003300]/70">
                      <Bus className="w-4 h-4 text-orange-500/70" />
                      <span className="text-sm">
                        {enrollment.transportation.paidAmount.toLocaleString()} / {enrollment.transportation.totalAmount.toLocaleString()} S.P.
                      </span>
                    </div>
                    <Badge
                      variant={
                        enrollment.transportation.remainingAmount === 0
                          ? 'success'
                          : enrollment.transportation.remainingAmount > 0
                          ? 'warning'
                          : 'default'
                      }
                      size="sm"
                    >
                      {enrollment.transportation.remainingAmount > 0
                        ? `${enrollment.transportation.remainingAmount.toLocaleString()} S.P. remaining`
                        : 'Paid in full'}
                    </Badge>

                    {/* "Transport pending assignment" banner — appears when the
                         student is paid up for transport but doesn't have an active
                         DriverStudent record yet (the bus side doesn't know about
                         them). Deep-links to Transport Management with the student
                         pre-selected. */}
                    {(() => {
                      const studentId = String(enrollment.student?._id || '');
                      const status = transportAssignmentByStudent[studentId];
                      const isUnassigned = !status?.assigned;
                      if (!isUnassigned || !onAssignTransport) return null;
                      return (
                        <button
                          type="button"
                          onClick={() => onAssignTransport(enrollment)}
                          className="mt-1 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-yellow-50 text-yellow-800 border border-yellow-200 text-xs font-medium hover:bg-yellow-100 transition-colors"
                          title="No driver assigned yet — click to assign in Transport Management"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          <span>No driver yet</span>
                          <UserPlus className="w-3 h-3 ms-0.5" />
                        </button>
                      );
                    })()}
                  </div>
                ) : (
                  <span className="text-sm text-[#003300]/50">-</span>
                )}
              </td>

              {/* Enrolled Date Column */}
              <td className="py-4 px-4">
                <div className="flex items-center gap-2 text-[#003300]/60 text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(enrollment.enrolledAt)}</span>
                </div>
              </td>

              {/* Actions Column */}
              {(onViewDetails || onEdit || onRecordPayment || onRecordTransportationPayment || onDownloadReceipt || onDelete) && (
                <td className="py-4 px-4">
                  <div className="flex items-center justify-end gap-2">
                    {/* Actions Dropdown Menu */}
                    <Dropdown
                      trigger={
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<MoreVertical className="w-4 h-4" />}
                          className="text-[#003300]"
                        />
                      }
                      items={[
                        ...(onViewDetails ? [{
                          label: 'View Details',
                          icon: <Eye className="w-4 h-4" />,
                          onClick: () => onViewDetails(enrollment)
                        }] : []),
                        ...(onRecordPayment ? [{
                          label: 'Record Payment',
                          icon: <DollarSign className="w-4 h-4" />,
                          onClick: () => onRecordPayment(enrollment),
                          disabled: enrollment.payment?.remainingAmount === 0
                        }] : []),
                        ...(onRecordTransportationPayment ? [{
                          label: 'Transportation Payment',
                          icon: <Bus className="w-4 h-4" />,
                          onClick: () => onRecordTransportationPayment(enrollment)
                        }] : []),
                        ...(onDeleteTransportation && enrollment.transportation?.enabled ? [{
                          label: 'Remove Transportation',
                          icon: <Trash2 className="w-4 h-4" />,
                          onClick: () => onDeleteTransportation(enrollment._id),
                          danger: true
                        }] : []),
                        ...(onDownloadReceipt && enrollment.payment && enrollment.payment.paidAmount > 0 ? [{
                          label: 'Download Receipt',
                          icon: <Download className="w-4 h-4" />,
                          onClick: () => onDownloadReceipt(enrollment._id)
                        }] : []),
                        ...(onEdit ? [{
                          label: 'Status',
                          icon: <Edit2 className="w-4 h-4" />,
                          onClick: () => onEdit(enrollment)
                        }] : []),
                        ...(onDelete ? [{
                          divider: true
                        }, {
                          label: isBundle ? 'Delete Bundle Enrollment' : 'Delete',
                          icon: <Trash2 className="w-4 h-4" />,
                          onClick: () => onDelete(enrollment._id),
                          danger: true
                        }] : [])
                      ]}
                      align="right"
                    />
                  </div>
                </td>
              )}
            </tr>
            {/* Bundle expanded sub-courses row */}
            {isBundle && isExpanded && (
              <BundleExpandRow enrollmentId={enrollment._id} colSpan={totalCols} />
            )}
            </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
