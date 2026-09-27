/**
 * ConvertChoiceModal Component
 *
 * Modal for choosing conversion type (Student, Interest, or Blacklist)
 */

import React from 'react';
import { Modal, Button } from '../ui';
import { UserPlus, X, Star, Clock } from 'lucide-react';
import type { Lead } from '../../hooks/reception/useReceptionLeads';

interface ConvertChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSelectStudent: () => void;
  onSelectBlacklist: () => void;
  onSelectInterest: () => void;
  onSelectWaiting: () => void;
}

export const ConvertChoiceModal: React.FC<ConvertChoiceModalProps> = ({
  isOpen,
  onClose,
  lead,
  onSelectStudent,
  onSelectBlacklist,
  onSelectInterest,
  onSelectWaiting
}) => {
  if (!lead) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Convert Lead"
      size="sm"
    >
      <div className="space-y-6">
        {/* Lead Info */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold text-lg">
              {lead.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-white">{lead.fullName}</p>
              {lead.englishName && (
                <p className="text-sm text-white/60">{lead.englishName}</p>
              )}
              <p className="text-sm text-white/60">
                Current Status: <span className="capitalize">{lead.status}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Instruction */}
        <p className="text-white/80 text-center">
          Choose how you want to convert this lead:
        </p>

        {/* Conversion Options */}
        <div className="space-y-3">
          {/* Set as Waiting - only for interest leads */}
          {lead.status === 'interest' && (
            <button
              onClick={onSelectWaiting}
              className="w-full p-4 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 rounded-lg hover:border-amber-500/40 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/30 transition-colors">
                  <Clock className="w-6 h-6 text-amber-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-white">Set as Waiting</p>
                  <p className="text-sm text-white/60">Create account, record course interest & deposit</p>
                </div>
              </div>
            </button>
          )}

          {/* Convert to Student - Only show if lead is NOT already a student */}
          {lead.status !== 'student' && (
            <button
              onClick={onSelectStudent}
              className="w-full p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg hover:border-green-500/40 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
                  <UserPlus className="w-6 h-6 text-green-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-white">Convert to Student</p>
                  <p className="text-sm text-white/60">Create a student account with email and password</p>
                </div>
              </div>
            </button>
          )}

          {/* Convert to Interest - Only show for blacklist status */}
          {lead.status === 'blacklist' && (
            <button
              onClick={onSelectInterest}
              className="w-full p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-lg hover:border-blue-500/40 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                  <Star className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-white">Convert to Interest</p>
                  <p className="text-sm text-white/60">Mark as interested lead</p>
                </div>
              </div>
            </button>
          )}

          {/* Convert to Blacklist - Only show if lead is NOT already blacklisted */}
          {lead.status !== 'blacklist' && (
            <button
              onClick={onSelectBlacklist}
              className="w-full p-4 bg-gradient-to-r from-red-500/10 to-rose-500/10 border border-red-500/20 rounded-lg hover:border-red-500/40 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center group-hover:bg-red-500/30 transition-colors">
                  <X className="w-6 h-6 text-red-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-white">Convert to Blacklist</p>
                  <p className="text-sm text-white/60">Mark as blacklisted with reason</p>
                </div>
              </div>
            </button>
          )}
        </div>

        {/* Cancel Button */}
        <div className="flex justify-end pt-4 border-t border-white/10">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-[#003300]/60 hover:text-[#003300] hover:bg-[#003300]/10"
          >
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};
