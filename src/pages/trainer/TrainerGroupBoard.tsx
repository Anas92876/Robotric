import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, StickyNote, ListTodo,
  Plus, Edit2, Trash2, Pin, PinOff, AlertCircle, RefreshCw,
  Lock, Calendar, User, CheckCircle2, Circle, Loader2, X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  useGroupBoard,
  type BoardNote,
  type BoardTask,
  type CreateBoardTaskData,
} from '../../hooks/board/useGroupBoard';
import { useAuth } from '../../providers/AuthProvider';
import { Alert, Button } from '../../components/ui';
import { formatDate } from '../../utils/dateTime';
import { api } from '../../lib/api';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const TEXT_PRIMARY   = '#0f1f33';
const TEXT_SECONDARY = '#0f1f33CC';
const TEXT_TERTIARY  = '#0f1f3380';

const fade      = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.2 } } };
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };

// ─── Priority / Status config ───────────────────────────────────────────────────
const PRIORITY_CFG = {
  1: { label: 'Critical', labelAr: 'حرج',   bar: '#ef4444', badge: 'bg-red-500/12 text-red-600 border-red-500/25' },
  2: { label: 'High',     labelAr: 'عالٍ',   bar: '#f97316', badge: 'bg-orange-500/12 text-orange-600 border-orange-500/25' },
  3: { label: 'Normal',   labelAr: 'عادي',   bar: '#22c55e', badge: 'bg-green-500/12 text-green-600 border-green-500/25' },
} as const;

const STATUS_CFG = {
  todo:        { label: 'To Do',       labelAr: 'للتنفيذ',     icon: Circle,       color: TEXT_TERTIARY, bg: 'rgba(15, 31, 51,0.06)' },
  in_progress: { label: 'In Progress', labelAr: 'قيد التنفيذ', icon: Loader2,       color: '#2563eb',     bg: 'rgba(37,99,235,0.06)' },
  done:        { label: 'Done',        labelAr: 'منتهية',      icon: CheckCircle2,  color: '#16a34a',     bg: 'rgba(22,163,74,0.06)' },
} as const;

type Tab = 'notes' | 'tasks';

// ─── Group student type ─────────────────────────────────────────────────────────
interface GroupMember {
  _id: string;
  name: string;
  email: string;
}

// ─── Task form state ────────────────────────────────────────────────────────────
interface TaskFormState {
  title: string;
  description: string;
  priority: 1 | 2 | 3;
  assignedTo: string[];
  dueDate: string;
}

const emptyTaskForm = (): TaskFormState => ({
  title: '', description: '', priority: 3, assignedTo: [], dueDate: '',
});

