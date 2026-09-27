/**
 * StatusChangeModal Component
 *
 * Modal for changing lead status with reason tracking
 */

import React, { useState, useEffect } from 'react';
import { Modal, Button, Input } from '../ui';
import type { Lead } from '../../hooks/reception/useReceptionLeads';

interface StatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  preselectedStatus?: string; // Optional preselected status
  onSubmit: (data: {
    newStatus: string;
    reason: string;
    isBannedFromPlatform?: boolean;
  }) => Promise<void>;
}

export const StatusChangeModal: React.FC<StatusChangeModalProps> = ({
  isOpen,
  onClose,
  lead,
  preselectedStatus,
  onSubmit
}) => {
  const [newStatus, setNewStatus] = useState('');
  const [reason, setReason] = useState('');
  const [isBannedFromPlatform, setIsBannedFromPlatform] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setNewStatus(preselectedStatus || '');
      setReason('');
      setIsBannedFromPlatform(false);
      setError('');
    }
  }, [isOpen, preselectedStatus]);

  // Get available status options based on current status
  const getAvailableStatuses = () => {
    if (!lead) return [];
    
    const statuses = [];
    
    if (lead.status === 'interest') {
      statuses.push({ value: 'student', label: 'Student' });
      statuses.push({ value: 'blacklist', label: 'Blacklist' });
    } else if (lead.status === 'student') {
      statuses.push({ value: 'interest', label: 'Interest' });
      statuses.push({ value: 'blacklist', label: 'Blacklist' });
    } else if (lead.status === 'blacklist') {
      statuses.push({ value: 'interest', label: 'Interest' });
      statuses.push({ value: 'student', label: 'Student' });
    }
    
    return statuses;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!newStatus) {
      setError('Please select a new status');
      return;
    }
    if (!reason.trim()) {
      setError('Please provide a reason for the status change');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        newStatus,
        reason: reason.trim(),
        ...(newStatus === 'blacklist' && { isBannedFromPlatform })
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to change status');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!lead) return null;

  const availableStatuses = getAvailableStatuses();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Change Lead Status"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current Status */}
        <div className="bg-zinc-50 p-4 rounded-lg">
          <p className="text-sm text-zinc-600 mb-1">Current Status</p>
          <p className="text-lg font-semibold text-zinc-900 capitalize">
            {lead.status}
          </p>
        </div>

        {/* New Status */}
        {!preselectedStatus && (
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              New Status <span className="text-red-500">*</span>
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-colors"
              required
            >
              <option value="">-- Select New Status --</option>
              {availableStatuses.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Show selected status when preselected */}
        {preselectedStatus && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-600 mb-1">Converting to</p>
            <p className="text-lg font-semibold text-green-900 capitalize">
              {preselectedStatus}
            </p>
          </div>
        )}

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why you are changing the status..."
            rows={4}
            className="w-full px-4 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-colors resize-none"
            required
          />
        </div>

        {/* Ban from Platform Checkbox (only for blacklist) */}
        {newStatus === 'blacklist' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isBannedFromPlatform}
                onChange={(e) => setIsBannedFromPlatform(e.target.checked)}
                className="mt-1 w-4 h-4 text-red-600 border-red-300 rounded focus:ring-red-500"
              />
              <div>
                <span className="text-sm font-medium text-red-900">
                  Ban from using our platform
                </span>
                <p className="text-xs text-red-700 mt-1">
                  Check this if the student should be banned from accessing the platform
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Changing Status...' : 'Change Status'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
