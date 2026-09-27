import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';

export interface QuizOption {
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestion {
  _id: string;
  question: string;
  type: 'single' | 'multiple';
  options: QuizOption[];
  points: number;
}

export interface Quiz {
  _id: string;
  module: string;
  course: string;
  title: string;
  description?: string;
  passingScore: number;
  timeLimit?: number;
  maxAttempts: number;
  questions: QuizQuestion[];
}

export interface QuizAnswer {
  questionId: string;
  selectedOptions: number[];
}

export interface QuizAttempt {
  _id: string;
  attemptNumber: number;
  score: number;
  passed: boolean;
  startedAt: string;
  submittedAt?: string;
  timeSpent?: number;
}

interface UseQuizReturn {
  quiz: Quiz | null;
  currentQuestion: number;
  answers: Record<string, number[]>;
  timeRemaining: number;
  attempts: QuizAttempt[];
  isLoading: boolean;
  error: string | null;
  setCurrentQuestion: (index: number) => void;
  selectOption: (questionId: string, optionIndex: number, isMultiple: boolean) => void;
  submitQuiz: (attemptId: string) => Promise<any>;
  startQuiz: () => Promise<string | null>;
  fetchQuiz: () => Promise<void>;
}

export const useQuiz = (quizId: string): UseQuizReturn => {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuiz = useCallback(async () => {
    if (!quizId) return;

    try {
      setIsLoading(true);
      setError(null);

      const [quizRes, attemptsRes] = await Promise.all([
        api.get(`/student/quizzes/${quizId}`),
        api.get(`/student/quizzes/${quizId}/attempts`),
      ]);

      setQuiz(quizRes.data.data);
      setAttempts(attemptsRes.data.data || []);

      // Initialize time remaining if there's a time limit
      if (quizRes.data.data.timeLimit) {
        setTimeRemaining(quizRes.data.data.timeLimit * 60); // Convert minutes to seconds
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch quiz');
      console.error('Error fetching quiz:', err);
    } finally {
      setIsLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    fetchQuiz();
  }, [fetchQuiz]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeRemaining]);

  const selectOption = useCallback(
    (questionId: string, optionIndex: number, isMultiple: boolean) => {
      setAnswers((prev) => {
        const current = prev[questionId] || [];

        if (isMultiple) {
          // Multiple choice - toggle selection
          if (current.includes(optionIndex)) {
            return {
              ...prev,
              [questionId]: current.filter((idx) => idx !== optionIndex),
            };
          } else {
            return {
              ...prev,
              [questionId]: [...current, optionIndex],
            };
          }
        } else {
          // Single choice - replace selection
          return {
            ...prev,
            [questionId]: [optionIndex],
          };
        }
      });
    },
    []
  );

  const startQuiz = useCallback(async () => {
    if (!quizId) return null;

    try {
      const response = await api.post(`/student/quizzes/${quizId}/start`);
      return response.data.data.attemptId;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to start quiz');
      console.error('Error starting quiz:', err);
      return null;
    }
  }, [quizId]);

  const submitQuiz = useCallback(
    async (attemptId: string) => {
      if (!quizId) return;

      try {
        // Convert answers to array format
        const answersArray = Object.entries(answers).map(([questionId, selectedOptions]) => ({
          questionId,
          selectedOptions,
        }));

        const response = await api.post(`/student/quizzes/${quizId}/submit`, {
          attemptId,
          answers: answersArray,
        });

        // Refresh attempts list
        await fetchQuiz();

        return response.data.data;
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to submit quiz');
        console.error('Error submitting quiz:', err);
        throw err;
      }
    },
    [quizId, answers, fetchQuiz]
  );

  return {
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
  };
};
