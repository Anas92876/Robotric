/**
 * ConvertToStudentModal Component
 *
 * Modal for converting a lead to a student account with email and password
 */

import React, { useState } from 'react';
import { Modal, Button, Input } from '../ui';
import { UserPlus, Mail, Lock, AlertCircle } from 'lucide-react';
import type { Lead } from '../../hooks/reception/useReceptionLeads';

interface ConvertToStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSubmit: (data: { email: string; password: string }) => Promise<void>;
}

export const ConvertToStudentModal: React.FC<ConvertToStudentModalProps> = ({
  isOpen,
  onClose,
  lead,
  onSubmit
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    if (!password) {
      setError('Password is required');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({ email, password });
      
      // Reset form
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to convert lead to student');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setError('');
      onClose();
    }
  };

  if (!lead) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Convert Lead to Student"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Lead Info */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-lg">
              {lead.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-white">{lead.fullName}</p>
              {lead.englishName && (
                <p className="text-sm text-white/60">{lead.englishName}</p>
              )}
              <p className="text-sm text-white/60">
                {lead.mobileNumber}
                {lead.age && ` • ${lead.age} years old`}
              </p>
            </div>
          </div>
        </div>

        {/* Info Message */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <UserPlus className="w-5 h-5 text-primary mt-0.5" />
            <div className="flex-1">
              <p className="text-white font-medium mb-1">Create Student Account</p>
              <p className="text-white/60 text-sm">
                This will create a student account for {lead.fullName} and change their status to "Student".
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Email Field */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Email Address <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@example.com"
              className="pl-10"
              disabled={isSubmitting}
              required
            />
          </div>
        </div>

        {/* Password Field */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Password <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password (min. 6 characters)"
              className="pl-10"
              disabled={isSubmitting}
              required
            />
          </div>
        </div>

        {/* Confirm Password Field */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Confirm Password <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="pl-10"
              disabled={isSubmitting}
              required
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-ink/60 hover:text-ink hover:bg-ink/10"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary/90"
          >
            {isSubmitting ? 'Converting...' : 'Create Student Account'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
