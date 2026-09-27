import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Plus,
  Loader2,
  CheckCircle,
  XCircle,
  Hourglass,
  Trash2,
  CalendarClock,
} from "lucide-react";
import { api } from "../../lib/api";

export interface ExtensionRequest {
  _id: string;
  taskId: string;
  requestedBy: { _id: string; name: string; email: string };
  reason: string;
  proposedDate: string;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: { _id: string; name: string } | null;
  reviewNote?: string;
  reviewedAt?: string;
  createdAt: string;
}

interface ExtensionRequestPanelProps {
  taskId: string;
  taskDueDate?: string;
  taskHardDeadline?: string;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const statusConfig = {
  pending:  { label: "Pending",  cls: "bg-yellow-100 text-yellow-700 border border-yellow-200", icon: <Hourglass className="w-3 h-3" /> },
  approved: { label: "Approved", cls: "bg-green-100 text-green-700 border border-green-200",   icon: <CheckCircle className="w-3 h-3" /> },
  rejected: { label: "Rejected", cls: "bg-red-100 text-red-700 border border-red-200",         icon: <XCircle className="w-3 h-3" /> },
};

export default function ExtensionRequestPanel({ taskId, taskDueDate, taskHardDeadline }: ExtensionRequestPanelProps) {
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<ExtensionRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState("");
  const [proposedDate, setProposedDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/engineer/tasks/${taskId}/extension-requests`);
      setRequests(res.data.data || []);
      setFetched(true);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (open && !fetched) fetch();
  }, [open, fetched, fetch]);

  const hasPending = requests.some(r => r.status === "pending");

  const handleSubmit = async () => {
    if (!reason.trim()) { setFormError("Please write a reason"); return; }
    if (!proposedDate)   { setFormError("Please pick a proposed date"); return; }
    setSaving(true);
    setFormError("");
    try {
      const res = await api.post(`/engineer/tasks/${taskId}/extension-requests`, {
        reason: reason.trim(),
        proposedDate,
      });
      setRequests(prev => [res.data.data, ...prev]);
      setShowForm(false);
      setReason("");
      setProposedDate("");
    } catch (e: any) {
      setFormError(e.response?.data?.message || "Failed to submit request");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (id: string) => {
    setActionId(id);
    try {
      await api.delete(`/engineer/extension-requests/${id}`);
      setRequests(prev => prev.filter(r => r._id !== id));
    } catch { /* silent */ } finally {
      setActionId(null);
    }
  };

  // Minimum proposed date = tomorrow
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().slice(0, 16);

  return (
    <div className="mt-2 border-t border-[#003300]/8 pt-2">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-xs text-[#003300]/50 hover:text-[#003300]/80 transition-colors w-full"
      >
        <CalendarClock className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="font-medium">
          Extension Requests
          {fetched && requests.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-[#003300]/10 text-[#003300]/60">
              {requests.length}
            </span>
          )}
          {fetched && hasPending && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-[10px] font-bold">pending</span>
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
            <div className="mt-2 space-y-2">
              {loading && (
                <div className="flex items-center gap-2 py-2 text-xs text-[#003300]/40">
                  <Loader2 className="w-3 h-3 animate-spin" /> Loading...
                </div>
              )}

              {/* Current deadline reference */}
              {(taskDueDate || taskHardDeadline) && (
                <div className="flex flex-wrap gap-3 px-2 py-1.5 rounded-lg bg-[#003300]/4 text-xs text-[#003300]/50">
                  {taskDueDate && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Soft: {formatDate(taskDueDate)}
                    </span>
                  )}
                  {taskHardDeadline && (
                    <span className="flex items-center gap-1 text-red-500 font-medium">
                      <Clock className="w-3 h-3" /> Hard: {formatDate(taskHardDeadline)}
                    </span>
                  )}
                </div>
              )}

              {/* Past requests */}
              {!loading && requests.length === 0 && (
                <p className="text-xs text-[#003300]/30 py-1 px-1">No requests yet.</p>
              )}

              {requests.map(req => {
                const sc = statusConfig[req.status];
                return (
                  <div key={req._id} className="rounded-lg border border-[#003300]/10 bg-white p-2.5 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#003300] leading-snug">{req.reason}</p>
                        <p className="text-[10px] text-[#003300]/40 mt-0.5">
                          Proposed: <span className="font-semibold text-[#003300]/60">{formatDate(req.proposedDate)}</span>
                          {" · "}{formatDateTime(req.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${sc.cls}`}>
                          {sc.icon} {sc.label}
                        </span>
                        {req.status === "pending" && (
                          <button
                            onClick={() => handleCancel(req._id)}
                            disabled={actionId === req._id}
                            className="text-[#003300]/20 hover:text-red-400 transition-colors"
                            title="Cancel request"
                          >
                            {actionId === req._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    </div>
                    {req.reviewNote && (
                      <p className={`text-[10px] px-2 py-1 rounded ${req.status === "approved" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                        Manager note: {req.reviewNote}
                      </p>
                    )}
                  </div>
                );
              })}

              {/* Request form */}
              {!hasPending && (
                <div className="pt-0.5">
                  {!showForm ? (
                    <button
                      onClick={() => setShowForm(true)}
                      className="flex items-center gap-1.5 text-xs text-[#003300]/40 hover:text-[#003300] transition-colors px-2 py-1"
                    >
                      <Plus className="w-3 h-3" /> Request extension
                    </button>
                  ) : (
                    <div className="space-y-2 px-2 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-[10px] font-semibold text-yellow-700 uppercase tracking-wide">New Extension Request</p>
                      {formError && <p className="text-[10px] text-red-500">{formError}</p>}
                      <div>
                        <label className="text-[10px] text-[#003300]/50 font-medium">Reason *</label>
                        <textarea
                          autoFocus
                          rows={2}
                          placeholder="Why do you need more time?"
                          value={reason}
                          onChange={e => setReason(e.target.value)}
                          className="w-full mt-0.5 text-xs px-2 py-1.5 rounded border border-yellow-200 bg-white text-[#003300] focus:outline-none focus:ring-1 focus:ring-yellow-400 resize-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#003300]/50 font-medium">Proposed new date *</label>
                        <input
                          type="datetime-local"
                          min={minDateStr}
                          value={proposedDate}
                          onChange={e => setProposedDate(e.target.value)}
                          className="w-full mt-0.5 text-xs px-2 py-1.5 rounded border border-yellow-200 bg-white text-[#003300] focus:outline-none focus:ring-1 focus:ring-yellow-400"
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-0.5">
                        <button
                          onClick={handleSubmit}
                          disabled={saving}
                          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-yellow-500 text-white font-medium disabled:opacity-40 hover:bg-yellow-600 transition-colors"
                        >
                          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                          Submit
                        </button>
                        <button
                          onClick={() => { setShowForm(false); setReason(""); setProposedDate(""); setFormError(""); }}
                          className="text-xs text-[#003300]/40 hover:text-[#003300] transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {hasPending && !showForm && (
                <p className="text-[10px] text-yellow-600 px-2 italic">You have a pending request — wait for a response before submitting another.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
