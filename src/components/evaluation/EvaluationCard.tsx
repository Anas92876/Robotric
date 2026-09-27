/**
 * EvaluationCard Component
 *
 * Display card for a single student evaluation with ratings,
 * attendance, and action buttons
 *
 * @component EvaluationCard
 * @version 1.0.0
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Star,
  Calendar,
  User,
  Edit,
  Trash2,
  AlertTriangle,
  TrendingUp,
  CheckCircle,
  Clock
} from 'lucide-react';
import type { StudentEvaluation } from '../../types/evaluation.types';
import { RATING_LABELS } from '../../types/evaluation.types';

interface EvaluationCardProps {
  evaluation: StudentEvaluation;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  showActions?: boolean;
}

export const EvaluationCard: React.FC<EvaluationCardProps> = ({
  evaluation,
  onEdit,
  onDelete,
  showActions = true
}) => {
  const student = typeof evaluation.studentId === 'object' ? evaluation.studentId : null;
  const session = typeof evaluation.sessionId === 'object' ? evaluation.sessionId : null;

  const attendanceColors = {
    present: 'text-green-400 bg-green-400/10',
    late: 'text-yellow-400 bg-yellow-400/10',
    absent: 'text-red-400 bg-red-400/10',
    excused: 'text-blue-400 bg-blue-400/10'
  };

  const attendanceIcons = {
    present: CheckCircle,
    late: Clock,
    absent: AlertTriangle,
    excused: Calendar
  };

  const AttendanceIcon = attendanceIcons[evaluation.attendance.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 hover:border-primary/50 transition-all duration-300"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white">{student?.name || 'Student'}</h3>
            <p className="text-sm text-white/60">
              {new Date(evaluation.evaluationDate).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Flags */}
        <div className="flex items-center gap-2">
          {evaluation.flags?.excelling && (
            <div className="px-3 py-1 rounded-full bg-green-400/10 text-green-400 text-xs font-bold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Excelling
            </div>
          )}
          {evaluation.flags?.atRisk && (
            <div className="px-3 py-1 rounded-full bg-red-400/10 text-red-400 text-xs font-bold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              At Risk
            </div>
          )}
          {evaluation.flags?.needsAttention && !evaluation.flags?.atRisk && (
            <div className="px-3 py-1 rounded-full bg-yellow-400/10 text-yellow-400 text-xs font-bold">
              Needs Attention
            </div>
          )}
        </div>
      </div>

      {/* Overall Rating */}
      <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 to-yellow-400/5 border border-yellow-400/20">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-white/80">Overall Rating</span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-yellow-400">
              {typeof evaluation.overallRating === 'number' 
                ? evaluation.overallRating.toFixed(1) 
                : evaluation.overallRating}
            </span>
            <span className="text-sm text-white/40">/ 5</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((star) => {
            const rating = typeof evaluation.overallRating === 'number' 
              ? evaluation.overallRating 
              : parseFloat(String(evaluation.overallRating)) || 0;
            const isFilled = star <= Math.floor(rating);
            const isHalfFilled = star === Math.ceil(rating) && rating % 1 >= 0.5 && rating % 1 < 1;
            
            return (
              <div key={star} className="relative w-7 h-7">
                <Star
                  className={`w-7 h-7 transition-all absolute ${
                    isFilled
                      ? 'fill-yellow-400 text-yellow-400 drop-shadow-lg'
                      : 'fill-transparent text-white/20'
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
      </div>

      {/* Performance Score */}
      {evaluation.performanceScore !== undefined && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Performance Score</span>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-green-700 bg-clip-text text-transparent">
              {evaluation.performanceScore}
            </span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${evaluation.performanceScore}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
            />
          </div>
        </div>
      )}



      {/* Quick Info - Only show if not default values */}
      {((evaluation.participation && evaluation.participation.level !== 'medium') ||
        (evaluation.comprehension && evaluation.comprehension.level !== 'adequate')) && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {evaluation.participation && evaluation.participation.level !== 'medium' && (
            <div className="p-3 rounded-lg bg-white/5">
              <p className="text-xs text-white/60 mb-1">Participation</p>
              <p className="font-semibold text-white capitalize">
                {evaluation.participation.level.replace('_', ' ')}
              </p>
            </div>
          )}
          {evaluation.comprehension && evaluation.comprehension.level !== 'adequate' && (
            <div className="p-3 rounded-lg bg-white/5">
              <p className="text-xs text-white/60 mb-1">Comprehension</p>
              <p className="font-semibold text-white capitalize">
                {evaluation.comprehension.level.replace('_', ' ')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {showActions && (
        <div className="flex items-center gap-2 pt-4 border-t border-white/10">
          {onEdit && (
            <button
              onClick={() => onEdit(evaluation._id)}
              className="flex-1 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(evaluation._id)}
              className="p-2 rounded-lg bg-red-400/10 hover:bg-red-400/20 border border-red-400/20 text-red-400 transition-all duration-300"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
};
