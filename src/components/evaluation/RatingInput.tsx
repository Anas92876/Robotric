/**
 * RatingInput Component
 *
 * Star rating input component with hover effects and labels
 *
 * @component RatingInput
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { RATING_LABELS } from '../../types/evaluation.types';

interface RatingInputProps {
  value: number;
  onChange: (rating: number) => void;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  required?: boolean;
}

export const RatingInput: React.FC<RatingInputProps> = ({
  value,
  onChange,
  label,
  disabled = false,
  size = 'md',
  showLabel = true,
  required = false
}) => {
  const [hoverRating, setHoverRating] = useState(0);

  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-9 h-9'
  };

  const displayRating = hoverRating || value;

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-semibold text-ink">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="flex items-center gap-2">
        {/* Star Rating */}
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((rating) => (
            <motion.button
              key={rating}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onChange(rating)}
              onMouseEnter={() => !disabled && setHoverRating(rating)}
              onMouseLeave={() => !disabled && setHoverRating(0)}
              className={`transition-all duration-200 ${
                disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-110'
              }`}
              whileHover={{ scale: disabled ? 1 : 1.1 }}
              whileTap={{ scale: disabled ? 1 : 0.95 }}
            >
              <Star
                className={`${sizeClasses[size]} transition-all duration-200 ${
                  rating <= displayRating
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'fill-transparent text-ink/20'
                }`}
              />
            </motion.button>
          ))}
        </div>

        {/* Rating Value */}
        {showLabel && displayRating > 0 && (
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-sm font-medium text-ink min-w-[100px]"
          >
            {typeof displayRating === 'number' 
              ? `${displayRating.toFixed(1)} / 5` 
              : `${parseFloat(displayRating.toString()).toFixed(1)} / 5`}
          </motion.span>
        )}
      </div>
    </div>
  );
};
