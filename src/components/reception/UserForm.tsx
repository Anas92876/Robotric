/**
 * UserForm Component
 *
 * Modal form for creating and editing users
 * - Create new student/trainer accounts
 * - Edit existing user information
 * - Form validation
 * - Loading states
 *
 * UPDATED: Light mode with brand colors (dark green & cream)
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Modal, Button, Input } from '../ui';
import type { User, CreateUserRequest, UpdateUserRequest } from '../../hooks/reception/useReceptionUsers';

/**
 * Props for UserForm component
 */
interface UserFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateUserRequest | UpdateUserRequest) => Promise<void>;
  user?: User | null; // If provided, edit mode. Otherwise, create mode
  mode: 'create' | 'edit';
}

/**
 * Form data interface
 */
interface FormData {
  name: string;
  email: string;
  password: string;
  role: string;
  phone: string;
}

/**
 * Form errors interface
 */
interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
  phone?: string;
}

/**
 * UserForm Component
 */
export const UserForm: React.FC<UserFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  user,
  mode,
}) => {
  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    role: 'student',
    phone: '',
  });

  // Validation errors
  const [errors, setErrors] = useState<FormErrors>({});

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Store initial form data to detect changes
  const initialFormDataRef = useRef<FormData | null>(null);

  /**
   * Populate form with user data in edit mode
   */
  useEffect(() => {
    let initialData: FormData;
    
    if (mode === 'edit' && user) {
      initialData = {
        name: user.name || '',
        email: user.email || '',
        password: '', // Don't populate password in edit mode
        role: user.role || 'student',
        phone: user.profile?.phone || '',
      };
    } else {
      // Reset form in create mode
      initialData = {
        name: '',
        email: '',
        password: '',
        role: 'student',
        phone: '',
      };
    }
    
    setFormData(initialData);
    initialFormDataRef.current = initialData;
    setErrors({});
    setShowConfirmDialog(false);
  }, [user, mode, isOpen]);

  /**
   * Validate form data
   */
  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Password validation (only required in create mode)
    if (mode === 'create' && !formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Role validation
    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form input changes
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error for this field
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!validate()) {
      return;
    }

    try {
      setIsSubmitting(true);

      // Prepare data based on mode
      if (mode === 'create') {
        // Create mode - include all fields
        const createData: CreateUserRequest = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: formData.role,
          phone: formData.phone.trim() || undefined,
        };
        await onSubmit(createData);
      } else {
        // Edit mode - only include changed fields
        const updateData: UpdateUserRequest = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          role: formData.role,
          phone: formData.phone.trim() || undefined,
        };
        
        // Include password only if provided (not empty)
        // The password field is optional, so reception can update other user fields without changing the password
        if (formData.password && formData.password.trim().length > 0) {
          updateData.password = formData.password;
        }
        
        await onSubmit(updateData);
      }

      // Close modal on success (no need to check for unsaved changes)
      setShowConfirmDialog(false);
      onClose();
    } catch (error: any) {
      // Show error from API
      setErrors({ email: error.message || 'Failed to save user' });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Check if form has unsaved changes
   */
  const hasUnsavedChanges = (): boolean => {
    if (!initialFormDataRef.current) return false;
    
    const initial = initialFormDataRef.current;
    const current = formData;
    
    // Compare all fields
    return (
      initial.name.trim() !== current.name.trim() ||
      initial.email.trim() !== current.email.trim() ||
      initial.role !== current.role ||
      initial.phone.trim() !== current.phone.trim() ||
      (mode === 'create' && current.password.trim().length > 0) ||
      (mode === 'edit' && current.password.trim().length > 0)
    );
  };

  /**
   * Handle modal close - check for unsaved changes
   */
  const handleClose = () => {
    if (isSubmitting) return;
    
    // Check if there are unsaved changes
    if (hasUnsavedChanges()) {
      setShowConfirmDialog(true);
    } else {
      onClose();
    }
  };

  /**
   * Handle confirmed close (user confirmed they want to discard changes)
   */
  const handleConfirmClose = () => {
    setShowConfirmDialog(false);
    onClose();
  };

  /**
   * Handle cancel close confirmation (user wants to continue editing)
   */
  const handleCancelClose = () => {
    setShowConfirmDialog(false);
  };

  return (
    <>
      {/* Main Form Modal */}
      <Modal
        isOpen={isOpen && !showConfirmDialog}
        onClose={handleClose}
        title={mode === 'create' ? 'Create New User' : 'Edit User'}
        description={mode === 'create' ? 'Add a new student or trainer to the system' : 'Update user information'}
        size="md"
        closeOnOverlayClick={!isSubmitting}
      >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Input */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-[#003300] mb-2">
            Full Name <span className="text-red-400">*</span>
          </label>
          <Input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter full name"
            disabled={isSubmitting}
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && (
            <p className="text-red-400 text-sm mt-1">{errors.name}</p>
          )}
        </div>

        {/* Email Input */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[#003300] mb-2">
            Email Address <span className="text-red-400">*</span>
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="user@example.com"
            disabled={isSubmitting}
            className={errors.email ? 'border-red-500' : ''}
          />
          {errors.email && (
            <p className="text-red-400 text-sm mt-1">{errors.email}</p>
          )}
        </div>

        {/* Password Input (Create mode only or optional in edit) */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-[#003300] mb-2">
            Password {mode === 'create' && <span className="text-red-400">*</span>}
            {mode === 'edit' && <span className="text-[#003300]/50 text-xs ml-1">(Leave blank to keep current)</span>}
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder={mode === 'create' ? 'Enter password' : 'Enter new password (optional)'}
            disabled={isSubmitting}
            className={errors.password ? 'border-red-500' : ''}
          />
          {errors.password && (
            <p className="text-red-400 text-sm mt-1">{errors.password}</p>
          )}
        </div>

        {/* Role Select */}
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-[#003300] mb-2">
            Role <span className="text-red-400">*</span>
          </label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            disabled={isSubmitting}
            className={`w-full px-4 py-2 rounded-lg bg-white border ${
              errors.role ? 'border-red-500' : 'border-primary/20'
            } text-[#003300] focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-colors`}
          >
            <option value="student">👨‍🎓 Student</option>
            <option value="trainer">👨‍🏫 Trainer</option>
            <option value="teacher">👨‍🏫 Teacher</option>
            <option value="social">📱 Social (Content Creator)</option>
            <option value="reception">📝 Reception</option>
            <option value="clo">📊 CLO (Chief Learning Officer)</option>
            <option value="admin">⚙️ Admin</option>
            <option value="cto">💻 CTO</option>
            <option value="engineer">🔧 Programmer</option>
            <option value="client">🤝 Client</option>
          </select>
          {errors.role && (
            <p className="text-red-400 text-sm mt-1">{errors.role}</p>
          )}
        </div>

        {/* Phone Input (Optional) */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-[#003300] mb-2">
            Phone Number <span className="text-[#003300]/50 text-xs">(Optional)</span>
          </label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            placeholder="555-1234"
            disabled={isSubmitting}
          />
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-primary/10">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
          >
            {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create User' : 'Update User'}
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
            <p className="text-[#003300] font-medium">Are you sure you want to leave?</p>
            <p className="text-sm text-[#003300]/60 mt-1">
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
