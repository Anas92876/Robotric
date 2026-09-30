import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle,
  XCircle,
  Hourglass,
  Clock,
  User,
  FolderOpen,
  RefreshCw,
} from "lucide-react";
import { api } from "../../lib/api";
import type { ExtensionRequest } from "./ExtensionRequestPanel";

interface ExtensionReviewPanelProps {
  defaultOpen?: boolean;
}

interface EnrichedRequest extends ExtensionRequest {
  taskId: {
    _id: string;
    title: string;
    dueDate?: string;
    hardDeadline?: string;
    projectId?: { _id: string; name: string } | string;
  };
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const statusConfig = {
  pending:  { label: "Pending",  cls: "bg-yellow-100 text-yellow-700 border border-yellow-200", icon: <Hourglass className="w-3 h-3" /> },
  approved: { label: "Approved", cls: "bg-green-100 text-green-700 border border-green-200",   icon: <CheckCircle className="w-3 h-3" /> },
  rejected: { label: "Rejected", cls: "bg-red-100 text-red-700 border border-red-200",         icon: <XCircle className="w-3 h-3" /> },
};

export default function ExtensionReviewPanel({ defaultOpen = false }: ExtensionReviewPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [requests, setRequests] = useState<EnrichedRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  // Per-request review state
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchRequests = useCallback(async (filter = statusFilter) => {
    setLoading(true);
    try {
      const params = filter !== "all" ? `?status=${filter}` : "";
      const res = await api.get(`/cto/internal/extension-requests${params}`);
      setRequests(res.data.data || []);
      setFetched(true);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (open && !fetched) fetchRequests();
  }, [open, fetched, fetchRequests]);

  const handleFilterChange = (f: typeof statusFilter) => {
    setStatusFilter(f);
    setFetched(false);
    if (open) {
      setLoading(true);
      const params = f !== "all" ? `?status=${f}` : "";
      api.get(`/cto/internal/extension-requests${params}`)
        .then(res => { setRequests(res.data.data || []); setFetched(true); })
        .catch(() => setRequests([]))
        .finally(() => setLoading(false));
    }
  };

  const handleReview = async (id: string, action: "approved" | "rejected") => {
    setActionId(id);
    try {
      const res = await api.patch(`/cto/internal/extension-requests/${id}/review`, {
        action,
        reviewNote: reviewNote.trim() || undefined,
      });
      setRequests(prev => prev.map(r => r._id === id ? { ...r, ...res.data.data } : r));
      setReviewingId(null);
      setReviewNote("");
    } catch (e: any) {
      alert(e.response?.data?.message || "Failed to review request");
    } finally {
      setActionId(null);
    }
  };

  const pendingCount = requests.filter(r => r.status === "pending").length;

  const getProjectName = (req: EnrichedRequest) => {
    const proj = req.taskId?.projectId;
    if (!proj) return null;
    if (typeof proj === "object") return proj.name;
    return null;
  };

  return (
    <div className="rounded-xl border border-yellow-200 bg-yellow-50/40 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-yellow-50 transition-colors"
      >
        <CalendarClock className="w-4 h-4 text-yellow-600 flex-shrink-0" />
        <span className="font-semibold text-ink flex-1 text-left text-sm">
          Extension Requests
          {fetched && pendingCount > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-yellow-500 text-white text-[10px] font-bold">
              {pendingCount} pending
            </span>
          )}
        </span>
        <button
          onClick={e => { e.stopPropagation(); fetchRequests(); }}
          className="text-ink/30 hover:text-ink/70 transition-colors p-1"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        {open ? <ChevronUp className="w-4 h-4 text-ink/40" /> : <ChevronDown className="w-4 h-4 text-ink/40" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {/* Filter tabs */}
              <div className="flex gap-1.5 pt-1">
                {(["pending", "approved", "rejected", "all"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => handleFilterChange(f)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors capitalize ${
                      statusFilter === f
                        ? "bg-ink text-white"
                        : "bg-ink/8 text-ink/50 hover:bg-ink/15"
                    }`}
                  >
                    {f === "all" ? "All" : f}
                  </button>
                ))}
              </div>

              {/* Loading */}
              {loading && (
                <div className="flex items-center gap-2 py-3 text-xs text-ink/40">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading requests...
                </div>
              )}

              {/* Empty */}
              {!loading && requests.length === 0 && (
                <p className="text-xs text-ink/30 py-2">
                  No {statusFilter !== "all" ? statusFilter : ""} extension requests.
                </p>
              )}

              {/* Request cards */}
              {!loading && requests.map(req => {
                const sc = statusConfig[req.status];
                const projName = getProjectName(req);
                const isReviewing = reviewingId === req._id;

                return (
                  <div
                    key={req._id}
                    className={`rounded-lg border bg-white p-3 space-y-2 ${
                      req.status === "pending" ? "border-yellow-200" : "border-ink/10"
                    }`}
                  >
                    {/* Task title + project */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {projName && (
                            <span className="flex items-center gap-0.5 text-[10px] text-ink/40">
                              <FolderOpen className="w-3 h-3" /> {projName}
                            </span>
                          )}
                          <span className="text-xs font-semibold text-ink">
                            {req.taskId?.title || "—"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <User className="w-3 h-3 text-ink/30 flex-shrink-0" />
                          <span className="text-[10px] text-ink/50">
                            {req.requestedBy?.name} · {formatDateTime(req.createdAt)}
                          </span>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${sc.cls}`}>
                        {sc.icon} {sc.label}
                      </span>
                    </div>

                    {/* Reason */}
                    <div className="text-xs text-ink/70 bg-ink/4 rounded px-2 py-1.5 leading-relaxed">
                      {req.reason}
                    </div>

                    {/* Dates */}
                    <div className="flex flex-wrap gap-3 text-[10px]">
                      <span className="flex items-center gap-1 text-ink/40">
                        <Clock className="w-3 h-3" /> Proposed: <span className="font-semibold text-ink/60">{formatDate(req.proposedDate)}</span>
                      </span>
                      {req.taskId?.dueDate && (
                        <span className="flex items-center gap-1 text-ink/40">
                          <Clock className="w-3 h-3" /> Current due: <span className="font-semibold text-ink/60">{formatDate(req.taskId.dueDate)}</span>
                        </span>
                      )}
                    </div>

                    {/* Review note (if already reviewed) */}
                    {req.status !== "pending" && req.reviewNote && (
                      <p className={`text-[10px] px-2 py-1 rounded ${req.status === "approved" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                        Note: {req.reviewNote}
                      </p>
                    )}
                    {req.status !== "pending" && req.reviewedBy && (
                      <p className="text-[10px] text-ink/30">
                        Reviewed by {req.reviewedBy.name}{req.reviewedAt ? ` · ${formatDateTime(req.reviewedAt)}` : ""}
                      </p>
                    )}

                    {/* Approve / Reject actions */}
                    {req.status === "pending" && (
                      <div className="space-y-2 pt-1">
                        {isReviewing ? (
                          <div className="space-y-2">
                            <textarea
                              autoFocus
                              rows={2}
                              placeholder="Optional note to employee..."
                              value={reviewNote}
                              onChange={e => setReviewNote(e.target.value)}
                              className="w-full text-xs px-2 py-1.5 rounded border border-ink/15 bg-white text-ink focus:outline-none focus:ring-1 focus:ring-ink/30 resize-none"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleReview(req._id, "approved")}
                                disabled={!!actionId}
                                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-green-500 text-white font-medium disabled:opacity-40 hover:bg-green-600 transition-colors"
                              >
                                {actionId === req._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                Approve
                              </button>
                              <button
                                onClick={() => handleReview(req._id, "rejected")}
                                disabled={!!actionId}
                                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-red-500 text-white font-medium disabled:opacity-40 hover:bg-red-600 transition-colors"
                              >
                                {actionId === req._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                                Reject
                              </button>
                              <button
                                onClick={() => { setReviewingId(null); setReviewNote(""); }}
                                className="text-xs text-ink/40 hover:text-ink transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setReviewingId(req._id); setReviewNote(""); }}
                            className="text-xs px-2.5 py-1 rounded border border-ink/15 text-ink/50 hover:border-ink/30 hover:text-ink transition-colors"
                          >
                            Review →
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
