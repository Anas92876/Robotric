/**
 * Subscription Plan Modal Component
 * 
 * Form for creating/editing subscription plans
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Modal, Input, Button } from '../ui';
import type { SubscriptionPlan } from '../../services/subscription.service';

export interface SubscriptionPlanFormData {
  name: string;
  monthlyHours: number;
  price: number;
  isActive: boolean;
  description?: string;
}

interface SubscriptionPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SubscriptionPlanFormData) => Promise<void>;
  plan?: SubscriptionPlan | null;
  isSubmitting?: boolean;
}

const SubscriptionPlanModal: React.FC<SubscriptionPlanModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  plan,
  isSubmitting = false,
}) => {
  const [formData, setFormData] = useState<SubscriptionPlanFormData>({
    name: '',
    monthlyHours: 0,
    price: 0,
    isActive: true,
    description: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof SubscriptionPlanFormData, string>>>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const initialFormDataRef = useRef<SubscriptionPlanFormData | null>(null);

  useEffect(() => {
    let initialData: SubscriptionPlanFormData;
    if (plan) {
      initialData = {
        name: plan.name,
        monthlyHours: plan.monthlyHours,
        price: plan.price,
        isActive: plan.isActive,
        description: plan.description || '',
      };
    } else {
      initialData = {
        name: '',
        monthlyHours: 0,
        price: 0,
        isActive: true,
        description: '',
      };
    }
    setFormData(initialData);
    initialFormDataRef.current = initialData;
    setErrors({});
    setShowConfirmDialog(false);
  }, [plan, isOpen]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof SubscriptionPlanFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Plan name is required';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Plan name must be 100 characters or less';
    }

    if (formData.monthlyHours < 1) {
      newErrors.monthlyHours = 'Monthly hours must be at least 1';
    } else if (formData.monthlyHours > 1000) {
      newErrors.monthlyHours = 'Monthly hours cannot exceed 1000';
    }

    if (formData.price < 0) {
      newErrors.price = 'Price cannot be negative';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be 500 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const hasUnsavedChanges = (): boolean => {
    if (!initialFormDataRef.current) return false;
    const initial = initialFormDataRef.current;
    const current = formData;
    
    return (
      initial.name !== current.name ||
      initial.monthlyHours !== current.monthlyHours ||
      initial.price !== current.price ||
      initial.isActive !== current.isActive ||
      initial.description !== current.description
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
    if (!validate()) return;

    try {
      await onSubmit(formData);
      setShowConfirmDialog(false);
    } catch (error) {
      // Error handling is done in parent
    }
  };

  const handleChange = (
    field: keyof SubscriptionPlanFormData,
    value: string | number | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <>
    <Modal isOpen={isOpen && !showConfirmDialog} onClose={handleClose} title={plan ? 'Edit Subscription Plan' : 'Create Subscription Plan'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            label="Plan Name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            error={errors.name}
            required
            placeholder="e.g., Basic Plan, Premium Plan"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input
              label="Monthly Hours"
              type="number"
              value={formData.monthlyHours}
              onChange={(e) => handleChange('monthlyHours', parseInt(e.target.value) || 0)}
              error={errors.monthlyHours}
              required
              min={1}
              max={1000}
            />
          </div>

          <div>
            <Input
              label="Price ($)"
              type="number"
              value={formData.price}
              onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
              error={errors.price}
              required
              min={0}
              step="0.01"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-2">
            Description (Optional)
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={3}
            className="w-full px-4 py-2.5 rounded-lg border border-ink/20 bg-white text-ink placeholder-ink/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:bg-gray-50 transition-all"
            placeholder="Describe what this plan includes..."
            maxLength={500}
          />
          {errors.description && (
            <p className="text-red-500 text-xs mt-1">{errors.description}</p>
          )}
          <p className="text-xs text-ink/50 mt-1">
            {formData.description?.length || 0}/500 characters
          </p>
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => handleChange('isActive', e.target.checked)}
              className="w-4 h-4 text-primary border-ink/30 rounded focus:ring-primary/20"
            />
            <span className="text-sm text-ink">Active (available for assignment)</span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-ink/10">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isSubmitting}>
            {plan ? 'Update Plan' : 'Create Plan'}
          </Button>
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

export default SubscriptionPlanModal;
