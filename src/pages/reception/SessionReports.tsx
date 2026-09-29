/**
 * Reception Session Reports Page
 * 
 * Manage session reports:
 * - View approved sessions (ready for reporting)
 * - Create session reports
 * - Upload PDF reports
 * - Mark attendance (attended/no-show)
 * - View existing reports
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { formatDate, formatTime } from "../../utils/dateTime";
import {
  FileText,
  Plus,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Download,
  Eye,
} from 'lucide-react';
import { useSessionReports } from '../../hooks';
import { getAllSessionRequests } from '../../services/subscription.service';
import type { SessionRequest, SessionReport } from '../../services/subscription.service';
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
import SessionReportModal from '../../components/reception/SessionReportModal';

export default function SessionReports() {
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardReception']);
  const isRTL = i18n.language === 'ar';

  const {
    isLoading,
    error,
    reports,
    createReport,
    getReport,
    getAllReports,
  } = useSessionReports();

  const [sessions, setSessions] = useState<SessionRequest[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('approved'); // Default to approved
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewReportModalOpen, setViewReportModalOpen] = useState(false);
  const [reportToView, setReportToView] = useState<SessionReport | null>(null);
  const [sessionWithReport, setSessionWithReport] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'sessions' | 'reports'>('sessions');

  // Fetch sessions
  const fetchSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const data = await getAllSessionRequests({ status: statusFilter === 'all' ? undefined : statusFilter });
      setSessions(data);
    } catch (err: any) {
      console.error('Error fetching sessions:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'sessions') {
      fetchSessions();
    } else if (activeTab === 'reports') {
      getAllReports();
    }
  }, [statusFilter, activeTab]);

  // Filter sessions
  const filteredSessions = sessions.filter((session) => {
    const user = typeof session.userId === 'object' ? session.userId : null;
    const userName = user?.name || '';
    const userEmail = user?.email || '';

    const matchesSearch =
      !searchQuery ||
      userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.description?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  const handleCreateReport = async (data: any) => {
    if (!selectedSession) return;
    
    try {
      setIsSubmitting(true);
      await createReport(selectedSession._id, data);
      alert('Session report created successfully! Hours have been deducted from the subscription.');
      setIsModalOpen(false);
      setSelectedSession(null);
      fetchSessions(); // Refresh to show updated status
    } catch (error: any) {
      alert(error.message || 'Failed to create session report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCreateModal = (session: SessionRequest) => {
    setSelectedSession(session);
    setIsModalOpen(true);
  };

  const handleViewReport = async (sessionId: string) => {
    try {
      const report = await getReport(sessionId);
      if (report) {
        setReportToView(report);
        setSessionWithReport(sessionId);
        setViewReportModalOpen(true);
      } else {
        alert('No report found for this session');
      }
    } catch (error: any) {
      alert(error.message || 'Failed to load report');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="success">Approved</Badge>;
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'no_show':
        return <Badge variant="error">No Show</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'declined':
        return <Badge variant="error">Declined</Badge>;
      case 'canceled':
        return <Badge variant="default">Canceled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (activeTab === 'sessions' && isLoadingSessions && sessions.length === 0) {
    return <LoadingState type="skeleton" text="Loading sessions..." />;
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
            color: '#003300',
            backgroundClip: 'text'
          }}>{t('dashboardReception:sessionReports.title', 'Session Reports')}</h1>
          <p className={`mt-1 transition-colors duration-300 ${isRTL ? 'text-right' : 'text-left'}`} style={{ color: '#003300' + 'CC' }}>
            {t('dashboardReception:sessionReports.subtitle', 'Create reports for completed sessions and deduct hours from subscriptions')}
          </p>
        </div>
        <Button
          variant="outline"
          leftIcon={<RefreshCw className="w-4 h-4" />}
          onClick={() => activeTab === 'sessions' ? fetchSessions() : getAllReports()}
        >
          {t('dashboardCommon:refresh', 'Refresh')}
        </Button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl p-1 border border-[#003300]/10 inline-flex">
        <button
          onClick={() => setActiveTab('sessions')}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'sessions'
              ? 'bg-primary text-white'
              : 'text-[#003300]/60 hover:text-[#003300]'
          }`}
        >
          Sessions
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'reports'
              ? 'bg-primary text-white'
              : 'text-[#003300]/60 hover:text-[#003300]'
          }`}
        >
          My Reports ({reports.length})
        </button>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="error" icon={<AlertCircle className="w-5 h-5" />}>
          {error}
        </Alert>
      )}

      {/* Filters - Only show on Sessions tab */}
      {activeTab === 'sessions' && (
        <div className="bg-white rounded-xl p-4 border border-[#003300]/10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#003300]/40" />
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
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-[#003300]/20 bg-white text-[#003300] focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              >
                <option value="all">All Status</option>
                <option value="approved">Approved (Ready for Report)</option>
                <option value="completed">Completed</option>
                <option value="no_show">No Show</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Info Alert - Only show on Sessions tab */}
      {activeTab === 'sessions' && (
        <Alert variant="info" icon={<AlertCircle className="w-5 h-5" />}>
          <strong>Important:</strong> Hours are deducted from the student's subscription when you create a report, 
          regardless of attendance status (attended or no-show).
        </Alert>
      )}

      {/* Sessions List (Sessions Tab) */}
      {activeTab === 'sessions' && (
        <>
          {filteredSessions.length === 0 ? (
            <CardComponent>
              <CardBody className="p-12 text-center">
                <FileText className="w-16 h-16 mx-auto text-[#003300]/20 mb-4" />
                <h3 className="text-xl font-semibold text-[#003300] mb-2">
                  No Sessions Found
                </h3>
                <p className="text-[#003300]/60">
                  {searchQuery || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'No sessions available for reporting'}
                </p>
              </CardBody>
            </CardComponent>
          ) : (
            <div className="space-y-4">
              {filteredSessions.map((session) => {
                const user = typeof session.userId === 'object' ? session.userId : null;
                const endTime = formatTime(new Date(
                  new Date(`${session.date.split('T')[0]}T${session.startTime}`).getTime() +
                    session.durationHours * 60 * 60 * 1000
                ));

                const hasReport = session.status === 'completed' || session.status === 'no_show';

                return (
                  <CardComponent key={session._id} hoverable>
                    <CardBody className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-[#003300] text-lg">
                              {user?.name || 'Unknown User'}
                            </h3>
                            {getStatusBadge(session.status)}
                          </div>
                          <p className="text-sm text-[#003300]/60 mb-4">{user?.email}</p>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-xs text-[#003300]/60 mb-1">Date</p>
                              <p className="font-semibold text-[#003300]">
                                {formatDate(session.date)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-[#003300]/60 mb-1">Time</p>
                              <p className="font-semibold text-[#003300]">
                                {session.startTime} - {endTime}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-[#003300]/60 mb-1">Duration</p>
                              <p className="font-semibold text-[#003300]">
                                {session.durationHours} hrs
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-[#003300]/60 mb-1">Status</p>
                              <p className="font-semibold text-[#003300]">{session.status}</p>
                            </div>
                          </div>

                          {session.description && (
                            <div className="bg-[#003300]/5 rounded-lg p-3 mb-4">
                              <p className="text-sm text-[#003300]/80">{session.description}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          {session.status === 'approved' && (
                            <Button
                              variant="primary"
                              size="sm"
                              leftIcon={<Plus className="w-4 h-4" />}
                              onClick={() => handleOpenCreateModal(session)}
                              disabled={isSubmitting}
                            >
                              Create Report
                            </Button>
                          )}
                          {hasReport && (
                            <Button
                              variant="outline"
                              size="sm"
                              leftIcon={<Eye className="w-4 h-4" />}
                              onClick={() => handleViewReport(session._id)}
                            >
                              View Report
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardBody>
                  </CardComponent>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Reports List (My Reports Tab) */}
      {activeTab === 'reports' && (
        <>
          {isLoading ? (
            <LoadingState type="skeleton" text="Loading reports..." />
          ) : reports.length === 0 ? (
            <CardComponent>
              <CardBody className="p-12 text-center">
                <FileText className="w-16 h-16 mx-auto text-[#003300]/20 mb-4" />
                <h3 className="text-xl font-semibold text-[#003300] mb-2">
                  No Reports Found
                </h3>
                <p className="text-[#003300]/60">
                  You haven't created any session reports yet
                </p>
              </CardBody>
            </CardComponent>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => {
                const session = report.sessionRequest;
                const user = session?.userId;
                const endTime = session
                  ? formatTime(new Date(
                      new Date(`${session.date.split('T')[0]}T${session.startTime}`).getTime() +
                        session.durationHours * 60 * 60 * 1000
                    ))
                  : '';

                return (
                  <CardComponent key={report._id} hoverable>
                    <CardBody className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-[#003300] text-lg">
                              {user?.name || 'Unknown User'}
                            </h3>
                            <Badge variant={report.attendance ? 'success' : 'error'}>
                              {report.attendance ? (
                                <>
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Attended
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3 h-3 mr-1" />
                                  No Show
                                </>
                              )}
                            </Badge>
                          </div>
                          {user?.email && (
                            <p className="text-sm text-[#003300]/60 mb-4">{user.email}</p>
                          )}

                          {session && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                              <div>
                                <p className="text-xs text-[#003300]/60 mb-1">Date</p>
                                <p className="font-semibold text-[#003300]">
                                  {formatDate(session.date)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-[#003300]/60 mb-1">Time</p>
                                <p className="font-semibold text-[#003300]">
                                  {session.startTime} - {endTime}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-[#003300]/60 mb-1">Duration</p>
                                <p className="font-semibold text-[#003300]">
                                  {session.durationHours} hrs
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-[#003300]/60 mb-1">Created</p>
                                <p className="font-semibold text-[#003300]">
                                  {formatDate(report.createdAt)}
                                </p>
                              </div>
                            </div>
                          )}

                          {report.notes && (
                            <div className="bg-[#003300]/5 rounded-lg p-3 mb-4">
                              <p className="text-sm text-[#003300]/80 whitespace-pre-wrap line-clamp-2">
                                {report.notes}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Eye className="w-4 h-4" />}
                            onClick={() => {
                              setReportToView(report);
                              setViewReportModalOpen(true);
                            }}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    </CardBody>
                  </CardComponent>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Create Report Modal */}
      {selectedSession && (
        <SessionReportModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedSession(null);
          }}
          onSubmit={handleCreateReport}
          session={selectedSession}
          isSubmitting={isSubmitting}
        />
      )}

      {/* View Report Modal */}
      <Modal
        isOpen={viewReportModalOpen}
        onClose={() => {
          setViewReportModalOpen(false);
          setReportToView(null);
          setSessionWithReport(null);
        }}
        title="Session Report"
      >
        {reportToView && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-[#003300]/60 mb-1">Attendance</p>
                <Badge variant={reportToView.attendance ? 'success' : 'error'}>
                  {reportToView.attendance ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Attended
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3 mr-1" />
                      No Show
                    </>
                  )}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-[#003300]/60 mb-1">Created At</p>
                <p className="font-semibold text-[#003300]">
                  {new Date(reportToView.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-[#003300]/60 mb-1">Notes</p>
              <div className="bg-[#003300]/5 rounded-lg p-3">
                <p className="text-sm text-[#003300]/80 whitespace-pre-wrap">
                  {reportToView.notes}
                </p>
              </div>
            </div>

            {reportToView.pdfUrl && (
              <div>
                <p className="text-sm text-[#003300]/60 mb-2">PDF Report</p>
                <a
                  href={reportToView.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </a>
              </div>
            )}

            {reportToView.createdBy && (
              <div>
                <p className="text-sm text-[#003300]/60 mb-1">Created By</p>
                <p className="font-semibold text-[#003300]">{reportToView.createdBy.name}</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#003300]/10">
              <Button
                variant="outline"
                onClick={() => {
                  setViewReportModalOpen(false);
                  setReportToView(null);
                  setSessionWithReport(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
}
