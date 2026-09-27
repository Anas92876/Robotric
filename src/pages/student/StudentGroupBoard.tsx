import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, StickyNote, ListTodo,
  Plus, Edit2, Trash2, Pin, PinOff, AlertCircle, RefreshCw,
  Lock, Calendar, User, CheckCircle2, Circle, Loader2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useGroupBoard, type BoardNote, type BoardTask } from '../../hooks/board/useGroupBoard';
import { useAuth } from '../../providers/AuthProvider';
import { Alert, Button } from '../../components/ui';
import { formatDate } from '../../utils/dateTime';

const TEXT_PRIMARY = '#003300';
const TEXT_SECONDARY = '#003300CC';
const TEXT_TERTIARY = '#00330080';

const fade = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.2 } } };
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };

// ─── Priority config (same as CTO/Engineer) ────────────────────────────────────
const PRIORITY_CFG = {
  1: { label: 'Critical', labelAr: 'حرج',   bar: '#ef4444', badge: 'bg-red-500/12 text-red-600 border-red-500/25' },
  2: { label: 'High',     labelAr: 'عالٍ',   bar: '#f97316', badge: 'bg-orange-500/12 text-orange-600 border-orange-500/25' },
  3: { label: 'Normal',   labelAr: 'عادي',   bar: '#22c55e', badge: 'bg-green-500/12 text-green-600 border-green-500/25' },
} as const;

const STATUS_CFG = {
  todo:        { label: 'To Do',       labelAr: 'للتنفيذ',      icon: Circle,        color: TEXT_TERTIARY,   bg: 'rgba(0,51,0,0.06)' },
  in_progress: { label: 'In Progress', labelAr: 'قيد التنفيذ', icon: Loader2,        color: '#2563eb',       bg: 'rgba(37,99,235,0.06)' },
  done:        { label: 'Done',        labelAr: 'منتهية',       icon: CheckCircle2,  color: '#16a34a',       bg: 'rgba(22,163,74,0.06)' },
} as const;

type Tab = 'notes' | 'tasks';

// ─── Task card ─────────────────────────────────────────────────────────────────
function TaskCard({ task, userId, isRTL, onStatusChange }: {
  task: BoardTask;
  userId: string;
  isRTL: boolean;
  onStatusChange: (taskId: string, next: 'todo' | 'in_progress' | 'done') => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const isAssigned = task.assignedTo.some(u => u._id === userId);
  const pCfg = PRIORITY_CFG[task.priority];
  const sCfg = STATUS_CFG[task.status];
  const StatusIcon = sCfg.icon;

  const CYCLE: Record<string, 'todo' | 'in_progress' | 'done'> = {
    todo: 'in_progress', in_progress: 'done', done: 'todo',
  };

  const handleStatusClick = async () => {
    if (!isAssigned || busy) return;
    setBusy(true);
    await onStatusChange(task._id, CYCLE[task.status]);
    setBusy(false);
  };

  return (
    <motion.div variants={fade}
      className="rounded-2xl bg-white border border-[#003300]/8 shadow-sm overflow-hidden">
      {/* priority bar */}
      <div className="h-1" style={{ background: pCfg.bar }} />
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* status toggle */}
          <button
            onClick={handleStatusClick}
            disabled={!isAssigned || busy}
            className={`mt-0.5 shrink-0 w-7 h-7 rounded-xl flex items-center justify-center transition-all ${isAssigned ? 'hover:scale-110 active:scale-95 cursor-pointer' : 'cursor-default opacity-50'}`}
            style={{ background: sCfg.bg }}
            title={isAssigned ? `Mark as ${CYCLE[task.status]}` : 'Not assigned to you'}
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: sCfg.color }} />
                  : <StatusIcon className="w-3.5 h-3.5" style={{ color: sCfg.color }} />}
          </button>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight" style={{ color: task.status === 'done' ? TEXT_TERTIARY : TEXT_PRIMARY,
              textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>
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
        </div>
      </div>
    </motion.div>
  );
}

