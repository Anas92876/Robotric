/**
 * UserManagement Page
 *
 * Complete user management interface for reception staff:
 * - View all users in a table
 * - Search and filter by role, name, email
 * - Create new users (students/trainers)
 * - Edit existing users
 * - Disable / enable accounts (blocks sign-in, keeps all history)
 * - Delete accounts that have no history
 * - Pagination
 *
 * REDESIGNED: Matching Teacher/Student dashboard UI/UX style
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Filter, RefreshCw, AlertCircle, Trash2, Users, GraduationCap, Briefcase } from 'lucide-react';
import { useReceptionUsers } from '../../hooks';
import type { User } from '../../hooks/reception/useReceptionUsers';
import { UserTable } from '../../components/reception/UserTable';
import { UserForm } from '../../components/reception/UserForm';
import { LoadingState, Alert, Button, Input, Modal, CardComponent, CardBody, StatsCard, ConfirmDialog } from '../../components/ui';
import { useAuth } from '../../providers/AuthProvider';

const UserManagement: React.FC = () => {
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardReception']);
  const isRTL = i18n.language === 'ar';
  const { user: me } = useAuth();
  const currentUser = me ? { id: me._id || me.id, role: me.role } : null;
  // Admin accounts are only listed to admins (the backend leaves them out for everyone else)
  const isAdminViewer = me?.role === 'admin' || me?.role === 'superadmin';

  // Get users data and CRUD functions from hook
  const {
    users,
    pagination,
    isLoading,
    error,
    filters,
    setFilters,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
  } = useReceptionUsers();

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  // Account being disabled/enabled (confirmation dialog)
  const [statusTarget, setStatusTarget] = useState<User | null>(null);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  // Local filter states
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');

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
  const studentCount = users.filter(u => u.role === 'student').length;
  const trainerCount = users.filter(u => u.role === 'trainer' || u.role === 'teacher').length;
  const otherCount = users.filter(u => !['student', 'trainer', 'teacher'].includes(u.role)).length;

  /**
   * Handle search input change with debouncing
   */
  const handleSearch = () => {
    setFilters({ ...filters, search: searchInput || undefined, page: 1 });
  };

  /**
   * Handle role filter change
   */
  const handleRoleFilterChange = (role: string) => {
    setRoleFilter(role);
    setFilters({ ...filters, role: role || undefined, page: 1 });
  };

  /**
   * Handle status filter change
   */
  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setFilters({ ...filters, status: status || undefined, page: 1 });
  };

  /**
   * Handle create user
   */
  const handleCreate = async (userData: any) => {
    await createUser(userData);
    setIsCreateModalOpen(false);
  };

  /**
   * Handle edit user button click
   */
  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  /**
   * Handle edit user submission
   */
  const handleEdit = async (userData: any) => {
    if (selectedUser) {
      await updateUser(selectedUser._id || selectedUser.id!, userData);
      setIsEditModalOpen(false);
      setSelectedUser(null);
    }
  };

  /**
   * Handle delete user button click
   */
  const handleDeleteClick = (user: User) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  /**
   * Handle delete user confirmation
   */
  const handleDelete = async () => {
    if (selectedUser) {
      try {
        await deleteUser(selectedUser._id || selectedUser.id!);
        setIsDeleteModalOpen(false);
        setSelectedUser(null);
      } catch (error) {
        console.error('Failed to delete user:', error);
      }
    }
  };


  /**
   * Disable or enable an account (after confirmation). Disabling signs the person out at once.
   */
  const handleToggleStatus = async () => {
    if (!statusTarget) return;
    const next = statusTarget.profile?.status === 'inactive' ? 'active' : 'inactive';
    setIsChangingStatus(true);
    try {
      await updateUser(statusTarget._id || statusTarget.id!, { status: next });
      setStatusTarget(null);
    } catch (error) {
      console.error('Failed to change account status:', error);
    } finally {
      setIsChangingStatus(false);
    }
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
            {t('dashboardReception:userManagement.title', 'User Management')}
          </h1>
          <p className={`mt-2 transition-colors duration-300 ${isRTL ? 'text-right' : 'text-left'}`} style={{ color: '#0f1f33' + 'CC' }}>
            {t('dashboardReception:userManagement.subtitle', 'Manage student, trainer, and staff accounts')}
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<Plus className="w-5 h-5" />}
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-primary hover:bg-primary/90"
        >
          Create User
        </Button>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <StatsCard
          label="Total Students"
          value={studentCount}
          icon={<GraduationCap className="w-6 h-6" />}
        />
        <StatsCard
          label="Total Trainers"
          value={trainerCount}
          icon={<Users className="w-6 h-6" />}
        />
        <StatsCard
          label="Staff & Others"
          value={otherCount}
          icon={<Briefcase className="w-6 h-6" />}
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
                placeholder="Search by name or email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-primary/20 rounded-xl text-ink placeholder-ink/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 hover:border-primary/30 shadow-sm"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-48">
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/60 pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                className="w-full pl-12 pr-10 py-3.5 bg-white border border-primary/20 rounded-xl text-ink focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 hover:border-primary/30 appearance-none cursor-pointer shadow-sm"
              >
                <option value="active" className="bg-white">Active Users</option>
                <option value="inactive" className="bg-white">Disabled Users</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-ink/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Role Filter */}
          <div className="w-full md:w-56">
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/60 pointer-events-none" />
              <select
                value={roleFilter}
                onChange={(e) => handleRoleFilterChange(e.target.value)}
                className="w-full pl-12 pr-10 py-3.5 bg-white border border-primary/20 rounded-xl text-ink focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 hover:border-primary/30 appearance-none cursor-pointer shadow-sm"
              >
                <option value="" className="bg-white">All Roles</option>
                <option value="student" className="bg-white">Students</option>
                <option value="trainer" className="bg-white">Trainers</option>
                <option value="teacher" className="bg-white">Teachers</option>
                <option value="reception" className="bg-white">Reception</option>
                <option value="clo" className="bg-white">CLO</option>
                <option value="cto" className="bg-white">CTO</option>
                <option value="engineer" className="bg-white">Programmers</option>
                <option value="client" className="bg-white">Clients</option>
                <option value="social" className="bg-white">Social</option>
                <option value="driver" className="bg-white">Drivers</option>
                <option value="judge" className="bg-white">Judges</option>
                <option value="editor" className="bg-white">Editors</option>
                <option value="organizer" className="bg-white">Organizers</option>
                {isAdminViewer && (
                  <>
                    <option value="admin" className="bg-white">Admins</option>
                    <option value="superadmin" className="bg-white">Super Admins</option>
                  </>
                )}
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
            onClick={fetchUsers}
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
                <p className="font-semibold mb-1">Error Loading Users</p>
                <p className="text-sm opacity-90">{error}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<RefreshCw className="w-4 h-4" />}
                onClick={fetchUsers}
              >
                Retry
              </Button>
            </div>
          </Alert>
        </motion.div>
      )}

      {/* Users Table */}
      <motion.div variants={itemVariants}>
        <CardComponent variant="glass" hover>
          <CardBody className="p-0">
            {isLoading ? (
              <div className="p-8">
                <LoadingState type="skeleton" text="Loading users..." />
              </div>
            ) : (
              <>
                <UserTable
                  users={users}
                  onEdit={handleEditClick}
                  onDelete={handleDeleteClick}
                  onToggleStatus={setStatusTarget}
                  currentUser={currentUser}
                  isLoading={isLoading}
                />

                {/* Pagination */}
                {pagination && pagination.pages > 1 && (
                  <div className={`flex items-center justify-between px-6 py-4 border-t border-white/10 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <p className="text-sm text-white/60">
                      Showing {users.length} of {pagination.total} users
                    </p>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="border-white/10 hover:border-primary/50 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </Button>

                      <span className="text-sm text-white/60 px-4">
                        Page {pagination.page} of {pagination.pages}
                      </span>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.pages}
                        className="border-white/10 hover:border-primary/50 text-white disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Create User Modal */}
      <UserForm
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreate}
        mode="create"
      />

      {/* Edit User Modal */}
      <UserForm
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedUser(null);
        }}
        onSubmit={handleEdit}
        user={selectedUser}
        mode="edit"
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedUser(null);
        }}
        title="Delete User"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <Trash2 className="w-6 h-6 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-white font-medium">Are you sure?</p>
              <p className="text-sm text-white/60">
                This will <strong>permanently delete</strong> the user account for <strong>{selectedUser?.name}</strong>. This action cannot be undone.
              </p>
              <p className="text-sm text-yellow-600 mt-2">
                Accounts with history (enrollments, payments, attendance, sessions…) can't be deleted — use <strong>Disable</strong> instead, which blocks sign-in and keeps the records.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedUser(null);
              }}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Delete User
            </Button>
          </div>
        </div>
      </Modal>

      {/* Disable / Enable Confirmation */}
      <ConfirmDialog
        isOpen={statusTarget !== null}
        onClose={() => setStatusTarget(null)}
        onConfirm={handleToggleStatus}
        isLoading={isChangingStatus}
        variant={statusTarget?.profile?.status === 'inactive' ? 'info' : 'warning'}
        title={statusTarget?.profile?.status === 'inactive' ? 'Enable account' : 'Disable account'}
        description={
          statusTarget?.profile?.status === 'inactive'
            ? `${statusTarget?.name} will be able to sign in again.`
            : `${statusTarget?.name} will be signed out now and can't sign in until the account is enabled again. All their records are kept.`
        }
        confirmText={statusTarget?.profile?.status === 'inactive' ? 'Enable' : 'Disable'}
      />
    </motion.div>
  );
};

export default UserManagement;
