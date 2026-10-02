import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import type { QuestionDraft } from '../../common/taskBuilder/QuestionsEditor';

export type TaskStatus = 'draft' | 'open' | 'closed';
export type SubmissionStatus = 'not_submitted' | 'pending_review' | 'graded' | 'returned';
export interface TrainerTask {
  _id: string;
  groupId: { _id: string; name: string } | string;
  courseId?: { _id: string; title: string } | string | null;
  title: string;
  titleAr?: string | null;
  description: string;
  descriptionAr?: string | null;
  deadline: string;
  maxScore: number;
  hasQuestions: boolean;
  questions: (QuestionDraft & { _id: string })[];
  allowLateSubmission: boolean;
  status: TaskStatus;
  createdAt: string;
}
export interface TaskAnswer {
  questionId: string;
  answerType: 'mcq' | 'text' | 'image';
  selectedAnswers?: number[];
  textAnswer?: string;
  imageAnswers?: { cloudinaryUrl: string | null; filename: string; size: number }[];
}
export interface Submission {
  _id: string;
  studentId: { _id: string; name: string; email: string } | string;
  answers: TaskAnswer[];
  attachedFiles: { _id: string; filename: string; originalName: string; size: number }[];
  submittedAt?: string | null;
  isLate: boolean;
  status: SubmissionStatus;
  score?: number | null;
  feedback?: string | null;
  gradedAt?: string | null;
}
export interface TaskInput {
  groupId?: string;
  title: string;
  titleAr?: string;
  description: string;
  descriptionAr?: string;
  deadline: string;
  maxScore: number;
  allowLateSubmission: boolean;
  questions: QuestionDraft[];
  status?: TaskStatus;
}

const ROOT = ['trainer', 'tasks'] as const;
export const idOf = (x: { _id: string } | string | null | undefined) => (x && typeof x === 'object' ? x._id : x ?? '');

export const useGroupTasks = (groupId: string) =>
  useQuery({ queryKey: [...ROOT, 'group', groupId], queryFn: async () => ((await api.get(`/trainer/tasks/group/${groupId}`)).data.data ?? []) as TrainerTask[], enabled: !!groupId });

/** The task with its questions and every submission. */
export const useTaskDetails = (taskId: string) =>
  useQuery({
    queryKey: [...ROOT, taskId],
    queryFn: async () => {
      const r = (await api.get(`/trainer/tasks/${taskId}`)).data;
      return { task: r.task as TrainerTask, submissions: (r.data?.submissions ?? []) as Submission[] };
    },
    enabled: !!taskId,
  });

export function useTaskMutations() {
  const qc = useQueryClient();
  const refresh = () => void qc.invalidateQueries({ queryKey: ROOT });
  return {
    save: useMutation({ mutationFn: ({ id, d }: { id?: string; d: TaskInput }) => (id ? api.put(`/trainer/tasks/${id}`, d) : api.post('/trainer/tasks', d)).then((r) => r.data.data as TrainerTask), onSuccess: refresh }),
    publish: useMutation({ mutationFn: (id: string) => api.patch(`/trainer/tasks/${id}/publish`), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (id: string) => api.delete(`/trainer/tasks/${id}`), onSuccess: refresh }),
    grade: useMutation({
      mutationFn: ({ taskId, subId, d }: { taskId: string; subId: string; d: { score: number; feedback: string; status: 'graded' | 'returned' } }) => api.post(`/trainer/tasks/${taskId}/submissions/${subId}/grade`, d),
      onSuccess: refresh,
    }),
  };
}

/** A short-lived download link for a file a student attached. */
export const fileLink = async (taskId: string, subId: string, fileId: string) =>
  (await api.get(`/trainer/tasks/${taskId}/submissions/${subId}/files/${fileId}`)).data.data as { downloadUrl: string; filename: string };
