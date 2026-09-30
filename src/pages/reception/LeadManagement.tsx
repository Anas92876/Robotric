/**
 * LeadManagement Page
 *
 * Complete lead management interface for reception staff:
 * - View all leads in a table
 * - Filter by status, interest, referral source
 * - Create new leads
 * - Edit lead information
 * - Convert leads to students
 * - Add follow-up notes
 * - Pagination and search
 *
 * REDESIGNED: Matching Teacher/Student dashboard UI/UX style
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Plus, Search, RefreshCw, AlertCircle, Filter, UserPlus, Users, ArrowUpDown, Clock } from 'lucide-react';
import { useReceptionLeads } from '../../hooks';
import { api } from '../../lib/api';
import type { Lead } from '../../hooks/reception/useReceptionLeads';
import { LeadList } from '../../components/reception/LeadList';
import { LeadForm } from '../../components/reception/LeadForm';
import { StatusChangeModal } from '../../components/reception/StatusChangeModal';
import { LeadDetailsModal } from '../../components/reception/LeadDetailsModal';
import { ConvertToStudentModal } from '../../components/reception/ConvertToStudentModal';
import { ConvertChoiceModal } from '../../components/reception/ConvertChoiceModal';
import { SetWaitingModal } from '../../components/reception/SetWaitingModal';
import { ContactHistoryModal } from '../../components/reception/ContactHistoryModal';
import { LoadingState, Alert, Button, CardComponent, CardBody, StatsCard } from '../../components/ui';
import { useContactHistory } from '../../hooks/reception/useContactHistory';

const LeadManagement: React.FC = () => {
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardReception']);
  const isRTL = i18n.language === 'ar';

  // Get leads data and functions from hook
  const {
    leads,
    pagination,
    stats,
    isLoading,
    error,
    filters,
    setFilters,
    fetchLeads,
    createLead,
    updateLead,
    deleteLead,
    changeLeadStatus,
    convertToStudent,
    setWaiting
  } = useReceptionLeads();

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusChangeLead, setStatusChangeLead] = useState<Lead | null>(null);
  const [preselectedStatus, setPreselectedStatus] = useState<string | undefined>(undefined);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [detailsLead, setDetailsLead] = useState<Lead | null>(null);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertLead, setConvertLead] = useState<Lead | null>(null);
  const [isConvertChoiceOpen, setIsConvertChoiceOpen] = useState(false);
  const [choiceLead, setChoiceLead] = useState<Lead | null>(null);
  const [isSetWaitingOpen, setIsSetWaitingOpen] = useState(false);
  const [waitingLead, setWaitingLead] = useState<Lead | null>(null);
  const [isContactHistoryModalOpen, setIsContactHistoryModalOpen] = useState(false);
  const [contactHistoryLead, setContactHistoryLead] = useState<Lead | null>(null);

  // Contact history hook
  const { createContactHistory } = useContactHistory();


  // Local filter states
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [interestFilter, setInterestFilter] = useState('');
  const [sortBy, setSortBy] = useState<'leadDate' | 'createdAt' | 'fullName'>('leadDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Fetch interests for filter dropdown via reception endpoint
  const [interests, setInterests] = useState<{ _id: string; name: string }[]>([]);
  useEffect(() => {
    api.get('/reception/interests?status=active')
      .then(res => setInterests(res.data.interests || res.data || []))
      .catch(() => setInterests([]));
  }, []);

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

  /**
   * Handle search
   */
  const handleSearch = () => {
    setFilters({ ...filters, search: searchInput || undefined, page: 1 });
  };

  /**
   * Handle status filter change
   */
  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setFilters({ ...filters, status: status || undefined, page: 1 });
  };

  /**
   * Handle interest filter change
   */
  const handleInterestFilterChange = (interest: string) => {
    setInterestFilter(interest);
    setFilters({ ...filters, interestField: interest || undefined, page: 1 });
  };

  /**
   * Handle sort change
   */
  const handleSortChange = (value: string) => {
    const [field, order] = value.split(':') as ['leadDate' | 'createdAt' | 'fullName', 'asc' | 'desc'];
    setSortBy(field);
    setSortOrder(order);
    setFilters({ ...filters, sortBy: field, sortOrder: order, page: 1 });
  };

  /**
   * Handle create lead
   */
  const handleCreate = async (data: any) => {
    await createLead(data);
    setIsCreateModalOpen(false);
  };

  /**
   * Handle edit lead button click
   */
  const handleEditClick = (lead: Lead) => {
    setSelectedLead(lead);
    setIsEditModalOpen(true);
  };

  /**
   * Handle edit lead
   */
  const handleEdit = async (data: any) => {
    if (selectedLead) {
      await updateLead(selectedLead._id, data);
      setIsEditModalOpen(false);
      setSelectedLead(null);
    }
  };

  /**
   * Handle delete lead
   */
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    await deleteLead(id);
  };

  /**
   * Handle convert button click (opens choice modal)
   */
  const handleConvertClick = (lead: Lead) => {
    setChoiceLead(lead);
    setIsConvertChoiceOpen(true);
  };

  /**
   * Handle student conversion selection
   */
  const handleSelectStudent = () => {
    setIsConvertChoiceOpen(false);
    setConvertLead(choiceLead);
    setIsConvertModalOpen(true);
  };

  /**
   * Handle blacklist conversion selection
   */
  const handleSelectBlacklist = () => {
    setIsConvertChoiceOpen(false);
    setStatusChangeLead(choiceLead);
    setPreselectedStatus('blacklist');
    setIsStatusModalOpen(true);
  };

  /**
   * Handle interest conversion selection
   */
  const handleSelectInterest = () => {
    setIsConvertChoiceOpen(false);
    setStatusChangeLead(choiceLead);
    setPreselectedStatus('interest');
    setIsStatusModalOpen(true);
  };

  /**
   * Handle waiting list selection
   */
  const handleSelectWaiting = () => {
    setIsConvertChoiceOpen(false);
    setWaitingLead(choiceLead);
    setIsSetWaitingOpen(true);
  };

  const handleStatusChangeSubmit = async (data: {
    newStatus: string;
    reason: string;
    isBannedFromPlatform?: boolean;
  }) => {
    if (statusChangeLead) {
      await changeLeadStatus(statusChangeLead._id, data);
      setIsStatusModalOpen(false);
      setStatusChangeLead(null);
    }
  };

  /**
   * Handle convert to student
   */
  const handleConvertToStudent = async (data: { email: string; password: string }) => {
    if (convertLead) {
      await convertToStudent(convertLead._id, data.email, data.password);
      setIsConvertModalOpen(false);
      setConvertLead(null);
    }
  };

  /**
   * Handle view lead details
   */
  const handleView = (lead: Lead) => {
    setDetailsLead(lead);
    setIsDetailsModalOpen(true);
  };

  /**
   * Handle add contact history
   */
  const handleAddContact = (lead: Lead) => {
    setContactHistoryLead(lead);
    setIsContactHistoryModalOpen(true);
  };

  /**
   * Handle page change
   */
  const handlePageChange = (newPage: number) => {
    setFilters({ ...filters, page: newPage });
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
          <h1 className={`text-4xl font-bold inline-block ${isRTL ? 'text-right' : 'text-left'}`} style={{
            color: '#0f1f33',
            backgroundClip: 'text'
          }}>
            {t('dashboardReception:leadManagement.title', 'Lead Management')}
          </h1>
          <p className={`mt-2 transition-colors duration-300 ${isRTL ? 'text-right' : 'text-left'}`} style={{ color: '#0f1f33' + 'CC' }}>
            {t('dashboardReception:leadManagement.subtitle', 'Track and manage interested customers')}
          </p>
        </div>

        {/* Create Lead Button */}
        <Button
          variant="primary"
          leftIcon={<Plus className="w-5 h-5" />}
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-primary hover:bg-primary/90"
        >
          New Lead
        </Button>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatsCard
          label="Total Leads"
          value={stats?.total || 0}
          icon={<Users className="w-5 h-5" />}
        />
        <StatsCard
          label="Interest"
          value={stats?.interest || 0}
          icon={<UserPlus className="w-5 h-5" />}
        />
        <StatsCard
          label="Waiting"
          value={stats?.waiting || 0}
          icon={<Clock className="w-5 h-5" />}
        />
        <StatsCard
          label="Students"
          value={stats?.student || 0}
          icon={<Users className="w-5 h-5" />}
        />
        <StatsCard
          label="Blacklist"
          value={stats?.blacklist || 0}
          icon={<AlertCircle className="w-5 h-5" />}
        />
      </motion.div>

      {/* Filters and Search */}
      <motion.div variants={itemVariants}>
        <div className={`flex flex-col md:flex-row gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
          {/* Search Input */}
          <div className="flex-1">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/60 group-hover:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Search by name or mobile number..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-primary/20 rounded-xl text-ink placeholder-ink/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 hover:border-primary/30 shadow-sm"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-56">
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/60 pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                className="w-full pl-12 pr-10 py-3.5 bg-white border border-primary/20 rounded-xl text-ink focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 hover:border-primary/30 appearance-none cursor-pointer shadow-sm"
              >
                <option value="" className="bg-white">All Status</option>
                <option value="interest" className="bg-white">Interest</option>
                <option value="student" className="bg-white">Student</option>
                <option value="blacklist" className="bg-white">Blacklist</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-ink/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Interest Filter */}
          <div className="w-full md:w-56">
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/60 pointer-events-none" />
              <select
                value={interestFilter}
                onChange={(e) => handleInterestFilterChange(e.target.value)}
                className="w-full pl-12 pr-10 py-3.5 bg-white border border-primary/20 rounded-xl text-ink focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 hover:border-primary/30 appearance-none cursor-pointer shadow-sm"
              >
                <option value="" className="bg-white">All Interests</option>
                {interests.map(interest => (
                  <option key={interest._id} value={interest.name} className="bg-white">
                    {interest.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-ink/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Sort Dropdown */}
          <div className="w-full md:w-56">
            <div className="relative">
              <ArrowUpDown className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/60 pointer-events-none" />
              <select
                value={`${sortBy}:${sortOrder}`}
                onChange={(e) => handleSortChange(e.target.value)}
                className="w-full pl-12 pr-10 py-3.5 bg-white border border-primary/20 rounded-xl text-ink focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 hover:border-primary/30 appearance-none cursor-pointer shadow-sm"
              >
                <option value="leadDate:desc" className="bg-white">Newest First</option>
                <option value="leadDate:asc" className="bg-white">Oldest First</option>
                <option value="createdAt:desc" className="bg-white">Recently Added</option>
                <option value="createdAt:asc" className="bg-white">First Added</option>
                <option value="fullName:asc" className="bg-white">الاسم (أ → ي)</option>
                <option value="fullName:desc" className="bg-white">الاسم (ي → أ)</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-ink/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Search Button */}
          <Button
            variant="primary"
            leftIcon={<Search className="w-4 h-4" />}
            onClick={handleSearch}
            className="bg-primary hover:bg-primary/90 px-6 shadow-sm"
          >
            Search
          </Button>

          {/* Refresh Button */}
          <Button
            variant="ghost"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={fetchLeads}
            className="text-ink/70 hover:text-ink hover:bg-primary/5 px-4"
          >
            <span className="hidden lg:inline">Refresh</span>
          </Button>
        </div>
      </motion.div>

      {/* Error Alert */}
      {error && (
        <motion.div variants={itemVariants}>
          <Alert variant="error">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold mb-1">Error Loading Leads</p>
                <p className="text-sm opacity-90">{error}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<RefreshCw className="w-4 h-4" />}
                onClick={fetchLeads}
              >
                Retry
              </Button>
            </div>
          </Alert>
        </motion.div>
      )}

      {/* Leads Table */}
      <motion.div variants={itemVariants}>
        <CardComponent variant="glass" hover>
          <CardBody className="p-0">
            {isLoading ? (
              <div className="p-8">
                <LoadingState type="skeleton" text="Loading leads..." />
              </div>
            ) : (
              <>
                <LeadList
                  leads={leads}
                  onView={handleView}
                  onEdit={handleEditClick}
                  onDelete={handleDelete}
                  onConvert={handleConvertClick}
                  onAddContact={handleAddContact}
                />

                {/* Pagination */}
                {pagination && pagination.pages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t transition-colors duration-300" style={{ borderColor: '#0f1f33' + '20' }}>
                    <p className="text-sm text-white/60">
                      Showing {leads.length} of {pagination.total} leads
                    </p>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="border-ink/20 hover:border-ink/50 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ color: '#0f1f33' }}
                      >
                        Previous
                      </Button>

                      <span className="text-sm px-4 transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>
                        Page {pagination.page} of {pagination.pages}
                      </span>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.pages}
                        className="border-ink/20 hover:border-ink/50 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ color: '#0f1f33' }}
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

      {/* Create Lead Modal */}
      <LeadForm
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreate}
        mode="create"
      />

      {/* Edit Lead Modal */}
      <LeadForm
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedLead(null);
        }}
        onSubmit={handleEdit}
        initialData={selectedLead}
        mode="edit"
      />



      {/* Status Change Modal */}
      <StatusChangeModal
        isOpen={isStatusModalOpen}
        onClose={() => {
          setIsStatusModalOpen(false);
          setStatusChangeLead(null);
          setPreselectedStatus(undefined);
        }}
        lead={statusChangeLead}
        preselectedStatus={preselectedStatus}
        onSubmit={handleStatusChangeSubmit}
      />

      {/* Lead Details Modal */}
      <LeadDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setDetailsLead(null);
        }}
        lead={detailsLead}
      />

      {/* Convert Choice Modal */}
      <ConvertChoiceModal
        isOpen={isConvertChoiceOpen}
        onClose={() => {
          setIsConvertChoiceOpen(false);
          setChoiceLead(null);
        }}
        lead={choiceLead}
        onSelectStudent={handleSelectStudent}
        onSelectBlacklist={handleSelectBlacklist}
        onSelectInterest={handleSelectInterest}
        onSelectWaiting={handleSelectWaiting}
      />

      {/* Set Waiting Modal */}
      <SetWaitingModal
        isOpen={isSetWaitingOpen}
        onClose={() => {
          setIsSetWaitingOpen(false);
          setWaitingLead(null);
        }}
        lead={waitingLead}
        onSubmit={setWaiting}
      />

      {/* Convert to Student Modal */}
      <ConvertToStudentModal
        isOpen={isConvertModalOpen}
        onClose={() => {
          setIsConvertModalOpen(false);
          setConvertLead(null);
        }}
        lead={convertLead}
        onSubmit={handleConvertToStudent}
      />

      {/* Contact History Modal */}
      {contactHistoryLead && (
        <ContactHistoryModal
          isOpen={isContactHistoryModalOpen}
          onClose={() => {
            setIsContactHistoryModalOpen(false);
            setContactHistoryLead(null);
          }}
          leadId={contactHistoryLead._id}
          leadName={contactHistoryLead.fullName}
          onSubmit={async (data) => {
            await createContactHistory(contactHistoryLead._id, data);
            setIsContactHistoryModalOpen(false);
            setContactHistoryLead(null);
          }}
        />
      )}
    </motion.div>
  );
};

export default LeadManagement;
