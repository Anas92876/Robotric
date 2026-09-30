/**
 * UserTable Component
 *
 * Displays a table of users with:
 * - User information (name, email, role)
 * - Status badges
 * - Action buttons (edit, delete)
 * - Role-based styling
 *
 * UPDATED: Professional icons and light mode styling
 */

import React from 'react';
import { Edit2, Trash2, Mail, Calendar, GraduationCap, Users, Shield, Clipboard, Crown, Scale, PenTool, Target, Ban, CheckCircle2 } from 'lucide-react';
import { Badge, Button } from '../ui';
import type { User } from '../../hooks/reception/useReceptionUsers';

/**
 * Props for UserTable component
 */
interface UserTableProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  /** Disable an active account or enable a disabled one. */
  onToggleStatus: (user: User) => void;
  /** Who is signed in — the buttons follow the backend's rules for this person. */
  currentUser: { id: string; role: string } | null;
  isLoading?: boolean;
}

const PRIVILEGED = ['admin', 'superadmin', 'clo', 'cto'];
const isAdminRole = (role?: string) => role === 'admin' || role === 'superadmin';

/** Mirrors the backend: only admins touch privileged accounts, nobody disables or deletes themselves,
 *  and only a superadmin deletes an admin. */
const permissionsFor = (user: User, me: { id: string; role: string } | null) => {
  const isSelf = !!me && (user._id === me.id || user.id === me.id);
  const canManage = !PRIVILEGED.includes(user.role) || isAdminRole(me?.role);
  return {
    canEdit: canManage,
    canToggle: canManage && !isSelf,
    canDelete: canManage && !isSelf && (!isAdminRole(user.role) || me?.role === 'superadmin'),
    isSelf,
  };
};

const isDisabled = (user: User) => user.profile?.status === 'inactive';

/**
 * Get badge variant based on user role
 */
const getRoleBadgeVariant = (role: string): 'default' | 'success' | 'warning' | 'error' => {
  switch (role) {
    case 'student':
      return 'default';
    case 'trainer':
    case 'teacher':
      return 'success';
    case 'reception':
      return 'warning';
    case 'admin':
    case 'superadmin':
      return 'error';
    default:
      return 'default';
  }
};

/**
 * Get role icon - Professional Lucide icons
 */
const getRoleIcon = (role: string) => {
  const iconClass = "w-4 h-4";

  switch (role) {
    case 'student':
      return <GraduationCap className={iconClass} />;
    case 'trainer':
    case 'teacher':
      return <Users className={iconClass} />;
    case 'reception':
      return <Clipboard className={iconClass} />;
    case 'admin':
      return <Shield className={iconClass} />;
    case 'superadmin':
      return <Crown className={iconClass} />;
    case 'judge':
      return <Scale className={iconClass} />;
    case 'editor':
      return <PenTool className={iconClass} />;
    case 'organizer':
      return <Target className={iconClass} />;
    default:
      return <Users className={iconClass} />;
  }
};

/**
 * Get role display name
 */
