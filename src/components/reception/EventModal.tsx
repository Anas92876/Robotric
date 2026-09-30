/**
 * EventModal Component
 *
 * Modal for creating and editing schedule events
 */

import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Input } from '../ui';
import { X, Search, User, UserPlus as UserPlusIcon, AlertTriangle } from 'lucide-react';
import { useReceptionLeads } from '../../hooks/reception/useReceptionLeads';
import type { Lead } from '../../hooks/reception/useReceptionLeads';

interface Participant {
  _id?: string;
  type: 'lead' | 'custom' | 'company';
  leadId?: any;
  customName?: string;
  customPhone?: string;
  companyRole?: string;
  fullName?: string;
  mobileNumber?: string;
}

interface Event {
  _id?: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  color: string;
  participants: Participant[];
}

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: Event | null;
  selectedDate?: Date;
  onSubmit: (data: any) => Promise<void>;
  onDelete?: (eventId: string) => Promise<void>;
}

const COLORS = [
  { value: 'blue', label: 'Blue', bg: 'bg-blue-500' },
  { value: 'green', label: 'Green', bg: 'bg-green-500' },
  { value: 'red', label: 'Red', bg: 'bg-red-500' },
  { value: 'yellow', label: 'Yellow', bg: 'bg-yellow-500' },
  { value: 'purple', label: 'Purple', bg: 'bg-purple-500' },
  { value: 'gray', label: 'Gray', bg: 'bg-zinc-500' },
];

