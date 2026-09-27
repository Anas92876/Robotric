/**
 * ContactHistoryList Component
 *
 * Displays contact history in a timeline format
 */

import React from 'react';
import { Phone, Mail, Users as UsersIcon, MoreHorizontal, Clock, Calendar, Edit, Trash2, CheckCircle, XCircle, PhoneOff, PhoneMissed, UserCheck } from 'lucide-react';
import type { ContactHistory } from '../../hooks/reception/useContactHistory';
import { LoadingState } from '../ui';

interface ContactHistoryListProps {
  contactHistory: ContactHistory[];
  onEdit?: (history: ContactHistory) => void;
  onDelete?: (id: string) => void;
  isLoading?: boolean;
}

const CONTACT_TYPE_ICONS: Record<string, React.ReactNode> = {
  call: <Phone className="w-4 h-4" />,
  meeting: <UsersIcon className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  other: <MoreHorizontal className="w-4 h-4" />
};

const OUTCOME_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  successful: {
    icon: <CheckCircle className="w-4 h-4" />,
    color: 'text-green-400 bg-green-500/10 border-green-500/20',
    label: 'Successful - Lead Engaged'
  },
  callback_requested: {
    icon: <PhoneMissed className="w-4 h-4" />,
    color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    label: 'Will Call Back'
  },
  no_answer: {
    icon: <PhoneOff className="w-4 h-4" />,
    color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
    label: 'No Answer'
  },
  not_interested: {
    icon: <XCircle className="w-4 h-4" />,
    color: 'text-red-400 bg-red-500/10 border-red-500/20',
    label: 'Not Interested'
  },
  converted: {
    icon: <UserCheck className="w-4 h-4" />,
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    label: 'Converted to Student'
  },
  other: {
    icon: <MoreHorizontal className="w-4 h-4" />,
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    label: 'Other'
  }
};

export const ContactHistoryList: React.FC<ContactHistoryListProps> = ({
  contactHistory,
  onEdit,
  onDelete,
  isLoading
}) => {
  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <LoadingState type="skeleton" text="Loading contact history..." />
      </div>
    );
  }

  if (contactHistory.length === 0) {
    return (
      <div className="text-center py-12">
        <Phone className="w-12 h-12 text-white/20 mx-auto mb-3" />
        <p className="text-white/60">No contact history yet</p>
        <p className="text-sm text-white/40 mt-1">Create your first contact record to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {contactHistory.map((history, index) => {
        const outcomeConfig = OUTCOME_CONFIG[history.outcome] || OUTCOME_CONFIG.other;
        const contactIcon = CONTACT_TYPE_ICONS[history.contactType] || CONTACT_TYPE_ICONS.other;

        return (
          <div
            key={history._id}
            className="relative pl-8 pb-8 last:pb-0"
          >
            {/* Timeline Line */}
            {index !== contactHistory.length - 1 && (
              <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-white/10" />
            )}

            {/* Timeline Dot */}
            <div className={`absolute left-0 top-0 w-8 h-8 rounded-full border-2 flex items-center justify-center ${outcomeConfig.color}`}>
              {contactIcon}
            </div>

            {/* Content Card */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-white capitalize">
                      {history.contactType}
                    </h4>
                    <span className={`px-2 py-0.5 rounded-full text-xs border flex items-center gap-1 ${outcomeConfig.color}`}>
                      {outcomeConfig.icon}
                      {outcomeConfig.label}
                    </span>
                  </div>
                  <p className="text-sm text-white/80">{history.callReason}</p>
                </div>

                {/* Actions */}
                {(onEdit || onDelete) && (
                  <div className="flex items-center gap-1">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(history)}
                        className="p-2 text-white/60 hover:text-cyan-400 hover:bg-white/5 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this contact history? This will also delete the associated calendar event.')) {
                            onDelete(history._id);
                          }
                        }}
                        className="p-2 text-white/60 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="space-y-2">
                {/* Date & Time */}
                <div className="flex items-center gap-4 text-sm text-white/60">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDateTime(history.contactDate)}
                  </div>
                  {history.duration && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {history.duration} min
                    </div>
                  )}
                </div>

                {/* Notes */}
                {history.notes && (
                  <div className="mt-2 p-3 bg-white/5 rounded-lg">
                    <p className="text-sm text-white/70 whitespace-pre-wrap">{history.notes}</p>
                  </div>
                )}

                {/* Next Follow-up */}
                {history.nextFollowUpDate && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-cyan-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Next follow-up: {formatDate(history.nextFollowUpDate)}</span>
                  </div>
                )}

                {/* Created By */}
                <div className="text-xs text-white/40 mt-2">
                  Created by {history.createdBy.name} on {formatDate(history.createdAt)}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
