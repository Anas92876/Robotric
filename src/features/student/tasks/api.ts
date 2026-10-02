import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';

export type SubmissionStatus = 'not_submitted' | 'pending_review' | 'graded' | 'returned';
export interface TaskQuestion {
  _id: string;
  questionText: string;
  questionTextAr?: string;
  answerType: 'mcq' | 'image' | 'text';
  type?: 'single_choice' | 'multiple_choice';
  options: string[];
  correctAnswers?: number[];
  points: number;
  order: number;
  required: boolean;
  maxLength?: number;
  maxImages: number;
  allowedImageTypes: string[];
  maxImageSize?: number;
}
export interface StudentTask {
  _id: string;
  title: string;
  titleAr?: string | null;
  description?: string | null;
  descriptionAr?: string | null;
  deadline: string;
  maxScore: number;
  hasQuestions: boolean;
  status: 'draft' | 'open' | 'closed';
  allowLateSubmission?: boolean;
  courseId?: { _id: string; title: string } | null;
  sessionId?: { _id: string; title: string; sessionNumber?: number } | null;
  groupId?: { _id: string; name: string } | null;
  createdBy?: { _id: string; name: string } | null;
  questions: TaskQuestion[];
  submission?: { _id: string; status: SubmissionStatus; score?: number | null; submittedAt?: string; isLate: boolean } | null;
}
export interface TaskSubmission {
  _id: string;
  answers: { questionId: string; answerType: string; selectedAnswers?: number[]; textAnswer?: string; imageAnswers?: { cloudinaryUrl: string | null; filename?: string }[] }[];
  attachedFiles: { _id: string; originalName: string; size: number }[];
  submittedAt?: string;
  isLate: boolean;
  status: SubmissionStatus;
  score?: number | null;
  feedback?: string | null;
  gradedBy?: { _id: string; name: string } | string | null;
}
export interface AnswerDraft {
  questionId: string;
  answerType: TaskQuestion['answerType'];
  selectedAnswers?: number[];
  textAnswer?: string;
  /** Image answers send indexes into the image files of the upload. */
  images?: File[];
}

const ROOT = ['student', 'tasks'] as const;

export const useStudentTasks = () =>
  useQuery({ queryKey: [...ROOT, 'list'], queryFn: async () => ((await api.get('/student/tasks?limit=100')).data.data ?? []) as StudentTask[], staleTime: 30_000 });

/** A task may open later; the server then answers 403 with { locked: true }. */
export const useStudentTask = (id: string) =>
  useQuery({
    queryKey: [...ROOT, id],
    queryFn: async (): Promise<{ task: StudentTask; submission: TaskSubmission | null } | { locked: true }> => {
      try {
        return (await api.get(`/student/tasks/${id}`, { skipErrorToast: true } as object)).data.data;
      } catch (err) {
        const r = (err as { response?: { status?: number; data?: { locked?: boolean } } }).response;
        if (r?.status === 403 && r.data?.locked) return { locked: true };
        throw err;
      }
    },
    retry: false,
  });

export function useSubmitTask(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ answers, archives }: { answers: AnswerDraft[]; archives: File[] }) => {
      const form = new FormData();
      const images: File[] = [];
      const payload = answers.map(({ images: imgs, ...a }) => {
        if (a.answerType !== 'image') return a;
        const imageFileIndices = (imgs ?? []).map((f) => images.push(f) - 1);
        return { ...a, imageFileIndices };
      });
      form.append('answers', JSON.stringify(payload));
      [...images, ...archives].forEach((f) => form.append('files', f));
      return api.post(`/student/tasks/${id}/submit`, form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 0, skipErrorToast: true } as object);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ROOT }),
  });
}

export type TaskState = 'todo' | 'late' | 'review' | 'graded' | 'closed' | 'missed';
/** Where the task stands for the student. */
export function stateOf(t: StudentTask, now = Date.now()): TaskState {
  const s = t.submission?.status;
  if (s === 'graded' || s === 'returned') return 'graded';
  if (s === 'pending_review') return 'review';
  const past = new Date(t.deadline).getTime() < now;
  if (t.status === 'closed') return 'closed';
  if (past) return t.allowLateSubmission ? 'late' : 'missed';
  return 'todo';
}
