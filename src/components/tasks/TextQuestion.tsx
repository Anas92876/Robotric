import { useState, useEffect } from 'react';
import { type Question, type Answer } from '../../hooks/student/useTasks';
import { CardComponent, CardBody } from '../ui';

interface TextQuestionProps {
  question: Question;
  answer?: Answer;
  onChange: (answer: Answer) => void;
  disabled?: boolean;
}

export const TextQuestion: React.FC<TextQuestionProps> = ({
  question,
  answer,
  onChange,
  disabled = false,
}) => {
  const [textAnswer, setTextAnswer] = useState<string>(
    answer?.textAnswer || ''
  );

  useEffect(() => {
    onChange({
      questionId: question._id || '',
      answerType: 'text',
      textAnswer,
    });
  }, [textAnswer, question._id, onChange]);

  const remainingChars = question.maxLength
    ? question.maxLength - textAnswer.length
    : null;

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

        <textarea
          value={textAnswer}
          onChange={(e) => setTextAnswer(e.target.value)}
          disabled={disabled}
          maxLength={question.maxLength}
          rows={6}
          className={`w-full px-4 py-3 rounded-lg border border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none ${
            disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
          }`}
          placeholder="Type your answer here..."
        />

        {question.maxLength && (
          <div className="mt-2 text-right">
            <span
              className={`text-xs ${
                remainingChars! < 20 ? 'text-red-600' : 'text-[#003300]/60'
              }`}
            >
              {remainingChars} characters remaining
            </span>
          </div>
        )}
      </CardBody>
    </CardComponent>
  );
};
