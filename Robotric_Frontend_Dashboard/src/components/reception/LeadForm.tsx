/**
 * LeadForm Component
 *
 * Modal form for creating/editing leads with all required fields
 */

import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { Modal, Button, Input, ConfirmDialog } from '../ui';
import { Plus, Trash2 } from 'lucide-react';
import type { CreateLeadRequest, Lead } from '../../hooks/reception/useReceptionLeads';
import { useReceptionInterests } from '../../hooks/reception/useReceptionInterests';

/**
 * Props for LeadForm component
 */
interface LeadFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateLeadRequest) => Promise<void>;
  initialData?: Lead | null;
  mode?: 'create' | 'edit';
}

/**
 * Form data interface
 */
interface FormData {
  fullName: string;
  englishName: string;
  firstName: string;
  lastName: string;
  gender: string;
  fatherName: string;
  motherName: string;
  dateOfBirth: string;
  age: string;
  residence: string;
  schoolName: string;
  mobileNumber: string;
  mobileNumberLabel: string;
  additionalNumbers: { number: string; label: string }[];
  socialMedia: { platform: string; handle: string }[];
  interestField: string;
  referralSource: string;
  notes: string;
  leadDate: string;
  status: string;
}

/**
 * LeadForm Component
 */
export const LeadForm: React.FC<LeadFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode = 'create'
}) => {
  const { t: tConfirm } = useTranslation('dashboardCommon');
  const todayStr = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    englishName: '',
    firstName: '',
    lastName: '',
    gender: '',
    fatherName: '',
    motherName: '',
    dateOfBirth: '',
    age: '',
    residence: '',
    schoolName: '',
    mobileNumber: '',
    mobileNumberLabel: 'Main',
    additionalNumbers: [],
    socialMedia: [],
    interestField: '',
    referralSource: '',
    notes: '',
    leadDate: todayStr,
    status: 'interest'
  });

  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [referralType, setReferralType] = useState('select'); // 'select' or 'other'
  const [interestType, setInterestType] = useState('select'); // 'select' or 'other'

  const { interests, fetchInterests } = useReceptionInterests();

  // Fetch interests when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchInterests({ status: 'active' });
    }
  }, [isOpen]);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Load initial data in edit mode
   */
  useEffect(() => {
    if (isOpen && initialData && mode === 'edit') {
      setFormData({
        fullName: initialData.fullName || '',
        englishName: initialData.englishName || '',
        firstName: initialData.firstName || '',
        lastName: initialData.lastName || '',
        gender: initialData.gender || '',
        fatherName: initialData.fatherName || '',
        motherName: initialData.motherName || '',
        dateOfBirth: initialData.dateOfBirth ? initialData.dateOfBirth.split('T')[0] : '',
        age: initialData.age?.toString() || '',
        residence: initialData.residence || '',
        schoolName: initialData.schoolName || '',
        mobileNumber: initialData.mobileNumber || '',
        mobileNumberLabel: initialData.mobileNumberLabel || 'Main',
        additionalNumbers: initialData.additionalNumbers || [],
        socialMedia: initialData.socialMedia || [],
        interestField: initialData.interestField || '',
        referralSource: initialData.referralSource || '',
        notes: initialData.notes || '',
        leadDate: initialData.leadDate
          ? initialData.leadDate.split('T')[0]
          : (initialData.createdAt ? initialData.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
        status: initialData.status || 'interest'
      });
      setIsDirty(false);
    } else if (isOpen && mode === 'create') {
      // Reset form for create mode
      setFormData({
        fullName: '',
        englishName: '',
        firstName: '',
        lastName: '',
        gender: '',
        fatherName: '',
        motherName: '',
        dateOfBirth: '',
        age: '',
        residence: '',
        schoolName: '',
        mobileNumber: '',
        mobileNumberLabel: 'Main',
        additionalNumbers: [],
        socialMedia: [],
        interestField: '',
        referralSource: '',
        notes: '',
        leadDate: new Date().toISOString().split('T')[0],
        status: 'interest'
      });
      setIsDirty(false);
    }
    setErrors({});
  }, [isOpen, initialData, mode]);

  /**
   * Handle input change
   */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setIsDirty(true);

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Auto-generate Arabic Full Name (both create and edit modes)
  useEffect(() => {
    const parts = [formData.firstName, formData.fatherName, formData.lastName].filter(Boolean);
    if (parts.length > 0) {
      setFormData(prev => ({ ...prev, fullName: parts.join(' ') }));
    }
  }, [formData.firstName, formData.fatherName, formData.lastName]);

  // Auto-calculate age from DOB
  useEffect(() => {
    if (formData.dateOfBirth) {
      const dob = new Date(formData.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      // Only update if age is valid and non-negative
      if (age >= 0) {
        setFormData(prev => ({ ...prev, age: age.toString() }));
      }
    }
  }, [formData.dateOfBirth]);

  const handleClose = () => {
    if (isDirty) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  const handleAddNumber = () => {
    setFormData(prev => ({
      ...prev,
      additionalNumbers: [...prev.additionalNumbers, { number: '', label: '' }]
    }));
    setIsDirty(true);
  };

  const handleRemoveNumber = (index: number) => {
    setFormData(prev => ({
      ...prev,
      additionalNumbers: prev.additionalNumbers.filter((_, i) => i !== index)
    }));
    setIsDirty(true);
  };

  const handleNumberChange = (index: number, field: 'number' | 'label', value: string) => {
    const newNumbers = [...formData.additionalNumbers];
    newNumbers[index] = { ...newNumbers[index], [field]: value };
    setFormData(prev => ({ ...prev, additionalNumbers: newNumbers }));
    setIsDirty(true);
  };

  const handleAddSocial = () => {
    setFormData(prev => ({
      ...prev,
      socialMedia: [...prev.socialMedia, { platform: 'Instagram', handle: '' }]
    }));
    setIsDirty(true);
  };

  const handleRemoveSocial = (index: number) => {
    setFormData(prev => ({
      ...prev,
      socialMedia: prev.socialMedia.filter((_, i) => i !== index)
    }));
    setIsDirty(true);
  };

  const handleSocialChange = (index: number, field: 'platform' | 'handle', value: string) => {
    const newSocial = [...formData.socialMedia];
    newSocial[index] = { ...newSocial[index], [field]: value };
    setFormData(prev => ({ ...prev, socialMedia: newSocial }));
    setIsDirty(true);
  };

  /**
   * Validate form
   */
  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.mobileNumber.trim()) {
      newErrors.mobileNumber = 'Mobile number is required';
    }

    if (formData.age) {
      const age = parseInt(formData.age);
      if (isNaN(age) || age < 3 || age > 100) {
        newErrors.age = 'Age must be between 3 and 100';
      }
    }


    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      setIsSubmitting(true);

      const submitData: CreateLeadRequest = {
        fullName: formData.fullName,
        englishName: formData.englishName || undefined,
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined,
        gender: (formData.gender as any) || undefined,
        fatherName: formData.fatherName || undefined,
        motherName: formData.motherName || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        age: formData.age ? parseInt(formData.age) : undefined,
        residence: formData.residence || undefined,
        schoolName: formData.schoolName || undefined,
        mobileNumber: formData.mobileNumber,
        mobileNumberLabel: formData.mobileNumberLabel,
        additionalNumbers: formData.additionalNumbers.filter(n => n.number.trim()),
        socialMedia: formData.socialMedia.filter(s => s.platform.trim() && s.handle.trim()),
        interestField: formData.interestField || undefined,
        referralSource: formData.referralSource || undefined,
        notes: formData.notes || undefined,
        leadDate: formData.leadDate || undefined,
        status: (formData.status as any) || 'interest'
      };

      await onSubmit(submitData);
      onClose();
    } catch (err: any) {
      setErrors({ submit: err.message || 'Failed to save lead' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === 'create' ? 'Add New Lead' : 'Edit Lead'}
      size="lg"
      closeOnOverlayClick={false}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error message */}
        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {errors.submit}
          </div>
        )}

        {/* Grid layout for form fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Full Name (Arabic) */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Full Name (Arabic) <span className="text-red-500">*</span>
            </label>
            <Input
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Auto-generated from First + Father + Last Name"
              className="bg-gray-50 cursor-not-allowed"
              disabled={true}
              readOnly={true}
            />
            {errors.fullName && (
              <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>
            )}
            <p className="text-xs text-zinc-500 mt-1">
              Auto-generating from First, Father, and Last names.
            </p>
          </div>

          {/* English Name */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Full Name (English)
            </label>
            <Input
              name="englishName"
              value={formData.englishName}
              onChange={handleChange}
              placeholder="Enter full name in English"
            />
          </div>

          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              First Name
            </label>
            <Input
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="First name"
            />
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Last Name
            </label>
            <Input
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Last name"
            />
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Gender
            </label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg bg-white border border-zinc-300 text-zinc-900 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-colors"
            >
              <option value="">-- Select --</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Age */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Age
            </label>
            <Input
              name="age"
              type="number"
              value={formData.age}
              onChange={handleChange}
              placeholder="Auto-calculated from DOB"
              className="bg-gray-50 cursor-not-allowed"
              disabled={true}
              readOnly={true}
            />
            <p className="text-xs text-zinc-500 mt-1">
              Auto-calculated from Date of Birth
            </p>
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Date of Birth
            </label>
            <Input
              name="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={handleChange}
            />
          </div>

          {/* Father Name */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Father's Name
            </label>
            <Input
              name="fatherName"
              value={formData.fatherName}
              onChange={handleChange}
              placeholder="Father's name"
            />
          </div>

          {/* Mother Name */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Mother's Name
            </label>
            <Input
              name="motherName"
              value={formData.motherName}
              onChange={handleChange}
              placeholder="Mother's name"
            />
          </div>

          {/* Mobile Number */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Mobile Numbers <span className="text-red-500">*</span>
            </label>
            
            {/* Main Number */}
            <div className="flex gap-2 mb-2">
              <div className="w-1/3">
                <Input
                  name="mobileNumberLabel"
                  value={formData.mobileNumberLabel}
                  onChange={handleChange}
                  placeholder="Label (e.g. Main)"
                />
              </div>
              <div className="flex-1">
                <Input
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleChange}
                  placeholder="Main Mobile Number"
                  className={errors.mobileNumber ? 'border-red-500' : ''}
                />
              </div>
              <div className="w-10"></div> {/* Spacer for alignment */}
            </div>
            {errors.mobileNumber && (
              <p className="text-red-500 text-sm mt-1 mb-2">{errors.mobileNumber}</p>
            )}

            {/* Additional Numbers */}
            {formData.additionalNumbers.map((num, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <div className="w-1/3">
                  <Input
                    value={num.label}
                    onChange={(e) => handleNumberChange(index, 'label', e.target.value)}
                    placeholder="Label"
                  />
                </div>
                <div className="flex-1">
                  <Input
                    value={num.number}
                    onChange={(e) => handleNumberChange(index, 'number', e.target.value)}
                    placeholder="Additional Number"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveNumber(index)}
                  className="w-10 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleAddNumber}
              leftIcon={<Plus className="w-4 h-4" />}
              className="mt-2 text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50"
            >
              Add Number
            </Button>
          </div>

          {/* Social Media */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Social Media
            </label>
            
            {formData.socialMedia.map((social, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <div className="w-1/3">
                  <select
                    value={social.platform}
                    onChange={(e) => handleSocialChange(index, 'platform', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-white border border-zinc-300 text-zinc-900 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-colors"
                  >
                    <option value="Instagram">Instagram</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Twitter">Twitter</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="TikTok">TikTok</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="flex-1">
                  <Input
                    value={social.handle}
                    onChange={(e) => handleSocialChange(index, 'handle', e.target.value)}
                    placeholder="Username / Link"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveSocial(index)}
                  className="w-10 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleAddSocial}
              leftIcon={<Plus className="w-4 h-4" />}
              className="mt-2 text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50"
            >
              Add Social Media
            </Button>
          </div>



          {/* Residence */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Residence / Address
            </label>
            <Input
              name="residence"
              value={formData.residence}
              onChange={handleChange}
              placeholder="Address or location"
            />
          </div>

          {/* School Name */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              School Name / Specialization
            </label>
            <Input
              name="schoolName"
              value={formData.schoolName}
              onChange={handleChange}
              placeholder="School or specialization"
            />
          </div>



          {/* Interest Field */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Interest Field / Course
            </label>
            <div className="space-y-2">
              <select
                value={interests.some(i => i.name === formData.interestField) ? formData.interestField : (formData.interestField ? 'Other' : '')}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'Other') {
                    setInterestType('Other');
                    setFormData(prev => ({ ...prev, interestField: '' }));
                  } else {
                    setInterestType('select');
                    setFormData(prev => ({ ...prev, interestField: val }));
                  }
                  setIsDirty(true);
                }}
                className="w-full px-4 py-2 rounded-lg bg-white border border-zinc-300 text-zinc-900 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-colors"
              >
                <option value="">-- Select Interest --</option>
                {interests.map(interest => (
                  <option key={interest._id} value={interest.name}>
                    {interest.name}
                  </option>
                ))}
                <option value="Other">Other</option>
              </select>
              
              {(interestType === 'Other' || (!interests.some(i => i.name === formData.interestField) && formData.interestField !== '')) ? (
                 <Input
                   name="interestField"
                   value={formData.interestField}
                   onChange={handleChange}
                   placeholder="Specify interest..."
                 />
              ) : null}
            </div>
          </div>

          {/* Referral Source */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Referral Source
            </label>
            <div className="space-y-2">
              <select
                value={['Instagram', 'Facebook', 'Google', 'Friend', 'Walk-in'].includes(formData.referralSource) ? formData.referralSource : (formData.referralSource ? 'Other' : '')}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'Other') {
                    setReferralType('Other');
                    setFormData(prev => ({ ...prev, referralSource: '' }));
                  } else {
                    setReferralType('select');
                    setFormData(prev => ({ ...prev, referralSource: val }));
                  }
                  setIsDirty(true);
                }}
                className="w-full px-4 py-2 rounded-lg bg-white border border-zinc-300 text-zinc-900 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-colors"
              >
                <option value="">-- Select --</option>
                <option value="Instagram">Instagram</option>
                <option value="Facebook">Facebook</option>
                <option value="Google">Google</option>
                <option value="Friend">Friend</option>
                <option value="Walk-in">Walk-in</option>
                <option value="Other">Other</option>
              </select>
              
              {(!['Instagram', 'Facebook', 'Google', 'Friend', 'Walk-in'].includes(formData.referralSource) && formData.referralSource !== '') || (formData.referralSource === '' && referralType === 'Other') ? (
                 <Input
                   name="referralSource"
                   value={formData.referralSource}
                   onChange={handleChange}
                   placeholder="Please specify..."
                 />
              ) : null}
            </div>
          </div>

          {/* Notes */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Notes / Remarks
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Additional notes or comments..."
              rows={3}
              className="w-full px-4 py-2 rounded-lg bg-white border border-zinc-300 text-zinc-900 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-colors resize-none"
            />
          </div>

          {/* Lead Date */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Lead Date <span className="text-red-500">*</span>
            </label>
            <Input
              name="leadDate"
              type="date"
              value={formData.leadDate}
              onChange={handleChange}
            />
            <p className="text-xs text-zinc-500 mt-1">
              The date this lead was acquired or first contacted
            </p>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200">
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
            className="bg-green-500 hover:bg-green-600"
          >
            {isSubmitting
              ? mode === 'create'
                ? 'Creating...'
                : 'Saving...'
              : mode === 'create'
              ? 'Create Lead'
              : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>

    <ConfirmDialog
      isOpen={showConfirmClose}
      onClose={() => setShowConfirmClose(false)}
      onConfirm={() => {
        setShowConfirmClose(false);
        onClose();
      }}
      title={tConfirm('discard.title')}
      description={tConfirm('discard.text')}
      confirmText={tConfirm('discard.confirm')}
      cancelText={tConfirm('discard.keep')}
      variant="danger"
      primaryAction="cancel"
    />
    </>
  );
};
