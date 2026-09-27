import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Answer, Question, ImageAnswer } from '../../hooks/student/useTasks';
import { CardComponent, CardBody, Badge, Button } from '../ui';
import { CheckCircle, XCircle, X, ZoomIn, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SubmissionViewerProps {
  questions: Question[];
  answers: Answer[];
}

export const SubmissionViewer: React.FC<SubmissionViewerProps> = ({
  questions,
  answers,
}) => {
  const [selectedImage, setSelectedImage] = useState<{ url: string; filename?: string } | null>(null);
  const { t } = useTranslation('dashboardTrainer');

  const getAnswerForQuestion = (questionId: string | undefined): Answer | undefined => {
    if (!questionId) return undefined;
    return answers.find((a) => a.questionId === questionId);
  };

  const renderMCQAnswer = (question: Question, answer?: Answer) => {
    const hasCorrectAnswers = question.correctAnswers && question.correctAnswers.length > 0;

    if (!answer || !answer.selectedAnswers || answer.selectedAnswers.length === 0) {
      return (
        <p className="text-sm text-white/60 italic">
          {t('noAnswerProvided', 'No answer provided')}
        </p>
      );
    }

    return (
      <div className="space-y-2">
        {question.options?.map((option, index) => {
          const isSelected = answer.selectedAnswers?.includes(index);
          const isCorrect = hasCorrectAnswers
            ? question.correctAnswers!.includes(index)
            : false;

          let containerClasses =
            'flex items-center gap-2 p-2 rounded-lg border transition-all ';
          let icon = <XCircle className="w-4 h-4 text-white/40" />;
          let textClasses = 'text-sm text-white/60';
          let extraLabel: string | null = null;

          if (hasCorrectAnswers) {
            if (isSelected && isCorrect) {
              // Correct choice
              containerClasses += 'bg-emerald-900/40 border-emerald-400/70';
              icon = <CheckCircle className="w-4 h-4 text-emerald-400" />;
              textClasses = 'text-sm font-medium text-white';
            } else if (isSelected && !isCorrect) {
              // Wrong choice (student error)
              containerClasses += 'bg-red-900/40 border-red-400/70';
              icon = <XCircle className="w-4 h-4 text-red-400" />;
              textClasses = 'text-sm font-medium text-red-100';
              extraLabel = t('yourAnswerWrong', 'Your selection was wrong');
            } else if (!isSelected && isCorrect) {
              // Missed correct answer
              containerClasses += 'bg-amber-900/40 border-amber-400/70';
              icon = <AlertCircle className="w-4 h-4 text-amber-300" />;
              textClasses = 'text-sm text-amber-100';
              extraLabel = t('correctAnswer', 'Correct Answer');
            } else {
              // Neutral
              containerClasses += 'bg-white/5 border-white/10';
            }
          } else {
            // Fallback: behave like original implementation (no correctAnswers info)
            if (isSelected) {
              containerClasses += 'bg-primary/20 border-primary/50';
              icon = <CheckCircle className="w-4 h-4 text-green-400" />;
              textClasses = 'text-sm font-medium text-white';
            } else {
              containerClasses += 'bg-white/5 border-white/10';
            }
          }

          return (
            <div key={index} className={containerClasses}>
              {icon}
              <div className="flex flex-col">
                <span className={textClasses}>{option}</span>
                {extraLabel && (
                  <span className="text-xs text-white/60 mt-0.5">
                    {extraLabel}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTextAnswer = (answer?: Answer) => {
    if (!answer || !answer.textAnswer) {
      return <p className="text-sm text-white/60 italic">No answer provided</p>;
    }

    return (
      <div className="p-4 bg-white/5 rounded-lg border border-white/20">
        <p className="text-sm text-white whitespace-pre-wrap">
          {answer.textAnswer}
        </p>
      </div>
    );
  };

  const renderImageAnswer = (answer?: Answer) => {
    if (!answer || !answer.imageAnswers || answer.imageAnswers.length === 0) {
      return <p className="text-sm text-white/60 italic">No images provided</p>;
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {answer.imageAnswers.map((img: ImageAnswer, index: number) => (
          <motion.div
            key={index}
            whileHover={{ scale: 1.02, y: -2 }}
            transition={{ duration: 0.2 }}
            className="relative group cursor-pointer border border-white/20 rounded-lg overflow-hidden bg-white/5 hover:border-primary/50 transition-all"
            onClick={() => setSelectedImage({ url: img.cloudinaryUrl, filename: img.filename })}
          >
            <div className="relative aspect-square">
              <img
                src={img.cloudinaryUrl}
                alt={img.filename || `Image ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            {img.filename && (
              <div className="p-2 bg-white/10">
                <p className="text-xs text-white/60 truncate">{img.filename}</p>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="space-y-4">
        {questions.map((question, index) => {
          const answer = getAnswerForQuestion(question._id);

          const hasCorrectAnswers =
            question.answerType === 'mcq' &&
            question.correctAnswers &&
            question.correctAnswers.length > 0;

          let questionResult: 'correct' | 'partial' | 'incorrect' | null = null;
          if (question.answerType === 'mcq' && hasCorrectAnswers) {
            const selected = answer?.selectedAnswers || [];
            const correct = question.correctAnswers || [];

            const correctSelected = selected.filter((idx) =>
              correct.includes(idx),
            ).length;
            const wrongSelected = selected.filter(
              (idx) => !correct.includes(idx),
            ).length;
            const missedCorrect = correct.filter(
              (idx) => !selected.includes(idx),
            ).length;

            if (correctSelected === correct.length && wrongSelected === 0) {
              questionResult = 'correct';
            } else if (correctSelected === 0 && wrongSelected > 0) {
              questionResult = 'incorrect';
            } else if (correctSelected === 0 && wrongSelected === 0) {
              // No selection at all (handled as no answer)
              questionResult = null;
            } else {
              questionResult = 'partial';
            }
          }

          return (
            <CardComponent key={question._id || `question-${index}`} variant="glass" className="mb-4 hover:border-primary/20 transition-all">
              <CardBody>
                <div className="mb-4">
                  <div className="flex items-start justify-between mb-2 flex-wrap gap-2">
                    <h4 className="text-base font-semibold text-white flex-1 min-w-[200px]">
                      Q{index + 1}: {question.questionText}
                    </h4>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {questionResult && (
                        <Badge
                          variant={
                            questionResult === 'correct'
                              ? 'success'
                              : questionResult === 'partial'
                              ? 'warning'
                              : 'error'
                          }
                          size="sm"
                        >
                          {questionResult === 'correct' &&
                            t('mcqCorrect', 'Correct')}
                          {questionResult === 'partial' &&
                            t('mcqPartial', 'Partially Correct')}
                          {questionResult === 'incorrect' &&
                            t('mcqIncorrect', 'Incorrect')}
                        </Badge>
                      )}
                      <Badge variant="secondary" size="sm">
                        {question.answerType.toUpperCase()}
                      </Badge>
                      <span className="text-sm text-white/60 whitespace-nowrap">
                        {question.points} {question.points === 1 ? 'point' : 'points'}
                      </span>
                    </div>
                  </div>
                  {question.required && (
                    <Badge variant="error" size="sm" className="mt-2">Required</Badge>
                  )}
                </div>

                <div className="mt-4">
                  {question.answerType === 'mcq' && renderMCQAnswer(question, answer)}
                  {question.answerType === 'text' && renderTextAnswer(answer)}
                  {question.answerType === 'image' && renderImageAnswer(answer)}
                </div>
              </CardBody>
            </CardComponent>
          );
        })}
      </div>

      {/* Image Lightbox */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-8"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative max-w-6xl max-h-full w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedImage.url}
                alt={selectedImage.filename || 'Submission image'}
                className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-xl shadow-2xl mx-auto"
              />
              {selectedImage.filename && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-4 rounded-b-xl">
                  <p className="text-white text-sm text-center">{selectedImage.filename}</p>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 border border-white/20"
              >
                <X className="w-4 h-4" />
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
