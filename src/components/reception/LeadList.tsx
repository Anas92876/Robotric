/**
 * LeadList Component
 *
 * Displays a table of leads with status badges, contact info, and actions
 */

import React from 'react';
import { Phone, Calendar, Edit2, Trash2, UserPlus, Users, Eye } from 'lucide-react';
import { Badge, Button } from '../ui';
import type { Lead } from '../../hooks/reception/useReceptionLeads';

/**
 * Props for LeadList component
 */
interface LeadListProps {
  leads: Lead[];
  onView: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (id: string) => void;
  onConvert: (lead: Lead) => void;
  onAddContact?: (lead: Lead) => void;
  isLoading?: boolean;
}

/**
 * Get badge variant based on lead status
 */
const getStatusBadgeVariant = (
  status: string
): 'default' | 'success' | 'warning' | 'error' => {
  switch (status) {
    case 'interest':
      return 'warning';
    case 'waiting':
      return 'default';
    case 'student':
      return 'success';
    case 'blacklist':
      return 'error';
    default:
      return 'default';
  }
};

/**
 * Get status label with emoji
 */
const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'interest':
      return '⭐ Interest';
    case 'waiting':
      return '⏳ Waiting';
    case 'student':
      return '✅ Student';
    case 'blacklist':
      return '🚫 Blacklist';
    default:
      return status;
  }
};

/**
 * Format date to readable string
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Format time to readable string (12h with AM/PM)
 */
const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * LeadList Component
 */
export const LeadList: React.FC<LeadListProps> = ({
  leads,
  onView,
  onEdit,
  onDelete,
  onConvert,
  onAddContact,
  isLoading = false
}) => {
  /**
   * Empty state
   */
  if (!isLoading && leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-6">
          <Users className="w-10 h-10 text-primary" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-3">No leads found</h3>
        <p className="text-white/60 text-center max-w-md">
          Try adjusting your filters or create a new lead to get started
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        {/* Table Header */}
        <thead>
          <tr className="border-b border-zinc-200">
            <th className="text-left py-4 px-4 text-sm font-semibold text-zinc-700 uppercase tracking-wider">
              Lead Info
            </th>
            <th className="text-left py-4 px-4 text-sm font-semibold text-zinc-700 uppercase tracking-wider">
              Contact
            </th>
            <th className="text-left py-4 px-4 text-sm font-semibold text-zinc-700 uppercase tracking-wider">
              Interest
            </th>
            <th className="text-left py-4 px-4 text-sm font-semibold text-zinc-700 uppercase tracking-wider">
              Status
            </th>
            <th className="text-left py-4 px-4 text-sm font-semibold text-zinc-700 uppercase tracking-wider">
              Date
            </th>
            <th className="text-center py-4 px-4 text-sm font-semibold text-zinc-700 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>

        {/* Table Body */}
        <tbody className="divide-y divide-zinc-200">
          {leads.map((lead) => (
            <tr
              key={lead._id}
              className="hover:bg-zinc-50 transition-colors duration-150"
            >
              {/* Lead Info Column */}
              <td className="py-4 px-4">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center text-white font-semibold">
                    {lead.fullName.charAt(0).toUpperCase()}
                  </div>

                  {/* Name and Details */}
                  <div>
                    <p className="font-medium text-zinc-900">{lead.fullName}</p>
                    {lead.age && (
                      <p className="text-sm text-zinc-500">Age: {lead.age}</p>
                    )}
                    {lead.schoolName && (
                      <p className="text-xs text-zinc-500">{lead.schoolName}</p>
                    )}
                  </div>
                </div>
              </td>

              {/* Contact Column */}
              <td className="py-4 px-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-zinc-700">
                    <Phone className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm">{lead.mobileNumber}</span>
                  </div>
                </div>
              </td>

              {/* Interest Column */}
              <td className="py-4 px-4">
                <div className="space-y-1">
                  {lead.interestField && (
                    <p className="text-sm font-medium text-zinc-900">
                      {lead.interestField}
                    </p>
                  )}
                  {lead.referralSource && (
                    <p className="text-xs text-zinc-500">
                      Source: {lead.referralSource}
                    </p>
                  )}
                </div>
              </td>

              {/* Status Column */}
              <td className="py-4 px-4">
                <Badge variant={getStatusBadgeVariant(lead.status)}>
                  {getStatusLabel(lead.status)}
                </Badge>
              </td>

              {/* Date Column */}
              <td className="py-4 px-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-zinc-700 text-sm font-medium">
                    <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span>{formatDate(lead.leadDate || lead.createdAt)}</span>
                  </div>
                  {lead.createdAt && (
                    <p className="text-xs text-zinc-400 ps-6">
                      Added {formatTime(lead.createdAt)}
                    </p>
                  )}
                </div>
              </td>

              {/* Actions Column */}
              <td className="py-4 px-4">
                <div className="flex items-center justify-center gap-2">
                  {/* View Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Eye className="w-4 h-4" />}
                    onClick={() => onView(lead)}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    title="View Details"
                  />

                  {/* Add Contact Button */}
                  {onAddContact && (
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Phone className="w-4 h-4" />}
                      onClick={() => onAddContact(lead)}
                      className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                      title="Add Contact History"
                    />
                  )}

                  {/* Convert Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<UserPlus className="w-4 h-4" />}
                    onClick={() => onConvert(lead)}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    title="Change Status"
                  >
                    Convert
                  </Button>

                  {/* Edit Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Edit2 className="w-4 h-4" />}
                    onClick={() => onEdit(lead)}
                    className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50"
                    title="Edit Lead"
                  />

                  {/* Delete Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Trash2 className="w-4 h-4" />}
                    onClick={() => onDelete(lead._id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="Delete Lead"
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
