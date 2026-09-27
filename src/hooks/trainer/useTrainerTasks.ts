import { useState, useCallback } from 'react';
import { api } from '../../lib/api';
import { Question, Task } from '../student/useTasks';

export interface CreateQuestionData {
  questionText: string;
  questionTextAr?: string;
  answerType: 'mcq' | 'text' | 'image';
  type?: 'single_choice' | 'multiple_choice';
  options?: string[];
  correctAnswers?: number[];
  points: number;
  order: number;
  required: boolean;
  maxLength?: number;
  maxImages?: number;
  allowedImageTypes?: string[];
  maxImageSize?: number;
}

export interface CreateTaskData {
  groupId: string;
  courseId?: string;
  title: string;
  titleAr?: string;
  description: string;
  descriptionAr?: string;
  deadline: string;
  maxScore?: number;
  questions: CreateQuestionData[];
  allowLateSubmission?: boolean;
  status?: 'draft' | 'open';
}

export interface AttachedFile {
  _id: string;
  filename: string;
  originalName?: string;
  size?: number;
  mimeType?: string;
  storagePath: string;
  storageBucket?: string;
}

export interface TaskSubmission {
  _id: string;
  studentId: {
    _id: string;
    name: string;
    email: string;
  };
  answers: any[];
  attachedFiles?: AttachedFile[];
  status: 'not_submitted' | 'pending_review' | 'graded' | 'returned';
  score?: number;
  feedback?: string;
  submittedAt?: string;
  isLate: boolean;
}

export interface GradeSubmissionData {
  score?: number;
  feedback?: string;
  status?: 'pending_review' | 'graded' | 'returned';
}

export interface TrainerTaskDetails {
  task: Task & {
    questions: Question[];
    allowLateSubmission: boolean;
  };
}

interface UseTrainerTasksReturn {
  tasks: Task[];
  submissions: TaskSubmission[];
  taskDetails: TrainerTaskDetails | null;
  isLoading: boolean;
  error: string | null;
  createTask: (data: CreateTaskData) => Promise<Task>;
  getGroupTasks: (groupId: string) => Promise<void>;
  getTaskDetails: (taskId: string) => Promise<void>;
  updateTask: (taskId: string, data: Partial<CreateTaskData>) => Promise<Task>;
  deleteTask: (taskId: string) => Promise<void>;
  publishTask: (taskId: string) => Promise<Task>;
  getTaskSubmissions: (taskId: string) => Promise<void>;
  gradeSubmission: (taskId: string, submissionId: string, data: GradeSubmissionData) => Promise<void>;
}