const COMPANY_ROLES = [
  'CEO',
  'CLO',
  'CTO'
];

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  event,
  selectedDate,
  onSubmit,
  onDelete
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [color, setColor] = useState('blue');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const initialFormDataRef = useRef<{
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    color: string;
    participants: Participant[];
  } | null>(null);

  // Lead search state
  const [searchTerm, setSearchTerm] = useState('');
  const { leads, setFilters } = useReceptionLeads();
  const [searchResults, setSearchResults] = useState<Lead[]>([]);

  // Custom participant state
  const [customName, setCustomName] = useState('');
  const [customPhone, setCustomPhone] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);

  // Initialize form
  useEffect(() => {
    if (isOpen) {
      let initialData: {
        title: string;
        description: string;
        startTime: string;
        endTime: string;
        color: string;
        participants: Participant[];
      };
      
      if (event) {
        const formattedStartTime = formatDateTimeForInput(new Date(event.startTime));
        const formattedEndTime = formatDateTimeForInput(new Date(event.endTime));
        
        setTitle(event.title);
        setDescription(event.description || '');
        setStartTime(formattedStartTime);
        setEndTime(formattedEndTime);
        setColor(event.color || 'blue');

        // Format participants from backend
        const formattedParticipants = (event.participants || []).map((p: any) => {
          if (p.type === 'lead' && p.leadId) {
            return {
              _id: p.leadId._id || p.leadId,
              type: 'lead',
              leadId: p.leadId,
              fullName: p.leadId.fullName,
              mobileNumber: p.leadId.mobileNumber
            };
          } else if (p.type === 'company') {
            return {
              _id: `company-${p.companyRole}`,
              type: 'company',
              companyRole: p.companyRole,
              fullName: p.companyRole
            };
          } else if (p.type === 'custom') {
            return {
              _id: p._id || `custom-${Date.now()}`,
              type: 'custom',
              customName: p.customName,
              customPhone: p.customPhone,
              fullName: p.customName,
              mobileNumber: p.customPhone
            };
          }
          return p;
        });

        setParticipants(formattedParticipants);
        
        initialData = {
          title: event.title,
          description: event.description || '',
          startTime: formattedStartTime,
          endTime: formattedEndTime,
          color: event.color || 'blue',
          participants: formattedParticipants
        };
      } else {
        // New event
        const start = selectedDate ? new Date(selectedDate) : new Date();
        start.setHours(10, 0, 0, 0); // Default to 10 AM
        
        const end = new Date(start);
        end.setHours(11, 0, 0, 0); // Default 1 hour duration

        const formattedStartTime = formatDateTimeForInput(start);
        const formattedEndTime = formatDateTimeForInput(end);
        
        setTitle('');
        setDescription('');
        setStartTime(formattedStartTime);
        setEndTime(formattedEndTime);
        setColor('blue');
        setParticipants([]);
        
        initialData = {
          title: '',
          description: '',
          startTime: formattedStartTime,
          endTime: formattedEndTime,
          color: 'blue',
          participants: []
        };
      }
      
      initialFormDataRef.current = initialData;
      setError('');
      setSearchTerm('');
      setSearchResults([]);
      setCustomName('');
      setCustomPhone('');
      setShowCustomForm(false);
      setShowConfirmDialog(false);
    }
  }, [isOpen, event, selectedDate]);

  // Handle lead search
  useEffect(() => {
    const searchLeads = async () => {
      if (searchTerm.trim().length >= 2) {
        setFilters({ search: searchTerm, limit: 5 });
      } else {
        setSearchResults([]);
      }
    };

    const timeoutId = setTimeout(searchLeads, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, setFilters]);

  // Update search results when leads change
  useEffect(() => {
    if (searchTerm.trim().length >= 2) {
      setSearchResults(leads);
    }
  }, [leads, searchTerm]);

  const formatDateTimeForInput = (date: Date) => {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  };

  const hasUnsavedChanges = (): boolean => {
    if (!initialFormDataRef.current) return false;
    const initial = initialFormDataRef.current;
    
    return (
      initial.title !== title ||
      initial.description !== description ||
      initial.startTime !== startTime ||
      initial.endTime !== endTime ||
      initial.color !== color ||
      JSON.stringify(initial.participants) !== JSON.stringify(participants)
    );
  };

  const handleClose = () => {
    if (hasUnsavedChanges()) {
      setShowConfirmDialog(true);
    } else {
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setShowConfirmDialog(false);
    onClose();
  };

  const handleCancelClose = () => {
    setShowConfirmDialog(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title) {
      setError('Title is required');
      return;
    }
    if (!startTime || !endTime) {
      setError('Start and end times are required');
      return;
    }
    if (new Date(startTime) >= new Date(endTime)) {
      setError('End time must be after start time');
      return;
    }

    // Validate time range (10 AM - 7 PM)
    const startHour = new Date(startTime).getHours();
    const endHour = new Date(endTime).getHours();
    const endMinutes = new Date(endTime).getMinutes();

    if (startHour < 10 || (endHour > 19 || (endHour === 19 && endMinutes > 0))) {
      setError('Events must be scheduled between 10:00 AM and 7:00 PM');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Format participants for backend
      const formattedParticipants = participants.map(p => {
        if (p.type === 'lead') {
          return {
            type: 'lead',
            leadId: p.leadId?._id || p.leadId
          };
        } else if (p.type === 'company') {
          return {
            type: 'company',
            companyRole: p.companyRole
          };
        } else {
          return {
            type: 'custom',
            customName: p.customName || p.fullName,
            customPhone: p.customPhone || p.mobileNumber
          };
        }
      });

      await onSubmit({
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        color,
        participants: formattedParticipants
      });
      setShowConfirmDialog(false);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addParticipant = (lead: Lead) => {
    if (!participants.find(p => p._id === lead._id || p.leadId === lead._id)) {
      setParticipants([...participants, {
        _id: lead._id,
        type: 'lead',
        leadId: lead._id,
        fullName: lead.fullName,
        mobileNumber: lead.mobileNumber
      }]);
    }
    setSearchTerm('');
    setSearchResults([]);
  };

  const addCustomParticipant = () => {
    if (!customName.trim()) {
      setError('Please enter a name');
      return;
    }

    setParticipants([...participants, {
      _id: `custom-${Date.now()}`,
      type: 'custom',
      customName: customName.trim(),
      customPhone: customPhone.trim(),
      fullName: customName.trim(),
      mobileNumber: customPhone.trim()
    }]);

    setCustomName('');
    setCustomPhone('');
    setShowCustomForm(false);
    setError('');
  };

  const addCompanyRole = (role: string) => {
    if (!participants.find(p => p.companyRole === role)) {
      setParticipants([...participants, {
        _id: `company-${role}`,
        type: 'company',
        companyRole: role,
        fullName: role
      }]);
    }
  };

  const removeParticipant = (id: string) => {
    setParticipants(participants.filter(p => p._id !== id && p.leadId !== id));
  };

  const getParticipantDisplay = (p: Participant) => {
    if (p.type === 'company') {
      return p.companyRole || 'Unknown';
    }
    if (p.type === 'lead' && p.leadId) {
      return p.leadId.fullName || p.fullName || 'Unknown';
    }
    return p.fullName || p.customName || 'Unknown';
  };

  return (
    <>
    <Modal
      isOpen={isOpen && !showConfirmDialog}
      onClose={handleClose}
      title={event ? 'Edit Event' : 'New Event'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Event details..."
            rows={3}
            className="w-full px-4 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-colors resize-none"
          />
        </div>

        {/* Time Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Start Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              End Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-colors"
              required
            />
          </div>
        </div>
        <p className="text-xs text-zinc-500">Allowed time: 10:00 AM - 7:00 PM</p>

        {/* Color Selection */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Color
          </label>
          <div className="flex gap-3">
            {COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                className={`w-8 h-8 rounded-full ${c.bg} transition-transform hover:scale-110 focus:outline-none ring-2 ring-offset-2 ${
                  color === c.value ? 'ring-zinc-400 scale-110' : 'ring-transparent'
                }`}
                title={c.label}
              />
            ))}
          </div>
        </div>

        {/* Participants */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Participants
          </label>
          
          {/* Selected Participants */}
          <div className="flex flex-wrap gap-2 mb-3">
            {participants.map(p => (
              <div
                key={p._id}
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm border ${
                  p.type === 'company'
                    ? 'bg-purple-50 text-purple-700 border-purple-100'
                    : p.type === 'lead'
                    ? 'bg-cyan-50 text-cyan-700 border-cyan-100'
                    : 'bg-zinc-50 text-zinc-700 border-zinc-200'
                }`}
              >
                <User className="w-3 h-3" />
                <span>{getParticipantDisplay(p)}</span>
                <button
                  type="button"
                  onClick={() => removeParticipant(p._id || p.leadId || '')}
                  className={`${
                    p.type === 'company'
                      ? 'text-purple-400 hover:text-purple-600'
                      : p.type === 'lead'
                      ? 'text-cyan-400 hover:text-cyan-600'
                      : 'text-zinc-400 hover:text-zinc-600'
                  }`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Company Roles Section */}
          <div className="mb-3">
            <p className="text-xs font-medium text-zinc-600 mb-2">Company Internal</p>
            <div className="flex flex-wrap gap-2">
              {COMPANY_ROLES.map(role => (
                <button
                  key={role}
                  type="button"
                  onClick={() => addCompanyRole(role)}
                  disabled={participants.some(p => p.companyRole === role)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    participants.some(p => p.companyRole === role)
                      ? 'bg-purple-100 text-purple-400 border-purple-200 cursor-not-allowed'
                      : 'bg-white text-purple-600 border-purple-200 hover:bg-purple-50 hover:border-purple-300'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* External Participants Section */}
          <div className="pt-3 border-t border-zinc-200">
            <p className="text-xs font-medium text-zinc-600 mb-2">External Participants</p>

          {/* Search Input */}
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search leads to add..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-colors"
            />
            
            {/* Search Results Dropdown */}
            {searchTerm.length >= 2 && searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {searchResults.map(lead => (
                  <button
                    key={lead._id}
                    type="button"
                    onClick={() => addParticipant(lead)}
                    className="w-full text-left px-4 py-2 hover:bg-zinc-50 flex items-center justify-between group"
                  >
                    <div>
                      <p className="font-medium text-zinc-900">{lead.fullName}</p>
                      <p className="text-xs text-zinc-500">{lead.mobileNumber}</p>
                    </div>
                    <UserPlusIcon className="w-4 h-4 text-zinc-400 group-hover:text-cyan-500 opacity-0 group-hover:opacity-100 transition-all" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Add Custom Participant Button */}
          {!showCustomForm && (
            <button
              type="button"
              onClick={() => setShowCustomForm(true)}
              className="w-full px-3 py-2 text-sm text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 border border-cyan-200 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <UserPlusIcon className="w-4 h-4" />
              Add Custom Participant
            </button>
          )}

          {/* Custom Participant Form */}
          {showCustomForm && (
            <div className="border border-zinc-200 rounded-lg p-3 space-y-2 bg-zinc-50">
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Name *"
              />
              <Input
                value={customPhone}
                onChange={(e) => setCustomPhone(e.target.value)}
                placeholder="Phone (optional)"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={addCustomParticipant}
                  className="flex-1 px-3 py-1.5 text-sm bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomForm(false);
                    setCustomName('');
                    setCustomPhone('');
                  }}
                  className="flex-1 px-3 py-1.5 text-sm bg-zinc-200 text-zinc-700 rounded-lg hover:bg-zinc-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t border-zinc-200">
          {/* Delete Button (only for existing events) */}
          {event && event._id && onDelete && (
            <Button
              type="button"
              variant="ghost"
              onClick={async () => {
                if (window.confirm('Are you sure you want to delete this event?')) {
                  try {
                    setIsDeleting(true);
                    await onDelete(event._id!);
                    onClose();
                  } catch (err: any) {
                    setError(err.response?.data?.message || 'Failed to delete event');
                  } finally {
                    setIsDeleting(false);
                  }
                }
              }}
              disabled={isSubmitting || isDeleting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete Event'}
            </Button>
          )}

          <div className="flex gap-3 ml-auto">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={isSubmitting || isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || isDeleting}
            >
              {isSubmitting ? 'Saving...' : 'Save Event'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>

    {/* Confirmation Dialog */}
    <Modal
      isOpen={showConfirmDialog}
      onClose={handleCancelClose}
      title="Unsaved Changes"
      size="sm"
      closeOnOverlayClick={true}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-ink font-medium">Are you sure you want to leave?</p>
            <p className="text-sm text-ink/60 mt-1">
              You have unsaved changes. If you leave now, your changes will be lost.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleCancelClose}
          >
            Continue Editing
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleConfirmClose}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            Discard Changes
          </Button>
        </div>
      </div>
    </Modal>
    </>
  );
};
