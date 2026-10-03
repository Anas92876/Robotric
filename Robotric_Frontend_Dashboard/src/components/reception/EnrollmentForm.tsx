/**
 * EnrollmentForm Component
 *
 * Multi-step form for enrolling students in courses:
 * - Step 1: Select student
 * - Step 2: Select course
 * - Step 3: Select group (optional)
 * - Step 4: Set payment plan
 * - Form validation and error handling
 *
 * UPDATED: Light mode with brand colors (dark green & cream)
 */

import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Input, Switch, Alert, useToast } from '../ui';
import { AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react';
import { api } from '../../lib/api';
import type { Course, Group, Student, CreateEnrollmentRequest } from '../../hooks';

/**
 * Props for EnrollmentForm component
 */
interface EnrollmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateEnrollmentRequest & { paidNow?: number }) => Promise<void>;
  availableCourses: Course[];
  availableGroups: Group[];
  availableStudents: Student[];
  onCourseSelect: (courseId: string) => void;
  onStudentSearch: (courseId?: string) => void;
  exchangeRate?: number;
}

interface InstallmentRow {
  amount: string;
  dueDate: string;
}

/**
 * Form data interface
 */
interface FormData {
  studentId: string;
  courseId: string;
  groupId: string;
  totalAmount: string;
  paidNow: string;
  notes: string;
  installments: InstallmentRow[];
  discount: string;
  transportation: {
    enabled: boolean;
    totalAmount: string;
    paidNow: string;
    installments: InstallmentRow[];
  };
}

/**
 * Form errors interface
 */
interface FormErrors {
  studentId?: string;
  courseId?: string;
  groupId?: string;
  totalAmount?: string;
  paidNow?: string;
  installments?: string;
  discount?: string;
  transportation?: {
    totalAmount?: string;
    paidNow?: string;
    installments?: string;
  };
}

/**
 * EnrollmentForm Component
 */
const DEFAULT_exchangeRate = 120;

