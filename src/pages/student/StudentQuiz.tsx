import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trophy,
  RefreshCw,
} from "lucide-react";
import { useQuiz } from "../../hooks";
import { useTranslation } from 'react-i18next';
import {
  CardComponent,
  CardBody,
  Button,
  Badge,
  LoadingState,
  Alert,
  Modal,
  useToast,
  Breadcrumb,
} from "../../components/ui";

export default function StudentQuiz() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardStudent']);
  const isRTL = i18n.language === 'ar';

  const {
    quiz,
    currentQuestion,
    answers,
    timeRemaining,
    attempts,
    isLoading,
    error,
    setCurrentQuestion,
    selectOption,
    submitQuiz,
    startQuiz,
    fetchQuiz,
  } = useQuiz(quizId!);

  const toast = useToast();
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    if (quiz && attempts.length > 0) {
      const latestAttempt = attempts[0];
      if (!latestAttempt.submittedAt) {
        setAttemptId(latestAttempt._id);
        setQuizStarted(true);
      }
    }
  }, [quiz, attempts]);

  const handleStartQuiz = async () => {
    const newAttemptId = await startQuiz();
    if (newAttemptId) {
      setAttemptId(newAttemptId);
      setQuizStarted(true);
    }
  };

  const handleSubmit = async () => {
    if (!attemptId) return;

    try {
      setIsSubmitting(true);
      const result = await submitQuiz(attemptId);
      setResults(result);
      setShowSubmitModal(false);
      setQuizStarted(false);
    } catch (err: any) {
      console.error("Failed to submit quiz:", err);
      toast.error(t('dashboardCommon:error'), err?.message || t('dashboardCommon:errorMessage'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getAnsweredCount = () => {
    return Object.keys(answers).length;
  };

  const getTotalQuestions = () => {
    return quiz?.questions.length || 0;
  };

  // Show loading state
  if (isLoading) {
    return <LoadingState type="skeleton" text={t('dashboardStudent:loadingQuiz')} />;
  }

  // Show error state
  if (error || !quiz) {
    return (
      <div className="space-y-4 sm:space-y-6 md:space-y-8">
        <Alert variant="error">
          <div className={`flex items-start gap-3`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold mb-1">{t('dashboardStudent:failedLoadQuiz')}</p>
              <p className="text-sm opacity-90">{error || t('dashboardStudent:quizNotFound')}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={fetchQuiz}
            >
              {t('dashboardCommon:retry')}
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  // Show results
  if (results) {
    const scorePercentage = Math.round(results.score);
    const isPassed = results.passed;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-3xl mx-auto"
      >
        <CardComponent variant="glass">
          <CardBody className="p-4 sm:p-6 md:p-8 text-center">
            {/* Icon */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 ${
                isPassed
                  ? "bg-gradient-to-br from-success/20 to-success/5 border-2 border-success/30"
                  : "bg-gradient-to-br from-error/20 to-error/5 border-2 border-error/30"
              }`}
            >
              {isPassed ? (
                <Trophy className="w-10 h-10 text-success" />
              ) : (
                <XCircle className="w-10 h-10 text-error" />
              )}
            </motion.div>

            {/* Message */}
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 bg-gradient-to-r from-primary via-green-700 to-primary bg-clip-text text-transparent">
              {isPassed ? t('dashboardStudent:congratulations') : t('dashboardStudent:keepTrying')}
            </h2>
            <p className="text-white/60 mb-8">
              {isPassed
                ? t('dashboardStudent:quizPassedSuccess')
                : t('dashboardStudent:quizFailedTryAgain')}
            </p>

            {/* Score */}
            <div className="mb-8">
              <div className={`inline-flex items-center justify-center w-32 h-32 rounded-2xl ${
                isPassed
                  ? "bg-gradient-to-br from-success/20 to-success/5 border-2 border-success/40"
                  : "bg-gradient-to-br from-error/20 to-error/5 border-2 border-error/40"
              }`}>
                <div>
                  <div className={`text-5xl font-bold ${isPassed ? "text-success" : "text-error"}`}>
                    {scorePercentage}%
                  </div>
                  <div className="text-xs text-white/50 mt-1">{t('dashboardStudent:passingScore', { score: quiz.passingScore })}</div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                <p className="text-xs text-primary mb-1">{t('dashboardStudent:points')}</p>
                <p className="text-lg font-bold text-primary">
                  {results.earnedPoints}<span className="text-sm text-white/40">/{results.totalPoints}</span>
                </p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20">
                <p className="text-xs text-accent mb-1">{t('dashboardCommon:time')}</p>
                <p className="text-lg font-bold text-accent">
                  {Math.floor(results.timeSpent / 60)}:{(results.timeSpent % 60).toString().padStart(2, '0')}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-xs text-white/50 mb-1">{t('dashboardStudent:attemptsLabel')}</p>
                <p className="text-lg font-bold text-white/80">
                  {attempts.length}<span className="text-sm text-white/40">/{quiz.maxAttempts}</span>
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className={`flex gap-3`}>
              <Link to={`/student/courses/${quiz.course}`} className="flex-1">
                <Button variant="outline" size="lg" className="w-full" leftIcon={<ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />}>
                  {t('dashboardStudent:backToCourse')}
                </Button>
              </Link>
              {!isPassed && scorePercentage < 100 && attempts.length < quiz.maxAttempts && (
                <Button
                  variant="primary"
                  size="lg"
                  className="flex-1"
                  leftIcon={<RefreshCw className="w-4 h-4" />}
                  onClick={() => {
                    setResults(null);
                    setQuizStarted(false);
                  }}
                >
                  {t('dashboardStudent:tryAgainBtn')}
                </Button>
              )}
            </div>
          </CardBody>
        </CardComponent>
      </motion.div>
    );
  }

  // Show quiz start screen
  if (!quizStarted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto space-y-4"
      >
        <Link to={`/student/courses/${quiz.course}`}>
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />}>
            {t('dashboardStudent:backToCourse')}
          </Button>
        </Link>

        <CardComponent variant="glass">
          <CardBody className="p-4 sm:p-6 md:p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 mb-4">
                <Trophy className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 bg-gradient-to-r from-primary via-green-700 to-primary bg-clip-text text-transparent">
                {quiz.title}
              </h1>
              {quiz.description && (
                <p className="text-white/60" dir="auto">{quiz.description}</p>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6">
              <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 text-center">
                <p className="text-[10px] sm:text-xs text-primary mb-1">{t('dashboardStudent:questionsCount', { count: '' }).replace(' ()', '')}</p>
                <p className="text-xl sm:text-2xl font-bold text-primary">{quiz.questions.length}</p>
              </div>
              <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 text-center">
                <p className="text-[10px] sm:text-xs text-accent mb-1">{t('dashboardCommon:time')}</p>
                <p className="text-xl sm:text-2xl font-bold text-accent">
                  {quiz.timeLimit ? `${quiz.timeLimit}m` : "∞"}
                </p>
              </div>
              <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-success/10 to-success/5 border border-success/20 text-center">
                <p className="text-[10px] sm:text-xs text-success mb-1">Pass</p>
                <p className="text-xl sm:text-2xl font-bold text-success">{quiz.passingScore}%</p>
              </div>
              <div className="p-3 sm:p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                <p className="text-[10px] sm:text-xs text-white/50 mb-1">{t('dashboardStudent:attemptsLabel')}</p>
                <p className="text-xl sm:text-2xl font-bold text-white/80">
                  {attempts.length}<span className="text-xs sm:text-sm text-white/40">/{quiz.maxAttempts}</span>
                </p>
              </div>
            </div>

            {/* Previous Attempts */}
            {attempts.length > 0 && (
              <div className="mb-6">
                <p className={`text-sm text-white/60 mb-3 font-medium flex items-center gap-2`}>
                  <RefreshCw className="w-4 h-4" />
                  {t('dashboardStudent:previousAttempts')}
                </p>
                <div className="space-y-2">
                  {attempts.slice(0, 3).map((attempt: any) => (
                    <div
                      key={attempt._id}
                      className={`flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10`}
                    >
                      <div className={`flex items-center gap-3`}>
                        <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                          #{attempt.attemptNumber}
                        </div>
                        <span className="text-sm text-white/70">
                          {new Date(attempt.submittedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <Badge variant={attempt.passed ? "success" : "error"} size="sm">
                        {Math.round(attempt.score)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Start Button */}
            {attempts.length >= quiz.maxAttempts ? (
              <Alert variant="warning">
                <div className={`flex items-start gap-3`}>
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">{t('dashboardStudent:maxAttemptsReached')}</p>
                    <p className="text-xs opacity-80 mt-1">
                      {t('dashboardStudent:maxAttemptsDesc', { count: quiz.maxAttempts })}
                    </p>
                  </div>
                </div>
              </Alert>
            ) : (
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                leftIcon={<Trophy className="w-5 h-5" />}
                onClick={handleStartQuiz}
              >
                {t('dashboardStudent:startQuizBtn')}
              </Button>
            )}
          </CardBody>
        </CardComponent>
      </motion.div>
    );
  }

  // Show quiz questions
  const currentQ = quiz.questions[currentQuestion];
  const selectedAnswers = answers[currentQ._id] || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-4"
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-2`}>
        <div >
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary via-green-700 to-primary bg-clip-text text-transparent">{quiz.title}</h1>
          <p className="text-sm text-white/50 mt-1">
            {t('dashboardStudent:questionOfTotal', {
              current: currentQuestion + 1,
              total: getTotalQuestions(),
              answered: getAnsweredCount()
            })}
          </p>
        </div>
        {quiz.timeLimit && (
          <motion.div
            animate={timeRemaining < 60 ? { scale: [1, 1.05, 1] } : {}}
            transition={{ repeat: timeRemaining < 60 ? Infinity : 0, duration: 1 }}
            className={`px-4 py-2 rounded-lg ${
              timeRemaining < 60
                ? "bg-error/20 text-error border border-error/30"
                : timeRemaining < 180
                ? "bg-warning/20 text-warning border border-warning/30"
                : "bg-primary/20 text-primary border border-primary/30"
            }`}
          >
            <div className={`flex items-center gap-2`}>
              <Clock className="w-4 h-4" />
              <span className="text-lg font-bold font-mono">
                {formatTime(timeRemaining)}
              </span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${((currentQuestion + 1) / getTotalQuestions()) * 100}%` }}
          className="h-full bg-gradient-to-r from-primary via-accent to-secondary"
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, x: isRTL ? -10 : 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: isRTL ? 10 : -10 }}
          transition={{ duration: 0.2 }}
        >
          <CardComponent variant="glass" hover>
            <CardBody className="p-6">
              {/* Question Header */}
              <div className={`flex items-center justify-between mb-6`}>
                <div className={`flex items-center gap-3`}>
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center text-sm font-bold text-primary">
                    {currentQuestion + 1}
                  </div>
                  <Badge variant={currentQ.type === "multiple" ? "warning" : "primary"} size="sm">
                    {currentQ.type === "multiple" ? "Multiple" : "Single"}
                  </Badge>
                </div>
                <div className={isRTL ? 'text-left' : 'text-right'}>
                  <div className="text-xs text-white/40">{t('dashboardStudent:points')}</div>
                  <div className="text-sm font-bold text-accent">{currentQ.points}</div>
                </div>
              </div>

              {/* Question Text */}
              <h2 className={`text-xl font-semibold mb-6 text-white/90 leading-relaxed`}>
                {currentQ.question}
              </h2>

              {/* Options */}
              <div className="space-y-2">
                {currentQ.options.map((option: any, index: number) => {
                  const isSelected = selectedAnswers.includes(index);
                  const isMultiple = currentQ.type === "multiple";
                  const optionLabel = String.fromCharCode(65 + index);

                  return (
                    <motion.button
                      key={index}
                      whileHover={{ x: isRTL ? -2 : 2 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => selectOption(currentQ._id, index, isMultiple)}
                      className={`w-full p-4 sm:p-4 rounded-xl transition-all ${isRTL ? 'text-right' : 'text-left'} group min-h-[56px] sm:min-h-[64px] ${
                        isSelected
                          ? "bg-gradient-to-r from-primary/20 to-accent/20 border-2 border-primary/50"
                          : "bg-white/5 border-2 border-white/10 hover:border-primary/30"
                      }`}
                    >
                      <div className={`flex items-center gap-3`}>
                        <div
                          className={`w-10 h-10 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-base sm:text-sm font-bold shrink-0 ${
                            isSelected
                              ? "bg-gradient-to-br from-primary to-accent text-white"
                              : "bg-white/10 text-white/50"
                          }`}
                        >
                          {optionLabel}
                        </div>
                        <span className={`flex-1 text-base sm:text-sm ${
                          isSelected ? "text-white font-semibold" : "text-white/70"
                        }`}>
                          {option.text}
                        </span>
                        <div
                          className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "bg-primary"
                              : "border-2 border-white/30"
                          } ${!isMultiple && "rounded-full"}`}
                        >
                          {isSelected && (
                            <CheckCircle className="w-3 h-3 text-white" />
                          )}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Info */}
              {currentQ.type === "multiple" && (
                <Alert variant="info" className="mt-4">
                  <div className={`flex items-center gap-2 text-xs`}>
                    <AlertCircle className="w-3 h-3" />
                    <span>{t('dashboardStudent:multipleAnswersAllowed')}</span>
                  </div>
                </Alert>
              )}
            </CardBody>
          </CardComponent>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <CardComponent variant="glass">
        <CardBody className="p-4">
          {/* Question Numbers Grid */}
          <div className="flex flex-wrap gap-2 mb-4">
            {quiz.questions.map((_: any, index: number) => {
              const isAnswered = answers[quiz.questions[index]._id];
              const isCurrent = index === currentQuestion;

              return (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCurrentQuestion(index)}
                  className={`w-9 h-9 rounded-lg text-sm font-semibold transition-all ${
                    isCurrent
                      ? "bg-gradient-to-br from-primary to-accent text-white shadow-glow"
                      : isAnswered
                      ? "bg-success/30 text-success border border-success/50"
                      : "bg-white/5 text-white/50 border border-white/10 hover:border-primary/30"
                  }`}
                >
                  {index + 1}
                </motion.button>
              );
            })}
          </div>

          {/* Navigation Buttons */}
          <div className={`flex items-center gap-3`}>
            <Button
              variant="outline"
              size="md"
              leftIcon={<ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />}
              onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
              disabled={currentQuestion === 0}
            >
              {t('dashboardCommon:previous')}
            </Button>

            <div className="flex-1" />

            {currentQuestion < getTotalQuestions() - 1 ? (
              <Button
                variant="primary"
                size="md"
                rightIcon={<ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />}
                onClick={() =>
                  setCurrentQuestion(Math.min(getTotalQuestions() - 1, currentQuestion + 1))
                }
              >
                {t('dashboardCommon:next')}
              </Button>
            ) : (
              <Button
                variant="success"
                size="md"
                rightIcon={<CheckCircle className="w-4 h-4" />}
                onClick={() => setShowSubmitModal(true)}
                disabled={getAnsweredCount() < getTotalQuestions()}
              >
                {t('dashboardStudent:submitQuizBtn')}
              </Button>
            )}
          </div>
        </CardBody>
      </CardComponent>

      {/* Submit Confirmation Modal */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title={t('dashboardStudent:submitQuizTitle')}
      >
        <div className="p-6">
          <p className={`text-white/80 mb-6`}>
            {t('dashboardStudent:readyToSubmit')}
          </p>

          {/* Progress */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-success/10 to-success/5 border border-success/20 text-center">
              <p className="text-xs text-success mb-1">{t('dashboardStudent:answeredLabel')}</p>
              <p className="text-2xl font-bold text-success">{getAnsweredCount()}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
              <p className="text-xs text-white/50 mb-1">{t('dashboardCommon:total')}</p>
              <p className="text-2xl font-bold">{getTotalQuestions()}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className={`flex items-center justify-between text-xs text-white/50 mb-2`}>
              <span>{t('dashboardStudent:completionLabel')}</span>
              <span>{Math.round((getAnsweredCount() / getTotalQuestions()) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(getAnsweredCount() / getTotalQuestions()) * 100}%` }}
                className="h-full bg-gradient-to-r from-primary via-accent to-success rounded-full"
              />
            </div>
          </div>

          {/* Warning */}
          {getAnsweredCount() < getTotalQuestions() && (
            <Alert variant="warning" className="mb-6">
              <div className={`flex items-start gap-3`}>
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold">{t('dashboardStudent:incompleteQuiz')}</p>
                  <p className="text-xs opacity-80 mt-1">
                    {t('dashboardStudent:unansweredWarning', { count: getTotalQuestions() - getAnsweredCount() })}
                  </p>
                </div>
              </div>
            </Alert>
          )}

          {/* Actions */}
          <div className={`flex flex-col sm:flex-row gap-3 pt-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
            <Button
              variant="outline"
              size="md"
              leftIcon={<ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />}
              onClick={() => setShowSubmitModal(false)}
              className="w-full sm:flex-1 order-2 sm:order-1 min-h-[44px] sm:min-h-[32px]"
            >
              {t('dashboardStudent:reviewBtn')}
            </Button>
            <Button
              variant="success"
              size="md"
              leftIcon={isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              onClick={handleSubmit}
              loading={isSubmitting}
              disabled={isSubmitting}
              className="w-full sm:flex-1 order-1 sm:order-2 min-h-[44px] sm:min-h-[32px]"
            >
              {t('dashboardStudent:submitQuizBtn')}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
