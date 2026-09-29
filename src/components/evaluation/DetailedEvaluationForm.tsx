/**
 * DetailedEvaluationForm Component
 *
 * Comprehensive evaluation form with all fields including skills,
 * participation, comprehension, behavior, and notes
 *
 * @component DetailedEvaluationForm
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, X, TrendingUp, MessageCircle } from 'lucide-react';
import { RatingInput, SkillRatingsInput } from './';
import type { EvaluationInput, Attendance } from '../../types/evaluation.types';

interface DetailedEvaluationFormProps {
  studentId: string;
  studentName: string;
  sessionId: string;
  groupId: string;
  onSubmit: (data: EvaluationInput) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<EvaluationInput>;
}

export const DetailedEvaluationForm: React.FC<DetailedEvaluationFormProps> = ({
  studentId,
  studentName,
  sessionId,
  groupId,
  onSubmit,
  onCancel,
  initialData
}) => {
  const [formData, setFormData] = useState<EvaluationInput>({
    studentId,
    sessionId,
    groupId,
    overallRating: initialData?.overallRating || 3,
    skillRatings: initialData?.skillRatings || {
      technicalSkills: 3,
      problemSolving: 3,
      creativity: 3,
      teamwork: 3,
      communication: 3
    },
    attendance: initialData?.attendance || {
      status: 'present'
    },
    participation: initialData?.participation || {
      level: 'medium',
      contributionQuality: 3
    },
    comprehension: initialData?.comprehension || {
      level: 'adequate'
    },
    behavior: initialData?.behavior || {
      engagement: 'engaged',
      attitude: 'positive',
      focus: 3
    },
    trainerNotes: initialData?.trainerNotes || {
      strengths: '',
      weaknesses: '',
      generalNotes: '',
      privateNotes: ''
    }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attendanceOptions: { value: Attendance['status']; label: string; color: string }[] = [
    { value: 'present', label: '✓ Present', color: 'bg-green-500' },
    { value: 'late', label: '⏰ Late', color: 'bg-amber-500' },
    { value: 'absent', label: '✗ Absent', color: 'bg-red-500' },
    { value: 'excused', label: '📋 Excused', color: 'bg-blue-500' }
  ];

  const participationLevels = [
    { value: 'very_high', label: 'Very High' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
    { value: 'very_low', label: 'Very Low' }
  ];

  const comprehensionLevels = [
    { value: 'excellent', label: 'Excellent' },
    { value: 'good', label: 'Good' },
    { value: 'adequate', label: 'Adequate' },
    { value: 'needs_support', label: 'Needs Support' },
    { value: 'struggling', label: 'Struggling' }
  ];

  const engagementLevels = [
    { value: 'exceptional', label: 'Exceptional' },
    { value: 'very_engaged', label: 'Very Engaged' },
    { value: 'engaged', label: 'Engaged' },
    { value: 'passive', label: 'Passive' },
    { value: 'distracted', label: 'Distracted' }
  ];

  const attitudeLevels = [
    { value: 'enthusiastic', label: 'Enthusiastic' },
    { value: 'positive', label: 'Positive' },
    { value: 'neutral', label: 'Neutral' },
    { value: 'negative', label: 'Negative' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.overallRating < 1 || formData.overallRating > 5) {
      setError('Please provide a rating between 1 and 5');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit(formData);
    } catch (err: any) {
      setError(err.message || 'Failed to save evaluation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 space-y-6 max-h-[90vh] overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 sticky top-0 bg-white/5 backdrop-blur-sm z-10">
        <div>
          <h3 className="text-xl font-bold text-white">{studentName}</h3>
          <p className="text-sm text-white/60">Detailed Evaluation</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5 text-white/60" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Overall Rating */}
        <div>
          <RatingInput
            label="Overall Performance"
            value={formData.overallRating}
            onChange={(rating) => setFormData({ ...formData, overallRating: rating })}
            required
            size="lg"
          />
        </div>

        {/* Skills Ratings */}
        <div>
          <label className="block text-sm font-semibold text-white/80 mb-3">
            Skill Assessment
          </label>
          <SkillRatingsInput
            value={formData.skillRatings!}
            onChange={(skills) => setFormData({ ...formData, skillRatings: skills })}
          />
        </div>

        {/* Attendance Status */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-white/80">
            Attendance Status <span className="text-red-400">*</span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            {attendanceOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFormData({
                  ...formData,
                  attendance: { status: option.value }
                })}
                className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                  formData.attendance.status === option.value
                    ? `${option.color} border-transparent shadow-lg`
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                <span className={`font-semibold ${
                  formData.attendance.status === option.value
                    ? 'text-white'
                    : 'text-white/80'
                }`}>
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Participation */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-white/80">
            Participation Level
          </label>
          <select
            value={formData.participation?.level}
            onChange={(e) => setFormData({
              ...formData,
              participation: { ...formData.participation!, level: e.target.value as any }
            })}
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-primary transition-colors"
          >
            {participationLevels.map((level) => (
              <option key={level.value} value={level.value} className="bg-zinc-900">
                {level.label}
              </option>
            ))}
          </select>

          <div className="mt-3">
            <label className="block text-xs font-semibold text-white/60 mb-2">
              Contribution Quality (1-5)
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={formData.participation?.contributionQuality || 3}
              onChange={(e) => setFormData({
                ...formData,
                participation: {
                  ...formData.participation!,
                  contributionQuality: parseInt(e.target.value)
                }
              })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-white/60 mt-1">
              <span>Poor</span>
              <span className="text-white font-bold">{formData.participation?.contributionQuality}</span>
              <span>Excellent</span>
            </div>
          </div>
        </div>

        {/* Comprehension */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-white/80">
            Comprehension Level
          </label>
          <select
            value={formData.comprehension?.level}
            onChange={(e) => setFormData({
              ...formData,
              comprehension: { ...formData.comprehension!, level: e.target.value as any }
            })}
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-primary transition-colors"
          >
            {comprehensionLevels.map((level) => (
              <option key={level.value} value={level.value} className="bg-zinc-900">
                {level.label}
              </option>
            ))}
          </select>
        </div>

        {/* Behavior */}
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-white/80">
            Behavior Assessment
          </label>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-white/60 mb-2">
                Engagement
              </label>
              <select
                value={formData.behavior?.engagement}
                onChange={(e) => setFormData({
                  ...formData,
                  behavior: { ...formData.behavior!, engagement: e.target.value as any }
                })}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-primary transition-colors"
              >
                {engagementLevels.map((level) => (
                  <option key={level.value} value={level.value} className="bg-zinc-900">
                    {level.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/60 mb-2">
                Attitude
              </label>
              <select
                value={formData.behavior?.attitude}
                onChange={(e) => setFormData({
                  ...formData,
                  behavior: { ...formData.behavior!, attitude: e.target.value as any }
                })}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-primary transition-colors"
              >
                {attitudeLevels.map((level) => (
                  <option key={level.value} value={level.value} className="bg-zinc-900">
                    {level.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/60 mb-2">
                Focus Level (1-5)
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={formData.behavior?.focus || 3}
                onChange={(e) => setFormData({
                  ...formData,
                  behavior: {
                    ...formData.behavior!,
                    focus: parseInt(e.target.value)
                  }
                })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-white/60 mt-1">
                <span>Distracted</span>
                <span className="text-white font-bold">{formData.behavior?.focus}</span>
                <span>Focused</span>
              </div>
            </div>
          </div>
        </div>

        {/* Trainer Notes */}
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-white/80 flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Trainer Notes
          </label>

          <div>
            <label className="block text-xs font-semibold text-white/60 mb-2">
              Strengths
            </label>
            <textarea
              value={formData.trainerNotes?.strengths}
              onChange={(e) => setFormData({
                ...formData,
                trainerNotes: { ...formData.trainerNotes!, strengths: e.target.value }
              })}
              rows={2}
              placeholder="Student's strengths and positive attributes..."
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/60 mb-2">
              Weaknesses / Areas for Improvement
            </label>
            <textarea
              value={formData.trainerNotes?.weaknesses}
              onChange={(e) => setFormData({
                ...formData,
                trainerNotes: { ...formData.trainerNotes!, weaknesses: e.target.value }
              })}
              rows={2}
              placeholder="Areas that need improvement..."
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/60 mb-2">
              General Notes (visible to student/parent)
            </label>
            <textarea
              value={formData.trainerNotes?.generalNotes}
              onChange={(e) => setFormData({
                ...formData,
                trainerNotes: { ...formData.trainerNotes!, generalNotes: e.target.value }
              })}
              rows={2}
              placeholder="Overall feedback and observations..."
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/60 mb-2">
              Private Notes (for trainer only)
            </label>
            <textarea
              value={formData.trainerNotes?.privateNotes}
              onChange={(e) => setFormData({
                ...formData,
                trainerNotes: { ...formData.trainerNotes!, privateNotes: e.target.value }
              })}
              rows={2}
              placeholder="Internal observations, concerns, follow-up actions..."
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
          >
            {error}
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-white/10 sticky bottom-0 bg-white/5 backdrop-blur-sm">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 rounded-xl bg-primary hover:bg-primary font-bold shadow-lg shadow-primary/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            {isSubmitting ? 'Saving...' : 'Save Evaluation'}
          </button>
        </div>
      </form>

      {/* Quick Info */}
      <div className="pt-4 border-t border-white/10 text-xs text-white/60">
        <p className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Detailed evaluation provides comprehensive feedback and better insights
        </p>
      </div>
    </motion.div>
  );
};
