/**
 * User Subscription Modal Component
 * 
 * Form for assigning/editing user subscriptions
 */

import React, { useState, useEffect } from 'react';
import { Modal, Input, Button } from '../ui';
import type { UserSubscription } from '../../services/subscription.service';
import type { SubscriptionPlan } from '../../services/subscription.service';
import type { User } from '../../hooks/reception/useReceptionUsers';

export interface UserSubscriptionFormData {
  userId: string;
  planId: string;
  startsAt: string;
  endsAt: string;
  remainingHours?: number;
}

interface UserSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UserSubscriptionFormData) => Promise<void>;
  subscription?: UserSubscription | null;
  activePlans: SubscriptionPlan[];
  users: User[];
  isSubmitting?: boolean;
}

const UserSubscriptionModal: React.FC<UserSubscriptionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  subscription,
  activePlans,
  users,
  isSubmitting = false,
}) => {
  const [formData, setFormData] = useState<UserSubscriptionFormData>({
    userId: '',
    planId: '',
    startsAt: '',
    endsAt: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof UserSubscriptionFormData, string>>>({});
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

  useEffect(() => {
    if (subscription) {
      const planId = typeof subscription.planId === 'object' ? subscription.planId._id : subscription.planId;
      const userId = typeof subscription.userId === 'object' ? subscription.userId._id : subscription.userId;
      
      setFormData({
        userId,
        planId,
        startsAt: new Date(subscription.startsAt).toISOString().split('T')[0],
        endsAt: new Date(subscription.endsAt).toISOString().split('T')[0],
        remainingHours: subscription.remainingHours,
      });
      
      const plan = activePlans.find((p) => p._id === planId);
      setSelectedPlan(plan || null);
    } else {
      setFormData({
        userId: '',
        planId: '',
        startsAt: '',
        endsAt: '',
      });
      setSelectedPlan(null);
    }
    setErrors({});
  }, [subscription, isOpen, activePlans]);

  const handlePlanChange = (planId: string) => {
    const plan = activePlans.find((p) => p._id === planId);
    setSelectedPlan(plan || null);
    setFormData((prev) => ({ ...prev, planId }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof UserSubscriptionFormData, string>> = {};

    if (!formData.userId) {
      newErrors.userId = 'Student is required';
    }

    if (!formData.planId) {
      newErrors.planId = 'Subscription plan is required';
    }

    if (!formData.startsAt) {
      newErrors.startsAt = 'Start date is required';
    }

    if (!formData.endsAt) {
      newErrors.endsAt = 'End date is required';
    }

    if (formData.startsAt && formData.endsAt) {
      const start = new Date(formData.startsAt);
      const end = new Date(formData.endsAt);
      if (end <= start) {
        newErrors.endsAt = 'End date must be after start date';
      }
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

  const handleChange = (field: keyof UserSubscriptionFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Filter students only
  const students = users.filter((u) => u.role === 'student');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={subscription ? 'Edit Subscription' : 'Assign Subscription'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#003300] mb-2">
            Student <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.userId}
            onChange={(e) => handleChange('userId', e.target.value)}
            disabled={!!subscription}
            className={`w-full px-4 py-2.5 rounded-lg border bg-white text-[#003300] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all ${
              errors.userId
                ? 'border-red-500'
                : 'border-[#003300]/20 hover:border-primary/40'
            } ${subscription ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <option value="">Select a student</option>
            {students.map((user) => (
              <option key={user._id} value={user._id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
          {errors.userId && (
            <p className="text-red-500 text-xs mt-1">{errors.userId}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-[#003300] mb-2">
            Subscription Plan <span className="text-red-500">*</span>
          </label>
          {activePlans.length === 0 ? (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm text-orange-700">
                No active subscription plans available. Please create a plan in the CLO dashboard first.
              </p>
            </div>
          ) : (
            <>
              <select
                value={formData.planId}
                onChange={(e) => handlePlanChange(e.target.value)}
                disabled={!!subscription}
                className={`w-full px-4 py-2.5 rounded-lg border bg-white text-[#003300] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all ${
                  errors.planId
                    ? 'border-red-500'
                    : 'border-[#003300]/20 hover:border-primary/40'
                } ${subscription ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <option value="">Select a plan</option>
                {activePlans.map((plan) => (
                  <option key={plan._id} value={plan._id}>
                    {plan.name} - {plan.monthlyHours} hrs/month - ${plan.price}
                  </option>
                ))}
              </select>
              {errors.planId && (
                <p className="text-red-500 text-xs mt-1">{errors.planId}</p>
              )}
              {selectedPlan && (
                <div className="mt-2 bg-[#003300]/5 rounded-lg p-3 border border-[#003300]/10">
                  <p className="text-sm font-medium text-[#003300] mb-1">Selected Plan Details:</p>
                  <div className="space-y-1 text-xs text-[#003300]/70">
                    <p>• Monthly Hours: <strong>{selectedPlan.monthlyHours} hrs</strong></p>
                    <p>• Price: <strong>${selectedPlan.price}</strong></p>
                    <p>• Remaining hours will be set to: <strong>{selectedPlan.monthlyHours} hours</strong></p>
                    {selectedPlan.description && (
                      <p>• Description: {selectedPlan.description}</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input
              label="Start Date"
              type="date"
              value={formData.startsAt}
              onChange={(e) => handleChange('startsAt', e.target.value)}
              error={errors.startsAt}
              required
            />
          </div>

          <div>
            <Input
              label="End Date"
              type="date"
              value={formData.endsAt}
              onChange={(e) => handleChange('endsAt', e.target.value)}
              error={errors.endsAt}
              required
            />
          </div>
        </div>

        {subscription && (
          <div>
            <Input
              label="Remaining Hours"
              type="number"
              value={formData.remainingHours || 0}
              onChange={(e) => handleChange('remainingHours', parseInt(e.target.value) || 0)}
              min={0}
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#003300]/10">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isSubmitting}>
            {subscription ? 'Update Subscription' : 'Assign Subscription'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default UserSubscriptionModal;
