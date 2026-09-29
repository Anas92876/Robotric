import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Calendar, Clock, Users, AlertCircle, RefreshCw,
  BookOpen, Edit, Trash2, CheckCircle, FileText, Eye, HardDrive,
  ChevronRight, Paperclip,
} from "lucide-react";
import { useCLOSessions } from "../../hooks/clo/useCLOSessions";
import { formatDate, formatHHMM } from "../../utils/dateTime";
import { api } from "../../lib/api";
import { PDFViewer } from "../../components/ui/PDFViewer";
import { useTranslation } from 'react-i18next';
import { Button, Badge, LoadingState, Alert } from "../../components/ui";

// ─── helpers ──────────────────────────────────────────────────────────────────
function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const CAT_COLOR: Record<string, string> = {
  lecture:    'bg-blue-100 text-blue-700',
  assignment: 'bg-amber-100 text-amber-700',
  lab:        'bg-emerald-100 text-emerald-700',
  exam:       'bg-red-100 text-red-700',
  reference:  'bg-purple-100 text-purple-700',
  other:      'bg-zinc-100 text-zinc-600',
};

// ─── Light-theme info card ────────────────────────────────────────────────────
function InfoCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#003300]/10 p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="text-[#003300]/40">{icon}</div>
        <p className="text-xs font-bold text-[#003300]/40 uppercase tracking-wider">{label}</p>
      </div>
      {children}
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  completed:   'bg-emerald-100 text-emerald-700 border-emerald-200',
  in_progress: 'bg-primary/10 text-primary border-primary/20',
  scheduled:   'bg-amber-100 text-amber-700 border-amber-200',
  cancelled:   'bg-red-100 text-red-600 border-red-200',
};

