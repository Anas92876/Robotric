/**
 * LeadDetailsModal Component
 *
 * Displays comprehensive lead information in a modal
 */

import React, { useState, useEffect } from 'react';
import { Modal, Button } from '../ui';
import { X, User, Phone, Mail, MapPin, School, Calendar, Users, MessageSquare, Clock, History, Plus } from 'lucide-react';
import type { Lead } from '../../hooks/reception/useReceptionLeads';
import { useContactHistory } from '../../hooks/reception/useContactHistory';
import { ContactHistoryList } from './ContactHistoryList';
import { ContactHistoryModal } from './ContactHistoryModal';

interface LeadDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
}

export const LeadDetailsModal: React.FC<LeadDetailsModalProps> = ({
  isOpen,
  onClose,
  lead
}) => {
  const [isContactHistoryModalOpen, setIsContactHistoryModalOpen] = useState(false);
  const { contactHistory, isLoading, fetchContactHistory, createContactHistory, deleteContactHistory } = useContactHistory();

  // Fetch contact history when modal opens
  useEffect(() => {
    if (isOpen && lead) {
      fetchContactHistory(lead._id);
    }
  }, [isOpen, lead, fetchContactHistory]);

  if (!lead) return null;

  const formatDate = (date?: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (date?: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      interest: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      student: 'bg-green-500/10 text-green-400 border-green-500/20',
      blacklist: 'bg-red-500/10 text-red-400 border-red-500/20'
    };
    return variants[status as keyof typeof variants] || variants.interest;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Lead Details"
      size="xl"
    >
      <div className="space-y-6 max-h-[70vh] overflow-y-auto">
        {/* Header with Status */}
        <div className="flex items-center justify-between pb-4 border-b transition-colors duration-300" style={{ borderColor: '#0f1f33' + '20' }}>
          <div>
            <h2 className="text-2xl font-bold transition-colors duration-300" style={{ color: '#0f1f33' }}>{lead.fullName}</h2>
            {lead.englishName && (
              <p className="mt-1 transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>{lead.englishName}</p>
            )}
          </div>
          <div className={`px-4 py-2 rounded-lg border ${getStatusBadge(lead.status)}`}>
            {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
          </div>
        </div>

        {/* Personal Information */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold transition-colors duration-300 flex items-center gap-2" style={{ color: '#0f1f33' }}>
            <User className="w-5 h-5" style={{ color: '#0f1f33' }} />
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg p-4 transition-colors duration-300" style={{ backgroundColor: '#0f1f33' + '08' }}>
            {lead.firstName && (
              <div>
                <p className="text-sm transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>First Name</p>
                <p className="transition-colors duration-300" style={{ color: '#0f1f33' }}>{lead.firstName}</p>
              </div>
            )}
            {lead.lastName && (
              <div>
                <p className="text-sm transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>Last Name</p>
                <p className="transition-colors duration-300" style={{ color: '#0f1f33' }}>{lead.lastName}</p>
              </div>
            )}
            {lead.gender && (
              <div>
                <p className="text-sm transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>Gender</p>
                <p className="capitalize transition-colors duration-300" style={{ color: '#0f1f33' }}>{lead.gender}</p>
              </div>
            )}
            {lead.dateOfBirth && (
              <div>
                <p className="text-sm transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>Date of Birth</p>
                <p className="transition-colors duration-300" style={{ color: '#0f1f33' }}>{formatDate(lead.dateOfBirth)}</p>
              </div>
            )}
            {lead.age && (
              <div>
                <p className="text-sm transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>Age</p>
                <p className="transition-colors duration-300" style={{ color: '#0f1f33' }}>{lead.age} years</p>
              </div>
            )}
            {lead.residence && (
              <div>
                <p className="text-sm transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>Residence</p>
                <p className="transition-colors duration-300" style={{ color: '#0f1f33' }}>{lead.residence}</p>
              </div>
            )}
            {lead.schoolName && (
              <div>
                <p className="text-sm transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>School</p>
                <p className="transition-colors duration-300" style={{ color: '#0f1f33' }}>{lead.schoolName}</p>
              </div>
            )}
          </div>
        </div>

        {/* Family Information */}
        {(lead.fatherName || lead.motherName) && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold transition-colors duration-300 flex items-center gap-2" style={{ color: '#0f1f33' }}>
              <Users className="w-5 h-5" style={{ color: '#0f1f33' }} />
              Family Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg p-4 transition-colors duration-300" style={{ backgroundColor: '#0f1f33' + '08' }}>
              {lead.fatherName && (
                <div>
                  <p className="text-sm transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>Father's Name</p>
                  <p className="transition-colors duration-300" style={{ color: '#0f1f33' }}>{lead.fatherName}</p>
                </div>
              )}
              {lead.motherName && (
                <div>
                  <p className="text-sm transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>Mother's Name</p>
                  <p className="transition-colors duration-300" style={{ color: '#0f1f33' }}>{lead.motherName}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contact Information */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold transition-colors duration-300 flex items-center gap-2" style={{ color: '#0f1f33' }}>
            <Phone className="w-5 h-5" style={{ color: '#0f1f33' }} />
            Contact Information
          </h3>
          <div className="rounded-lg p-4 space-y-3 transition-colors duration-300" style={{ backgroundColor: '#0f1f33' + '08' }}>
            <div>
              <p className="text-sm transition-colors duration-300 mb-1" style={{ color: '#0f1f33' + 'CC' }}>Primary Mobile</p>
              <p className="transition-colors duration-300" style={{ color: '#0f1f33' }}>{lead.mobileNumber} {lead.mobileNumberLabel && `(${lead.mobileNumberLabel})`}</p>
            </div>
            {lead.additionalNumbers && lead.additionalNumbers.length > 0 && (
              <div>
                <p className="text-sm mb-2 transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>Additional Numbers</p>
                {lead.additionalNumbers.map((num, idx) => (
                  <p key={idx} className="transition-colors duration-300" style={{ color: '#0f1f33' }}>
                    {num.number} {num.label && `(${num.label})`}
                  </p>
                ))}
              </div>
            )}
            {lead.socialMedia && lead.socialMedia.length > 0 && (
              <div>
                <p className="text-sm mb-2 transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>Social Media</p>
                {lead.socialMedia.map((social, idx) => (
                  <p key={idx} className="transition-colors duration-300" style={{ color: '#0f1f33' }}>
                    {social.platform}: {social.handle}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Interest & Referral */}
        {(lead.interestField || lead.referralSource) && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold transition-colors duration-300 flex items-center gap-2" style={{ color: '#0f1f33' }}>
              <MessageSquare className="w-5 h-5" style={{ color: '#0f1f33' }} />
              Interest & Referral
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg p-4 transition-colors duration-300" style={{ backgroundColor: '#0f1f33' + '08' }}>
              {lead.interestField && (
                <div>
                  <p className="text-sm transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>Interest Field</p>
                  <p className="transition-colors duration-300" style={{ color: '#0f1f33' }}>{lead.interestField}</p>
                </div>
              )}
              {lead.referralSource && (
                <div>
                  <p className="text-sm transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>Referral Source</p>
                  <p className="transition-colors duration-300" style={{ color: '#0f1f33' }}>{lead.referralSource}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {lead.notes && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold transition-colors duration-300 flex items-center gap-2" style={{ color: '#0f1f33' }}>
              <MessageSquare className="w-5 h-5" style={{ color: '#0f1f33' }} />
              Notes
            </h3>
            <div className="rounded-lg p-4 transition-colors duration-300" style={{ backgroundColor: '#0f1f33' + '08' }}>
              <p className="whitespace-pre-wrap transition-colors duration-300" style={{ color: '#0f1f33' }}>{lead.notes}</p>
            </div>
          </div>
        )}

        {/* Blacklist Information */}
        {lead.status === 'blacklist' && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-red-400 flex items-center gap-2">
              <X className="w-5 h-5" />
              Blacklist Information
            </h3>
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 space-y-2">
              {lead.isBannedFromPlatform && (
                <div className="flex items-center gap-2 text-red-400">
                  <X className="w-4 h-4" />
                  <span className="font-semibold">Banned from Platform</span>
                </div>
              )}
              {lead.blacklistReason && (
                <div>
                  <p className="text-red-400/60 text-sm">Reason</p>
                  <p className="text-red-400">{lead.blacklistReason}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status History */}
        {lead.statusHistory && lead.statusHistory.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold transition-colors duration-300 flex items-center gap-2" style={{ color: '#0f1f33' }}>
              <History className="w-5 h-5" style={{ color: '#0f1f33' }} />
              Status History
            </h3>
            <div className="rounded-lg p-4 space-y-3 transition-colors duration-300" style={{ backgroundColor: '#0f1f33' + '08' }}>
              {lead.statusHistory.map((history, idx) => (
                <div key={idx} className="border-l-2 pl-4 pb-3 last:pb-0 transition-colors duration-300" style={{ borderColor: '#0f1f33' + '50' }}>
                  <div className="flex items-center gap-2 text-sm transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>
                    <Clock className="w-4 h-4" />
                    {formatDateTime(history.changedAt)}
                  </div>
                  <p className="mt-1 transition-colors duration-300" style={{ color: '#0f1f33' }}>
                    {history.fromStatus ? (
                      <>
                        <span className="capitalize">{history.fromStatus}</span>
                        {' → '}
                        <span className="capitalize">{history.toStatus}</span>
                      </>
                    ) : (
                      <span className="capitalize">Set to {history.toStatus}</span>
                    )}
                  </p>
                  <p className="text-sm mt-1 transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>Reason: {history.reason}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact History */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold transition-colors duration-300 flex items-center gap-2" style={{ color: '#0f1f33' }}>
              <Phone className="w-5 h-5" style={{ color: '#0f1f33' }} />
              Contact History
            </h3>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsContactHistoryModalOpen(true)}
              className="bg-primary hover:bg-primary/90"
            >
              Add Contact
            </Button>
          </div>
          <div className="rounded-lg p-4 transition-colors duration-300" style={{ backgroundColor: '#0f1f33' + '08' }}>
            <ContactHistoryList
              contactHistory={contactHistory}
              onDelete={deleteContactHistory}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Metadata */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold transition-colors duration-300 flex items-center gap-2" style={{ color: '#0f1f33' }}>
            <Calendar className="w-5 h-5" style={{ color: '#0f1f33' }} />
            Record Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg p-4 transition-colors duration-300" style={{ backgroundColor: '#0f1f33' + '08' }}>
            <div>
              <p className="text-sm transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>Created At</p>
              <p className="transition-colors duration-300" style={{ color: '#0f1f33' }}>{formatDateTime(lead.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>Last Updated</p>
              <p className="transition-colors duration-300" style={{ color: '#0f1f33' }}>{formatDateTime(lead.updatedAt)}</p>
            </div>
            {lead.convertedAt && (
              <div>
                <p className="text-sm transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>Converted At</p>
                <p className="transition-colors duration-300" style={{ color: '#0f1f33' }}>{formatDateTime(lead.convertedAt)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contact History Modal */}
      <ContactHistoryModal
        isOpen={isContactHistoryModalOpen}
        onClose={() => setIsContactHistoryModalOpen(false)}
        leadId={lead._id}
        leadName={lead.fullName}
        onSubmit={async (data) => {
          await createContactHistory(lead._id, data);
          setIsContactHistoryModalOpen(false);
        }}
      />
    </Modal>
  );
};
