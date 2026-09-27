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
import { Edit2, Trash2, Mail, Calendar, GraduationCap, Users, Shield, Clipboard, Crown, Scale, PenTool, Target } from 'lucide-react';
import { Badge, Button } from '../ui';
import type { User } from '../../hooks/reception/useReceptionUsers';

/**
 * Props for UserTable component
 */
interface UserTableProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  isLoading?: boolean;
}

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
  isLoading = false,
}) => {
  /**
   * Empty state
   */
  if (!isLoading && users.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-16 h-16 text-primary/30 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-[#003300] mb-2">No users found</h3>
        <p className="text-[#003300]/60">
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
            <th className="text-left py-4 px-4 text-sm font-semibold text-[#003300]/70 uppercase tracking-wider">
              Name
            </th>
            <th className="text-left py-4 px-4 text-sm font-semibold text-[#003300]/70 uppercase tracking-wider">
              Email
            </th>
            <th className="text-left py-4 px-4 text-sm font-semibold text-[#003300]/70 uppercase tracking-wider">
              Role
            </th>
            <th className="text-left py-4 px-4 text-sm font-semibold text-[#003300]/70 uppercase tracking-wider">
              Joined
            </th>
            <th className="text-right py-4 px-4 text-sm font-semibold text-[#003300]/70 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>

        {/* Table Body */}
        <tbody className="divide-y divide-primary/5">
          {users.map((user) => (
            <tr
              key={user._id || user.id}
              className="hover:bg-primary/5 transition-colors duration-150"
            >
              {/* Name Column */}
              <td className="py-4 px-4">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-[#004d00] flex items-center justify-center text-[#ffffcc] font-semibold shadow-md">
                    {user.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Name */}
                  <div>
                    <p className="font-medium text-[#003300]">{user.name}</p>
                    {user.profile?.phone && (
                      <p className="text-sm text-[#003300]/50">{user.profile.phone}</p>
                    )}
                  </div>
                </div>
              </td>

              {/* Email Column */}
              <td className="py-4 px-4">
                <div className="flex items-center gap-2 text-[#003300]/70">
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

              {/* Joined Date Column */}
              <td className="py-4 px-4">
                <div className="flex items-center gap-2 text-[#003300]/60 text-sm">
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
                  >
                    Edit
                  </Button>

                  {/* Delete Button */}
                  {/* Note: Admin and CLO users cannot be deleted (backend validation) */}
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Trash2 className="w-4 h-4" />}
                    onClick={() => onDelete(user)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    disabled={user.role === 'admin' || user.role === 'clo'}
                    title={user.role === 'admin' || user.role === 'clo' ? 'Admin and CLO users cannot be deleted' : 'Delete user permanently'}
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
  );
};
