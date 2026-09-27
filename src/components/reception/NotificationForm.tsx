/**
 * NotificationForm Component
 *
 * Form for composing and sending custom push notifications
 */

import React, { useState, useEffect } from 'react';
import { Bell, Send, Users, BookOpen, UserCheck } from 'lucide-react';
import { Button, Input, Select, CardComponent, CardBody } from '../ui';
import { StudentMultiSelect } from './StudentMultiSelect';
import type { Course, Group, Student } from '../../hooks/common/useNotifications';

interface NotificationFormProps {
  onSubmit: (data: {
    title: string;
    body: string;
    targetType: 'all' | 'course' | 'group' | 'students';
    targetIds?: string | string[];
  }) => Promise<void>;
  isLoading?: boolean;
  courses: Course[];
  groups: Group[];
  students: Student[];
  onFetchCourses: () => Promise<void>;
  onFetchGroups: (courseId?: string) => Promise<void>;
  onFetchStudents: () => Promise<void>;
}

interface FormData {
  title: string;
  body: string;
  targetType: 'all' | 'course' | 'group' | 'students';
  courseId: string;
  groupId: string;
  studentIds: string[];
}

interface FormErrors {
  title?: string;
  body?: string;
  targetType?: string;
  courseId?: string;
  groupId?: string;
  studentIds?: string;
  submit?: string;
}

