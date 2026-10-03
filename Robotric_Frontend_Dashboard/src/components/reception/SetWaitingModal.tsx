/**
 * SetWaitingModal
 *
 * Converts a lead to "waiting" status:
 * - Creates a User account (email + password)
 * - Records which course they're waiting for
 * - Records any deposit they've already paid
 */

import React, { useState, useEffect } from 'react';
import { Modal, Button, Input } from '../ui';
import { Clock, DollarSign, Eye, EyeOff } from 'lucide-react';
import { api } from '../../lib/api';
import type { Lead, SetWaitingRequest } from '../../hooks/reception/useReceptionLeads';

interface Course {
  _id: string;
  title: string;
  price: number;
}

interface SetWaitingModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSubmit: (id: string, data: SetWaitingRequest) => Promise<any>;
}

const DEPOSIT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'sham_cash_app', label: 'ShamCash' },
  { value: 'other', label: 'Other' },
];

export const SetWaitingModal: React.FC<SetWaitingModalProps> = ({
  isOpen,
  onClose,
  lead,
  onSubmit,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [courseId, setCourseId] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState<'cash' | 'sham_cash_app' | 'other'>('cash');
  const [depositNotes, setDepositNotes] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch available courses when modal opens
  useEffect(() => {
    if (isOpen) {
      api.get('/reception/enrollments/available-courses?all=true')
        .then(res => setCourses(res.data.data || res.data || []))
        .catch(() => setCourses([]));

      // Reset form
      setEmail('');
      setPassword('');
      setShowPassword(false);
      setCourseId('');
      setDepositAmount('');
      setDepositMethod('cash');
      setDepositNotes('');
      setErrors({});
    }
  }, [isOpen]);

  if (!lead) return null;

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Invalid email format';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters';
    if (!courseId) e.courseId = 'Please select a course';
    if (depositAmount && isNaN(parseFloat(depositAmount))) e.depositAmount = 'Enter a valid amount';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      await onSubmit(lead._id, {
        email: email.trim(),
        password,
        courseId,
        depositAmount: depositAmount ? parseFloat(depositAmount) : 0,
        depositMethod,
        depositNotes: depositNotes.trim(),
      });
      onClose();
    } catch (err: any) {
      setErrors({ submit: err.response?.data?.message || err.message || 'Failed to set waiting status' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCourse = courses.find(c => c._id === courseId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Set Lead as Waiting"
      size="md"
      closeOnOverlayClick={false}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Lead info strip */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
          <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center text-white font-bold shrink-0">
            {lead.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-zinc-900 text-sm">{lead.fullName}</p>
            {lead.englishName && <p className="text-xs text-zinc-500">{lead.englishName}</p>}
            <p className="text-xs text-zinc-500">{lead.mobileNumber}</p>
          </div>
          <div className="ms-auto flex items-center gap-1.5 text-amber-600 text-xs font-semibold">
            <Clock className="w-3.5 h-3.5" />
            Waiting
          </div>
        </div>

        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {errors.submit}
          </div>
        )}

        {/* Section: Account */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-2">Student Account</p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); }}
                placeholder="student@email.com"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })); }}
                  placeholder="Min. 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>
          </div>
        </div>

        {/* Section: Course */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-2">Course Interest</p>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Course <span className="text-red-500">*</span>
            </label>
            <select
              value={courseId}
              onChange={e => { setCourseId(e.target.value); setErrors(p => ({ ...p, courseId: '' })); }}
              className="w-full px-3 py-2.5 rounded-lg bg-white border border-zinc-300 text-zinc-900 focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/20 transition-colors"
            >
              <option value="">— Select Course —</option>
              {courses.map(c => (
                <option key={c._id} value={c._id}>{c.title} (${c.price})</option>
              ))}
            </select>
            {errors.courseId && <p className="text-red-500 text-xs mt-1">{errors.courseId}</p>}
            {selectedCourse && (
              <p className="text-xs text-zinc-500 mt-1">Course price: <span className="font-semibold">${selectedCourse.price}</span></p>
            )}
          </div>
        </div>

        {/* Section: Deposit */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-2">
            Deposit <span className="text-zinc-400 font-normal">(optional)</span>
          </p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Amount (USD)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={depositAmount}
                    onChange={e => { setDepositAmount(e.target.value); setErrors(p => ({ ...p, depositAmount: '' })); }}
                    placeholder="0.00"
                    className="pl-8"
                  />
                </div>
                {errors.depositAmount && <p className="text-red-500 text-xs mt-1">{errors.depositAmount}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Payment Method</label>
                <select
                  value={depositMethod}
                  onChange={e => setDepositMethod(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-lg bg-white border border-zinc-300 text-zinc-900 focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/20 transition-colors"
                >
                  {DEPOSIT_METHODS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Deposit Notes</label>
              <textarea
                value={depositNotes}
                onChange={e => setDepositNotes(e.target.value)}
                rows={2}
                placeholder="Any notes about the deposit..."
                className="w-full px-3 py-2 rounded-lg bg-white border border-zinc-300 text-zinc-900 focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/20 transition-colors resize-none text-sm"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6"
          >
            {isSubmitting ? 'Setting up...' : 'Set as Waiting'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