export const useTrainerTasks = (): UseTrainerTasksReturn => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [taskDetails, setTaskDetails] = useState<TrainerTaskDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTask = useCallback(async (data: CreateTaskData): Promise<Task> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.post('/trainer/tasks', data);
      const newTask = response.data.data;
      setTasks(prev => [newTask, ...prev]);
      return newTask;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to create task';
      setError(errorMsg);
      console.error('Error creating task:', err);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getGroupTasks = useCallback(async (groupId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.get(`/trainer/tasks/group/${groupId}`);
      setTasks(response.data.data || []);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch tasks';
      setError(errorMsg);
      console.error('Error fetching group tasks:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateTask = useCallback(async (taskId: string, data: Partial<CreateTaskData>): Promise<Task> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.put(`/trainer/tasks/${taskId}`, data);
      const updatedTask = response.data.data;
      setTasks(prev => prev.map(t => t._id === taskId ? updatedTask : t));
      return updatedTask;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to update task';
      setError(errorMsg);
      console.error('Error updating task:', err);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      await api.delete(`/trainer/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t._id !== taskId));
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to delete task';
      setError(errorMsg);
      console.error('Error deleting task:', err);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getTaskDetails = useCallback(async (taskId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Try to get task details from the submissions endpoint first
      try {
        const response = await api.get(`/trainer/tasks/${taskId}/submissions`);
        if (response.data.task) {
          setTaskDetails({ task: response.data.task });
          return;
        }
      } catch (submissionsErr) {
        // If submissions endpoint doesn't include task, continue to try other methods
        console.log('Task not found in submissions response, trying alternative...');
      }

      // Try direct endpoint: /trainer/tasks/:taskId
      try {
        const response = await api.get(`/trainer/tasks/${taskId}`);
        if (response.data.task) {
          setTaskDetails({ task: response.data.task });
          return;
        }
      } catch (directErr) {
        console.log('Direct task endpoint failed, trying group tasks...');
      }

      // Last resort: Try to get from group tasks (need to fetch all groups first)
      // This is less ideal but might work if we know the group
      setTaskDetails(null);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch task details';
      setError(errorMsg);
      console.error('Error fetching task details:', err);
      // Don't throw - allow the page to work without task details
      setTaskDetails(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const publishTask = useCallback(async (taskId: string): Promise<Task> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.patch(`/trainer/tasks/${taskId}/publish`);
      const publishedTask = response.data.data;
      setTasks(prev => prev.map(t => t._id === taskId ? publishedTask : t));
      return publishedTask;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to publish task';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getTaskSubmissions = useCallback(async (taskId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.get(`/trainer/tasks/${taskId}/submissions`);
      console.log('Submissions API Full Response:', response);
      console.log('Submissions API Response.data:', response.data);
      console.log('Submissions API Response.data.data:', response.data?.data);
      console.log('Submissions API Response.data.submissions:', response.data?.submissions);
      
      // Try multiple possible response structures
      let submissionsData = null;
      
      // Structure 1: { success: true, data: [...] }
      if (Array.isArray(response.data?.data)) {
        submissionsData = response.data.data;
      }
      // Structure 2: { success: true, submissions: [...] }
      else if (Array.isArray(response.data?.submissions)) {
        submissionsData = response.data.submissions;
      }
      // Structure 3: Direct array
      else if (Array.isArray(response.data)) {
        submissionsData = response.data;
      }
      // Structure 4: { data: { submissions: [...] } }
      else if (Array.isArray(response.data?.data?.submissions)) {
        submissionsData = response.data.data.submissions;
      }
      // Structure 5: Empty array as fallback
      else {
        console.warn('Unexpected response structure:', response.data);
        submissionsData = [];
      }
      
      // Ensure we always set an array
      const submissionsArray = Array.isArray(submissionsData) ? submissionsData : [];
      console.log('Final submissions array:', submissionsArray);
      console.log('Submissions count:', submissionsArray.length);
      
      // Validate submission structure
      if (submissionsArray.length > 0) {
        console.log('First submission structure:', submissionsArray[0]);
        console.log('First submission has studentId?', !!submissionsArray[0]?.studentId);
        console.log('First submission studentId type:', typeof submissionsArray[0]?.studentId);
      }
      
      setSubmissions(submissionsArray);
      
      // Check if the response includes task details
      if (response.data.task) {
        setTaskDetails({ task: response.data.task });
      }
      // Also check nested task
      else if (response.data.data?.task) {
        setTaskDetails({ task: response.data.data.task });
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch submissions';
      setError(errorMsg);
      console.error('Error fetching submissions:', err);
      console.error('Error response:', err.response);
      setSubmissions([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  const gradeSubmission = useCallback(async (
    taskId: string,
    submissionId: string,
    data: GradeSubmissionData
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.post(
        `/trainer/tasks/${taskId}/submissions/${submissionId}/grade`,
        data
      );
      
      const updatedSubmission = response.data.data;
      setSubmissions(prev => prev.map(s => 
        s._id === submissionId ? updatedSubmission : s
      ));
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to grade submission';
      setError(errorMsg);
      console.error('Error grading submission:', err);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    tasks,
    submissions,
    taskDetails,
    isLoading,
    error,
    createTask,
    getGroupTasks,
    getTaskDetails,
    updateTask,
    deleteTask,
    publishTask,
    getTaskSubmissions,
    gradeSubmission,
  };
};