const getRoleDisplayName = (role: string): string => {
  const roleMap: Record<string, string> = {
    student: 'Student',
    trainer: 'Trainer',
    teacher: 'Teacher',
    reception: 'Reception',
    admin: 'Admin',
    superadmin: 'Super Admin',
    clo: 'CLO',
    cto: 'CTO',
    engineer: 'Programmer',
    client: 'Client',
    social: 'Social',
    driver: 'Driver',
    judge: 'Judge',
    editor: 'Editor',
    organizer: 'Organizer',
  };
  return roleMap[role] || role;
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

/**
 * UserTable Component
 */
export const UserTable: React.FC<UserTableProps> = ({
  users,
  onEdit,
  onDelete,
  onToggleStatus,
  currentUser,
  isLoading = false,
}) => {
  /**
   * Empty state
   */
  if (!isLoading && users.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-16 h-16 text-primary/30 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-ink mb-2">No users found</h3>
        <p className="text-ink/60">
          Try adjusting your filters or create a new user
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        {/* Table Header */}
        <thead>
          <tr className="border-b border-primary/10 bg-[#f9fafb]">
            <th className="text-left py-4 px-4 text-sm font-semibold text-ink/70 uppercase tracking-wider">
              Name
            </th>
            <th className="text-left py-4 px-4 text-sm font-semibold text-ink/70 uppercase tracking-wider">
              Email
            </th>
            <th className="text-left py-4 px-4 text-sm font-semibold text-ink/70 uppercase tracking-wider">
              Role
            </th>
            <th className="text-left py-4 px-4 text-sm font-semibold text-ink/70 uppercase tracking-wider">
              Status
            </th>
            <th className="text-left py-4 px-4 text-sm font-semibold text-ink/70 uppercase tracking-wider">
              Joined
            </th>
            <th className="text-right py-4 px-4 text-sm font-semibold text-ink/70 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>

        {/* Table Body */}
        <tbody className="divide-y divide-primary/5">
          {users.map((user) => {
            const can = permissionsFor(user, currentUser);
            const disabled = isDisabled(user);
            return (
            <tr
              key={user._id || user.id}
              className="hover:bg-primary/5 transition-colors duration-150"
            >
              {/* Name Column */}
              <td className="py-4 px-4">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-frost font-semibold shadow-md">
                    {user.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Name */}
                  <div>
                    <p className="font-medium text-ink">{user.name}</p>
                    {user.profile?.phone && (
                      <p className="text-sm text-ink/50">{user.profile.phone}</p>
                    )}
                  </div>
                </div>
              </td>

              {/* Email Column */}
              <td className="py-4 px-4">
                <div className="flex items-center gap-2 text-ink/70">
                  <Mail className="w-4 h-4 text-primary/50" />
                  <span className="text-sm">{user.email}</span>
                </div>
              </td>

              {/* Role Column */}
              <td className="py-4 px-4">
                <Badge variant={getRoleBadgeVariant(user.role)} className="flex items-center gap-1.5 w-fit">
                  {getRoleIcon(user.role)}
                  <span>{getRoleDisplayName(user.role)}</span>
                </Badge>
              </td>

              {/* Status Column */}
              <td className="py-4 px-4">
                <Badge variant={disabled ? 'error' : 'success'} className="w-fit">
                  {disabled ? 'Disabled' : 'Active'}
                </Badge>
              </td>

              {/* Joined Date Column */}
              <td className="py-4 px-4">
                <div className="flex items-center gap-2 text-ink/60 text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(user.createdAt)}</span>
                </div>
              </td>

              {/* Actions Column */}
              <td className="py-4 px-4">
                <div className="flex items-center justify-end gap-2">
                  {/* Edit Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Edit2 className="w-4 h-4" />}
                    onClick={() => onEdit(user)}
                    className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50"
                    disabled={!can.canEdit}
                    title={can.canEdit ? 'Edit user' : 'Only an admin can manage admin, CLO and CTO accounts'}
                  >
                    Edit
                  </Button>

                  {/* Disable / Enable: blocks sign-in but keeps all history */}
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={disabled ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                    onClick={() => onToggleStatus(user)}
                    className={disabled ? 'text-green-700 hover:text-green-800 hover:bg-green-50' : 'text-amber-700 hover:text-amber-800 hover:bg-amber-50'}
                    disabled={!can.canToggle}
                    title={can.isSelf ? 'You cannot disable your own account' : disabled ? 'Allow this person to sign in again' : 'Block sign-in, keep all history'}
                  >
                    {disabled ? 'Enable' : 'Disable'}
                  </Button>

                  {/* Delete Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Trash2 className="w-4 h-4" />}
                    onClick={() => onDelete(user)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    disabled={!can.canDelete}
                    title={
                      can.isSelf ? 'You cannot delete your own account'
                        : !can.canDelete && isAdminRole(user.role) ? 'Only a superadmin can delete admin accounts'
                        : !can.canDelete ? 'Only an admin can manage admin, CLO and CTO accounts'
                        : 'Delete permanently (accounts with history can only be disabled)'
                    }
                  >
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
