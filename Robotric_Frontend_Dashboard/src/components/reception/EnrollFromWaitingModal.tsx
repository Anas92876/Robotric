/**
 * EnrollFromWaitingModal
 *
 * Enrolls a waiting lead into a course group.
 * - Group is REQUIRED
 * - Deposit already paid is shown as credit and pre-applied
 * - Reception sets the remaining installment plan
 */

import React, { useState, useEffect } from 'react';
import { Modal, Button, Input, useToast } from '../ui';
import { UserCheck, BookOpen, Users, DollarSign, Plus, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';

interface Group {
  _id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  schedule?: Array<{ day: string; startTime: string; endTime: string }>;
}

interface InstallmentRow {
  amount: string;
  dueDate: string;
}

interface WaitingLead {
  _id: string;
  fullName: string;
  englishName?: string;
  mobileNumber: string;
  convertedToStudent?: { _id: string; name: string; email: string };
  waitingInfo?: {
    courseId?: { _id: string; title: string; price: number };
    depositAmount?: number;
    depositMethod?: string;
    depositNotes?: string;
  };
}

interface EnrollFromWaitingModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: WaitingLead;
  onSuccess: () => void;
}

export const EnrollFromWaitingModal: React.FC<EnrollFromWaitingModalProps> = ({
  isOpen,
  onClose,
  lead,
  onSuccess,
}) => {
  const toast = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState('');
  const [discount, setDiscount] = useState('');
  const [notes, setNotes] = useState('');
  const [installments, setInstallments] = useState<InstallmentRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const course = lead.waitingInfo?.courseId;
  const courseId = course?._id;
  const coursePrice = course?.price || 0;
  const deposit = lead.waitingInfo?.depositAmount || 0;
  const depositMethod = lead.waitingInfo?.depositMethod || 'cash';

  // Calculated totals
  const discountPct = Math.min(Math.max(parseFloat(discount) || 0, 0), 100);
  const priceAfterDiscount = Math.round((coursePrice - coursePrice * (discountPct / 100)) * 100) / 100;
  const remainingAfterDeposit = Math.max(0, priceAfterDiscount - deposit);

  // Fetch groups for this course
  useEffect(() => {
    if (isOpen && courseId) {
      api.get(`/reception/enrollments/available-groups/${courseId}`)
        .then(res => setGroups(res.data.data || res.data || []))
        .catch(() => setGroups([]));

      // Reset
      setGroupId('');
      setDiscount('');
      setNotes('');
      setInstallments([]);
      setErrors({});
    }
  }, [isOpen, courseId]);

  const addInstallment = () => {
    setInstallments(p => [...p, { amount: '', dueDate: '' }]);
  };

  const removeInstallment = (i: number) => {
    setInstallments(p => p.filter((_, idx) => idx !== i));
  };

  const updateInstallment = (i: number, field: 'amount' | 'dueDate', value: string) => {
    setInstallments(p => p.map((row, idx) => idx === i ? { ...row, [field]: value } : row));
  };

  const installmentSum = installments.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!groupId) e.groupId = 'Please select a group — it is required';
    if (discount && (parseFloat(discount) < 0 || parseFloat(discount) > 100)) {
      e.discount = 'Discount must be 0–100';
    }
    if (installments.length > 0) {
      const hasEmpty = installments.some(r => !r.amount || !r.dueDate);
      if (hasEmpty) e.installments = 'All installment fields are required';
      else if (Math.abs(installmentSum - remainingAfterDeposit) > 0.01) {
        e.installments = `Installments must equal remaining balance ($${remainingAfterDeposit.toFixed(2)}). Current sum: $${installmentSum.toFixed(2)}`;
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      await api.post('/reception/enrollments/from-waiting', {
        leadId: lead._id,
        groupId,
        discount: discountPct,
        notes: notes.trim() || undefined,
        installments: installments.length > 0
          ? installments.map(r => ({ amount: parseFloat(r.amount), dueDate: r.dueDate }))
          : undefined,
      });
      toast.success('Enrolled!', `${lead.fullName} has been enrolled successfully${deposit > 0 ? ` with $${deposit} deposit applied` : ''}.`);
      onSuccess();
    } catch (err: any) {
      toast.error('Enrollment Failed', err.response?.data?.message || err.message || 'Failed to enroll student');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedGroup = groups.find(g => g._id === groupId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Enroll from Waiting List"
      size="md"
      closeOnOverlayClick={false}
    >
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Student + Course strip */}
        <div className="p-3 rounded-xl bg-ink/5 border border-ink/10 space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-ink flex items-center justify-center text-white font-bold text-sm shrink-0">
              {lead.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-zinc-900 text-sm">{lead.fullName}</p>
              <p className="text-xs text-zinc-500">{lead.convertedToStudent?.email}</p>
            </div>
          </div>

          {course && (
            <div className="flex items-center gap-2 text-xs text-zinc-600 ps-1">
              <BookOpen className="w-3.5 h-3.5 text-ink" />
              <span className="font-medium">{course.title}</span>
              <span className="text-zinc-400">— ${coursePrice}</span>
            </div>
          )}

          {deposit > 0 && (
            <div className="flex items-center gap-2 text-xs text-green-700 ps-1 bg-green-50 rounded-lg px-2 py-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              <span>Deposit already paid: <strong>${deposit.toFixed(2)}</strong> ({depositMethod})</span>
              {lead.waitingInfo?.depositNotes && (
                <span className="text-green-600 italic">— {lead.waitingInfo.depositNotes}</span>
              )}
            </div>
          )}
        </div>

        {/* Group selector — REQUIRED */}
        <div>
          <label className="block text-sm font-semibold text-zinc-700 mb-1">
            Group <span className="text-red-500">*</span>
            <span className="text-xs font-normal text-zinc-400 ms-1">(required)</span>
          </label>
          {groups.length === 0 ? (
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              No active groups found for this course. Create a group first.
            </p>
          ) : (
            <select
              value={groupId}
              onChange={e => { setGroupId(e.target.value); setErrors(p => ({ ...p, groupId: '' })); }}
              className="w-full px-3 py-2.5 rounded-lg bg-white border border-zinc-300 text-zinc-900 focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/20 transition-colors"
            >
              <option value="">— Select Group —</option>
              {groups.map(g => (
                <option key={g._id} value={g._id}>
                  {g.name} ({g.status})
                </option>
              ))}
            </select>
          )}
          {errors.groupId && <p className="text-red-500 text-xs mt-1">{errors.groupId}</p>}
          {selectedGroup && (
            <p className="text-xs text-zinc-500 mt-1">
              {new Date(selectedGroup.startDate).toLocaleDateString()} → {new Date(selectedGroup.endDate).toLocaleDateString()}
              {selectedGroup.schedule?.[0] && ` · ${selectedGroup.schedule[0].day} ${selectedGroup.schedule[0].startTime}–${selectedGroup.schedule[0].endTime}`}
            </p>
          )}
        </div>

        {/* Discount */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Discount (%)</label>
          <Input
            type="number"
            min="0"
            max="100"
            value={discount}
            onChange={e => { setDiscount(e.target.value); setErrors(p => ({ ...p, discount: '' })); }}
            placeholder="0"
          />
          {errors.discount && <p className="text-red-500 text-xs mt-1">{errors.discount}</p>}
        </div>

        {/* Payment summary */}
        <div className="rounded-xl border border-zinc-200 overflow-hidden">
          <div className="bg-zinc-50 px-4 py-2.5 border-b border-zinc-200">
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Payment Summary</p>
          </div>
          <div className="px-4 py-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-zinc-700">
              <span>Course price</span>
              <span className="font-medium">${coursePrice.toFixed(2)}</span>
            </div>
            {discountPct > 0 && (
              <div className="flex justify-between text-zinc-500">
                <span>Discount ({discountPct}%)</span>
                <span>−${(coursePrice * discountPct / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-zinc-700 border-t border-zinc-100 pt-1.5">
              <span>After discount</span>
              <span className="font-medium">${priceAfterDiscount.toFixed(2)}</span>
            </div>
            {deposit > 0 && (
              <div className="flex justify-between text-green-700">
                <span>Deposit (paid)</span>
                <span>−${deposit.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-zinc-900 border-t border-zinc-200 pt-1.5">
              <span>Remaining to pay</span>
              <span className={remainingAfterDeposit === 0 ? 'text-green-600' : 'text-ink'}>
                ${remainingAfterDeposit.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Installments for remaining balance */}
        {remainingAfterDeposit > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-zinc-700">
                Installment Plan <span className="text-zinc-400 text-xs">(for remaining ${remainingAfterDeposit.toFixed(2)})</span>
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={addInstallment}
                className="text-ink hover:bg-ink/5 text-xs"
              >
                Add
              </Button>
            </div>

            {installments.length === 0 && (
              <p className="text-xs text-zinc-400 italic">
                No installments added — full remaining balance due immediately.
              </p>
            )}

            <div className="space-y-2">
              {installments.map((row, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <div className="w-32">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.amount}
                      onChange={e => updateInstallment(i, 'amount', e.target.value)}
                      placeholder="Amount $"
                    />
                  </div>
                  <Input
                    type="date"
                    value={row.dueDate}
                    onChange={e => updateInstallment(i, 'dueDate', e.target.value)}
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => removeInstallment(i)}
                    className="text-red-400 hover:text-red-600 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {installments.length > 0 && (
              <p className={`text-xs mt-1 ${Math.abs(installmentSum - remainingAfterDeposit) < 0.01 ? 'text-green-600' : 'text-amber-600'}`}>
                Sum: ${installmentSum.toFixed(2)} / ${remainingAfterDeposit.toFixed(2)}
              </p>
            )}
            {errors.installments && <p className="text-red-500 text-xs mt-1">{errors.installments}</p>}
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Any notes about this enrollment..."
            className="w-full px-3 py-2 rounded-lg bg-white border border-zinc-300 text-zinc-900 focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/20 transition-colors resize-none text-sm"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || groups.length === 0}
            className="bg-ink hover:bg-ink-deep text-white font-semibold px-6"
            leftIcon={<UserCheck className="w-4 h-4" />}
          >
            {isSubmitting ? 'Enrolling...' : `Enroll${deposit > 0 ? ` ($${deposit} credited)` : ''}`}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
