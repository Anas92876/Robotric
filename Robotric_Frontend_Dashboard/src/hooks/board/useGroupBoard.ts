import { useState, useCallback } from 'react';
import { api } from '../../lib/api';

export interface BoardNote {
  _id: string;
  groupId: string;
  author: { _id: string; name: string; email: string };
  content: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BoardTask {
  _id: string;
  groupId: string;
  title: string;
  description?: string;
  priority: 1 | 2 | 3;
  status: 'todo' | 'in_progress' | 'done';
  assignedTo: { _id: string; name: string; email: string }[];
  createdBy: { _id: string; name: string; email: string };
  dueDate?: string;
  createdAt: string;
}

export interface CreateBoardTaskData {
  title: string;
  description?: string;
  priority: 1 | 2 | 3;
  assignedTo?: string[];
  dueDate?: string;
}

export interface GroupBoardData {
  notes: BoardNote[];
  tasks: BoardTask[];
}

type UserRole = 'trainer' | 'teacher' | 'student';

interface UseGroupBoardReturn {
  notes: BoardNote[];
  tasks: BoardTask[];
  isLoading: boolean;
  error: string | null;
  boardDisabled: boolean;
  fetchBoard: () => Promise<void>;
  // Notes
  createNote: (content: string) => Promise<void>;
  updateNote: (noteId: string, content: string, isPinned?: boolean) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  // Tasks — trainer only
  createTask: (data: CreateBoardTaskData) => Promise<void>;
  updateTask: (taskId: string, data: Partial<CreateBoardTaskData> & { status?: 'todo' | 'in_progress' | 'done' }) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  // Status — student only
  updateTaskStatus: (taskId: string, status: 'todo' | 'in_progress' | 'done') => Promise<void>;
}

export function useGroupBoard(groupId: string, role: UserRole): UseGroupBoardReturn {
  const [notes, setNotes] = useState<BoardNote[]>([]);
  const [tasks, setTasks] = useState<BoardTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [boardDisabled, setBoardDisabled] = useState(false);

  const base = role === 'student' ? '/student/board' : '/trainer/board';

  const fetchBoard = useCallback(async () => {
    if (!groupId) return;
    try {
      setIsLoading(true);
      setError(null);
      setBoardDisabled(false);
      const res = await api.get(`${base}/${groupId}`);
      setNotes(res.data.data.notes || []);
      setTasks(res.data.data.tasks || []);
    } catch (err: any) {
      const code = err.response?.data?.error?.code;
      if (code === 'BOARD_NOT_ENABLED') {
        setBoardDisabled(true);
      } else {
        setError(err.response?.data?.error?.message || 'Failed to load board');
      }
    } finally {
      setIsLoading(false);
    }
  }, [groupId, base]);

  // ─── Notes ──────────────────────────────────────────────────────────────────

  const createNote = useCallback(async (content: string) => {
    const res = await api.post(`${base}/${groupId}/notes`, { content });
    setNotes(prev => [res.data.data, ...prev]);
  }, [groupId, base]);

  const updateNote = useCallback(async (noteId: string, content: string, isPinned?: boolean) => {
    const body: any = { content };
    if (isPinned !== undefined) body.isPinned = isPinned;
    const res = await api.patch(`${base}/${groupId}/notes/${noteId}`, body);
    setNotes(prev => prev.map(n => n._id === noteId ? res.data.data : n)
      .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)));
  }, [groupId, base]);

  const deleteNote = useCallback(async (noteId: string) => {
    await api.delete(`${base}/${groupId}/notes/${noteId}`);
    setNotes(prev => prev.filter(n => n._id !== noteId));
  }, [groupId, base]);

  // ─── Tasks (trainer) ────────────────────────────────────────────────────────

  const createTask = useCallback(async (data: CreateBoardTaskData) => {
    const res = await api.post(`${base}/${groupId}/tasks`, data);
    setTasks(prev => [...prev, res.data.data].sort((a, b) => a.priority - b.priority));
  }, [groupId, base]);

  const updateTask = useCallback(async (taskId: string, data: Partial<CreateBoardTaskData> & { status?: 'todo' | 'in_progress' | 'done' }) => {
    const res = await api.patch(`${base}/${groupId}/tasks/${taskId}`, data);
    setTasks(prev => prev.map(t => t._id === taskId ? res.data.data : t));
  }, [groupId, base]);

  const deleteTask = useCallback(async (taskId: string) => {
    await api.delete(`${base}/${groupId}/tasks/${taskId}`);
    setTasks(prev => prev.filter(t => t._id !== taskId));
  }, [groupId, base]);

  // ─── Task status (student) ──────────────────────────────────────────────────

  const updateTaskStatus = useCallback(async (taskId: string, status: 'todo' | 'in_progress' | 'done') => {
    const res = await api.patch(`${base}/${groupId}/tasks/${taskId}/status`, { status });
    setTasks(prev => prev.map(t => t._id === taskId ? res.data.data : t));
  }, [groupId, base]);

  return {
    notes,
    tasks,
    isLoading,
    error,
    boardDisabled,
    fetchBoard,
    createNote,
    updateNote,
    deleteNote,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
  };
}