// ─── Note card ─────────────────────────────────────────────────────────────────
function NoteCard({ note, userId, isRTL, onEdit, onDelete }: {
  note: BoardNote;
  userId: string;
  isRTL: boolean;
  onEdit: (note: BoardNote) => void;
  onDelete: (noteId: string) => void;
}) {
  const isOwner = note.author._id === userId;

  return (
    <motion.div variants={fade}
      className={`rounded-2xl bg-white border shadow-sm p-4 ${note.isPinned ? 'border-amber-300' : 'border-[#003300]/8'}`}>
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
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#003300]/6">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-[#003300]/10 flex items-center justify-center shrink-0">
            <User className="w-3 h-3" style={{ color: TEXT_TERTIARY }} />
          </div>
          <span className="text-xs font-medium" style={{ color: TEXT_SECONDARY }}>{note.author.name}</span>
          <span className="text-xs" style={{ color: TEXT_TERTIARY }}>
            · {formatDate(note.createdAt, { month: 'short', day: 'numeric' })}
          </span>
        </div>
        {isOwner && (
          <div className="flex items-center gap-1">
            <button onClick={() => onEdit(note)}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#003300]/6 transition-colors"
              style={{ color: TEXT_TERTIARY }}>
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(note._id)}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors text-red-400">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function StudentGroupBoard() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const { t, i18n } = useTranslation(['dashboardStudent', 'dashboardCommon']);
  const isRTL = i18n.language === 'ar';

  const { notes, tasks, isLoading, error, boardDisabled, fetchBoard, createNote, updateNote, deleteNote, updateTaskStatus } =
    useGroupBoard(groupId!, 'student');

  const [tab, setTab] = useState<Tab>('notes');
  const [noteInput, setNoteInput] = useState('');
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editingNote, setEditingNote] = useState<BoardNote | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchBoard(); }, [fetchBoard]);

  const handleCreateNote = async () => {
    if (!noteInput.trim()) return;
    setSaving(true);
    try { await createNote(noteInput.trim()); setNoteInput(''); setShowNoteForm(false); }
    catch { /* error handled by hook */ }
    finally { setSaving(false); }
  };

  const handleEditSave = async () => {
    if (!editingNote || !editContent.trim()) return;
    setSaving(true);
    try { await updateNote(editingNote._id, editContent.trim()); setEditingNote(null); }
    catch { /* error handled by hook */ }
    finally { setSaving(false); }
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm(isRTL ? 'هل تريد حذف هذه الملاحظة؟' : 'Delete this note?')) return;
    await deleteNote(noteId);
  };

  const handleStatusChange = async (taskId: string, next: 'todo' | 'in_progress' | 'done') => {
    try { await updateTaskStatus(taskId, next); } catch { /* ignore */ }
  };

  if (boardDisabled) {
    return (
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-3" dir={isRTL ? 'rtl' : 'ltr'}>
        <motion.div variants={fade}>
          <Link to="/student/courses"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl font-semibold text-sm"
            style={{ background: 'rgba(0,51,0,0.07)', color: TEXT_PRIMARY }}>
            {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {t('dashboardStudent:myCourses')}
          </Link>
        </motion.div>
        <motion.div variants={fade} className="rounded-2xl border border-[#003300]/10 bg-white shadow-sm p-8 text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(0,51,0,0.06)' }}>
            <Lock className="w-8 h-8" style={{ color: TEXT_TERTIARY }} />
          </div>
          <h2 className="text-lg font-bold mb-2" style={{ color: TEXT_PRIMARY }}>
            {t('dashboardStudent:boardNotEnabled')}
          </h2>
          <p className="text-sm" style={{ color: TEXT_SECONDARY }}>
            {t('dashboardStudent:boardNotEnabledDesc')}
          </p>
        </motion.div>
      </motion.div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-10 w-32 bg-[#003300]/8 rounded-2xl" />
        <div className="h-48 bg-white border border-[#003300]/8 rounded-2xl" />
      </div>
    );
  }

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

  const myTasks = tasks.filter(t => t.assignedTo.some(u => u._id === user?._id || u._id === (user as any)?.id));
  const otherTasks = tasks.filter(t => !t.assignedTo.some(u => u._id === user?._id || u._id === (user as any)?.id));

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-3 sm:space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Back */}
      <motion.div variants={fade}>
        <Link to="/student/courses"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl font-semibold text-sm transition-all active:scale-[0.97]"
          style={{ background: 'rgba(0,51,0,0.07)', color: TEXT_PRIMARY }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,51,0,0.12)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,51,0,0.07)')}>
          {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {t('dashboardStudent:myCourses')}
        </Link>
      </motion.div>

      {/* Header */}
      <motion.div variants={fade} className="rounded-2xl bg-white border border-[#003300]/8 shadow-sm p-4 sm:p-5">
        <h1 className="text-xl sm:text-2xl font-bold" style={{ color: TEXT_PRIMARY }}>
          {t('dashboardStudent:groupBoard')}
        </h1>
        <p className="text-sm mt-1" style={{ color: TEXT_SECONDARY }}>
          {isRTL ? 'ملاحظات ومهام مجموعتك' : 'Notes and tasks for your group'}
        </p>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={fade} className="flex gap-2">
        {(['notes', 'tasks'] as Tab[]).map(tabKey => (
          <button key={tabKey} onClick={() => setTab(tabKey)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all ${tab === tabKey ? 'shadow-sm' : 'hover:opacity-80'}`}
            style={tab === tabKey
              ? { background: '#003300', color: '#fff' }
              : { background: 'rgba(0,51,0,0.07)', color: TEXT_PRIMARY }}>
            {tabKey === 'notes' ? <StickyNote className="w-4 h-4" /> : <ListTodo className="w-4 h-4" />}
            {tabKey === 'notes' ? t('dashboardStudent:boardNotes') : t('dashboardStudent:boardTasks')}
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: tab === tabKey ? 'rgba(255,255,255,0.2)' : 'rgba(0,51,0,0.1)', color: tab === tabKey ? '#fff' : TEXT_TERTIARY }}>
              {tabKey === 'notes' ? notes.length : tasks.length}
            </span>
          </button>
        ))}
      </motion.div>

      {/* ─── Notes tab ─── */}
      <AnimatePresence mode="wait">
        {tab === 'notes' && (
          <motion.div key="notes" variants={container} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-3">
            {/* Add note */}
            <motion.div variants={fade} className="rounded-2xl bg-white border border-[#003300]/8 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-[#003300]/6">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.1)' }}>
                    <StickyNote className="w-4 h-4 text-amber-500" />
                  </div>
                  <h2 className="font-bold text-base" style={{ color: TEXT_PRIMARY }}>{t('dashboardStudent:boardNotes')}</h2>
                </div>
                <button onClick={() => setShowNoteForm(f => !f)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
                  style={{ background: 'rgba(0,51,0,0.07)', color: TEXT_PRIMARY }}>
                  <Plus className="w-3.5 h-3.5" />
                  {t('dashboardStudent:addNote')}
                </button>
              </div>

              <AnimatePresence>
                {showNoteForm && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="border-b border-[#003300]/6 overflow-hidden">
                    <div className="p-4">
                      <textarea rows={3} value={noteInput} onChange={e => setNoteInput(e.target.value)}
                        placeholder={t('dashboardStudent:noteWritePlaceholder')}
                        className="w-full text-sm rounded-xl border border-[#003300]/12 bg-[#003300]/2 px-3 py-2.5 resize-none focus:outline-none focus:border-[#003300]/30"
                        style={{ color: TEXT_PRIMARY }} dir="auto" />
                      <div className="flex gap-2 mt-2">
                        <button onClick={handleCreateNote} disabled={saving || !noteInput.trim()}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-50"
                          style={{ background: '#003300' }}>
                          {saving ? '...' : t('dashboardStudent:saveNote')}
                        </button>
                        <button onClick={() => { setShowNoteForm(false); setNoteInput(''); }}
                          className="px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
                          style={{ background: 'rgba(0,51,0,0.07)', color: TEXT_PRIMARY }}>
                          {t('dashboardStudent:cancel')}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="p-4 space-y-3">
                {notes.length === 0 ? (
                  <div className="text-center py-8">
                    <StickyNote className="w-10 h-10 mx-auto mb-2" style={{ color: TEXT_TERTIARY, opacity: 0.4 }} />
                    <p className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>{t('dashboardStudent:noNotes')}</p>
                    <p className="text-xs mt-1" style={{ color: TEXT_SECONDARY }}>{t('dashboardStudent:noNotesDesc')}</p>
                  </div>
                ) : (
                  <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
                    {notes.map(note => (
                      <NoteCard key={note._id} note={note} userId={user?._id || (user as any)?.id || ''} isRTL={isRTL}
                        onEdit={n => { setEditingNote(n); setEditContent(n.content); }}
                        onDelete={handleDelete} />
                    ))}
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Inline edit modal */}
            <AnimatePresence>
              {editingNote && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                  onClick={e => { if (e.target === e.currentTarget) setEditingNote(null); }}>
                  <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                    className="w-full max-w-md rounded-2xl bg-white shadow-xl p-5">
                    <h3 className="font-bold text-base mb-3" style={{ color: TEXT_PRIMARY }}>{t('dashboardStudent:editNote')}</h3>
                    <textarea rows={4} value={editContent} onChange={e => setEditContent(e.target.value)}
                      className="w-full text-sm rounded-xl border border-[#003300]/12 bg-[#003300]/2 px-3 py-2.5 resize-none focus:outline-none focus:border-[#003300]/30"
                      style={{ color: TEXT_PRIMARY }} dir="auto" />
                    <div className="flex gap-2 mt-3">
                      <button onClick={handleEditSave} disabled={saving || !editContent.trim()}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50"
                        style={{ background: '#003300' }}>
                        {saving ? '...' : t('dashboardStudent:saveNote')}
                      </button>
                      <button onClick={() => setEditingNote(null)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold"
                        style={{ background: 'rgba(0,51,0,0.07)', color: TEXT_PRIMARY }}>
                        {t('dashboardStudent:cancel')}
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
            <motion.div variants={fade} className="rounded-2xl bg-white border border-[#003300]/8 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2.5 px-4 sm:px-5 py-3.5 border-b border-[#003300]/6">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.08)' }}>
                  <ListTodo className="w-4 h-4 text-blue-500" />
                </div>
                <h2 className="font-bold text-base" style={{ color: TEXT_PRIMARY }}>{t('dashboardStudent:boardTasks')}</h2>
              </div>
              <div className="p-4 space-y-4">
                {tasks.length === 0 ? (
                  <div className="text-center py-8">
                    <ListTodo className="w-10 h-10 mx-auto mb-2" style={{ color: TEXT_TERTIARY, opacity: 0.4 }} />
                    <p className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>{t('dashboardStudent:noBoardTasks')}</p>
                    <p className="text-xs mt-1" style={{ color: TEXT_SECONDARY }}>{t('dashboardStudent:noBoardTasksDesc')}</p>
                  </div>
                ) : (
                  <>
                    {myTasks.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: TEXT_TERTIARY }}>
                          {isRTL ? 'مهامي' : 'My Tasks'}
                        </p>
                        <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
                          {myTasks.map(task => (
                            <TaskCard key={task._id} task={task} userId={user?._id || (user as any)?.id || ''}
                              isRTL={isRTL} onStatusChange={handleStatusChange} />
                          ))}
                        </motion.div>
                      </div>
                    )}
                    {otherTasks.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: TEXT_TERTIARY }}>
                          {isRTL ? 'مهام المجموعة' : 'Group Tasks'}
                        </p>
                        <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
                          {otherTasks.map(task => (
                            <TaskCard key={task._id} task={task} userId={user?._id || (user as any)?.id || ''}
                              isRTL={isRTL} onStatusChange={handleStatusChange} />
                          ))}
                        </motion.div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