export const EnrollmentForm: React.FC<EnrollmentFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  availableCourses,
  availableGroups,
  availableStudents,
  onCourseSelect,
  onStudentSearch,
  exchangeRate = DEFAULT_exchangeRate,
}) => {
  const toast = useToast();
  
  // Currency state
  const [currency, setCurrency] = useState<'USD' | 'SP'>('USD');

  // Form state
  const [formData, setFormData] = useState<FormData>({
    studentId: '',
    courseId: '',
    groupId: '',
    totalAmount: '',
    paidNow: '',
    notes: '',
    installments: [],
    discount: '',
    transportation: {
      enabled: false,
      totalAmount: '',
      paidNow: '',
      installments: []
    }
  });
  
  // Calculate remaining balance helper
  const calculateRemaining = () => {
    const total = parseFloat(formData.totalAmount) || 0;
    const paid = parseFloat(formData.paidNow) || 0;
    return Math.max(0, total - paid);
  };

  // Calculate transportation remaining balance helper
  const calculateTransportationRemaining = () => {
    if (!formData.transportation.enabled) return 0;
    const total = parseFloat(formData.transportation.totalAmount) || 0;
    const paid = parseFloat(formData.transportation.paidNow) || 0;
    return Math.max(0, total - paid);
  };
  
  // Calculate final price based on selected course and discount
  useEffect(() => {
    const selectedCourse = availableCourses.find(c => c._id === formData.courseId);
    if (selectedCourse && selectedCourse.price) {
      let price = selectedCourse.price;
      const discount = parseFloat(formData.discount) || 0;
      
      if (discount > 0 && discount <= 100) {
        price = price - (price * (discount / 100));
      }
      
      setFormData(prev => ({
        ...prev,
        totalAmount: price.toFixed(2)
      }));
    }
  }, [formData.courseId, formData.discount, availableCourses]);

  // Check enrollment when course or group is selected
  useEffect(() => {
    const checkExistingEnrollment = async () => {
      if (!formData.studentId || !formData.courseId) {
        setEnrollmentWarning(null);
        return;
      }

      setIsCheckingEnrollment(true);
      try {
        const params: any = {
          studentId: formData.studentId,
          courseId: formData.courseId
        };
        if (formData.groupId) {
          params.groupId = formData.groupId;
        }

        const response = await api.get('/reception/enrollments/check', { params });
        const data = response.data.data;

        if (data.isEnrolledInCourse) {
          const courseName = data.courseEnrollment?.course?.title || 'this course';
          const studentName = data.courseEnrollment?.student?.name || 'the student';
          setEnrollmentWarning({
            show: true,
            message: `${studentName} is already enrolled in ${courseName} (Status: ${data.courseEnrollment.status}).`,
            type: 'course'
          });
        } else if (formData.groupId && data.isEnrolledInGroup) {
          const groupName = data.groupEnrollment?.groupName || 'this group';
          setEnrollmentWarning({
            show: true,
            message: `The student is already in ${groupName}.`,
            type: 'group'
          });
        } else {
          setEnrollmentWarning(null);
        }
      } catch (error) {
        console.error('Error checking enrollment:', error);
        setEnrollmentWarning(null);
      } finally {
        setIsCheckingEnrollment(false);
      }
    };

    // Only check if we have both student and course selected
    if (formData.studentId && formData.courseId) {
      // Add a small delay to avoid too many API calls
      const timeoutId = setTimeout(checkExistingEnrollment, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setEnrollmentWarning(null);
    }
  }, [formData.studentId, formData.courseId, formData.groupId]);

  // Validation errors
  const [errors, setErrors] = useState<FormErrors>({});

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Current step (1-4)
  const [currentStep, setCurrentStep] = useState(1);

  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const initialFormDataRef = useRef<FormData | null>(null);

  // Enrollment check state
  const [enrollmentWarning, setEnrollmentWarning] = useState<{
    show: boolean;
    message: string;
    type: 'course' | 'group';
  } | null>(null);
  const [isCheckingEnrollment, setIsCheckingEnrollment] = useState(false);

  /**
   * Reset form when modal opens/closes
   */
  useEffect(() => {
    if (isOpen) {
      // Try to load saved data from localStorage
      const savedData = localStorage.getItem('enrollmentFormData');
      let initialData: FormData;
      
      if (savedData) {
        try {
          initialData = JSON.parse(savedData);
        } catch (e) {
          console.error('Error loading saved form data:', e);
          initialData = getInitialFormData();
        }
      } else {
        initialData = getInitialFormData();
      }
      
      setFormData(initialData);
      initialFormDataRef.current = initialData;
      setErrors({});
      setCurrentStep(1);
      setShowConfirmDialog(false);
      onStudentSearch(); // Load all students initially
    } else {
      // Clear saved data when modal closes successfully
      localStorage.removeItem('enrollmentFormData');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  /**
   * Get initial form data
   */
  const getInitialFormData = (): FormData => ({
    studentId: '',
    courseId: '',
    groupId: '',
    totalAmount: '',
    paidNow: '',
    notes: '',
    installments: [],
    discount: '',
    transportation: {
      enabled: false,
      totalAmount: '',
      paidNow: '',
      installments: []
    }
  });

  /**
   * Save form data to localStorage whenever it changes
   */
  useEffect(() => {
    if (isOpen && formData) {
      localStorage.setItem('enrollmentFormData', JSON.stringify(formData));
    }
  }, [formData, isOpen]);

  /**
   * Handle course selection
   */
  useEffect(() => {
    if (formData.courseId) {
      // Fetch groups for selected course
      onCourseSelect(formData.courseId);

      // Fetch students not enrolled in this course
      onStudentSearch(formData.courseId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.courseId]); // Only depend on courseId to prevent infinite loops

  /**
   * Handle adding a new installment row
   */
  const addInstallment = () => {
    setFormData(prev => ({
      ...prev,
      installments: [...prev.installments, { amount: '', dueDate: '' }]
    }));
  };

  /**
   * Handle removing an installment row
   */
  const removeInstallment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      installments: prev.installments.filter((_, i) => i !== index)
    }));
  };

  /**
   * Handle installment change
   */
  const handleInstallmentChange = (index: number, field: keyof InstallmentRow, value: string) => {
    const newInstallments = [...formData.installments];
    newInstallments[index] = { ...newInstallments[index], [field]: value };
    setFormData(prev => ({ ...prev, installments: newInstallments }));
  };

  /**
   * Validate current step
   */
  const validateStep = (step: number): boolean => {
    const newErrors: FormErrors = {};
    const discountValue = parseFloat(formData.discount || '0');

    if (step === 1) {
      // Validate student selection
      if (!formData.studentId) {
        newErrors.studentId = 'Please select a student';
      }
    } else if (step === 2) {
      // Validate course selection
      if (!formData.courseId) {
        newErrors.courseId = 'Please select a course';
      }
    } else if (step === 3) {
      // Validate group selection
      if (!formData.groupId) {
        newErrors.groupId = 'Please select a group';
      }
    } else if (step === 4) {
      // Validate payment details
      const totalAmount = parseFloat(formData.totalAmount || '0');

      // Allow totalAmount = 0 ONLY if discount is 100% (full discount)
      if (
        isNaN(totalAmount) ||
        totalAmount < 0 ||
        (totalAmount === 0 && discountValue < 100)
      ) {
        newErrors.totalAmount = 'Please enter a valid amount or 100% discount';
      }

      let paidNow = 0;
      
      // Validate initial payment
      if (formData.paidNow) {
        paidNow = parseFloat(formData.paidNow);
        if (paidNow < 0) {
          newErrors.paidNow = 'Payment amount cannot be negative';
        } else if (paidNow > totalAmount) {
          newErrors.paidNow = 'Initial payment cannot exceed total amount';
        }
      }

      const remaining = Math.max(0, totalAmount - paidNow);

      // Validate installments if remaining balance > 0
      if (remaining > 0.01) { // Use small epsilon for float comparison
        if (formData.installments.length === 0) {
          newErrors.installments = `Please add installments for the remaining balance of $${remaining.toFixed(2)}`;
        } else {
          let installmentSum = 0;
          let hasEmptyFields = false;

          formData.installments.forEach(inst => {
            if (!inst.amount || !inst.dueDate) {
              hasEmptyFields = true;
            } else {
              installmentSum += parseFloat(inst.amount);
            }
          });

          if (hasEmptyFields) {
            newErrors.installments = 'Please fill in all installment fields';
          } else if (Math.abs(installmentSum - remaining) > 0.01) {
            newErrors.installments = `Installments must equal remaining balance ($${remaining.toFixed(2)}). Current sum: $${installmentSum.toFixed(2)}`;
          }
        }
      }

      // Validate transportation if enabled
      if (formData.transportation.enabled) {
        const transportTotal = parseFloat(formData.transportation.totalAmount || '0');
        const transportPaid = parseFloat(formData.transportation.paidNow || '0');

        if (isNaN(transportTotal) || transportTotal <= 0) {
          newErrors.transportation = {
            ...newErrors.transportation,
            totalAmount: 'Transportation amount must be greater than 0'
          };
        }

        if (transportPaid < 0) {
          newErrors.transportation = {
            ...newErrors.transportation,
            paidNow: 'Transportation payment cannot be negative'
          };
        }

        if (transportPaid > transportTotal) {
          newErrors.transportation = {
            ...newErrors.transportation,
            paidNow: 'Transportation payment cannot exceed total amount'
          };
        }

        const transportRemaining = Math.max(0, transportTotal - transportPaid);

        // Validate transportation installments if remaining balance > 0
        if (transportRemaining > 0) {
          if (formData.transportation.installments.length === 0) {
            newErrors.transportation = {
              ...newErrors.transportation,
              installments: `Please add installments for the remaining transportation balance of ${Math.round(transportRemaining).toLocaleString()} S.P.`
            };
          } else {
            let installmentSum = 0;
            let hasEmptyFields = false;

            formData.transportation.installments.forEach(inst => {
              if (!inst.amount || !inst.dueDate) {
                hasEmptyFields = true;
              } else {
                installmentSum += parseFloat(inst.amount);
              }
            });

            if (hasEmptyFields) {
              newErrors.transportation = {
                ...newErrors.transportation,
                installments: 'Please fill in all transportation installment fields'
              };
            } else if (Math.abs(installmentSum - transportRemaining) > 0) {
              newErrors.transportation = {
                ...newErrors.transportation,
                installments: `Transportation installments must equal remaining balance (${Math.round(transportRemaining).toLocaleString()} S.P.). Current sum: ${Math.round(installmentSum).toLocaleString()} S.P.`
              };
            }
          }
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle next step
   */
  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  /**
   * Handle previous step
   */
  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  /**
   * Handle form input changes
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    // Handle transportation checkbox
    if (name === 'transportationEnabled') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        transportation: {
          ...prev.transportation,
          enabled: checked
        }
      }));
      return;
    }

    // Handle transportation fields
    if (name.startsWith('transportation.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        transportation: {
          ...prev.transportation,
          [field]: value
        }
      }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error for this field
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // If not on the last step, just move to next step
    if (currentStep < 4) {
      handleNext();
      return;
    }

    // Validate final step
    if (!validateStep(4)) {
      return;
    }

    try {
      setIsSubmitting(true);

      const remaining = calculateRemaining();
      const installmentsPayload = remaining > 0.01 
        ? formData.installments.map(inst => ({
            amount: parseFloat(inst.amount),
            dueDate: new Date(inst.dueDate).toISOString()
          }))
        : []; 
        // If remaining is 0, we can effectively send an empty installments array for the remaining logic,
        // or the backend will create a single "paid" installment covering the full amount if we don't send anything.
        // Actually, if paidNow == totalAmount, backend sees totalAmount needed.
        // If we send `installments: []`, backend logic might falter if it expects coverage.
        // BUT, our backend modification logic was: "If custom installments provided... else if plan provided... else single payment".
        // If paidNow cover everything, we technically don't have "future installments".
        // However, the `createEnrollment` call is just creates the record. It doesn't know about `paidNow` (we handle that in UI chaining).
        // So the backend sees `totalAmount`, `paidAmount: 0`. It expects `installments` covering `totalAmount`.
        // Wait! The user says "if payed now is == to the ammount total , so no need for Installments".
        // Ideally, we create the enrollment with 1 installment of full amount (backend default),
        // and then immediately mark it paid via `recordPayment`.
        // So if remaining == 0, we should NOT send `installments` array, letting backend default to 1 full installment.
        // Or we send 1 installment of totalAmount due now. 
        // Let's stick to: If remaining > 0, send custom installments. Else send undefined (let backend default).

      // Process transportation data if enabled
      let transportationPayload = undefined;
      if (formData.transportation.enabled) {
        const transportRemaining = calculateTransportationRemaining();
        const transportInstallmentsPayload = transportRemaining > 0
          ? formData.transportation.installments.map(inst => ({
              amount: parseFloat(inst.amount),
              dueDate: new Date(inst.dueDate).toISOString()
            }))
          : undefined;

        transportationPayload = {
          enabled: true,
          totalAmount: parseFloat(formData.transportation.totalAmount),
          paidNow: formData.transportation.paidNow ? parseFloat(formData.transportation.paidNow) : undefined,
          installments: transportInstallmentsPayload
        };
      }

      const enrollmentData: CreateEnrollmentRequest & { paidNow?: number } = {
        studentId: formData.studentId,
        courseId: formData.courseId,
        groupId: formData.groupId, // Now required, no need for || undefined
        totalAmount: parseFloat(formData.totalAmount),
        installments: remaining > 0.01 ? installmentsPayload : undefined,
        notes: formData.notes || undefined,
        discount: formData.discount ? parseFloat(formData.discount) : undefined,
        paidNow: formData.paidNow ? parseFloat(formData.paidNow) : undefined,
        transportation: transportationPayload
      };

      await onSubmit(enrollmentData);
      setShowConfirmDialog(false);
      onClose();
    } catch (error: any) {
      // Show error message to user
      const errorMessage = error.message || 'Failed to create enrollment';
      toast.error('Enrollment Failed', errorMessage);
      
      // If it's a duplicate enrollment error, go back to step 1 to select different student/course
      if (errorMessage.includes('already enrolled')) {
        setCurrentStep(1);
        setErrors({ studentId: 'This student is already enrolled in this course. Please select a different student or course.' });
      } else {
        setErrors({ totalAmount: errorMessage });
      }
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
    
    return (
      initial.studentId !== current.studentId ||
      initial.courseId !== current.courseId ||
      initial.groupId !== current.groupId ||
      initial.totalAmount !== current.totalAmount ||
      initial.paidNow !== current.paidNow ||
      initial.notes !== current.notes ||
      initial.discount !== current.discount ||
      JSON.stringify(initial.installments) !== JSON.stringify(current.installments) ||
      initial.transportation.enabled !== current.transportation.enabled ||
      initial.transportation.totalAmount !== current.transportation.totalAmount ||
      initial.transportation.paidNow !== current.transportation.paidNow ||
      JSON.stringify(initial.transportation.installments) !== JSON.stringify(current.transportation.installments)
    );
  };

  /**
   * Handle modal close - check for unsaved changes
   */
  const handleClose = () => {
    if (isSubmitting) return;
    
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

  /**
   * Get selected student name
   */
  const getSelectedStudentName = () => {
    const student = availableStudents.find(s => s._id === formData.studentId);
    return student ? student.name : '';
  };

  /**
   * Get selected course name
   */
  const getSelectedCourseName = () => {
    const course = availableCourses.find(c => c._id === formData.courseId);
    if (!course) return '';
    return course.level ? `${course.title} — ${course.level}` : course.title;
  };

  // Student search state
  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  // Filter students based on search term
  const filteredStudents = availableStudents.filter(student =>
    student.name.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(studentSearchTerm.toLowerCase())
  );

  // Safety delay for final step button to prevent double clicks
  const [isReadyToSubmit, setIsReadyToSubmit] = useState(false);
  
  // Collapsible state for transportation section
  const [isTransportationExpanded, setIsTransportationExpanded] = useState(false);

  useEffect(() => {
    if (currentStep === 4) {
      setIsReadyToSubmit(false);
      const timer = setTimeout(() => setIsReadyToSubmit(true), 1000);
      return () => clearTimeout(timer);
    } else {
      setIsReadyToSubmit(false);
    }
  }, [currentStep]);

  return (
    <>
    <Modal
      isOpen={isOpen && !showConfirmDialog}
      onClose={handleClose}
      title="Enroll Student in Course"
      description={`Step ${currentStep} of 4`}
      size="lg"
      closeOnOverlayClick={false}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
 step === currentStep
 ?'bg-cyan-500 text-white shadow-md'
 : step < currentStep
 ?'bg-green-500 text-white shadow-md'
 :'bg-gray-200 text-ink/40'
 }`}
              >
                {step < currentStep ? '✓' : step}
              </div>
              {step < 4 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
 step < currentStep ?'bg-green-500':'bg-gray-200'
 }`}
                ></div>
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Select Student */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-zinc-900">Select Student</h3>

            <div>
              <label htmlFor="studentSearch" className="block text-sm font-medium text-zinc-700 mb-2">
                Search Student
              </label>
              <input
                id="studentSearch"
                type="text"
                placeholder="Search by name or email..."
                value={studentSearchTerm}
                onChange={(e) => setStudentSearchTerm(e.target.value)}
                className="w-full px-4 py-2 mb-4 rounded-lg bg-white border border-zinc-300 text-zinc-900 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-colors"
                autoComplete="off"
              />

              <label htmlFor="studentId" className="block text-sm font-medium text-zinc-700 mb-2">
                Select Student <span className="text-red-500">*</span>
              </label>
              <select
                id="studentId"
                name="studentId"
                value={formData.studentId}
                onChange={handleChange}
                disabled={isSubmitting || availableStudents.length === 0}
                className={`w-full px-4 py-2 rounded-lg bg-white border ${
                  errors.studentId ? 'border-red-500' : 'border-zinc-300'
                } text-zinc-900 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-colors`}
              >
                <option value="">
                  {availableStudents.length === 0
                    ? '-- Loading students... --'
                    : filteredStudents.length === 0
                    ? '-- No students match your search --'
                    : '-- Select a student --'}
                </option>
                {filteredStudents.map((student) => (
                  <option key={student._id} value={student._id}>
                    {student.name} ({student.email})
                  </option>
                ))}
              </select>
              {availableStudents.length === 0 && !isSubmitting && (
                <p className="text-yellow-600 text-sm mt-1">
                  No students available. Please create student accounts first or convert leads to students.
                </p>
              )}
              {errors.studentId && (
                <p className="text-red-500 text-sm mt-1">{errors.studentId}</p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Select Course */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-ink">Select Course</h3>

            <div>
              <label htmlFor="courseId" className="block text-sm font-medium text-ink mb-2">
                Course <span className="text-red-400">*</span>
              </label>
              <select
                id="courseId"
                name="courseId"
                value={formData.courseId}
                onChange={handleChange}
                disabled={isSubmitting}
                className={`w-full px-4 py-2 rounded-lg bg-white border ${
                  errors.courseId ? 'border-red-500' : 'border-primary/20'
                } text-ink focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-colors`}
              >
                <option value="">-- Select a course --</option>
                {availableCourses
                  .filter((c: any) => c.type !== 'bundle')
                  .map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.title}{course.level ? ` — ${course.level}` : ''}
                    </option>
                  ))}
              </select>
              {errors.courseId && (
                <p className="text-red-400 text-sm mt-1">{errors.courseId}</p>
              )}

              {formData.courseId && (
                <div className="mt-4 space-y-2">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-ink/70">
                      Selected: <span className="text-ink font-medium">{getSelectedCourseName()}</span>
                    </p>
                  </div>
                  {enrollmentWarning && enrollmentWarning.type === 'course' && (
                    <Alert variant="warning" className="mt-2">
                      <AlertTriangle className="w-5 h-5" />
                      <div>
                        <p className="font-semibold text-ink">Warning: Already Enrolled</p>
                        <p className="text-sm text-ink/80 mt-1">{enrollmentWarning.message}</p>
                      </div>
                    </Alert>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Select Group */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-ink">Select Group</h3>

            <div>
              <label htmlFor="groupId" className="block text-sm font-medium text-ink mb-2">
                Group <span className="text-red-400">*</span>
              </label>
              <select
                id="groupId"
                name="groupId"
                value={formData.groupId}
                onChange={handleChange}
                disabled={isSubmitting || availableGroups.length === 0}
                className={`w-full px-4 py-2 rounded-lg bg-white border ${
                  errors.groupId ? 'border-red-500' : 'border-primary/20'
                } text-ink focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-colors`}
              >
                <option value="">-- Select a group --</option>
                {availableGroups.map((group) => (
                  <option key={group._id} value={group._id} disabled={group.isFull}>
                    {group.name || 'Unnamed Group'} - {group.availableSeats} seats available
                    {group.isFull ? ' (FULL)' : ''}
                  </option>
                ))}
              </select>

              {errors.groupId && (
                <p className="text-red-400 text-sm mt-1">{errors.groupId}</p>
              )}

              {availableGroups.length === 0 && (
                <p className="text-yellow-600 text-sm mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  No groups available for this course. Please create a group first.
                </p>
              )}

              {enrollmentWarning && enrollmentWarning.type === 'group' && formData.groupId && (
                <Alert variant="warning" className="mt-2">
                  <AlertTriangle className="w-5 h-5" />
                  <div>
                    <p className="font-semibold text-ink">Warning: Already in Group</p>
                    <p className="text-sm text-ink/80 mt-1">{enrollmentWarning.message}</p>
                  </div>
                </Alert>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Payment Plan */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-ink">Payment Plan</h3>
              <div className="flex items-center gap-3 bg-white/50 px-3 py-1.5 rounded-lg border border-primary/10">
                <span className={`text-sm font-medium ${currency === 'USD' ? 'text-primary' : 'text-gray-400'}`}>USD ($)</span>
                <Switch
                  checked={currency === 'SP'}
                  onChange={(checked) => setCurrency(checked ? 'SP' : 'USD')}
                  size="sm"
                />
                <span className={`text-sm font-medium ${currency === 'SP' ? 'text-primary' : 'text-gray-400'}`}>S.P.</span>
              </div>
            </div>

            {/* Total Amount */}
            {/* Discount Section */}
            <div className="mb-4">
              <label htmlFor="discount" className="block text-sm font-medium text-ink mb-2">
                Discount (%) <span className="text-ink/50 text-xs">(Optional)</span>
              </label>
              <Input
                id="discount"
                name="discount"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.discount}
                onChange={handleChange}
                placeholder="0"
                disabled={isSubmitting}
                className={errors.discount ? 'border-red-500' : ''}
              />
              {errors.discount && (
                <p className="text-red-400 text-sm mt-1">{errors.discount}</p>
              )}
            </div>

            {/* Total Amount Display */}
            <div className="mb-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <label className="block text-sm font-medium text-ink mb-1">
                Total Amount ({currency})
              </label>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-ink">
                  {currency === 'USD'
                    ? `$${formData.totalAmount || '0.00'}`
                    : `${(parseFloat(formData.totalAmount || '0') * exchangeRate).toLocaleString()} S.P.`
                  }
                </span>
              </div>
              <p className="text-xs text-ink/40 mt-1">Exchange Rate: $1 = {exchangeRate} S.P.</p>
            </div>

            {/* Number of Installments */}
            {/* Installments Section */}
            {calculateRemaining() > 0.01 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-ink">
                    Installments for Balance ($${calculateRemaining().toFixed(2)} USD) <span className="text-red-400">*</span>
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addInstallment}
                    className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50"
                  >
                    + Add Installment
                  </Button>
                </div>
                <p className="text-xs text-ink/50">
                  Installments are always in USD to protect against exchange rate fluctuations
                </p>

                {formData.installments.map((inst, index) => (
                  <div key={index} className="flex gap-3 items-start">
                    <div className="flex-1">
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-400 text-xs font-bold pt-0.5">
                            $
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Amount"
                          value={inst.amount}
                          onChange={(e) => {
                             handleInstallmentChange(index, 'amount', e.target.value);
                          }}
                          onWheel={(e) => e.currentTarget.blur()}
                          className="w-full pl-12 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <Input
                        type="date"
                        placeholder="Due Date"
                        value={inst.dueDate}
                        onChange={(e) => handleInstallmentChange(index, 'dueDate', e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeInstallment(index)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 mt-1"
                    >
                      ✕
                    </Button>
                  </div>
                ))}
                
                {formData.installments.length === 0 && (
                  <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                     Remaining balance: <strong>
                       ${calculateRemaining().toFixed(2)} USD
                     </strong>. Please add installments in USD.
                  </p>
                )}

                {errors.installments && (
                  <p className="text-red-400 text-sm mt-1">{errors.installments}</p>
                )}
              </div>
            ) : (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
                <span className="font-bold">✓</span> Full Payment. No installments required.
              </div>
            )}

            {/* Paid Now */}
            <div>
              <label htmlFor="paidNow" className="block text-sm font-medium text-ink mb-2">
                Paid Now ({currency}) <span className="text-ink/50 text-xs">(Optional)</span>
              </label>
              <div className="relative">
                 <span className="absolute left-3 top-2 text-gray-500 font-bold">
                   {currency === 'USD' ? '$' : 'S.P.'}
                 </span>
                 <Input
                    id="paidNow"
                    name="paidNow"
                    type="number"
                    step={currency === 'USD' ? "0.01" : "1"}
                    min="0"
                    value={
                      currency === 'USD'
                        ? formData.paidNow
                        : formData.paidNow ? Math.round(parseFloat(formData.paidNow) * exchangeRate).toString() : ''
                    }
                    onChange={(e) => {
                      const inputVal = e.target.value;
                      if (inputVal === '') {
                         setFormData(prev => ({ ...prev, paidNow: '' }));
                      } else {
                         const val = parseFloat(inputVal);
                         if (!isNaN(val)) {
                           const usdVal = currency === 'USD' ? val : val / exchangeRate;
                           setFormData(prev => ({ ...prev, paidNow: usdVal.toString() }));
                         }
                      }
                      if (errors.paidNow) setErrors(prev => ({ ...prev, paidNow: undefined }));
                    }}
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder={currency === 'USD' ? "0.00" : "0"}
                    disabled={isSubmitting}
                    className={`pl-12 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${errors.paidNow ? 'border-red-500' : ''}`}
                 />
              </div>
              {errors.paidNow && (
                <p className="text-red-400 text-sm mt-1">{errors.paidNow}</p>
              )}
            </div>

            {/* Transportation Section */}
            <div className="mt-6 pt-6 border-t border-primary/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="transportationEnabled"
                    name="transportationEnabled"
                    checked={formData.transportation.enabled}
                    onChange={(e) => {
                      handleChange(e);
                      if (e.target.checked) {
                        setIsTransportationExpanded(true);
                      }
                    }}
                    disabled={isSubmitting}
                    className="w-4 h-4 rounded border-primary/20 text-primary focus:ring-primary"
                  />
                  <label htmlFor="transportationEnabled" className="text-sm font-semibold text-ink cursor-pointer">
                    Enable Transportation Payment
                  </label>
                </div>
                {formData.transportation.enabled && (
                  <button
                    type="button"
                    onClick={() => setIsTransportationExpanded(!isTransportationExpanded)}
                    className="text-primary hover:text-ink-deep transition-colors"
                    aria-label={isTransportationExpanded ? 'Collapse transportation section' : 'Expand transportation section'}
                  >
                    {isTransportationExpanded ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                )}
              </div>

              {formData.transportation.enabled && (
                <div className={`space-y-4 pl-7 border-l-2 border-primary/20 transition-all duration-300 ${isTransportationExpanded ? 'opacity-100 max-h-[2000px]' : 'opacity-0 max-h-0 overflow-hidden'}`}>
                  {/* Transportation Total Amount */}
                  <div>
                    <label htmlFor="transportation.totalAmount" className="block text-sm font-medium text-ink mb-2">
                      Transportation Total Amount (S.P.) <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500 font-bold">
                        S.P.
                      </span>
                      <Input
                        id="transportation.totalAmount"
                        name="transportation.totalAmount"
                        type="number"
                        step="1"
                        min="0"
                        value={formData.transportation.totalAmount}
                        onChange={(e) => {
                          const inputVal = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            transportation: { ...prev.transportation, totalAmount: inputVal }
                          }));
                          if (errors.transportation?.totalAmount) {
                            setErrors(prev => ({
                              ...prev,
                              transportation: { ...prev.transportation, totalAmount: undefined }
                            }));
                          }
                        }}
                        placeholder="0"
                        disabled={isSubmitting}
                        className={`pl-12 ${errors.transportation?.totalAmount ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors.transportation?.totalAmount && (
                      <p className="text-red-400 text-sm mt-1">{errors.transportation.totalAmount}</p>
                    )}
                  </div>

                  {/* Transportation Paid Now */}
                  <div>
                    <label htmlFor="transportation.paidNow" className="block text-sm font-medium text-ink mb-2">
                      Transportation Paid Now (S.P.) <span className="text-ink/50 text-xs">(Optional)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500 font-bold">
                        S.P.
                      </span>
                      <Input
                        id="transportation.paidNow"
                        name="transportation.paidNow"
                        type="number"
                        step="1"
                        min="0"
                        value={formData.transportation.paidNow}
                        onChange={(e) => {
                          const inputVal = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            transportation: { ...prev.transportation, paidNow: inputVal }
                          }));
                          if (errors.transportation?.paidNow) {
                            setErrors(prev => ({
                              ...prev,
                              transportation: { ...prev.transportation, paidNow: undefined }
                            }));
                          }
                        }}
                        placeholder="0"
                        disabled={isSubmitting}
                        className={`pl-12 ${errors.transportation?.paidNow ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors.transportation?.paidNow && (
                      <p className="text-red-400 text-sm mt-1">{errors.transportation.paidNow}</p>
                    )}
                  </div>

                  {/* Transportation Installments */}
                  {calculateTransportationRemaining() > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-ink">
                          Transportation Installments ({Math.round(calculateTransportationRemaining()).toLocaleString()} S.P.) <span className="text-red-400">*</span>
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              transportation: {
                                ...prev.transportation,
                                installments: [
                                  ...prev.transportation.installments,
                                  { amount: '', dueDate: '' }
                                ]
                              }
                            }));
                          }}
                          className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50"
                        >
                          + Add Installment
                        </Button>
                      </div>

                      {formData.transportation.installments.map((inst, index) => (
                        <div key={index} className="flex gap-3 items-start">
                          <div className="flex-1">
                            <div className="relative">
                              <span className="absolute left-3 top-2 text-gray-500 font-bold">S.P.</span>
                              <Input
                                type="number"
                                step="1"
                                min="0"
                                value={inst.amount}
                                onChange={(e) => {
                                  const newInstallments = [...formData.transportation.installments];
                                  newInstallments[index].amount = e.target.value;
                                  setFormData(prev => ({
                                    ...prev,
                                    transportation: { ...prev.transportation, installments: newInstallments }
                                  }));
                                }}
                                placeholder="Amount"
                                className="pl-12"
                              />
                            </div>
                          </div>
                          <div className="flex-1">
                            <Input
                              type="date"
                              value={inst.dueDate}
                              onChange={(e) => {
                                const newInstallments = [...formData.transportation.installments];
                                newInstallments[index].dueDate = e.target.value;
                                setFormData(prev => ({
                                  ...prev,
                                  transportation: { ...prev.transportation, installments: newInstallments }
                                }));
                              }}
                              className="w-full"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                transportation: {
                                  ...prev.transportation,
                                  installments: prev.transportation.installments.filter((_, i) => i !== index)
                                }
                              }));
                            }}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                      {errors.transportation?.installments && (
                        <p className="text-red-400 text-sm">{errors.transportation.installments}</p>
                      )}
                    </div>
                  ) : formData.transportation.enabled && formData.transportation.totalAmount && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
                      <span className="font-bold">✓</span> Full Transportation Payment. No installments required.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-ink mb-2">
                Notes <span className="text-ink/50 text-xs">(Optional)</span>
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Any special notes or requirements..."
                disabled={isSubmitting}
                rows={3}
                className="w-full px-4 py-2 rounded-lg bg-white border border-primary/20 text-ink focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-colors resize-none"
              />
            </div>

            {/* Summary */}
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
              <p className="text-base font-semibold text-ink mb-3 pb-2 border-b border-primary/20">Enrollment Summary</p>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-ink/70">Student:</span>
                  <span className="text-sm font-medium text-ink">{getSelectedStudentName() || 'Not selected'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-ink/70">Course:</span>
                  <span className="text-sm font-medium text-ink">{getSelectedCourseName() || 'Not selected'}</span>
                </div>
                {formData.groupId && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-ink/70">Group:</span>
                    <span className="text-sm font-medium text-ink">
                      {availableGroups.find(g => g._id === formData.groupId)?.name || 'Selected'}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-primary/10">
                  {(() => {
                    const discountPct   = parseFloat(formData.discount || '0');
                    const finalTotal    = parseFloat(formData.totalAmount || '0');
                    const originalPrice = discountPct > 0 ? finalTotal / (1 - discountPct / 100) : finalTotal;
                    const discountAmt   = originalPrice - finalTotal;
                    const paidNow       = parseFloat(formData.paidNow || '0');
                    const remaining     = Math.max(0, finalTotal - paidNow);
                    return (
                      <>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-ink/70">Course Total:</span>
                          <span className="text-sm font-medium text-ink">
                            ${originalPrice.toFixed(2)}
                          </span>
                        </div>
                        {discountPct > 0 && (
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-ink/70">Discount ({formData.discount}%):</span>
                            <span className="text-sm font-medium text-green-600">
                              -${discountAmt.toFixed(2)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-ink/70">Paid Now:</span>
                          <span className="text-sm font-medium text-ink">
                            ${paidNow.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center font-semibold pt-1 border-t border-primary/10">
                          <span className="text-sm text-ink">Remaining:</span>
                          <span className="text-sm text-ink">
                            ${remaining.toFixed(2)}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
                {formData.transportation.enabled && (
                  <div className="pt-2 border-t border-primary/10">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-ink/70">Transportation Total:</span>
                      <span className="text-sm font-medium text-ink">
                        {parseFloat(formData.transportation.totalAmount || '0').toLocaleString()} S.P.
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-ink/70">Transportation Paid:</span>
                      <span className="text-sm font-medium text-ink">
                        {parseFloat(formData.transportation.paidNow || '0').toLocaleString()} S.P.
                      </span>
                    </div>
                    <div className="flex justify-between items-center font-semibold pt-1 border-t border-primary/10">
                      <span className="text-sm text-ink">Transportation Remaining:</span>
                      <span className="text-sm text-ink">
                        {(Math.max(0, parseFloat(formData.transportation.totalAmount || '0') - parseFloat(formData.transportation.paidNow || '0'))).toLocaleString()} S.P.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-primary/10">
          <div className="flex gap-2">
            {currentStep > 1 && (
              <Button
                key="prev-btn"
                type="button"
                variant="ghost"
                onClick={handlePrevious}
                disabled={isSubmitting}
              >
                Previous
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              key="cancel-btn"
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            {currentStep < 4 ? (
              <Button
                key={`next-btn-${currentStep}`}
                type="button"
                variant="primary"
                onClick={handleNext}
                className="bg-cyan-500 hover:bg-cyan-600"
              >
                Next
              </Button>
            ) : (
              <Button
                key="submit-enrollment-btn"
                type="submit"
                variant="primary"
                disabled={isSubmitting || !isReadyToSubmit}
                className={`bg-green-500 hover:bg-green-600 ${!isReadyToSubmit ?'opacity-50 cursor-not-allowed':''}`}
                title={!isReadyToSubmit ? "Component initializing..." : "Submit Enrollment"}
              >
                {isSubmitting ? 'Creating...' : 'Create Enrollment'}
              </Button>
            )}
          </div>
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
