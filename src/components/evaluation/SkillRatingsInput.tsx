/**
 * SkillRatingsInput Component
 *
 * Input component for rating 5 different skill dimensions
 *
 * @component SkillRatingsInput
 * @version 1.0.0
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Code, Brain, Lightbulb, Users as UsersIcon, MessageCircle } from 'lucide-react';
import type { SkillRatings } from '../../types/evaluation.types';

interface SkillRatingsInputProps {
  value: SkillRatings;
  onChange: (skillRatings: SkillRatings) => void;
  disabled?: boolean;
}

const skills = [
  {
    key: 'technicalSkills' as keyof SkillRatings,
    label: 'Technical Skills',
    icon: Code,
    color: 'from-cyan-500 to-blue-500'
  },
  {
    key: 'problemSolving' as keyof SkillRatings,
    label: 'Problem Solving',
    icon: Brain,
    color: 'from-purple-500 to-pink-500'
  },
  {
    key: 'creativity' as keyof SkillRatings,
    label: 'Creativity',
    icon: Lightbulb,
    color: 'from-yellow-500 to-orange-500'
  },
  {
    key: 'teamwork' as keyof SkillRatings,
    label: 'Teamwork',
    icon: UsersIcon,
    color: 'from-green-500 to-emerald-500'
  },
  {
    key: 'communication' as keyof SkillRatings,
    label: 'Communication',
    icon: MessageCircle,
    color: 'from-blue-500 to-indigo-500'
  }
];

const ratingLabels = ['Poor', 'Below Avg', 'Average', 'Good', 'Excellent'];

export const SkillRatingsInput: React.FC<SkillRatingsInputProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  const handleSkillChange = (skill: keyof SkillRatings, rating: number) => {
    onChange({
      ...value,
      [skill]: rating
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Skill Assessment</h3>
        <div className="flex items-center gap-2 text-xs text-white/60">
          <span>1 = Poor</span>
          <span>•</span>
          <span>5 = Excellent</span>
        </div>
      </div>

      {skills.map((skill, index) => {
        const Icon = skill.icon;
        const skillValue = value[skill.key];

        return (
          <motion.div
            key={skill.key}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="space-y-3"
          >
            {/* Skill Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-gradient-to-r ${skill.color} bg-opacity-20`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white">{skill.label}</p>
                  <p className="text-sm text-white/60">{ratingLabels[skillValue - 1]}</p>
                </div>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r ${skill.color} bg-clip-text text-transparent">
                {skillValue}
              </span>
            </div>

            {/* Slider */}
            <div className="relative">
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={skillValue}
                onChange={(e) => handleSkillChange(skill.key, parseInt(e.target.value))}
                disabled={disabled}
                className="w-full h-2 rounded-full appearance-none cursor-pointer
                  bg-white/10
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-6
                  [&::-webkit-slider-thumb]:h-6
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-gradient-to-r
                  [&::-webkit-slider-thumb]:${skill.color}
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:shadow-lg
                  [&::-webkit-slider-thumb]:border-2
                  [&::-webkit-slider-thumb]:border-white/20
                  [&::-webkit-slider-thumb]:hover:scale-110
                  [&::-webkit-slider-thumb]:transition-transform
                  [&::-moz-range-thumb]:w-6
                  [&::-moz-range-thumb]:h-6
                  [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:bg-gradient-to-r
                  [&::-moz-range-thumb]:${skill.color}
                  [&::-moz-range-thumb]:cursor-pointer
                  [&::-moz-range-thumb]:shadow-lg
                  [&::-moz-range-thumb]:border-2
                  [&::-moz-range-thumb]:border-white/20
                  disabled:opacity-50
                  disabled:cursor-not-allowed"
              />

              {/* Gradient Progress */}
              <div
                className={`absolute top-0 left-0 h-2 rounded-full bg-gradient-to-r ${skill.color} pointer-events-none transition-all duration-300`}
                style={{ width: `${((skillValue - 1) / 4) * 100}%` }}
              />

              {/* Step Markers */}
              <div className="flex justify-between mt-2 px-1">
                {[1, 2, 3, 4, 5].map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => !disabled && handleSkillChange(skill.key, step)}
                    disabled={disabled}
                    className={`w-2 h-2 rounded-full transition-all duration-200 ${
                      step <= skillValue
                        ? `bg-gradient-to-r ${skill.color}`
                        : 'bg-white/20'
                    } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-150'}`}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
