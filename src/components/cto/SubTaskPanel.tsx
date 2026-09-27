import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  CheckCircle,
  Circle,
  Trash2,
  Loader2,
  ListChecks,
} from "lucide-react";
import { api } from "../../lib/api";

export interface SubTask {
  _id: string;
  taskId: string;
  title: string;
  note?: string;
  isDone: boolean;
  createdBy: { _id: string; name: string; email: string; role: string };
  createdAt: string;
}

interface SubTaskPanelProps {
  taskId: string;
  /** "cto" = manager view: read-only + can delete any; "employee" = can add/toggle/delete own */
  mode: "cto" | "employee";
  currentUserId?: string;
}

export default function SubTaskPanel({ taskId, mode, currentUserId }: SubTaskPanelProps) {
  const [open, setOpen] = useState(false);
  const [subTasks, setSubTasks] = useState<SubTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newNote, setNewNote] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const baseUrl = mode === "cto"
    ? `/cto/internal/tasks/${taskId}/subtasks`
    : `/engineer/tasks/${taskId}/subtasks`;

  const deleteUrl = (id: string) =>
    mode === "cto" ? `/cto/internal/subtasks/${id}` : `/engineer/subtasks/${id}`;

  const fetchSubTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(baseUrl);
      setSubTasks(res.data.data || []);
      setFetched(true);
    } catch {
      setSubTasks([]);
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  useEffect(() => {
    if (open && !fetched) fetchSubTasks();
  }, [open, fetched, fetchSubTasks]);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      const res = await api.post(baseUrl, { title: newTitle.trim(), note: newNote.trim() || undefined });
      setSubTasks(prev => [...prev, res.data.data]);
      setNewTitle("");
      setNewNote("");
      setShowForm(false);
    } catch { /* silent */ } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string) => {
    setActionId(id);
    try {
      const res = await api.patch(`/engineer/subtasks/${id}/toggle`);
      setSubTasks(prev => prev.map(st => st._id === id ? res.data.data : st));
    } catch { /* silent */ } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setActionId(id);
    try {
      await api.delete(deleteUrl(id));
      setSubTasks(prev => prev.filter(st => st._id !== id));
    } catch { /* silent */ } finally {
      setActionId(null);
    }
  };

  const doneCount = subTasks.filter(st => st.isDone).length;
  const total = subTasks.length;

  return (
    <div className="mt-2 border-t border-[#003300]/8 pt-2">
      {/* Toggle row */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-xs text-[#003300]/50 hover:text-[#003300]/80 transition-colors w-full"
      >
        <ListChecks className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="font-medium">
          Sub-tasks
          {fetched && total > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-[#003300]/10 text-[#003300]/60">
              {doneCount}/{total}
            </span>
          )}
        </span>
        {open ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-1">
              {loading && (
                <div className="flex items-center gap-2 py-2 text-xs text-[#003300]/40">
                  <Loader2 className="w-3 h-3 animate-spin" /> Loading...
                </div>
              )}

              {!loading && subTasks.length === 0 && (
                <p className="text-xs text-[#003300]/30 py-1">
                  {mode === "employee" ? "No sub-tasks yet. Add the first one." : "No sub-tasks written yet."}
                </p>
              )}

              {/* Sub-task list */}
              {subTasks.map(st => {
                const isOwn = currentUserId && st.createdBy._id === currentUserId;
                const canToggle = mode === "employee" && isOwn;
                const canDelete = mode === "cto" || isOwn;

                return (
                  <div
                    key={st._id}
                    className={`flex items-start gap-2 px-2 py-1.5 rounded-lg group transition-colors ${st.isDone ? "opacity-60" : ""} hover:bg-[#003300]/4`}
                  >
                    {/* Checkbox / done indicator */}
                    <button
                      onClick={() => canToggle && handleToggle(st._id)}
                      disabled={!canToggle || actionId === st._id}
                      className={`flex-shrink-0 mt-0.5 transition-colors ${canToggle ? "cursor-pointer hover:text-green-500" : "cursor-default"} ${st.isDone ? "text-green-500" : "text-[#003300]/25"}`}
                    >
                      {actionId === st._id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : st.isDone
                        ? <CheckCircle className="w-3.5 h-3.5" />
                        : <Circle className="w-3.5 h-3.5" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium text-[#003300] leading-snug ${st.isDone ? "line-through" : ""}`}>
                        {st.title}
                      </p>
                      {st.note && (
                        <p className="text-xs text-[#003300]/40 mt-0.5 leading-relaxed">{st.note}</p>
                      )}
                      <p className="text-[10px] text-[#003300]/30 mt-0.5">
                        by {st.createdBy.name}
                      </p>
                    </div>

                    {/* Delete */}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(st._id)}
                        disabled={actionId === st._id}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-[#003300]/25 hover:text-red-400 disabled:opacity-30"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Progress bar */}
              {total > 0 && (
                <div className="px-2 pt-1">
                  <div className="w-full bg-[#003300]/8 rounded-full h-1 overflow-hidden">
                    <motion.div
                      className="h-1 rounded-full bg-green-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${(doneCount / total) * 100}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                </div>
              )}

              {/* Add form — employee only */}
              {mode === "employee" && (
                <div className="pt-1">
                  {!showForm ? (
                    <button
                      onClick={() => setShowForm(true)}
                      className="flex items-center gap-1.5 text-xs text-[#003300]/40 hover:text-[#003300] transition-colors px-2 py-1"
                    >
                      <Plus className="w-3 h-3" /> Add sub-task
                    </button>
                  ) : (
                    <div className="space-y-1.5 px-2 py-1.5 bg-[#003300]/4 rounded-lg">
                      <input
                        autoFocus
                        type="text"
                        placeholder="Sub-task title..."
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setShowForm(false); setNewTitle(""); setNewNote(""); } }}
                        className="w-full text-xs px-2 py-1.5 rounded border border-[#003300]/15 bg-white text-[#003300] focus:outline-none focus:ring-1 focus:ring-[#003300]/30"
                      />
                      <input
                        type="text"
                        placeholder="Optional note..."
                        value={newNote}
                        onChange={e => setNewNote(e.target.value)}
                        className="w-full text-xs px-2 py-1.5 rounded border border-[#003300]/15 bg-white text-[#003300] focus:outline-none focus:ring-1 focus:ring-[#003300]/30"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleAdd}
                          disabled={saving || !newTitle.trim()}
                          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-[#003300] text-[#ffffcc] font-medium disabled:opacity-40 hover:bg-[#004d00] transition-colors"
                        >
                          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                          Add
                        </button>
                        <button
                          onClick={() => { setShowForm(false); setNewTitle(""); setNewNote(""); }}
                          className="text-xs text-[#003300]/40 hover:text-[#003300] transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
