import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export interface Task {
  _id: string;
  title: string;
  titleAr?: string;
  description: string;
  descriptionAr?: string;
  deadline: string;
  maxScore: number;
  hasQuestions: boolean;
  status: 'draft' | 'open' | 'closed';
  groupId: {
    _id: string;
    name: string;
  };
  courseId?: {
    _id: string;
    title: string;
  };
  sessionId?: {
    _id: string;
    title: string;
    sessionNumber?: number;
    scheduledDate?: string;
  } | null;
  // Full multi-link sets — populated for CLO tasks that span more than one
  // group/course/session. Falls back to the singular fields above when empty.
  groupIds?: { _id: string; name: string }[];
  courseIds?: { _id: string; title: string }[];
  sessionIds?: { _id: string; title: string; sessionNumber?: number; scheduledDate?: string }[];
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  submission?: {
    _id: string;
    status: 'not_submitted' | 'pending_review' | 'graded' | 'returned';
    score?: number;
    submittedAt?: string;
    isLate: boolean;
  };
}

export interface Question {
  _id?: string; // Optional for new questions being created
  questionText: string;
  questionTextAr?: string;
  answerType: 'mcq' | 'text' | 'image';
  type?: 'single_choice' | 'multiple_choice';
  options?: string[];
  correctAnswers?: number[]; // Indices of correct options (MCQ only, trainer-set)
  points: number;
  order: number;
  required: boolean;
  maxLength?: number;
  maxImages?: number;
  allowedImageTypes?: string[];
  maxImageSize?: number;
}

export interface TaskDetails {
  task: Task & {
    questions: Question[];
    allowLateSubmission: boolean;
  };
  submission?: {
    _id: string;
    answers: Answer[];
    status: 'not_submitted' | 'pending_review' | 'graded' | 'returned';
    score?: number;
    feedback?: string;
    submittedAt?: string;
    isLate: boolean;
  };
}

export interface Answer {
  questionId: string;
  answerType: 'mcq' | 'text' | 'image';
  selectedAnswers?: number[];
  textAnswer?: string;
  imageAnswers?: ImageAnswer[];
}

export interface ImageAnswer {
  cloudinaryUrl: string;
  cloudinaryPublicId: string;
  filename?: string;
  size?: number;
  mimeType?: string;
}

export interface TaskFilters {
  status?: 'open' | 'closed';
  courseId?: string;
  page?: number;
  limit?: number;
}

interface UseTasksReturn {
  tasks: Task[];
  taskDetails: TaskDetails | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    total: number;
  } | null;
  getMyTasks: (filters?: TaskFilters) => Promise<void>;
  getTaskDetails: (taskId: string) => Promise<void>;
  submitTask: (taskId: string, answers: Answer[], files: File[]) => Promise<void>;
  refetch: () => Promise<void>;
}

// Overload signatures for better type inference
export function useTasks(): UseTasksReturn;
export function useTasks(initialFilters: TaskFilters): UseTasksReturn;
export function useTasks(initialFilters: TaskFilters = {}) {
  const queryClient = useQueryClient();
  const [currentFilters, setCurrentFilters] = useState<TaskFilters>({
    page: 1,
    limit: 10, // Reduced from 20 for faster initial load
    ...initialFilters,
  });
  const [taskDetails, setTaskDetails] = useState<TaskDetails | null>(null);

  // Query for tasks list with pagination
  const {
    data: tasksData,
    isLoading: tasksLoading,
    error: tasksError,
    refetch: refetchTasks,
  } = useQuery({
    queryKey: ['student', 'tasks', currentFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentFilters.status) params.append('status', currentFilters.status);
      if (currentFilters.courseId) params.append('courseId', currentFilters.courseId);
      if (currentFilters.page) params.append('page', currentFilters.page.toString());
      if (currentFilters.limit) params.append('limit', currentFilters.limit.toString());

      const response = await api.get(`/student/tasks?${params.toString()}`);
      return {
        tasks: response.data.data || [],
        pagination: response.data.pagination || null,
      };
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  // Query for task details
  const getTaskDetails = useCallback(async (taskId: string) => {
    try {
      const response = await api.get(`/student/tasks/${taskId}`);
      setTaskDetails(response.data.data || null);
      return response.data.data || null;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch task details';
      console.error('Error fetching task details:', err);
      throw err;
    }
  }, []);

  // Mutation for submitting task
  const submitTaskMutation = useMutation({
    mutationFn: async ({ taskId, answers, files }: { taskId: string; answers: Answer[]; files: File[] }) => {
      const formData = new FormData();
      formData.append('answers', JSON.stringify(answers));

      files.forEach((file) => {
        formData.append('files', file);
      });

      const response = await api.post(`/student/tasks/${taskId}/submit`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 0, // no timeout — large files on slow connections need unlimited time
      });

      // Invalidate and refetch tasks list
      queryClient.invalidateQueries({ queryKey: ['student', 'tasks'] });
      
      // Refresh task details
      await getTaskDetails(taskId);
      
      return response.data;
    },
  });

  const getMyTasks = useCallback(async (filters: TaskFilters = {}) => {
    setCurrentFilters((prev) => ({
      ...prev,
      ...filters,
      page: filters.page ?? prev.page ?? 1,
      limit: filters.limit ?? prev.limit ?? 10,
    }));
  }, []);

  const submitTask = useCallback(async (taskId: string, answers: Answer[], files: File[]) => {
    return submitTaskMutation.mutateAsync({ taskId, answers, files });
  }, [submitTaskMutation]);

  const refetch = useCallback(async () => {
    await refetchTasks();
  }, [refetchTasks]);

  return {
    tasks: tasksData?.tasks || [],
    taskDetails,
    isLoading: tasksLoading || submitTaskMutation.isPending,
    error: tasksError ? (tasksError as any)?.response?.data?.message || 'Failed to fetch tasks' : null,
    pagination: tasksData?.pagination || null,
    getMyTasks,
    getTaskDetails,
    submitTask,
    refetch,
  } as UseTasksReturn;
};
