/**
 * ContactHistoryModal Component
 *
 * Modal for creating and editing contact history entries
 * Automatically creates calendar events for each contact
 */

import React, { useState, useEffect } from 'react';
import { Modal, Button, Input } from '../ui';
import type { ContactHistory, CreateContactHistoryRequest } from '../../hooks/reception/useContactHistory';

interface ContactHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
  contactHistory?: ContactHistory | null;
  onSubmit: (data: CreateContactHistoryRequest) => Promise<void>;
}

const CONTACT_TYPES = [
  { value: 'call', label: 'Call' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'email', label: 'Email' },
  { value: 'other', label: 'Other' }
];

const OUTCOMES = [
  { value: 'successful', label: 'Successful - Lead Engaged', color: 'green' },
  { value: 'callback_requested', label: 'Will Call Back', color: 'yellow' },
  { value: 'no_answer', label: 'No Answer', color: 'gray' },
  { value: 'not_interested', label: 'Not Interested', color: 'red' },
  { value: 'converted', label: 'Converted to Student', color: 'blue' },
  { value: 'other', label: 'Other', color: 'purple' }
];

export const ContactHistoryModal: React.FC<ContactHistoryModalProps> = ({
  isOpen,
  onClose,
  leadId,
  leadName,
  contactHistory,
  onSubmit
}) => {
  const [contactType, setContactType] = useState<string>('call');
  const [callReason, setCallReason] = useState('');
  const [outcome, setOutcome] = useState<string>('successful');
  const [notes, setNotes] = useState('');
  const [contactDate, setContactDate] = useState('');
  const [duration, setDuration] = useState('30');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Initialize form
  useEffect(() => {
    if (isOpen) {
      if (contactHistory) {
        // Edit mode
        setContactType(contactHistory.contactType);
        setCallReason(contactHistory.callReason);
        setOutcome(contactHistory.outcome);
        setNotes(contactHistory.notes || '');
        setContactDate(formatDateTimeForInput(new Date(contactHistory.contactDate)));
        setDuration(contactHistory.duration?.toString() || '30');
        setNextFollowUpDate(contactHistory.nextFollowUpDate ? formatDateTimeForInput(new Date(contactHistory.nextFollowUpDate)) : '');
      } else {
        // Create mode - set defaults
        setContactType('call');
        setCallReason('');
        setOutcome('successful');
        setNotes('');
        setDuration('30');
        setNextFollowUpDate('');
        
        // Set current date/time as default
        const now = new Date();
        setContactDate(formatDateTimeForInput(now));
      }
      setError('');
    }
  }, [isOpen, contactHistory]);

  const formatDateTimeForInput = (date: Date) => {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!callReason.trim()) {
      setError('Call reason is required');
      return;
    }

    if (!contactDate) {
      setError('Contact date is required');
      return;
    }

    try {
      setIsSubmitting(true);

      const data: CreateContactHistoryRequest = {
        contactType: contactType as any,
        callReason: callReason.trim(),
        outcome: outcome as any,
        notes: notes.trim() || undefined,
        contactDate,
        duration: parseInt(duration) || 30,
        nextFollowUpDate: nextFollowUpDate || undefined
      };

      await onSubmit(data);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save contact history');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={contactHistory ? 'Edit Contact History' : 'New Contact History'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Info Alert */}
        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3">
          <p className="text-sm text-cyan-400">
            📅 A calendar event will be automatically created for this contact with {leadName}
          </p>
        </div>

        {/* Contact Type */}
        <div>
          <label className="block text-sm font-medium mb-1 transition-colors duration-300" style={{ color: '#003300' }}>
            Contact Type <span className="text-red-500">*</span>
          </label>
          <select
            value={contactType}
            onChange={(e) => setContactType(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border bg-white focus:outline-none focus:ring-2 transition-colors"
            style={{ borderColor: '#003300' + '30', color: '#003300' }}
            required
          >
            {CONTACT_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Call Reason */}
        <div>
          <label className="block text-sm font-medium mb-1 transition-colors duration-300" style={{ color: '#003300' }}>
            Call Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            value={callReason}
            onChange={(e) => setCallReason(e.target.value)}
            placeholder="e.g., Follow-up on robotics course interest"
            rows={2}
            className="w-full px-4 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-colors resize-none"
            required
          />
        </div>

        {/* Outcome */}
        <div>
          <label className="block text-sm font-medium mb-1 transition-colors duration-300" style={{ color: '#003300' }}>
            Outcome <span className="text-red-500">*</span>
          </label>
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border bg-white focus:outline-none focus:ring-2 transition-colors"
            style={{ borderColor: '#003300' + '30', color: '#003300' }}
            required
          >
            {OUTCOMES.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="text-xs mt-1 transition-colors duration-300" style={{ color: '#003300' + 'CC' }}>
            Event color will be {OUTCOMES.find(o => o.value === outcome)?.color}
          </p>
        </div>

        {/* Contact Date & Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 transition-colors duration-300" style={{ color: '#003300' }}>
              Contact Date & Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={contactDate}
              onChange={(e) => setContactDate(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border bg-white focus:outline-none focus:ring-2 transition-colors"
            style={{ borderColor: '#003300' + '30', color: '#003300' }}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 transition-colors duration-300" style={{ color: '#003300' }}>
              Duration (minutes)
            </label>
            <Input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              min="1"
              placeholder="30"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium mb-1 transition-colors duration-300" style={{ color: '#003300' }}>
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional details about the contact..."
            rows={3}
            className="w-full px-4 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-colors resize-none"
          />
        </div>

        {/* Next Follow-up Date */}
        <div>
          <label className="block text-sm font-medium mb-1 transition-colors duration-300" style={{ color: '#003300' }}>
            Next Follow-up Date (Optional)
          </label>
          <input
            type="datetime-local"
            value={nextFollowUpDate}
            onChange={(e) => setNextFollowUpDate(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border bg-white focus:outline-none focus:ring-2 transition-colors"
            style={{ borderColor: '#003300' + '30', color: '#003300' }}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t transition-colors duration-300" style={{ borderColor: '#003300' + '20' }}>
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
            {isSubmitting ? 'Saving...' : contactHistory ? 'Update Contact' : 'Create Contact'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
