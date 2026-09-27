import { useState } from 'react';
import { Plus, Trash2, GripVertical, X } from 'lucide-react';
import { Question } from '../../hooks/student/useTasks';
import { Button, CardComponent, CardBody, Badge } from '../ui';
import { motion, Reorder } from 'framer-motion';

interface QuestionBuilderProps {
  questions: Question[];
  onChange: (questions: Question[]) => void;
}

export const QuestionBuilder: React.FC<QuestionBuilderProps> = ({
  questions,
  onChange,
}) => {
  const [activeQuestion, setActiveQuestion] = useState<number | null>(null);

  const addQuestion = (type: 'mcq' | 'text' | 'image') => {
    const newQuestion: Question = {
      _id: `temp-${Date.now()}`,
      questionText: '',
      answerType: type,
      points: 10,
      order: questions.length,
      required: true,
      ...(type === 'mcq' && {
        type: 'single_choice',
        options: ['Option 1', 'Option 2'],
      }),
      ...(type === 'text' && {
        maxLength: 500,
      }),
      ...(type === 'image' && {
        maxImages: 1,
        maxImageSize: 5,
        allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
      }),
    };
    onChange([...questions, newQuestion]);
    setActiveQuestion(questions.length);
  };

  const updateQuestion = (index: number, updates: Partial<Question>) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const removeQuestion = (index: number) => {
    const updated = questions.filter((_, i) => i !== index).map((q, i) => ({
      ...q,
      order: i,
    }));
    onChange(updated);
    if (activeQuestion === index) {
      setActiveQuestion(null);
    } else if (activeQuestion !== null && activeQuestion > index) {
      setActiveQuestion(activeQuestion - 1);
    }
  };

  const reorderQuestions = (newOrder: Question[]) => {
    const reordered = newOrder.map((q, i) => ({ ...q, order: i }));
    onChange(reordered);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[#003300]">Questions</h3>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addQuestion('mcq')}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add MCQ
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addQuestion('text')}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Text
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addQuestion('image')}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Image
          </Button>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="text-center py-8 text-[#003300]/60">
          <p>No questions added yet. Click the buttons above to add questions.</p>
        </div>
      ) : (
        <Reorder.Group
          axis="y"
          values={questions}
          onReorder={reorderQuestions}
          className="space-y-3"
        >
          {questions.map((question, index) => (
            <Reorder.Item
              key={question._id || `temp-${index}`}
              value={question}
              className="cursor-move"
            >
              <CardComponent
                variant="glass"
                className={`${
                  activeQuestion === index ? 'ring-2 ring-primary' : ''
                }`}
              >
                <CardBody>
                  <div className="flex items-start gap-3">
                    <GripVertical className="w-5 h-5 text-[#003300]/40 mt-1 cursor-move" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="primary" size="sm">
                            Q{index + 1}
                          </Badge>
                          <Badge variant="secondary" size="sm">
                            {question.answerType.toUpperCase()}
                          </Badge>
                          {question.required && (
                            <Badge variant="error" size="sm">
                              Required
                            </Badge>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeQuestion(index);
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-[#003300] mb-1">
                            Question Text
                          </label>
                          <input
                            type="text"
                            value={question.questionText}
                            onChange={(e) =>
                              updateQuestion(index, { questionText: e.target.value })
                            }
                            placeholder="Enter question text..."
                            className="w-full px-3 py-2 border border-primary/20 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-[#003300] mb-1">
                              Points
                            </label>
                            <input
                              type="number"
                              value={question.points}
                              onChange={(e) =>
                                updateQuestion(index, {
                                  points: parseInt(e.target.value) || 0,
                                })
                              }
                              min="0"
                              className="w-full px-3 py-2 border border-primary/20 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                          </div>
                          <div className="flex items-end">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={question.required}
                                onChange={(e) =>
                                  updateQuestion(index, { required: e.target.checked })
                                }
                                className="w-4 h-4 text-primary"
                              />
                              <span className="text-sm text-[#003300]">Required</span>
                            </label>
                          </div>
                        </div>

                        {question.answerType === 'mcq' && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-sm font-medium text-[#003300]">
                                Options
                              </label>
                              <select
                                value={question.type}
                                onChange={(e) => {
                                  updateQuestion(index, {
                                    type: e.target.value as 'single_choice' | 'multiple_choice',
                                    correctAnswers: [],
                                  });
                                }}
                                className="px-2 py-1 text-sm border border-primary/20 rounded"
                              >
                                <option value="single_choice">Single Choice</option>
                                <option value="multiple_choice">Multiple Choice</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              {question.options?.map((option, optIndex) => {
                                const isCorrect = (question.correctAnswers || []).includes(optIndex);
                                return (
                                  <div key={optIndex} className="flex gap-2 items-center">
                                    {/* Correct answer toggle */}
                                    <button
                                      type="button"
                                      title="Mark as correct answer"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const current = question.correctAnswers || [];
                                        if (question.type === 'single_choice') {
                                          updateQuestion(index, { correctAnswers: isCorrect ? [] : [optIndex] });
                                        } else {
                                          updateQuestion(index, {
                                            correctAnswers: isCorrect
                                              ? current.filter((i) => i !== optIndex)
                                              : [...current, optIndex],
                                          });
                                        }
                                      }}
                                      className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                                        isCorrect
                                          ? 'bg-green-500 border-green-500 text-white'
                                          : 'border-primary/30 hover:border-green-400'
                                      }`}
                                    >
                                      {isCorrect && (
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                    </button>
                                    <input
                                      type="text"
                                      value={option}
                                      onChange={(e) => {
                                        const newOptions = [...(question.options || [])];
                                        newOptions[optIndex] = e.target.value;
                                        updateQuestion(index, { options: newOptions });
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                        }
                                      }}
                                      placeholder={`Option ${optIndex + 1}`}
                                      className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 outline-none transition-colors ${
                                        isCorrect
                                          ? 'border-green-400 bg-green-50 focus:border-green-500 focus:ring-green-200'
                                          : 'border-primary/20 focus:border-primary focus:ring-primary/20'
                                      }`}
                                    />
                                    {question.options && question.options.length > 2 && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          const newOptions = question.options?.filter((_, i) => i !== optIndex);
                                          // Adjust correctAnswers indices after removal
                                          const newCorrect = (question.correctAnswers || [])
                                            .filter((i) => i !== optIndex)
                                            .map((i) => (i > optIndex ? i - 1 : i));
                                          updateQuestion(index, { options: newOptions, correctAnswers: newCorrect });
                                        }}
                                        className="text-red-600"
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </div>
                                );
                              })}
                              <div className="flex items-center justify-between">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const newOptions = [
                                      ...(question.options || []),
                                      `Option ${(question.options?.length || 0) + 1}`,
                                    ];
                                    updateQuestion(index, { options: newOptions });
                                  }}
                                  leftIcon={<Plus className="w-4 h-4" />}
                                >
                                  Add Option
                                </Button>
                                <span className="text-xs text-[#003300]/50">
                                  Click the circle to mark correct answer(s)
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {question.answerType === 'text' && (
                          <div>
                            <label className="block text-sm font-medium text-[#003300] mb-1">
                              Max Length (characters)
                            </label>
                            <input
                              type="number"
                              value={question.maxLength || ''}
                              onChange={(e) =>
                                updateQuestion(index, {
                                  maxLength: parseInt(e.target.value) || undefined,
                                })
                              }
                              placeholder="No limit"
                              className="w-full px-3 py-2 border border-primary/20 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                          </div>
                        )}

                        {question.answerType === 'image' && (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-[#003300] mb-1">
                                Max Images
                              </label>
                              <input
                                type="number"
                                value={question.maxImages || 1}
                                onChange={(e) =>
                                  updateQuestion(index, {
                                    maxImages: parseInt(e.target.value) || 1,
                                  })
                                }
                                min="1"
                                className="w-full px-3 py-2 border border-primary/20 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-[#003300] mb-1">
                                Max Size (MB)
                              </label>
                              <input
                                type="number"
                                value={question.maxImageSize || 5}
                                onChange={(e) =>
                                  updateQuestion(index, {
                                    maxImageSize: parseInt(e.target.value) || 5,
                                  })
                                }
                                min="1"
                                className="w-full px-3 py-2 border border-primary/20 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardBody>
              </CardComponent>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}
    </div>
  );
};
