/**
 * Session Report Modal Component
 * 
 * Form for creating session reports with:
 * - Notes (required)
 * - Attendance toggle (attended/no-show)
 * - PDF upload (optional)
 */

import React, { useState, useRef } from 'react';
import { Upload, X, FileText, CheckCircle, XCircle } from 'lucide-react';
import { Modal, Button } from '../ui';
import type { SessionRequest } from '../../services/subscription.service';

export interface SessionReportFormData {
  notes: string;
  attendance: boolean;
  pdf?: File;
}

interface SessionReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SessionReportFormData) => Promise<void>;
  session: SessionRequest;
  isSubmitting?: boolean;
}

const SessionReportModal: React.FC<SessionReportModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  session,
  isSubmitting = false,
}) => {
  const [formData, setFormData] = useState<SessionReportFormData>({
    notes: '',
    attendance: true,
    pdf: undefined,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof SessionReportFormData, string>>>({});
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const user = typeof session.userId === 'object' ? session.userId : null;

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof SessionReportFormData, string>> = {};

    if (!formData.notes.trim()) {
      newErrors.notes = 'Notes are required';
    } else if (formData.notes.length > 5000) {
      newErrors.notes = 'Notes must be 5000 characters or less';
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

  const handleFileSelect = (file: File | null) => {
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file only');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setFormData((prev) => ({ ...prev, pdf: file }));
    if (errors.pdf) {
      setErrors((prev) => ({ ...prev, pdf: undefined }));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeFile = () => {
    setFormData((prev) => ({ ...prev, pdf: undefined }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Session Report"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Session Info */}
        <div className="bg-[#003300]/5 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-[#003300] mb-2">Session Details</h4>
          <div className="space-y-1 text-sm">
            <p className="text-[#003300]/80">
              <strong>Student:</strong> {user?.name || 'Unknown'}
            </p>
            <p className="text-[#003300]/80">
              <strong>Date:</strong> {new Date(session.date).toLocaleDateString()}
            </p>
            <p className="text-[#003300]/80">
              <strong>Time:</strong> {session.startTime} ({session.durationHours} hrs)
            </p>
          </div>
        </div>

        {/* Warning */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <p className="text-sm text-orange-700">
            <strong>⚠️ Important:</strong> Hours will be deducted from the student's subscription 
            when you create this report, regardless of attendance status.
          </p>
        </div>

        {/* Attendance Toggle */}
        <div>
          <label className="block text-sm font-medium text-[#003300] mb-3">
            Attendance <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="attendance"
                checked={formData.attendance === true}
                onChange={() => setFormData((prev) => ({ ...prev, attendance: true }))}
                className="w-4 h-4 text-primary border-[#003300]/30 focus:ring-primary/20"
              />
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm text-[#003300]">Attended</span>
              </div>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="attendance"
                checked={formData.attendance === false}
                onChange={() => setFormData((prev) => ({ ...prev, attendance: false }))}
                className="w-4 h-4 text-primary border-[#003300]/30 focus:ring-primary/20"
              />
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm text-[#003300]">No Show</span>
              </div>
            </label>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-[#003300] mb-2">
            Notes <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, notes: e.target.value }));
              if (errors.notes) {
                setErrors((prev) => ({ ...prev, notes: undefined }));
              }
            }}
            rows={6}
            className={`w-full px-4 py-2.5 rounded-lg border bg-white text-[#003300] placeholder-[#003300]/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all ${
              errors.notes
                ? 'border-red-500'
                : 'border-[#003300]/20 hover:border-primary/40'
            }`}
            placeholder="Enter detailed notes about the session..."
            maxLength={5000}
          />
          {errors.notes && (
            <p className="text-red-500 text-xs mt-1">{errors.notes}</p>
          )}
          <p className="text-xs text-[#003300]/50 mt-1">
            {formData.notes.length}/5000 characters
          </p>
        </div>

        {/* PDF Upload */}
        <div>
          <label className="block text-sm font-medium text-[#003300] mb-2">
            PDF Report (Optional)
          </label>
          {!formData.pdf ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
                ${isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-[#003300]/20 hover:border-primary/40 bg-[#003300]/5'
                }
              `}
            >
              <Upload className="w-8 h-8 mx-auto text-[#003300]/40 mb-2" />
              <p className="text-sm text-[#003300]/60 mb-1">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-[#003300]/50">
                PDF only, max 10MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                className="hidden"
              />
            </div>
          ) : (
            <div className="border border-[#003300]/20 rounded-lg p-4 bg-[#003300]/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-[#003300]">
                    {formData.pdf.name}
                  </p>
                  <p className="text-xs text-[#003300]/60">
                    {formatFileSize(formData.pdf.size)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={removeFile}
                className="p-1 hover:bg-red-50 rounded transition-colors"
              >
                <X className="w-4 h-4 text-red-500" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#003300]/10">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isSubmitting}>
            Create Report
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default SessionReportModal;