export const NotificationForm: React.FC<NotificationFormProps> = ({
  onSubmit,
  isLoading = false,
  courses,
  groups,
  students,
  onFetchCourses,
  onFetchGroups,
  onFetchStudents
}) => {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    body: '',
    targetType: 'all',
    courseId: '',
    groupId: '',
    studentIds: []
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch initial data
  useEffect(() => {
    onFetchCourses();
    onFetchStudents();
  }, [onFetchCourses, onFetchStudents]);

  // Fetch groups when course is selected
  useEffect(() => {
    if (formData.targetType === 'group' && formData.courseId) {
      onFetchGroups(formData.courseId);
    } else if (formData.targetType === 'group') {
      onFetchGroups();
    }
  }, [formData.targetType, formData.courseId, onFetchGroups]);

  /**
   * Validate form
   */
  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    // Title validation
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 100) {
      newErrors.title = 'Title cannot exceed 100 characters';
    }

    // Body validation
    if (!formData.body.trim()) {
      newErrors.body = 'Body is required';
    } else if (formData.body.length > 500) {
      newErrors.body = 'Body cannot exceed 500 characters';
    }

    // Target-specific validation
    if (formData.targetType === 'course') {
      if (!formData.courseId) {
        newErrors.courseId = 'Please select a course';
      }
    } else if (formData.targetType === 'group') {
      if (!formData.groupId) {
        newErrors.groupId = 'Please select a group';
      }
    } else if (formData.targetType === 'students') {
      if (formData.studentIds.length === 0) {
        newErrors.studentIds = 'Please select at least one student';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form input changes
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error for this field
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }

    // Reset dependent fields when target type changes
    if (name === 'targetType') {
      setFormData(prev => ({
        ...prev,
        targetType: value as 'all' | 'course' | 'group' | 'students',
        courseId: '',
        groupId: '',
        studentIds: []
      }));
    }

    // Reset group when course changes
    if (name === 'courseId') {
      setFormData(prev => ({ ...prev, courseId: value, groupId: '' }));
    }
  };

  /**
   * Handle student selection change
   */
  const handleStudentIdsChange = (selectedIds: string[]) => {
    setFormData(prev => ({ ...prev, studentIds: selectedIds }));
    if (errors.studentIds) {
      setErrors(prev => ({ ...prev, studentIds: undefined }));
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      setIsSubmitting(true);
      setErrors({});

      // Prepare targetIds based on targetType
      let targetIds: string | string[] | undefined;
      if (formData.targetType === 'course') {
        targetIds = formData.courseId;
      } else if (formData.targetType === 'group') {
        targetIds = formData.groupId;
      } else if (formData.targetType === 'students') {
        targetIds = formData.studentIds;
      }

      await onSubmit({
        title: formData.title.trim(),
        body: formData.body.trim(),
        targetType: formData.targetType,
        targetIds
      });

      // Reset form on success
      setFormData({
        title: '',
        body: '',
        targetType: 'all',
        courseId: '',
        groupId: '',
        studentIds: []
      });
    } catch (err: any) {
      setErrors({ submit: err.message || 'Failed to send notification' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Prepare select options
  const courseOptions = courses.map(course => ({
    value: course._id,
    label: course.title
  }));

  const groupOptions = groups.map(group => ({
    value: group._id,
    label: `${group.name} (${group.courseId?.title || 'N/A'})`
  }));

  return (
    <CardComponent>
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#003300]">Send Notification</h2>
              <p className="text-sm text-[#003300]/60">Compose and send push notifications to users</p>
            </div>
          </div>

          {/* Error message */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {errors.submit}
            </div>
          )}

          {/* Title */}
          <div>
            <Input
              name="title"
              label="Notification Title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter notification title..."
              error={errors.title}
              maxLength={100}
              required
            />
            <div className="text-xs text-[#003300]/60 mt-1">
              {formData.title.length}/100 characters
            </div>
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium text-[#003300] mb-2">
              Notification Body <span className="text-red-500">*</span>
            </label>
            <textarea
              name="body"
              value={formData.body}
              onChange={handleChange}
              placeholder="Enter notification message..."
              rows={4}
              maxLength={500}
              required
              className={`w-full px-4 py-2.5 rounded-lg border transition-all duration-200 ${
                errors.body
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-primary/20 focus:border-primary focus:ring-primary/20'
              } bg-white text-[#003300] placeholder:text-[#003300]/40 focus:outline-none focus:ring-2`}
            />
            {errors.body && (
              <p className="text-sm text-red-600 mt-1">{errors.body}</p>
            )}
            <div className="text-xs text-[#003300]/60 mt-1">
              {formData.body.length}/500 characters
            </div>
          </div>

          {/* Target Type */}
          <div>
            <label className="block text-sm font-medium text-[#003300] mb-3">
              Target Audience <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <label
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-all ${
                  formData.targetType === 'all'
                    ? 'border-primary bg-primary/5'
                    : 'border-[#003300]/10 hover:border-[#003300]/20'
                }`}
              >
                <input
                  type="radio"
                  name="targetType"
                  value="all"
                  checked={formData.targetType === 'all'}
                  onChange={handleChange}
                  className="text-primary focus:ring-primary"
                />
                <Users className="h-5 w-5 text-[#003300]" />
                <span className="text-sm font-medium text-[#003300]">All Users</span>
              </label>

              <label
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-all ${
                  formData.targetType === 'course'
                    ? 'border-primary bg-primary/5'
                    : 'border-[#003300]/10 hover:border-[#003300]/20'
                }`}
              >
                <input
                  type="radio"
                  name="targetType"
                  value="course"
                  checked={formData.targetType === 'course'}
                  onChange={handleChange}
                  className="text-primary focus:ring-primary"
                />
                <BookOpen className="h-5 w-5 text-[#003300]" />
                <span className="text-sm font-medium text-[#003300]">Course</span>
              </label>

              <label
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-all ${
                  formData.targetType === 'group'
                    ? 'border-primary bg-primary/5'
                    : 'border-[#003300]/10 hover:border-[#003300]/20'
                }`}
              >
                <input
                  type="radio"
                  name="targetType"
                  value="group"
                  checked={formData.targetType === 'group'}
                  onChange={handleChange}
                  className="text-primary focus:ring-primary"
                />
                <Users className="h-5 w-5 text-[#003300]" />
                <span className="text-sm font-medium text-[#003300]">Group</span>
              </label>

              <label
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-all ${
                  formData.targetType === 'students'
                    ? 'border-primary bg-primary/5'
                    : 'border-[#003300]/10 hover:border-[#003300]/20'
                }`}
              >
                <input
                  type="radio"
                  name="targetType"
                  value="students"
                  checked={formData.targetType === 'students'}
                  onChange={handleChange}
                  className="text-primary focus:ring-primary"
                />
                <UserCheck className="h-5 w-5 text-[#003300]" />
                <span className="text-sm font-medium text-[#003300]">Students</span>
              </label>
            </div>
            {errors.targetType && (
              <p className="text-sm text-red-600 mt-1">{errors.targetType}</p>
            )}
          </div>

          {/* Course Selection */}
          {formData.targetType === 'course' && (
            <div>
              <Select
                value={formData.courseId}
                onChange={(value) => {
                  setFormData(prev => ({ ...prev, courseId: value }));
                  if (errors.courseId) {
                    setErrors(prev => ({ ...prev, courseId: undefined }));
                  }
                }}
                options={courseOptions}
                placeholder="Select a course..."
              />
              {errors.courseId && (
                <p className="text-sm text-red-600 mt-1">{errors.courseId}</p>
              )}
            </div>
          )}

          {/* Group Selection */}
          {formData.targetType === 'group' && (
            <div>
              <div className="mb-3">
                <Select
                  value={formData.courseId}
                  onChange={(value) => {
                    setFormData(prev => ({ ...prev, courseId: value, groupId: '' }));
                  }}
                  options={courseOptions}
                  placeholder="Filter by course (optional)..."
                />
              </div>
              <Select
                value={formData.groupId}
                onChange={(value) => {
                  setFormData(prev => ({ ...prev, groupId: value }));
                  if (errors.groupId) {
                    setErrors(prev => ({ ...prev, groupId: undefined }));
                  }
                }}
                options={groupOptions}
                placeholder="Select a group..."
              />
              {errors.groupId && (
                <p className="text-sm text-red-600 mt-1">{errors.groupId}</p>
              )}
            </div>
          )}

          {/* Student Selection */}
          {formData.targetType === 'students' && (
            <StudentMultiSelect
              students={students}
              selectedIds={formData.studentIds}
              onChange={handleStudentIdsChange}
              error={errors.studentIds}
            />
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#003300]/10">
            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              {isSubmitting || isLoading ? 'Sending...' : 'Send Notification'}
            </Button>
          </div>
        </form>
      </CardBody>
    </CardComponent>
  );
};
