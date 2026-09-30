/**
 * ContactManagement Page
 *
 * View and manage contact form submissions from the public website:
 * - View all contacts in a table
 * - Filter by status
 * - Search by name, phone, or subject
 * - Update contact status
 * - Delete contacts
 * - View contact details
 *
 * REDESIGNED: Matching other reception pages UI/UX style
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Search,
  RefreshCw,
  AlertCircle,
  Filter,
  Mail,
  Eye,
  Trash2,
  CheckCircle,
  Archive,
  MessageSquare,
  Phone,
  User,
  Calendar,
  FileText,
  MapPin,
  Briefcase,
  GraduationCap,
  Users
} from 'lucide-react';
import {
  getAllContacts,
  updateContact,
  deleteContact,
  getContactById,
  type Contact,
  type ContactFilters
} from '../../services/contact.service';
import {
  LoadingState,
  Alert,
  Button,
  Input,
  Modal,
  CardComponent,
  CardBody,
  StatsCard,
  Badge
} from '../../components/ui';
import { useToast } from '../../components/ui';

const ContactManagement: React.FC = () => {
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardReception']);
  const isRTL = i18n.language === 'ar';
  const toast = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    read: 0,
    replied: 0,
    archived: 0
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 1,
    limit: 20
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ContactFilters>({
    page: 1,
    limit: 20
  });

  // Modal states
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);

  // Local filter states
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

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
   * Fetch contacts
   */
  const fetchContacts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await getAllContacts(filters);
      setContacts(response.data);
      setPagination(response.pagination);
      setStats(response.stats);
    } catch (err: any) {
      console.error('Error fetching contacts:', err);
      setError(err.response?.data?.message || 'Failed to fetch contacts');
      toast.error('Error', err.response?.data?.message || 'Failed to fetch contacts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [filters]);

  /**
   * Handle search
   */
  const handleSearch = () => {
    setFilters({
      ...filters,
      page: 1,
      search: searchInput.trim() || undefined
    });
  };

  /**
   * Handle status filter change
   */
  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setFilters({
      ...filters,
      page: 1,
      status: status || undefined
    });
  };

  /**
   * Handle refresh
   */
  const handleRefresh = () => {
    setSearchInput('');
    setStatusFilter('');
    setFilters({ page: 1, limit: 20 });
  };

  /**
   * Handle view contact details
   */
  const handleView = async (contact: Contact) => {
    try {
      const fullContact = await getContactById(contact._id);
      setSelectedContact(fullContact);
      setIsDetailsModalOpen(true);
      
      // Mark as read if it's new
      if (fullContact.status === 'new') {
        await updateContact(fullContact._id, { status: 'read' });
        fetchContacts();
      }
    } catch (err: any) {
      toast.error('Error', err.response?.data?.message || 'Failed to fetch contact details');
    }
  };

  /**
   * Handle status update
   */
  const handleStatusUpdate = async (contactId: string, newStatus: 'new' | 'read' | 'replied' | 'archived') => {
    try {
      await updateContact(contactId, { status: newStatus });
      toast.success('Success', 'Contact status updated successfully');
      fetchContacts();
      if (selectedContact?._id === contactId) {
        setSelectedContact({ ...selectedContact, status: newStatus });
      }
    } catch (err: any) {
      toast.error('Error', err.response?.data?.message || 'Failed to update contact status');
    }
  };

  /**
   * Handle delete
   */
  const handleDelete = async () => {
    if (!contactToDelete) return;

    try {
      await deleteContact(contactToDelete._id);
      toast.success('Success', 'Contact deleted successfully');
      setIsDeleteModalOpen(false);
      setContactToDelete(null);
      fetchContacts();
    } catch (err: any) {
      toast.error('Error', err.response?.data?.message || 'Failed to delete contact');
    }
  };

  /**
   * Handle page change
   */
  const handlePageChange = (newPage: number) => {
    setFilters({ ...filters, page: newPage });
  };

  /**
   * Get status badge color
   */
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge variant="primary">New</Badge>;
      case 'read':
        return <Badge variant="secondary">Read</Badge>;
      case 'replied':
        return <Badge variant="success">Replied</Badge>;
      case 'archived':
        return <Badge variant="warning">Archived</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
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
            color: '#0f1f33',
            backgroundClip: 'text'
          }}>
            {t('dashboardReception:contactManagement.title', 'Contact Submissions')}
          </h1>
          <p className={`mt-2 transition-colors duration-300 ${isRTL ? 'text-right' : 'text-left'}`} style={{ color: '#0f1f33' + 'CC' }}>
            {t('dashboardReception:contactManagement.subtitle', 'Manage contact form submissions from the website')}
          </p>
        </div>

        <Button
          variant="secondary"
          leftIcon={<RefreshCw className="w-5 h-5" />}
          onClick={handleRefresh}
        >
          Refresh
        </Button>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatsCard
          label="Total"
          value={stats.total}
          icon={<Mail className="w-5 h-5" />}
        />
        <StatsCard
          label="New"
          value={stats.new}
          icon={<AlertCircle className="w-5 h-5" />}
        />
        <StatsCard
          label="Read"
          value={stats.read}
          icon={<Eye className="w-5 h-5" />}
        />
        <StatsCard
          label="Replied"
          value={stats.replied}
          icon={<CheckCircle className="w-5 h-5" />}
        />
        <StatsCard
          label="Archived"
          value={stats.archived}
          icon={<Archive className="w-5 h-5" />}
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
                placeholder="Search by name, phone, or subject..."
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
                <option value="new" className="bg-white">New</option>
                <option value="read" className="bg-white">Read</option>
                <option value="replied" className="bg-white">Replied</option>
                <option value="archived" className="bg-white">Archived</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-ink/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Error Alert */}
      {error && (
        <motion.div variants={itemVariants}>
          <Alert variant="error" message={error} onClose={() => setError(null)} />
        </motion.div>
      )}

      {/* Contacts Table */}
      <motion.div variants={itemVariants}>
        <CardComponent>
          <CardBody>
            {isLoading ? (
              <LoadingState message="Loading contacts..." />
            ) : contacts.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="w-16 h-16 text-primary/30 mx-auto mb-4" />
                <p className="text-lg transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>No contacts found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-primary/20">
                      <th className="text-left py-4 px-4 text-sm font-bold text-ink">Name</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-ink">Phone</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-ink">Subject</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-ink">Status</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-ink">Date</th>
                      <th className="text-right py-4 px-4 text-sm font-bold text-ink">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map((contact) => (
                      <tr key={contact._id} className="border-b border-primary/10 hover:bg-primary/5 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="w-5 h-5 text-primary" />
                            </div>
                            <span className="font-medium text-ink">{contact.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2 text-ink">
                            <Phone className="w-4 h-4 text-primary/60" />
                            {contact.phone}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-ink">{contact.subject}</span>
                        </td>
                        <td className="py-4 px-4">
                          {getStatusBadge(contact.status)}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2 text-sm text-ink/70">
                            <Calendar className="w-4 h-4 text-primary/60" />
                            {new Date(contact.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={<Eye className="w-4 h-4" />}
                              onClick={() => handleView(contact)}
                            >
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={<Trash2 className="w-4 h-4" />}
                              onClick={() => {
                                setContactToDelete(contact);
                                setIsDeleteModalOpen(true);
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </CardComponent>
      </motion.div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <motion.div variants={itemVariants} className="flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            Previous
          </Button>
          <span className="transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>
            Page {pagination.page} of {pagination.pages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.pages}
          >
            Next
          </Button>
        </motion.div>
      )}

      {/* Contact Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedContact(null);
        }}
        title="Contact Details"
        size="lg"
      >
        {selectedContact && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-bold text-ink/70 mb-1 block">Name</label>
                <div className="flex items-center gap-2 text-ink">
                  <User className="w-4 h-4 text-primary/60" />
                  {selectedContact.name}
                </div>
              </div>
              <div>
                <label className="text-sm font-bold text-ink/70 mb-1 block">Phone</label>
                <div className="flex items-center gap-2 text-ink">
                  <Phone className="w-4 h-4 text-primary/60" />
                  {selectedContact.phone}
                </div>
              </div>
              {selectedContact.email && (
                <div>
                  <label className="text-sm font-bold text-ink/70 mb-1 block">Email</label>
                  <div className="flex items-center gap-2 text-ink">
                    <Mail className="w-4 h-4 text-primary/60" />
                    {selectedContact.email}
                  </div>
                </div>
              )}
              {selectedContact.location && (
                <div>
                  <label className="text-sm font-bold text-ink/70 mb-1 block">Location</label>
                  <div className="flex items-center gap-2 text-ink">
                    <MapPin className="w-4 h-4 text-primary/60" />
                    {selectedContact.location}
                  </div>
                </div>
              )}
              {selectedContact.who && (
                <div>
                  <label className="text-sm font-bold text-ink/70 mb-1 block">Type</label>
                  <div className="flex items-center gap-2 text-ink">
                    {selectedContact.who === 'student' && <GraduationCap className="w-4 h-4 text-primary/60" />}
                    {selectedContact.who === 'parent' && <Users className="w-4 h-4 text-primary/60" />}
                    {selectedContact.who === 'business-owner' && <Briefcase className="w-4 h-4 text-primary/60" />}
                    {selectedContact.who === 'other' && <User className="w-4 h-4 text-primary/60" />}
                    <span className="capitalize">
                      {selectedContact.who === 'business-owner' ? 'Business Owner' : selectedContact.who}
                      {selectedContact.who === 'other' && selectedContact.otherType && ` - ${selectedContact.otherType}`}
                    </span>
                  </div>
                </div>
              )}
              <div>
                <label className="text-sm font-bold text-ink/70 mb-1 block">Subject</label>
                <div className="flex items-center gap-2 text-ink">
                  <FileText className="w-4 h-4 text-primary/60" />
                  {selectedContact.subject}
                </div>
              </div>
              <div>
                <label className="text-sm font-bold text-ink/70 mb-1 block">Status</label>
                {getStatusBadge(selectedContact.status)}
              </div>
              <div>
                <label className="text-sm font-bold text-ink/70 mb-1 block">Submitted</label>
                <div className="flex items-center gap-2 text-sm text-ink">
                  <Calendar className="w-4 h-4 text-primary/60" />
                  {new Date(selectedContact.createdAt).toLocaleString()}
                </div>
              </div>
            </div>

            {selectedContact.message && (
              <div>
                <label className="text-sm font-bold text-ink/70 mb-2 block">Message</label>
                <div className="p-4 bg-surface rounded-xl border border-primary/20 text-ink">
                  {selectedContact.message}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-4 border-t border-primary/20">
              <span className="text-sm font-bold text-ink/70">Update Status:</span>
              <Button
                variant={selectedContact.status === 'read' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => handleStatusUpdate(selectedContact._id, 'read')}
              >
                Read
              </Button>
              <Button
                variant={selectedContact.status === 'replied' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => handleStatusUpdate(selectedContact._id, 'replied')}
              >
                Replied
              </Button>
              <Button
                variant={selectedContact.status === 'archived' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => handleStatusUpdate(selectedContact._id, 'archived')}
              >
                Archive
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setContactToDelete(null);
        }}
        title="Delete Contact"
      >
        <div className="space-y-4">
          <p className="text-ink">
            Are you sure you want to delete this contact submission? This action cannot be undone.
          </p>
          {contactToDelete && (
            <div className="p-4 bg-surface rounded-xl border border-primary/20">
              <p className="font-bold text-ink">{contactToDelete.name}</p>
              <p className="text-sm text-ink/70">{contactToDelete.phone}</p>
            </div>
          )}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setContactToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};

export default ContactManagement;
