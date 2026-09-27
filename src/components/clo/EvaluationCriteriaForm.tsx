/**
 * Evaluation Criteria Form Component
 *
 * Modal form for creating and editing evaluation criteria
 * Allows CLO to configure dynamic evaluation parameters
 *
 * @component EvaluationCriteriaForm
 * @version 2.0.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Plus,
  Trash2,
  Save,
  BookOpen,
  Users,
  Star,
  BarChart3,
  FileText,
  CheckCircle,
  GripVertical,
  AlertCircle
} from 'lucide-react';
import Modal from '../ui/Modal';
import { Button, Badge, Alert, Input, ConfirmDialog } from '../ui';
import { api } from '../../lib/api';

interface Parameter {
  name: string;
  description: string;
  type: 'rating' | 'percentage' | 'grade' | 'boolean' | 'text';
  ratingScale?: {
    min: number;
    max: number;
  };
  weight: number;
  required: boolean;
  order: number;
}

interface FormData {
  name: string;
  description: string;
  appliesTo: 'course' | 'groups';
  courseIds: string[];
  groupIds: string[];
  parameters: Parameter[];
  includeOverallRating: boolean;
  overallRatingScale: {
    min: number;
    max: number;
  };
}

interface EvaluationCriteriaFormProps {
  criteriaId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EvaluationCriteriaForm({
  criteriaId,
  onClose,
  onSuccess
}: EvaluationCriteriaFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    appliesTo: 'course',
    courseIds: [],
    groupIds: [],
    parameters: [],
    includeOverallRating: true,
    overallRatingScale: { min: 1, max: 5 },
  });

  const [courses, setCourses] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [parameterErrors, setParameterErrors] = useState<Record<number, string>>({});

  useEffect(() => {
    fetchCourses();
    if (criteriaId) {
      fetchCriteria();
    } else {
      setFormData({
        name: '',
        description: '',
        appliesTo: 'course',
        courseIds: [],
        groupIds: [],
        parameters: [],
        includeOverallRating: true,
        overallRatingScale: { min: 1, max: 5 },
      });
      setIsDirty(false);
      setParameterErrors({});
    }
  }, [criteriaId]);

  useEffect(() => {
    if (formData.courseIds.length > 0) {
      fetchGroupsForCourses(formData.courseIds);
    } else {
      setGroups([]);
    }
  }, [formData.courseIds]);

  const fetchCourses = async () => {
    try {
      const response = await api.get('/clo/courses', { params: { status: 'published' } });
      setCourses(response.data.data || []);
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  };

  const groupsRequestRef = useRef(0);

  const fetchGroupsForCourses = async (courseIds: string[]) => {
    const requestId = ++groupsRequestRef.current;
    try {
      const allGroups: any[] = [];
      const seen = new Set<string>();

      // If a selected course is a "bucket"/bundle course, also pull in groups
      // from each of its sub-courses. Fetch each course's own details directly
      // (rather than relying on the possibly-stale/published-only `courses`
      // list) so this works correctly in edit mode and for multi-course selections.
      const expandedCourseIds = new Set<string>(courseIds);
      await Promise.all(courseIds.map(async (cid) => {
        let course = courses.find((c) => c._id === cid);
        if (!course?.type) {
          try {
            const res = await api.get(`/clo/courses/${cid}`);
            course = res.data.data;
          } catch (e) {
            console.error(`Error fetching course ${cid}:`, e);
          }
        }
        if (course?.type === 'bundle') {
          (course.bundleCourses || []).forEach((sc: any) => expandedCourseIds.add(sc._id || sc));
        }
      }));

      for (const courseId of expandedCourseIds) {
        const response = await api.get('/clo/groups', { params: { courseId, status: 'active' } });
        for (const g of response.data.data || []) {
          if (!seen.has(g._id)) {
            seen.add(g._id);
            allGroups.push(g);
          }
        }
      }

      // Ignore results from a stale/superseded request (e.g. rapid course toggling)
      if (requestId === groupsRequestRef.current) {
        setGroups(allGroups);
      }
    } catch (err) {
      console.error('Error fetching groups:', err);
    }
  };

  const fetchCriteria = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/clo/evaluation-criteria/${criteriaId}`);
      const data = response.data.data;
      setFormData({
        name: data.name,
        description: data.description || '',
        appliesTo: data.appliesTo,
        courseIds: Array.isArray(data.courseIds)
          ? data.courseIds.filter(Boolean).map((c: any) => c._id || c)
          : (data.courseId ? [data.courseId._id || data.courseId] : []),
        groupIds: (data.groupIds || []).filter(Boolean).map((g: any) => g._id),
        parameters: data.parameters?.map((p: any, index: number) => ({
          name: p.name || '',
          description: p.description || '',
          type: p.type || 'rating',
          ratingScale: p.ratingScale || { min: 1, max: 5 },
          weight: p.weight || 0,
          required: p.required !== undefined ? p.required : true,
          order: p.order !== undefined ? p.order : index
        })) || [],
        includeOverallRating: data.includeOverallRating !== undefined ? data.includeOverallRating : true,
        overallRatingScale: data.overallRatingScale || { min: 1, max: 5 },
      });
      setIsDirty(false);
      setParameterErrors({});
    } catch (err: any) {
      setError(err.message || 'Failed to load criteria');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!formData.courseIds.length) {
      setError('At least one course is required');
      return;
    }
    if (formData.appliesTo === 'groups' && formData.groupIds.length === 0) {
      setError('At least one group must be selected');
      return;
    }

    // Validate that all parameters have a name
    const paramErrors: Record<number, string> = {};
    formData.parameters.forEach((param, index) => {
      if (!param.name || !param.name.trim()) {
        paramErrors[index] = 'Parameter name is required';
      }
      // Validate rating scale if type is rating
      if (param.type === 'rating' && param.ratingScale) {
        if (param.ratingScale.min >= param.ratingScale.max) {
          paramErrors[index] = paramErrors[index] 
            ? `${paramErrors[index]}; Rating scale min must be less than max`
            : 'Rating scale min must be less than max';
        }
      }
    });

    if (Object.keys(paramErrors).length > 0) {
      setParameterErrors(paramErrors);
      const firstErrorIndex = parseInt(Object.keys(paramErrors)[0]);
      setError(`Parameter ${firstErrorIndex + 1} has errors. Please fix all parameter errors.`);
      return;
    }

    // Clear parameter errors if validation passes
    setParameterErrors({});

    // Check if weights sum to 100 if any weight is set
    const totalWeight = formData.parameters.reduce((sum, p) => sum + (p.weight || 0), 0);
    if (totalWeight > 0 && totalWeight !== 100) {
      setError(`Parameter weights must sum to 100% (current: ${totalWeight}%)`);
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      // Filter and format parameters
      const validParameters = formData.parameters
        .filter(p => p.name && p.name.trim())
        .map((p, index) => ({
          name: p.name.trim(),
          description: p.description || '',
          type: p.type,
          ratingScale: p.type === 'rating' ? (p.ratingScale || { min: 1, max: 5 }) : undefined,
          weight: p.weight || 0,
          required: p.required !== undefined ? p.required : true,
          order: index
        }));

      const payload = {
        name: formData.name,
        description: formData.description,
        appliesTo: formData.appliesTo,
        courseIds: formData.courseIds,
        groupIds: formData.appliesTo === 'groups' ? formData.groupIds : [],
        parameters: validParameters,
        includeOverallRating: formData.includeOverallRating,
        overallRatingScale: formData.overallRatingScale,
      };

      if (criteriaId) {
        await api.put(`/clo/evaluation-criteria/${criteriaId}`, payload);
      } else {
        await api.post('/clo/evaluation-criteria', payload);
      }

      setIsDirty(false);
      setParameterErrors({});
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save criteria');
    } finally {
      setIsSaving(false);
    }
  };

  const addParameter = () => {
    setFormData(prev => ({
      ...prev,
      parameters: [
        ...prev.parameters,
        {
          name: '',
          description: '',
          type: 'rating',
          ratingScale: { min: 1, max: 5 },
          weight: 0,
          required: true,
          order: prev.parameters.length
        }
      ]
    }));
    setIsDirty(true);
  };

  const updateParameter = (index: number, field: keyof Parameter, value: any) => {
    setFormData(prev => ({
      ...prev,
      parameters: prev.parameters.map((p, i) =>
        i === index ? { ...p, [field]: value } : p
      )
    }));
    setIsDirty(true);
  };

  const removeParameter = (index: number) => {
    setFormData(prev => ({
      ...prev,
      parameters: prev.parameters.filter((_, i) => i !== index)
    }));
    setIsDirty(true);
  };

  const handleClose = () => {
    if (isDirty) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  const totalWeight = formData.parameters.reduce((sum, p) => sum + (p.weight || 0), 0);

  return (
    <>
    <Modal
      isOpen={true}
      onClose={handleClose}
      title={criteriaId ? 'Edit Evaluation Criteria' : 'Create Evaluation Criteria'}
      description="Configure dynamic evaluation parameters for courses and groups"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Alert */}
        {error && (
          <Alert variant="error">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </Alert>
        )}

        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[#003300] border-b border-[#003300]/10 pb-2">
            Basic Information
          </h3>

          <div>
            <label className="block text-sm font-medium text-[#003300] mb-1">
              Criteria Name <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, name: e.target.value }));
                setIsDirty(true);
              }}
              placeholder="e.g., Robotics Workshop Evaluation"
              leftIcon={<FileText className="w-4 h-4" />}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#003300] mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, description: e.target.value }));
                setIsDirty(true);
              }}
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-[#003300]/20 bg-white text-[#003300] placeholder:text-[#003300]/40 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
              placeholder="Optional description..."
            />
          </div>
        </div>

        {/* Application Scope */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[#003300] border-b border-[#003300]/10 pb-2">
            Application Scope
          </h3>

          <div>
            <label className="block text-sm font-medium text-[#003300] mb-2">
              Courses <span className="text-red-500">*</span>
              <span className="text-xs font-normal text-[#003300]/50 ml-2">(select one or more)</span>
            </label>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-1 border border-[#003300]/10 rounded-lg bg-gray-50">
              {courses.map(course => (
                <label
                  key={course._id}
                  className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all ${
                    formData.courseIds.includes(course._id)
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-[#003300]/10 bg-white hover:border-[#003300]/20'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.courseIds.includes(course._id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData(prev => ({
                          ...prev,
                          courseIds: [...prev.courseIds, course._id],
                          groupIds: []
                        }));
                      } else {
                        setFormData(prev => ({
                          ...prev,
                          courseIds: prev.courseIds.filter(id => id !== course._id),
                          groupIds: []
                        }));
                      }
                      setIsDirty(true);
                    }}
                    className="rounded border-[#003300]/20 text-emerald-500 focus:ring-emerald-500"
                  />
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <BookOpen className="w-4 h-4 text-[#003300]/40 flex-shrink-0" />
                    <span className="text-sm text-[#003300] truncate">{course.title}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#003300] mb-2">
              Applies To <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, appliesTo: 'course' as const, groupIds: [] }));
                  setIsDirty(true);
                }}
                className={`p-4 rounded-lg border-2 transition-all ${
                  formData.appliesTo === 'course'
                    ? 'border-emerald-500 bg-emerald-50 text-[#003300]'
                    : 'border-[#003300]/20 bg-white text-[#003300]/60 hover:border-[#003300]/30'
                }`}
              >
                <BookOpen className="w-6 h-6 mx-auto mb-2" />
                <div className="font-semibold">Entire Course</div>
                <div className="text-xs mt-1">All groups in this course</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, appliesTo: 'groups' as const }));
                  setIsDirty(true);
                }}
                className={`p-4 rounded-lg border-2 transition-all ${
                  formData.appliesTo === 'groups'
                    ? 'border-emerald-500 bg-emerald-50 text-[#003300]'
                    : 'border-[#003300]/20 bg-white text-[#003300]/60 hover:border-[#003300]/30'
                }`}
              >
                <Users className="w-6 h-6 mx-auto mb-2" />
                <div className="font-semibold">Specific Groups</div>
                <div className="text-xs mt-1">Select individual groups</div>
              </button>
            </div>
          </div>

          {formData.appliesTo === 'groups' && (
            <div>
              <label className="block text-sm font-medium text-[#003300] mb-2">
                Select Groups <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 border border-[#003300]/10 rounded-lg bg-gray-50">
                {groups.map(group => (
                  <label
                    key={group._id}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                      formData.groupIds.includes(group._id)
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-[#003300]/10 bg-white hover:border-[#003300]/20'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.groupIds.includes(group._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({
                            ...prev,
                            groupIds: [...prev.groupIds, group._id]
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            groupIds: prev.groupIds.filter(id => id !== group._id)
                          }));
                        }
                        setIsDirty(true);
                      }}
                      className="rounded border-[#003300]/20 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-[#003300]">{group.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Evaluation Parameters */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#003300]/10 pb-2">
            <div>
              <h3 className="text-lg font-semibold text-[#003300]">Evaluation Parameters</h3>
              <p className="text-sm mt-1 text-[#003300]/60">
                Define custom evaluation parameters for this criteria
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={addParameter}
            >
              Add Parameter
            </Button>
          </div>

          {formData.parameters.length === 0 ? (
            <div className="text-center py-8 text-[#003300]/40 bg-gray-50 rounded-lg border border-dashed border-[#003300]/20">
              <p className="mb-2">No parameters added yet</p>
              <p className="text-sm">Click "Add Parameter" to create custom evaluation criteria</p>
            </div>
          ) : (
            <div className="space-y-3">
              {formData.parameters.map((param, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-white rounded-lg border border-[#003300]/20 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <GripVertical className="w-5 h-5 text-[#003300]/40 cursor-move" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="font-semibold text-[#003300]">
                            Parameter {index + 1}
                          </span>
                          {param.required && (
                            <Badge variant="error" size="sm">Required</Badge>
                          )}
                        </div>
                        {parameterErrors[index] && (
                          <Alert variant="error" className="mb-2 py-1">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-xs">{parameterErrors[index]}</span>
                          </Alert>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      leftIcon={<Trash2 className="w-4 h-4" />}
                      onClick={() => removeParameter(index)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-[#003300] mb-1">
                        Parameter Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        value={param.name}
                        onChange={(e) => updateParameter(index, 'name', e.target.value)}
                        placeholder="e.g., Technical Skills, Participation"
                        className={parameterErrors[index]?.includes('name') ? 'border-red-500' : ''}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-[#003300] mb-1">
                        Description
                      </label>
                      <textarea
                        value={param.description}
                        onChange={(e) => updateParameter(index, 'description', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg border border-[#003300]/20 bg-white text-[#003300] placeholder:text-[#003300]/40 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm"
                        placeholder="Optional description for this parameter..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#003300] mb-1">
                        Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={param.type}
                        onChange={(e) => {
                          const newType = e.target.value as Parameter['type'];
                          updateParameter(index, 'type', newType);
                          // Ensure rating scale is set for rating type
                          if (!param.ratingScale) {
                            updateParameter(index, 'ratingScale', { min: 1, max: 5 });
                          }
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-[#003300]/20 bg-white text-[#003300] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm"
                      >
                        <option value="rating">Rating</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#003300] mb-1">
                        Rating Scale
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={param.ratingScale?.min || 1}
                          onChange={(e) => updateParameter(index, 'ratingScale', {
                            ...(param.ratingScale || { min: 1, max: 5 }),
                            min: parseInt(e.target.value) || 1
                          })}
                          className="w-full px-3 py-2 rounded-lg border border-[#003300]/20 bg-white text-[#003300] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm"
                          min="1"
                        />
                        <span className="text-[#003300]/60">to</span>
                        <input
                          type="number"
                          value={param.ratingScale?.max || 5}
                          onChange={(e) => updateParameter(index, 'ratingScale', {
                            ...(param.ratingScale || { min: 1, max: 5 }),
                            max: parseInt(e.target.value) || 5
                          })}
                          className="w-full px-3 py-2 rounded-lg border border-[#003300]/20 bg-white text-[#003300] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm"
                          min="2"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#003300] mb-1">
                        Weight (%)
                      </label>
                      <input
                        type="number"
                        value={param.weight || 0}
                        onChange={(e) => updateParameter(index, 'weight', Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                        className="w-full px-3 py-2 rounded-lg border border-[#003300]/20 bg-white text-[#003300] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm"
                        min="0"
                        max="100"
                        placeholder="0-100"
                      />
                      <p className="text-xs text-[#003300]/60 mt-1">
                        Weight for weighted calculation (optional)
                      </p>
                    </div>

                    <div className="flex items-center gap-3 pt-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={param.required}
                          onChange={(e) => updateParameter(index, 'required', e.target.checked)}
                          className="rounded border-[#003300]/20 text-emerald-500 focus:ring-emerald-500"
                        />
                        <span className="text-sm text-[#003300]">Required</span>
                      </label>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Weight Summary */}
              {totalWeight > 0 && (
                <div className={`p-3 rounded-lg border ${
                  totalWeight === 100 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#003300]">
                      Total Weight: {totalWeight}%
                    </span>
                    {totalWeight !== 100 && (
                      <Badge variant="warning" size="sm">
                        Should be 100%
                      </Badge>
                    )}
                    {totalWeight === 100 && (
                      <Badge variant="success" size="sm">
                        Valid
                      </Badge>
                    )}
                  </div>
                  {totalWeight !== 100 && (
                    <p className="text-xs text-[#003300]/60 mt-1">
                      Parameter weights should sum to 100% for weighted calculations
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Additional Options */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[#003300] border-b border-[#003300]/10 pb-2">
            Additional Options
          </h3>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg border-2 border-emerald-500/30">
              <input
                type="checkbox"
                checked={true}
                disabled
                className="mt-0.5 rounded border-[#003300]/20 text-emerald-500 focus:ring-emerald-500 cursor-not-allowed"
              />
              <div className="flex-1">
                <div className="text-[#003300] font-semibold flex items-center gap-2">
                  Overall Rating (1-5) <Badge variant="success" size="sm">Required</Badge>
                </div>
                <div className="text-sm text-[#003300]/60">Overall rating from 1 to 5 stars - Always included in evaluations</div>
              </div>
            </div>

            {formData.includeOverallRating && (
              <div className="ml-8 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#003300]/70 mb-1">
                    Min Rating
                  </label>
                  <input
                    type="number"
                    value={formData.overallRatingScale.min}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        overallRatingScale: {
                          ...prev.overallRatingScale,
                          min: parseInt(e.target.value)
                        }
                      }));
                      setIsDirty(true);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-[#003300]/20 bg-white text-[#003300] text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    min="1"
                    max="5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#003300]/70 mb-1">
                    Max Rating
                  </label>
                  <input
                    type="number"
                    value={formData.overallRatingScale.max}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        overallRatingScale: {
                          ...prev.overallRatingScale,
                          max: parseInt(e.target.value)
                        }
                      }));
                      setIsDirty(true);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-[#003300]/20 bg-white text-[#003300] text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    min="1"
                    max="5"
                  />
                </div>
                <div className="col-span-2 mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-[#003300]/70">
                    <strong>Note:</strong> Overall rating is always included in evaluations. You can also add custom parameters above.
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#003300]/10">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            leftIcon={<Save className="w-4 h-4" />}
            disabled={isSaving || isLoading}
          >
            {isSaving ? 'Saving...' : criteriaId ? 'Update Criteria' : 'Create Criteria'}
          </Button>
        </div>
      </form>
    </Modal>

    <ConfirmDialog
      isOpen={showConfirmClose}
      onClose={() => setShowConfirmClose(false)}
      onConfirm={() => {
        setShowConfirmClose(false);
        setIsDirty(false);
        onClose();
      }}
      title="Discard Changes?"
      description="You have unsaved changes. Are you sure you want to discard them?"
      confirmText="Discard"
      cancelText="Keep Editing"
      variant="danger"
      primaryAction="cancel"
    />
    </>
  );
}
