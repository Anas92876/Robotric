import React, { memo } from 'react';
import { Question, Answer } from '../../hooks/student/useTasks';
import { CardComponent, CardBody } from '../ui';

interface MCQQuestionProps {
  question: Question;
  answer?: Answer;
  onChange: (answer: Answer) => void;
  disabled?: boolean;
}

const MCQQuestionComponent: React.FC<MCQQuestionProps> = ({
  question,
  answer,
  onChange,
  disabled = false,
}) => {
  const selected = answer?.selectedAnswers || [];

  const handleOptionChange = (index: number) => {
    if (disabled) return;

    let newSelected: number[];
    const current = answer?.selectedAnswers || [];

    if (question.type === 'single_choice') {
      newSelected = [index];
    } else {
      // multiple_choice
      if (current.includes(index)) {
        newSelected = current.filter(i => i !== index);
      } else {
        newSelected = [...current, index];
      }
    }

    onChange({
      questionId: question._id || '',
      answerType: 'mcq',
      selectedAnswers: newSelected,
    });
  };

  return (
    <CardComponent variant="glass" className="mb-4">
      <CardBody>
        <div className="mb-4">
          <div className="flex items-start justify-between mb-2">
            <h4 className="text-base font-semibold text-[#003300]">
              {question.questionText}
            </h4>
            <span className="text-sm text-[#003300]/60">
              {question.points} {question.points === 1 ? 'point' : 'points'}
            </span>
          </div>
          {question.required && (
            <span className="text-xs text-red-600">Required</span>
          )}
        </div>

        <div className="space-y-2">
          {question.options?.map((option, index) => (
            <label
              key={index}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                selected.includes(index)
                  ? 'border-primary bg-primary/5'
                  : 'border-primary/20 hover:border-primary/40'
              } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              <input
                type={question.type === 'single_choice' ? 'radio' : 'checkbox'}
                name={`question-${question._id || `index-${index}`}`}
                checked={selected.includes(index)}
                onChange={() => handleOptionChange(index)}
                disabled={disabled}
                className="w-4 h-4 text-primary focus:ring-primary"
              />
              <span className="text-sm text-[#003300] flex-1">{option}</span>
            </label>
          ))}
        </div>
      </CardBody>
    </CardComponent>
  );
};

export const MCQQuestion = memo(MCQQuestionComponent);
