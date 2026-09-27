/**
 * Session Request Modal Component
 * 
 * Form for students to request sessions
 */

import React, { useState } from 'react';
import { Modal, Input, Button } from '../ui';

export interface SessionRequestFormData {
  date: string;
  startTime: string;
  durationHours: number;
  description?: string;
}

interface SessionRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SessionRequestFormData) => Promise<void>;
  remainingHours: number;
  isSubmitting?: boolean;
}

const SessionRequestModal: React.FC<SessionRequestModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  remainingHours,
  isSubmitting = false,
}) => {
  const [formData, setFormData] = useState<SessionRequestFormData>({
    date: '',
    startTime: '',
    durationHours: 1,
    description: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof SessionRequestFormData, string>>>({});

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof SessionRequestFormData, string>> = {};

    if (!formData.date) {
      newErrors.date = 'Date is required';
    } else {
      const selectedDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.date = 'Date cannot be in the past';
      }
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    } else {
      const [hours] = formData.startTime.split(':').map(Number);
      if (hours < 11 || hours >= 19) {
        newErrors.startTime = 'Start time must be between 11:00 and 19:00';
      }
    }

    if (formData.durationHours < 1) {
      newErrors.durationHours = 'Duration must be at least 1 hour';
    }

    if (formData.durationHours > remainingHours) {
      newErrors.durationHours = `Insufficient hours. Available: ${remainingHours}`;
    }

    // Check end time doesn't exceed 19:00
    if (formData.startTime && formData.durationHours) {
      const [hours, minutes] = formData.startTime.split(':').map(Number);
      const endHour = hours + formData.durationHours;
      if (endHour > 19 || (endHour === 19 && minutes > 0)) {
        newErrors.durationHours = 'Session must end before 19:00';
      }
    }

    if (formData.description && formData.description.length > 1000) {
      newErrors.description = 'Description must be 1000 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await onSubmit(formData);
    } catch (error) {
      // Error handling is done in parent
    }
  };

  const handleChange = (field: keyof SessionRequestFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request Session">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-blue-700">
            <strong>Remaining Hours:</strong> {remainingHours} hrs
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input
              label="Date"
              type="date"
              value={formData.date}
              onChange={(e) => handleChange('date', e.target.value)}
              error={errors.date}
              required
              min={today}
            />
          </div>

          <div>
            <Input
              label="Start Time"
              type="time"
              value={formData.startTime}
              onChange={(e) => handleChange('startTime', e.target.value)}
              error={errors.startTime}
              required
              min="11:00"
              max="19:00"
            />
            <p className="text-xs text-[#003300]/50 mt-1">
              Must be between 11:00 and 19:00
            </p>
          </div>
        </div>

        <div>
          <Input
            label="Duration (Hours)"
            type="number"
            value={formData.durationHours}
            onChange={(e) => handleChange('durationHours', parseInt(e.target.value) || 1)}
            error={errors.durationHours}
            required
            min={1}
            max={remainingHours}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#003300] mb-2">
            Description (Optional)
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={3}
            className="w-full px-4 py-2.5 rounded-lg border border-[#003300]/20 bg-white text-[#003300] placeholder-[#003300]/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            placeholder="What do you need help with?"
            maxLength={1000}
          />
          {errors.description && (
            <p className="text-red-500 text-xs mt-1">{errors.description}</p>
          )}
          <p className="text-xs text-[#003300]/50 mt-1">
            {formData.description?.length || 0}/1000 characters
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#003300]/10">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isSubmitting}>
            Request Session
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default SessionRequestModal;