export default function CLOSessionDetail() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { getSessionById, deleteSession } = useCLOSessions();
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardTrainer']);
  const isRTL = i18n.language === 'ar';

  const [session, setSession]         = useState<any>(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [isUpdating, setIsUpdating]   = useState(false);

  // Resources
  const [resources, setResources]     = useState<any[]>([]);
  const [resLoading, setResLoading]   = useState(false);
  const [viewerResource, setViewerResource] = useState<any>(null);

  const fetchSessionData = async () => {
    try {
      setIsLoading(true); setError(null);
      if (!sessionId) throw new Error("Session ID is required");
      const data = await getSessionById(sessionId);
      setSession(data);
      // Fetch resources after session loads
      fetchResources(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch session data");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchResources = async (sess: any) => {
    const courseId = typeof sess?.courseId === 'object' ? sess.courseId._id : sess?.courseId;
    if (!courseId || !sessionId) return;
    try {
      setResLoading(true);
      const res = await api.get('/clo/resources', { params: { courseId } });
      const raw = res.data.data;
      const all = Array.isArray(raw) ? raw : raw?.resources || [];
      // Filter to resources assigned to this specific session
      const assigned = all.filter((r: any) =>
        r?.assignments?.details?.some((d: any) =>
          d.sessions?.some((s: any) => s.sessionId === sessionId || s.sessionId?._id === sessionId)
        )
      );
      setResources(assigned);
    } catch {
      // Non-blocking
    } finally {
      setResLoading(false);
    }
  };

  useEffect(() => { fetchSessionData(); }, [sessionId]);

  const handleDelete = async () => {
    if (!sessionId || !confirm("Delete this session? This cannot be undone.")) return;
    try {
      setIsUpdating(true);
      const ok = await deleteSession(sessionId, true);
      if (ok) navigate("/clo/sessions");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUpdating(false);
    }
  };


  if (isLoading) return <LoadingState type="skeleton" text="Loading session…" />;

  if (error || !session) {
    return (
      <Alert variant="error">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1 text-sm">{error || "Session not found"}</span>
          <Button variant="ghost" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={fetchSessionData}>Retry</Button>
        </div>
      </Alert>
    );
  }

  const statusStyle = STATUS_STYLE[session.status] ?? 'bg-zinc-100 text-zinc-600 border-zinc-200';

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* ── Header ── */}
      <div>
        <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate("/clo/sessions")}>
          {t('dashboardTrainer:backToSessions')}
        </Button>

        <div className="flex items-start justify-between mt-4 gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-2xl font-bold text-[#003300]">{session.title}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusStyle}`}>
                {session.status.replace("_", " ")}
              </span>
            </div>
            {session.description && (
              <p className="text-sm text-[#003300]/55 mt-1">{session.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="primary" size="sm" leftIcon={<Edit className="w-4 h-4" />} onClick={() => navigate(`/clo/sessions/${sessionId}/edit`)}>
              {t('dashboardCommon:edit')}
            </Button>
            <Button variant="ghost" size="sm" leftIcon={<Trash2 className="w-4 h-4" />} onClick={handleDelete} disabled={isUpdating} className="text-red-500 hover:text-red-600 hover:bg-red-50">
              {t('dashboardCommon:delete')}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Info grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoCard icon={<Calendar className="w-4 h-4" />} label="Date & Time">
          <p className="font-semibold text-[#003300]">
            {formatDate(session.scheduledDate, { month: "long", day: "numeric", year: "numeric" })}
          </p>
          <p className="text-sm text-[#003300]/60 mt-0.5">
            {formatHHMM(session.startTime)} – {formatHHMM(session.endTime)}
            {session.duration && <span className="ml-2 text-[#003300]/40">({session.duration} min)</span>}
          </p>
        </InfoCard>

        <InfoCard icon={<Users className="w-4 h-4" />} label="Group">
          <p className="font-semibold text-[#003300]">{session.groupId?.name || "Unknown"}</p>
          <p className="text-sm text-[#003300]/60 mt-0.5">
            {session.groupId?.students?.length || 0} students
            {session.courseId?.title && <span className="text-[#003300]/40"> · {session.courseId.title}</span>}
          </p>
        </InfoCard>
      </div>

      {/* ── Lesson Plan ── */}
      {session.lessonPlan && (
        session.lessonPlan.objectives?.length > 0 ||
        session.lessonPlan.materialsNeeded?.length > 0 ||
        session.lessonPlan.activities?.length > 0
      ) && (
        <div className="bg-white rounded-2xl border border-[#003300]/10 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-[#003300]/40" />
            <p className="text-xs font-bold text-[#003300]/40 uppercase tracking-wider">{t('dashboardTrainer:lessonPlan')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {session.lessonPlan.objectives?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[#003300] mb-2">{t('dashboardTrainer:learningObjectives')}</h3>
                <ul className="space-y-1.5">
                  {session.lessonPlan.objectives.map((o: string, i: number) => (
                    <li key={i} className="text-sm text-[#003300]/65 flex items-start gap-2">
                      <span className="text-primary mt-1 text-xs">•</span>{o}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {session.lessonPlan.materialsNeeded?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[#003300] mb-2">{t('dashboardTrainer:materialsNeeded')}</h3>
                <ul className="space-y-1.5">
                  {session.lessonPlan.materialsNeeded.map((m: string, i: number) => (
                    <li key={i} className="text-sm text-[#003300]/65 flex items-start gap-2">
                      <span className="text-accent mt-1 text-xs">•</span>{m}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {session.lessonPlan.activities?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[#003300] mb-2">{t('dashboardTrainer:activities')}</h3>
                <ul className="space-y-1.5">
                  {session.lessonPlan.activities.map((a: string, i: number) => (
                    <li key={i} className="text-sm text-[#003300]/65 flex items-start gap-2">
                      <span className="text-secondary mt-1 text-xs">•</span>{a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Session Resources ── */}
      <div className="bg-white rounded-2xl border border-[#003300]/10 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#003300]/8">
          <div className="flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-[#003300]/40" />
            <p className="text-xs font-bold text-[#003300]/40 uppercase tracking-wider">Session Resources</p>
            {resources.length > 0 && (
              <span className="bg-primary/10 text-primary text-xs font-bold px-1.5 py-0.5 rounded-full">{resources.length}</span>
            )}
          </div>
          <Button variant="ghost" size="sm" leftIcon={<Edit className="w-3.5 h-3.5" />} onClick={() => navigate(`/clo/sessions/${sessionId}/edit`)}>
            Manage
          </Button>
        </div>

        <div className="p-5">
          {resLoading ? (
            <div className="flex items-center gap-2 text-sm text-[#003300]/40 py-4">
              <div className="w-4 h-4 border-2 border-[#003300]/20 border-t-primary rounded-full animate-spin" />
              Loading resources…
            </div>
          ) : resources.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-8 h-8 mx-auto mb-2 text-[#003300]/15" />
              <p className="text-sm text-[#003300]/45">No files attached to this session.</p>
              <button
                onClick={() => navigate(`/clo/sessions/${sessionId}/edit`)}
                className="mt-2 text-xs text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
              >
                Add resources in edit
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {resources.map(r => (
                <div key={r._id} className="flex items-center gap-3 p-3 bg-[#003300]/2 rounded-xl hover:bg-[#003300]/4 transition-colors group">
                  <div className="w-9 h-9 rounded-lg bg-primary/80 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#003300] truncate">{r.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {r.category && (
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${CAT_COLOR[r.category] ?? CAT_COLOR.other}`}>
                          {r.category}
                        </span>
                      )}
                      <span className="text-[10px] text-[#003300]/40">{formatBytes(r.fileSize)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setViewerResource(r)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#003300]/40 hover:text-primary opacity-0 group-hover:opacity-100 transition-all px-2 py-1.5 rounded-lg hover:bg-primary/8"
                  >
                    <Eye className="w-3.5 h-3.5" /> View
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Status alerts ── */}
      {session.status === "completed" && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {t('dashboardTrainer:sessionCompletedAlert')}
        </div>
      )}
      {session.status === "cancelled" && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {t('dashboardTrainer:sessionCancelledAlert')}
        </div>
      )}

      {/* PDF Viewer */}
      {viewerResource && (
        <PDFViewer
          isOpen={!!viewerResource}
          onClose={() => setViewerResource(null)}
          resourceId={viewerResource._id}
          title={viewerResource.title}
        />
      )}
    </motion.div>
  );
}
