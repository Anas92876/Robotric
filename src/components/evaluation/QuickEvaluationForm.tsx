/**
 * QuickEvaluationForm Component
 *
 * Simplified evaluation form with dynamic criteria.
 * Fetches evaluation parameters configured by CLO.
 * Trainer can toggle which parameters to include in each evaluation.
 *
 * @component QuickEvaluationForm
 * @version 3.0.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Save, X, Star, AlertCircle, Loader } from 'lucide-react';
import { RatingInput } from './RatingInput';
import { ConfirmDialog, Badge } from '../ui';
import { api } from '../../lib/api';
import type { QuickEvaluationInput } from '../../types/evaluation.types';

interface QuickEvaluationFormProps {
  studentId: string;
  studentName: string;
  sessionId: string;
  groupId: string;
  onSubmit: (data: QuickEvaluationInput) => Promise<void>;
  onCancel: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
  initialData?: Partial<QuickEvaluationInput>;
}

interface EvaluationParameter {
  name: string;
  description?: string;
  type: 'rating' | 'percentage' | 'grade' | 'boolean' | 'text';
  ratingScale?: {
    min: number;
    max: number;
  };
  weight: number;
  required: boolean;
  order: number;
}

interface EvaluationCriteria {
  _id: string;
  name: string;
  parameters: EvaluationParameter[];
  includeOverallRating: boolean;
  overallRatingScale?: {
    min: number;
    max: number;
  };
}

export const QuickEvaluationForm: React.FC<QuickEvaluationFormProps> = ({
  studentId,
  studentName,
  sessionId,
  groupId,
  onSubmit,
  onCancel,
  onDirtyChange,
  initialData
}) => {
  const [criteria, setCriteria] = useState<EvaluationCriteria | null>(null);
  const [loadingCriteria, setLoadingCriteria] = useState(true);
  const [criteriaError, setCriteriaError] = useState<string | null>(null);

  const [selectedParams, setSelectedParams] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState<any>(() => ({
    studentId,
    sessionId,
    groupId,
    overallRating: initialData?.overallRating || 3,
    parameters: initialData?.parameters || {},
    trainerNotes: initialData?.trainerNotes || ''
  }));

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const initialFormDataRef = useRef<any>(null);

  // Calculate overall rating from selected parameters only
  const calculateOverallRating = React.useCallback((
    parameters: any,
    criteriaParams: EvaluationParameter[],
    selected: Set<string>
  ): number => {
    if (!criteriaParams || criteriaParams.length === 0) return 3;

    let totalWeightedSum = 0;
    let totalWeight = 0;
    let unweightedSum = 0;
    let unweightedCount = 0;

    criteriaParams.forEach((param) => {
      // Skip parameters that are not selected
      if (!selected.has(param.name)) return;

      const paramValue = parameters[param.name];

      if (paramValue !== undefined && paramValue !== null && paramValue !== '') {
        let numericValue = 0;

        switch (param.type) {
          case 'rating':
            numericValue = typeof paramValue === 'number' ? paramValue : parseFloat(paramValue) || 0;
            break;
          case 'percentage':
            numericValue = (parseFloat(paramValue) || 0) / 20;
            break;
          case 'grade': {
            const gradeMap: Record<string, number> = { 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'F': 1 };
            numericValue = gradeMap[paramValue] || 0;
            break;
          }
          case 'boolean':
            numericValue = paramValue === true || paramValue === 'true' ? 5 : 1;
            break;
          default:
            numericValue = 0;
        }

        numericValue = Math.max(1, Math.min(5, numericValue));

        const weight = param.weight || 0;
        if (weight > 0) {
          totalWeightedSum += numericValue * weight;
          totalWeight += weight;
        } else {
          unweightedSum += numericValue;
          unweightedCount++;
        }
      }
    });

    if (totalWeight > 0) {
      return Math.max(1, Math.min(5, Math.round(totalWeightedSum / totalWeight)));
    }
    if (unweightedCount > 0) {
      return Math.max(1, Math.min(5, Math.round(unweightedSum / unweightedCount)));
    }

    return 3;
  }, []);

  // Initialize form data only once when component mounts or key props change
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!isInitializedRef.current || initialFormDataRef.current?.studentId !== studentId ||
        initialFormDataRef.current?.sessionId !== sessionId) {
      const initialFormData = {
        studentId,
        sessionId,
        groupId,
        overallRating: initialData?.overallRating || 3,
        parameters: initialData?.parameters || {},
        trainerNotes: initialData?.trainerNotes || ''
      };
      setFormData(initialFormData);
      initialFormDataRef.current = JSON.parse(JSON.stringify(initialFormData));
      setIsDirty(false);
      isInitializedRef.current = true;
      if (onDirtyChange) onDirtyChange(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, sessionId, groupId]);

  // Update form data when initialData changes (edit mode)
  const initialDataRef = useRef(initialData);
  useEffect(() => {
    if (initialData && !initialDataRef.current && !isDirty) {
      const updatedFormData = {
        studentId,
        sessionId,
        groupId,
        overallRating: initialData.overallRating || 3,
        parameters: initialData.parameters || {},
        trainerNotes: initialData.trainerNotes || ''
      };

      if (criteria && criteria.parameters && criteria.parameters.length > 0 && updatedFormData.parameters) {
        const calculatedRating = calculateOverallRating(updatedFormData.parameters, criteria.parameters, selectedParams);
        updatedFormData.overallRating = calculatedRating;
      }

      setFormData(updatedFormData);
      initialFormDataRef.current = JSON.parse(JSON.stringify(updatedFormData));
      setIsDirty(false);
      initialDataRef.current = initialData;
      if (onDirtyChange) onDirtyChange(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, criteria, calculateOverallRating]);

  // Fetch evaluation criteria for this group
  useEffect(() => {
    const fetchCriteria = async () => {
      try {
        setLoadingCriteria(true);
        setCriteriaError(null);
        const response = await api.get(`/trainer/evaluations/criteria/group/${groupId}`);
        const fetchedCriteria: EvaluationCriteria = response.data.data;
        setCriteria(fetchedCriteria);

        // Initialize selectedParams:
        // - Edit mode: only params that already have a value in initialData
        // - New evaluation: all params selected
        if (initialData?.parameters && Object.keys(initialData.parameters).length > 0) {
          const existingKeys = new Set(Object.keys(initialData.parameters));
          setSelectedParams(existingKeys);
        } else {
          setSelectedParams(new Set(fetchedCriteria.parameters.map((p) => p.name)));
        }
      } catch (err: any) {
        console.error('Error fetching criteria:', err);
        setCriteriaError(err.response?.data?.message || 'No evaluation criteria found for this group');
      } finally {
        setLoadingCriteria(false);
      }
    };

    if (groupId) fetchCriteria();
  }, [groupId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Recalculate overall rating when criteria loads
  useEffect(() => {
    if (criteria && criteria.parameters.length > 0 && formData.parameters) {
      const calculatedRating = calculateOverallRating(formData.parameters, criteria.parameters, selectedParams);
      if (Math.abs(calculatedRating - formData.overallRating) > 0.01) {
        setFormData((prev: any) => ({ ...prev, overallRating: calculatedRating }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criteria]);

  // Recalculate when parameters or selectedParams change
  useEffect(() => {
    if (criteria && criteria.parameters.length > 0) {
      const calculatedRating = calculateOverallRating(formData.parameters, criteria.parameters, selectedParams);
      if (Math.abs(calculatedRating - formData.overallRating) > 0.01) {
        setFormData((prev: any) => ({ ...prev, overallRating: calculatedRating }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.parameters, selectedParams, criteria]);

  // Toggle a parameter on/off
  const toggleParam = (name: string) => {
    setSelectedParams((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
        // Remove value from formData so it won't be submitted
        setFormData((fd: any) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [name]: _removed, ...rest } = fd.parameters;
          return { ...fd, parameters: rest };
        });
      } else {
        next.add(name);
      }
      return next;
    });
    setIsDirty(true);
  };

  // Select / deselect all parameters
  const selectAll = () => {
    if (!criteria) return;
    setSelectedParams(new Set(criteria.parameters.map((p) => p.name)));
    setIsDirty(true);
  };

  const clearAll = () => {
    setSelectedParams(new Set());
    setFormData((fd: any) => ({ ...fd, parameters: {} }));
    setIsDirty(true);
  };

  // Check if form has unsaved changes
  const hasUnsavedChanges = (): boolean => {
    if (!initialFormDataRef.current) return false;
    const initial = initialFormDataRef.current;
    return (
      initial.overallRating !== formData.overallRating ||
      JSON.stringify(initial.parameters) !== JSON.stringify(formData.parameters) ||
      initial.trainerNotes !== formData.trainerNotes
    );
  };

  useEffect(() => {
    const dirty = hasUnsavedChanges();
    setIsDirty(dirty);
    if (onDirtyChange) onDirtyChange(dirty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]);

  const handleClose = () => {
    if (isDirty) {
      setShowConfirmClose(true);
    } else {
      onCancel();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (criteria) {
      // Only validate selected required parameters
      for (const param of criteria.parameters) {
        if (selectedParams.has(param.name) && param.required && !formData.parameters[param.name]) {
          setError(`${param.name} is required`);
          return;
        }
      }

      if (criteria.includeOverallRating && !formData.overallRating) {
        setError('Overall rating is required');
        return;
      }

    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Only submit selected parameter values
      const filteredParameters: Record<string, any> = {};
      selectedParams.forEach((name) => {
        if (formData.parameters[name] !== undefined) {
          filteredParameters[name] = formData.parameters[name];
        }
      });

      const submissionData = {
        ...formData,
        parameters: filteredParameters,
        overallRating: formData.overallRating ? Math.round(formData.overallRating) : formData.overallRating
      };

      await onSubmit(submissionData);
      setIsDirty(false);
      initialFormDataRef.current = JSON.parse(JSON.stringify(formData));
    } catch (err: any) {
      setError(err.message || 'Failed to save evaluation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleParameterChange = (paramName: string, value: any) => {
    setFormData((prev: any) => {
      const updatedParameters = { ...prev.parameters, [paramName]: value };
      const calculatedRating = criteria
        ? calculateOverallRating(updatedParameters, criteria.parameters, selectedParams)
        : prev.overallRating;
      return { ...prev, parameters: updatedParameters, overallRating: calculatedRating };
    });
    setIsDirty(true);
  };

  const renderParameterInput = (param: EvaluationParameter) => {
    const value = formData.parameters[param.name];

    switch (param.type) {
      case 'rating':
        return (
          <RatingInput
            label={param.name}
            description={param.description}
            value={value || param.ratingScale?.min || 1}
            onChange={(rating) => handleParameterChange(param.name, rating)}
            min={param.ratingScale?.min || 1}
            max={param.ratingScale?.max || 5}
            required={param.required}
          />
        );

      case 'percentage':
        return (
          <div>
            <input
              type="number"
              min="0"
              max="100"
              value={value || ''}
              onChange={(e) => handleParameterChange(param.name, parseInt(e.target.value))}
              className="w-full px-4 py-3 bg-white border border-ink/20 rounded-xl text-ink placeholder:text-ink/40 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              placeholder="0–100%"
            />
          </div>
        );

      case 'boolean':
        return (
          <div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleParameterChange(param.name, true)}
                className={`flex-1 p-3 rounded-xl border-2 font-medium transition-all ${
                  value === true
                    ? 'bg-green-50 border-green-500 text-green-700'
                    : 'bg-white border-ink/20 text-ink/60 hover:border-ink/30'
                }`}
              >
                ✓ Yes
              </button>
              <button
                type="button"
                onClick={() => handleParameterChange(param.name, false)}
                className={`flex-1 p-3 rounded-xl border-2 font-medium transition-all ${
                  value === false
                    ? 'bg-red-50 border-red-500 text-red-700'
                    : 'bg-white border-ink/20 text-ink/60 hover:border-ink/30'
                }`}
              >
                ✗ No
              </button>
            </div>
          </div>
        );

      case 'text':
        return (
          <div>
            <textarea
              value={value || ''}
              onChange={(e) => handleParameterChange(param.name, e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-white border border-ink/20 rounded-xl text-ink placeholder:text-ink/40 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              placeholder="Enter your response..."
            />
          </div>
        );

      case 'grade':
        return (
          <div>
            <select
              value={value || ''}
              onChange={(e) => handleParameterChange(param.name, e.target.value)}
              className="w-full px-4 py-3 bg-white border border-ink/20 rounded-xl text-ink focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">Select grade...</option>
              <option value="A">A — Excellent</option>
              <option value="B">B — Good</option>
              <option value="C">C — Satisfactory</option>
              <option value="D">D — Needs Improvement</option>
              <option value="F">F — Unsatisfactory</option>
            </select>
          </div>
        );

      default:
        return null;
    }
  };

  if (loadingCriteria) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl border border-ink/20 shadow-lg p-6"
      >
        <div className="flex items-center justify-center gap-3 py-8">
          <Loader className="w-6 h-6 text-emerald-500 animate-spin" />
          <span className="text-ink">Loading evaluation criteria...</span>
        </div>
      </motion.div>
    );
  }

  if (criteriaError || !criteria) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl border border-ink/20 shadow-lg p-6"
      >
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-ink mb-2">No Evaluation Criteria</h3>
          <p className="text-ink/60 mb-6">
            {criteriaError || 'No evaluation criteria has been configured for this group.'}
          </p>
          <button
            onClick={onCancel}
            className="px-6 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 border border-ink/20 text-ink font-semibold transition-all"
          >
            Close
          </button>
        </div>
      </motion.div>
    );
  }

  const totalParams = criteria.parameters.length;
  const selectedCount = selectedParams.size;
  const allSelected = selectedCount === totalParams;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-2xl border border-ink/20 shadow-lg p-6 space-y-6 max-h-[80vh] overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-ink/10">
        <div>
          <h3 className="text-xl font-bold text-ink">{studentName}</h3>
          <p className="text-sm text-ink/60">{criteria.name}</p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5 text-ink/60" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Overall Rating — auto-calculated */}
        {criteria.includeOverallRating && (
          <div className="space-y-3 p-4 bg-emerald-50 rounded-xl border-2 border-emerald-500/30">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-ink">
                Overall Rating (Auto-calculated)
                <Badge variant="success" size="sm" className="ml-2">Auto</Badge>
              </label>
              <span className="text-2xl font-bold text-emerald-600">
                {formData.overallRating.toFixed(1)} / 5
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => {
                const rating = formData.overallRating;
                const isFilled = star <= Math.floor(rating);
                const isHalfFilled = star === Math.ceil(rating) && rating % 1 >= 0.5 && rating % 1 < 1;
                return (
                  <div key={star} className="relative w-7 h-7">
                    <Star
                      className={`w-7 h-7 transition-all absolute ${
                        isFilled
                          ? 'fill-yellow-400 text-yellow-400 drop-shadow-lg'
                          : 'fill-transparent text-ink/20'
                      }`}
                    />
                    {isHalfFilled && (
                      <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                        <Star className="w-7 h-7 fill-yellow-400 text-yellow-400 drop-shadow-lg" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-ink/60 mt-2">
              {selectedCount > 0 ? (
                <>
                  Calculated from{' '}
                  <span className="font-medium text-emerald-700">
                    {selectedCount} of {totalParams}
                  </span>{' '}
                  selected parameters using weighted average.
                  <span className="block mt-1 font-medium">
                    Formula: Sum(Value × Weight) / Sum(Weights)
                  </span>
                </>
              ) : (
                'Select at least one parameter below to calculate the rating.'
              )}
            </p>
          </div>
        )}

        {/* Parameters section */}
        <div>
          {/* Section header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-ink">Evaluation Parameters</h4>
              <p className="text-xs text-ink/50 mt-0.5">
                <span className={`font-semibold ${selectedCount === 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                  {selectedCount}
                </span>
                {' of '}
                {totalParams} selected
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium">
              {!allSelected && (
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
                >
                  Select All
                </button>
              )}
              {selectedCount > 0 && (
                <>
                  {!allSelected && <span className="text-ink/20">|</span>}
                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-ink/40 hover:text-ink/70 hover:underline transition-colors"
                  >
                    Clear All
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Parameter cards */}
          <div className="space-y-3">
            {criteria.parameters
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((param, index) => {
                const isSelected = selectedParams.has(param.name);
                return (
                  <motion.div
                    key={index}
                    layout
                    transition={{ duration: 0.2 }}
                    className={`rounded-xl border-2 transition-all duration-200 ${
                      isSelected
                        ? 'border-ink/15 bg-white shadow-sm'
                        : 'border-ink/8 bg-gray-50'
                    }`}
                  >
                    {/* Card header */}
                    <div className="flex items-start justify-between px-4 pt-3 pb-2">
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`text-sm font-semibold truncate transition-all ${
                              isSelected ? 'text-ink' : 'text-ink/35 line-through'
                            }`}
                          >
                            {param.name}
                          </span>
                          {param.weight > 0 && (
                            <span
                              className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full border transition-all ${
                                isSelected
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-gray-100 text-gray-400 border-gray-200'
                              }`}
                            >
                              {param.weight}%
                            </span>
                          )}
                          {param.required && isSelected && (
                            <span className="flex-shrink-0 text-xs text-red-400 font-medium">required</span>
                          )}
                        </div>
                        {param.description && (
                          <p className={`text-xs transition-all ${isSelected ? 'text-ink/55' : 'text-ink/25'}`}>
                            {param.description}
                          </p>
                        )}
                      </div>

                      {/* Toggle switch */}
                      <button
                        type="button"
                        onClick={() => toggleParam(param.name)}
                        aria-label={isSelected ? `Deselect ${param.name}` : `Select ${param.name}`}
                        className={`flex-shrink-0 ml-3 relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                          isSelected ? 'bg-emerald-500' : 'bg-ink/20'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${
                            isSelected ? 'left-5' : 'left-0.5'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Input — only when selected */}
                    {isSelected ? (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18 }}
                        className="px-4 pb-4"
                      >
                        {renderParameterInput(param)}
                      </motion.div>
                    ) : (
                      <p className="px-4 pb-3 text-xs text-ink/35 italic">
                        Excluded from this evaluation
                      </p>
                    )}
                  </motion.div>
                );
              })}
          </div>
        </div>

        {/* Trainer Notes */}
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">
            Notes & Comments
          </label>
          <textarea
            value={formData.trainerNotes}
            onChange={(e) => {
              setFormData({ ...formData, trainerNotes: e.target.value });
              setIsDirty(true);
            }}
            rows={4}
            className="w-full px-4 py-3 bg-white border border-ink/20 rounded-xl text-ink placeholder:text-ink/40 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            placeholder="Add your notes and observations..."
          />
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-ink/10">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 border border-ink/20 text-ink font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting || selectedCount === 0}
            className="flex-1 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            {isSubmitting ? 'Saving...' : 'Save Evaluation'}
          </button>
        </div>
      </form>

      {/* Tip */}
      <div className="pt-4 border-t border-ink/10 text-xs text-ink/60">
        <p>💡 Toggle parameters on/off to include only what you evaluated this session.</p>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirmClose}
        onClose={() => setShowConfirmClose(false)}
        onConfirm={() => {
          setShowConfirmClose(false);
          setIsDirty(false);
          onCancel();
        }}
        title="Discard Changes?"
        description="You have unsaved changes. Are you sure you want to discard them?"
        confirmText="Discard"
        cancelText="Keep Editing"
        variant="danger"
        primaryAction="cancel"
      />
    </motion.div>
  );
};