// ─── Trainer Task Card ──────────────────────────────────────────────────────────
function TrainerTaskCard({ task, isRTL, onEdit, onDelete, onStatusChange }: {
  task: BoardTask;
  isRTL: boolean;
  onEdit: (task: BoardTask) => void;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, next: 'todo' | 'in_progress' | 'done') => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const pCfg = PRIORITY_CFG[task.priority];
  const sCfg = STATUS_CFG[task.status];
  const StatusIcon = sCfg.icon;
  const CYCLE: Record<string, 'todo' | 'in_progress' | 'done'> = {
    todo: 'in_progress', in_progress: 'done', done: 'todo',
  };

  const handleStatusClick = async () => {
    if (busy) return;
    setBusy(true);
    await onStatusChange(task._id, CYCLE[task.status]);
    setBusy(false);
  };

  return (
    <motion.div variants={fade}
      className="rounded-2xl bg-white border border-ink/8 shadow-sm overflow-hidden">
      <div className="h-1" style={{ background: pCfg.bar }} />
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Status toggle */}
          <button onClick={handleStatusClick} disabled={busy}
            className="mt-0.5 shrink-0 w-7 h-7 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
            style={{ background: sCfg.bg }}
            title={`Mark as ${CYCLE[task.status]}`}>
            {busy
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: sCfg.color }} />
              : <StatusIcon className="w-3.5 h-3.5" style={{ color: sCfg.color }} />}
          </button>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight"
              style={{
                color: task.status === 'done' ? TEXT_TERTIARY : TEXT_PRIMARY,
                textDecoration: task.status === 'done' ? 'line-through' : 'none',
              }}>
              {task.title}
            </p>
            {task.description && (
              <p className="text-xs mt-1 line-clamp-2" dir="auto" style={{ color: TEXT_SECONDARY }}>
                {task.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${pCfg.badge}`}>
                {isRTL ? pCfg.labelAr : pCfg.label}
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: sCfg.bg, color: sCfg.color }}>
                {isRTL ? sCfg.labelAr : sCfg.label}
              </span>
              {task.dueDate && (
                <span className="flex items-center gap-1 text-[10px]" style={{ color: TEXT_TERTIARY }}>
                  <Calendar className="w-3 h-3" />
                  {formatDate(task.dueDate, { month: 'short', day: 'numeric' })}
                </span>
              )}
              {task.assignedTo.length > 0 && (
                <span className="flex items-center gap-1 text-[10px]" style={{ color: TEXT_TERTIARY }}>
                  <User className="w-3 h-3" />
                  {task.assignedTo.map(u => u.name).join(', ')}
                </span>
              )}
            </div>
          </div>

          {/* Edit / Delete */}
          <div className="flex items-center gap-1 shrink-0 ml-1">
            <button onClick={() => onEdit(task)}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-ink/6 transition-colors"
              style={{ color: TEXT_TERTIARY }}>
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(task._id)}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors text-red-400">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Trainer Note Card ──────────────────────────────────────────────────────────
function TrainerNoteCard({ note, userId, isRTL, onEdit, onDelete, onTogglePin }: {
  note: BoardNote;
  userId: string;
  isRTL: boolean;
  onEdit: (note: BoardNote) => void;
  onDelete: (noteId: string) => void;
  onTogglePin: (note: BoardNote) => void;
}) {
  const isOwner = note.author._id === userId;

  return (
    <motion.div variants={fade}
      className={`rounded-2xl bg-white border shadow-sm p-4 ${note.isPinned ? 'border-amber-300' : 'border-ink/8'}`}>
      {note.isPinned && (
        <div className="flex items-center gap-1.5 mb-2">
          <Pin className="w-3 h-3 text-amber-500" />
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">
            {isRTL ? 'مثبّت' : 'Pinned'}
          </span>
        </div>
      )}
      <p className="text-sm leading-relaxed whitespace-pre-wrap" dir="auto" style={{ color: TEXT_PRIMARY }}>
        {note.content}
      </p>
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-ink/6">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-ink/10 flex items-center justify-center shrink-0">
            <User className="w-3 h-3" style={{ color: TEXT_TERTIARY }} />
          </div>
          <span className="text-xs font-medium" style={{ color: TEXT_SECONDARY }}>{note.author.name}</span>
          <span className="text-xs" style={{ color: TEXT_TERTIARY }}>
            · {formatDate(note.createdAt, { month: 'short', day: 'numeric' })}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Pin / Unpin — trainer can pin any note */}
          <button onClick={() => onTogglePin(note)}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-amber-50 transition-colors"
            style={{ color: note.isPinned ? '#d97706' : TEXT_TERTIARY }}
            title={note.isPinned ? 'Unpin' : 'Pin'}>
            {note.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
          </button>
          {/* Edit — own notes only */}
          {isOwner && (
            <button onClick={() => onEdit(note)}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-ink/6 transition-colors"
              style={{ color: TEXT_TERTIARY }}>
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          {/* Delete — trainer can delete any note */}
          <button onClick={() => onDelete(note._id)}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors text-red-400">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Task Modal ─────────────────────────────────────────────────────────────────
function TaskModal({ isOpen, editingTask, members, isRTL, onClose, onSubmit, t }: {
  isOpen: boolean;
  editingTask: BoardTask | null;
  members: GroupMember[];
  isRTL: boolean;
  onClose: () => void;
  onSubmit: (data: CreateBoardTaskData) => Promise<void>;
  t: (key: string) => string;
}) {
  const [form, setForm] = useState<TaskFormState>(emptyTaskForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingTask) {
      setForm({
        title: editingTask.title,
        description: editingTask.description || '',
        priority: editingTask.priority,
        assignedTo: editingTask.assignedTo.map(u => u._id),
        dueDate: editingTask.dueDate ? editingTask.dueDate.slice(0, 10) : '',
      });
    } else {
      setForm(emptyTaskForm());
    }
  }, [editingTask, isOpen]);

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        priority: form.priority,
        assignedTo: form.assignedTo.length ? form.assignedTo : undefined,
        dueDate: form.dueDate || undefined,
      });
      onClose();
    } catch { /* hook handles error */ }
    finally { setSaving(false); }
  };

  const toggleMember = (id: string) => {
    setForm(f => ({
      ...f,
      assignedTo: f.assignedTo.includes(id)
        ? f.assignedTo.filter(x => x !== id)
        : [...f.assignedTo, id],
    }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden"
            dir={isRTL ? 'rtl' : 'ltr'}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-ink/8">
              <h3 className="font-bold text-base" style={{ color: TEXT_PRIMARY }}>
                {editingTask ? t('dashboardTrainer:editTask') : t('dashboardTrainer:createTask')}
              </h3>
              <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-ink/6 transition-colors"
                style={{ color: TEXT_TERTIARY }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: TEXT_SECONDARY }}>
                  {t('dashboardTrainer:taskTitle')} *
                </label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder={isRTL ? 'عنوان المهمة' : 'Task title'}
                  className="w-full text-sm rounded-xl border border-ink/12 bg-ink/2 px-3 py-2.5 focus:outline-none focus:border-ink/30"
                  style={{ color: TEXT_PRIMARY }}
                  dir="auto"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: TEXT_SECONDARY }}>
                  {t('dashboardTrainer:taskDescription')}
                </label>
                <textarea rows={3}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder={isRTL ? 'وصف اختياري...' : 'Optional description...'}
                  className="w-full text-sm rounded-xl border border-ink/12 bg-ink/2 px-3 py-2.5 resize-none focus:outline-none focus:border-ink/30"
                  style={{ color: TEXT_PRIMARY }}
                  dir="auto"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: TEXT_SECONDARY }}>
                  {t('dashboardTrainer:taskPriority')}
                </label>
                <div className="flex gap-2">
                  {([1, 2, 3] as const).map(p => {
                    const cfg = PRIORITY_CFG[p];
                    const active = form.priority === p;
                    return (
                      <button key={p} onClick={() => setForm(f => ({ ...f, priority: p }))}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${active ? 'shadow-sm scale-[1.02]' : 'opacity-60 hover:opacity-90'}`}
                        style={{
                          background: active ? cfg.bar + '18' : 'transparent',
                          borderColor: active ? cfg.bar : '#0f1f33' + '20',
                          color: cfg.bar,
                        }}>
                        {isRTL ? cfg.labelAr : cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Due date */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: TEXT_SECONDARY }}>
                  {t('dashboardTrainer:dueDate')}
                </label>
                <input type="date"
                  value={form.dueDate}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                  className="w-full text-sm rounded-xl border border-ink/12 bg-ink/2 px-3 py-2.5 focus:outline-none focus:border-ink/30"
                  style={{ color: TEXT_PRIMARY }}
                />
              </div>

              {/* Assign members */}
              {members.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: TEXT_SECONDARY }}>
                    {t('dashboardTrainer:assignMembers')}
                  </label>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {members.map(m => {
                      const checked = form.assignedTo.includes(m._id);
                      return (
                        <button key={m._id} onClick={() => toggleMember(m._id)}
                          className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${checked ? 'border-ink/30 bg-ink/5' : 'border-ink/8 hover:border-ink/20'}`}
                          dir={isRTL ? 'rtl' : 'ltr'}>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${checked ? 'border-ink bg-ink' : 'border-ink/30'}`}>
                            {checked && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </div>
                          <div className="w-8 h-8 rounded-full bg-ink/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold" style={{ color: TEXT_PRIMARY }}>
                              {m.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate" style={{ color: TEXT_PRIMARY }}>{m.name}</p>
                            <p className="text-[10px] truncate" style={{ color: TEXT_TERTIARY }}>{m.email}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-2 px-5 py-4 border-t border-ink/8">
              <button onClick={handleSubmit} disabled={saving || !form.title.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-50"
                style={{ background: '#0f1f33' }}>
                {saving ? '...' : editingTask ? (isRTL ? 'حفظ التغييرات' : 'Save Changes') : t('dashboardTrainer:createTask')}
              </button>
              <button onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
                style={{ background: 'rgba(15, 31, 51,0.07)', color: TEXT_PRIMARY }}>
                {t('dashboardTrainer:cancel')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────────
export default function TrainerGroupBoard() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const { t, i18n } = useTranslation(['dashboardTrainer', 'dashboardCommon']);
  const isRTL = i18n.language === 'ar';

  const {
    notes, tasks, isLoading, error, boardDisabled,
    fetchBoard, createNote, updateNote, deleteNote,
    createTask, updateTask, deleteTask,
  } = useGroupBoard(groupId!, 'trainer');

  const [tab, setTab] = useState<Tab>('notes');
  const [members, setMembers] = useState<GroupMember[]>([]);

  // Note state
  const [noteInput, setNoteInput] = useState('');
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editingNote, setEditingNote] = useState<BoardNote | null>(null);
  const [editNoteContent, setEditNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Task modal state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<BoardTask | null>(null);

  useEffect(() => { fetchBoard(); }, [fetchBoard]);

  // Load group members (students) for task assignment
  useEffect(() => {
    if (!groupId) return;
    api.get(`/trainer/groups/${groupId}/students`)
      .then(res => setMembers(res.data.data || []))
      .catch(() => { /* non-critical */ });
  }, [groupId]);

  const handleCreateNote = async () => {
    if (!noteInput.trim()) return;
    setSavingNote(true);
    try {
      await createNote(noteInput.trim());
      setNoteInput('');
      setShowNoteForm(false);
    } catch { /* handled by hook */ }
    finally { setSavingNote(false); }
  };

  const handleEditNoteSave = async () => {
    if (!editingNote || !editNoteContent.trim()) return;
    setSavingNote(true);
    try {
      await updateNote(editingNote._id, editNoteContent.trim());
      setEditingNote(null);
    } catch { /* handled by hook */ }
    finally { setSavingNote(false); }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm(isRTL ? 'هل تريد حذف هذه الملاحظة؟' : 'Delete this note?')) return;
    await deleteNote(noteId);
  };

  const handleTogglePin = async (note: BoardNote) => {
    await updateNote(note._id, note.content, !note.isPinned);
  };

  const handleTaskSubmit = async (data: CreateBoardTaskData) => {
    if (editingTask) {
      await updateTask(editingTask._id, data);
    } else {
      await createTask(data);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm(isRTL ? 'هل تريد حذف هذه المهمة؟' : 'Delete this task?')) return;
    await deleteTask(taskId);
  };

  const handleTaskStatusChange = async (taskId: string, next: 'todo' | 'in_progress' | 'done') => {
    try { await updateTask(taskId, { status: next }); } catch { /* ignore */ }
  };

  const userId = user?._id || (user as any)?.id || '';

  // ─── Board disabled ────────────────────────────────────────────────────────────
  if (boardDisabled) {
    return (
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-3" dir={isRTL ? 'rtl' : 'ltr'}>
        <motion.div variants={fade}>
          <Link to="/trainer/groups"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl font-semibold text-sm transition-all"
            style={{ background: 'rgba(15, 31, 51,0.07)', color: TEXT_PRIMARY }}>
            {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {isRTL ? 'مجموعاتي' : 'My Groups'}
          </Link>
        </motion.div>
        <motion.div variants={fade} className="rounded-2xl border border-ink/10 bg-white shadow-sm p-8 text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(15, 31, 51,0.06)' }}>
            <Lock className="w-8 h-8" style={{ color: TEXT_TERTIARY }} />
          </div>
          <h2 className="text-lg font-bold mb-2" style={{ color: TEXT_PRIMARY }}>
            {t('dashboardTrainer:boardNotEnabled')}
          </h2>
          <p className="text-sm" style={{ color: TEXT_SECONDARY }}>
            {t('dashboardTrainer:boardNotEnabledDesc')}
          </p>
        </motion.div>
      </motion.div>
    );
  }

  // ─── Loading ───────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-10 w-32 bg-ink/8 rounded-2xl" />
        <div className="h-48 bg-white border border-ink/8 rounded-2xl" />
      </div>
    );
  }

  // ─── Error ─────────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <Alert variant="error">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1"><p className="font-semibold">{error}</p></div>
          <Button variant="ghost" size="sm" onClick={fetchBoard}><RefreshCw className="w-4 h-4" /></Button>
        </div>
      </Alert>
    );
  }

  // ─── Main UI ───────────────────────────────────────────────────────────────────
  return (
    <motion.div variants={container} initial="hidden" animate="show"
      className="space-y-3 sm:space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* Back */}
      <motion.div variants={fade}>
        <Link to="/trainer/groups"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl font-semibold text-sm transition-all active:scale-[0.97]"
          style={{ background: 'rgba(15, 31, 51,0.07)', color: TEXT_PRIMARY }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(15, 31, 51,0.12)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(15, 31, 51,0.07)')}>
          {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {isRTL ? 'مجموعاتي' : 'My Groups'}
        </Link>
      </motion.div>

      {/* Header */}
      <motion.div variants={fade} className="rounded-2xl bg-white border border-ink/8 shadow-sm p-4 sm:p-5">
        <h1 className="text-xl sm:text-2xl font-bold" style={{ color: TEXT_PRIMARY }}>
          {t('dashboardTrainer:groupBoard')}
        </h1>
        <p className="text-sm mt-1" style={{ color: TEXT_SECONDARY }}>
          {isRTL ? 'إدارة ملاحظات ومهام المجموعة' : 'Manage group notes and tasks'}
        </p>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={fade} className="flex gap-2">
        {(['notes', 'tasks'] as Tab[]).map(tabKey => (
          <button key={tabKey} onClick={() => setTab(tabKey)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all ${tab === tabKey ? 'shadow-sm' : 'hover:opacity-80'}`}
            style={tab === tabKey
              ? { background: '#0f1f33', color: '#fff' }
              : { background: 'rgba(15, 31, 51,0.07)', color: TEXT_PRIMARY }}>
            {tabKey === 'notes' ? <StickyNote className="w-4 h-4" /> : <ListTodo className="w-4 h-4" />}
            {tabKey === 'notes' ? t('dashboardTrainer:boardNotes') : t('dashboardTrainer:boardTasks')}
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
              style={{
                background: tab === tabKey ? 'rgba(255,255,255,0.2)' : 'rgba(15, 31, 51,0.1)',
                color: tab === tabKey ? '#fff' : TEXT_TERTIARY,
              }}>
              {tabKey === 'notes' ? notes.length : tasks.length}
            </span>
          </button>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        {/* ─── Notes tab ─── */}
        {tab === 'notes' && (
          <motion.div key="notes" variants={container} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-3">
            <motion.div variants={fade} className="rounded-2xl bg-white border border-ink/8 shadow-sm overflow-hidden">
              {/* Section header */}
              <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-ink/6">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.1)' }}>
                    <StickyNote className="w-4 h-4 text-amber-500" />
                  </div>
                  <h2 className="font-bold text-base" style={{ color: TEXT_PRIMARY }}>
                    {t('dashboardTrainer:boardNotes')}
                  </h2>
                </div>
                <button onClick={() => setShowNoteForm(f => !f)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
                  style={{ background: 'rgba(15, 31, 51,0.07)', color: TEXT_PRIMARY }}>
                  <Plus className="w-3.5 h-3.5" />
                  {t('dashboardTrainer:addNote')}
                </button>
              </div>

              {/* Add note form */}
              <AnimatePresence>
                {showNoteForm && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="border-b border-ink/6 overflow-hidden">
                    <div className="p-4">
                      <textarea rows={3} value={noteInput} onChange={e => setNoteInput(e.target.value)}
                        placeholder={t('dashboardTrainer:noteWritePlaceholder')}
                        className="w-full text-sm rounded-xl border border-ink/12 bg-ink/2 px-3 py-2.5 resize-none focus:outline-none focus:border-ink/30"
                        style={{ color: TEXT_PRIMARY }} dir="auto" />
                      <div className="flex gap-2 mt-2">
                        <button onClick={handleCreateNote} disabled={savingNote || !noteInput.trim()}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-50"
                          style={{ background: '#0f1f33' }}>
                          {savingNote ? '...' : t('dashboardTrainer:saveNote')}
                        </button>
                        <button onClick={() => { setShowNoteForm(false); setNoteInput(''); }}
                          className="px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
                          style={{ background: 'rgba(15, 31, 51,0.07)', color: TEXT_PRIMARY }}>
                          {t('dashboardTrainer:cancel')}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Notes list */}
              <div className="p-4 space-y-3">
                {notes.length === 0 ? (
                  <div className="text-center py-8">
                    <StickyNote className="w-10 h-10 mx-auto mb-2" style={{ color: TEXT_TERTIARY, opacity: 0.4 }} />
                    <p className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>{t('dashboardTrainer:noNotes')}</p>
                    <p className="text-xs mt-1" style={{ color: TEXT_SECONDARY }}>{t('dashboardTrainer:noNotesDesc')}</p>
                  </div>
                ) : (
                  <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
                    {notes.map(note => (
                      <TrainerNoteCard key={note._id} note={note} userId={userId} isRTL={isRTL}
                        onEdit={n => { setEditingNote(n); setEditNoteContent(n.content); }}
                        onDelete={handleDeleteNote}
                        onTogglePin={handleTogglePin}
                      />
                    ))}
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Edit note modal */}
            <AnimatePresence>
              {editingNote && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                  onClick={e => { if (e.target === e.currentTarget) setEditingNote(null); }}>
                  <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                    className="w-full max-w-md rounded-2xl bg-white shadow-xl p-5">
                    <h3 className="font-bold text-base mb-3" style={{ color: TEXT_PRIMARY }}>
                      {t('dashboardTrainer:editNote')}
                    </h3>
                    <textarea rows={4} value={editNoteContent} onChange={e => setEditNoteContent(e.target.value)}
                      className="w-full text-sm rounded-xl border border-ink/12 bg-ink/2 px-3 py-2.5 resize-none focus:outline-none focus:border-ink/30"
                      style={{ color: TEXT_PRIMARY }} dir="auto" />
                    <div className="flex gap-2 mt-3">
                      <button onClick={handleEditNoteSave} disabled={savingNote || !editNoteContent.trim()}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50 transition-all active:scale-95"
                        style={{ background: '#0f1f33' }}>
                        {savingNote ? '...' : t('dashboardTrainer:saveNote')}
                      </button>
                      <button onClick={() => setEditingNote(null)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
                        style={{ background: 'rgba(15, 31, 51,0.07)', color: TEXT_PRIMARY }}>
                        {t('dashboardTrainer:cancel')}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ─── Tasks tab ─── */}
        {tab === 'tasks' && (
          <motion.div key="tasks" variants={container} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-3">
            <motion.div variants={fade} className="rounded-2xl bg-white border border-ink/8 shadow-sm overflow-hidden">
              {/* Section header */}
              <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-ink/6">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.08)' }}>
                    <ListTodo className="w-4 h-4 text-blue-500" />
                  </div>
                  <h2 className="font-bold text-base" style={{ color: TEXT_PRIMARY }}>
                    {t('dashboardTrainer:boardTasks')}
                  </h2>
                </div>
                <button onClick={() => { setEditingTask(null); setShowTaskModal(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
                  style={{ background: 'rgba(15, 31, 51,0.07)', color: TEXT_PRIMARY }}>
                  <Plus className="w-3.5 h-3.5" />
                  {t('dashboardTrainer:createTask')}
                </button>
              </div>

              {/* Tasks list */}
              <div className="p-4 space-y-3">
                {tasks.length === 0 ? (
                  <div className="text-center py-8">
                    <ListTodo className="w-10 h-10 mx-auto mb-2" style={{ color: TEXT_TERTIARY, opacity: 0.4 }} />
                    <p className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>{t('dashboardTrainer:noBoardTasks')}</p>
                    <p className="text-xs mt-1" style={{ color: TEXT_SECONDARY }}>{t('dashboardTrainer:noBoardTasksDesc')}</p>
                  </div>
                ) : (
                  <>
                    {/* Priority groups */}
                    {([1, 2, 3] as const).map(p => {
                      const group = tasks.filter(tk => tk.priority === p);
                      if (!group.length) return null;
                      const cfg = PRIORITY_CFG[p];
                      return (
                        <div key={p}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.bar }} />
                            <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: TEXT_TERTIARY }}>
                              {isRTL ? cfg.labelAr : cfg.label} ({group.length})
                            </p>
                          </div>
                          <motion.div variants={container} initial="hidden" animate="show" className="space-y-2 mb-4">
                            {group.map(task => (
                              <TrainerTaskCard key={task._id} task={task} isRTL={isRTL}
                                onEdit={tk => { setEditingTask(tk); setShowTaskModal(true); }}
                                onDelete={handleDeleteTask}
                                onStatusChange={handleTaskStatusChange}
                              />
                            ))}
                          </motion.div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task modal */}
      <TaskModal
        isOpen={showTaskModal}
        editingTask={editingTask}
        members={members}
        isRTL={isRTL}
        onClose={() => { setShowTaskModal(false); setEditingTask(null); }}
        onSubmit={handleTaskSubmit}
        t={t as (key: string) => string}
      />
    </motion.div>
  );
}
