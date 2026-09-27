import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, AlertCircle, User } from "lucide-react";
import { useClientTasks } from "../../hooks/client/useClientTasks";
import { CardComponent, CardBody, LoadingState } from "../../components/ui";
import MediaGrid from "../../components/media/MediaGrid";
import { StatusBadge, UrgencyBadge } from "./clientStatus";
import type { InternalTask, ClientMediaItem } from "../../hooks/cto/useCTOProjects";

export default function ClientTaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getTaskById, getMedia } = useClientTasks();
  const [task, setTask] = useState<InternalTask | null>(null);
  const [media, setMedia] = useState<ClientMediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const [t, m] = await Promise.all([getTaskById(id), getMedia(id)]);
        setTask(t);
        setMedia(m);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, getTaskById, getMedia]);

  if (loading) return <LoadingState type="skeleton" text="Loading request…" />;
  if (!task) return null;

  const projectName = typeof task.projectId === 'object' ? task.projectId.name : '';
  const submittedBy = typeof task.clientId === 'object' && task.clientId ? task.clientId.name : '';
  const assignedNames = task.assignedTo?.map(a => a.name).join(', ');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-2xl">
      <button onClick={() => navigate('/client/tasks')} className="inline-flex items-center gap-1.5 text-sm text-[#003300]/60 hover:text-[#003300]">
        <ArrowLeft className="w-4 h-4" /> Back to requests
      </button>

      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <h1 className="text-xl font-bold text-[#003300] leading-snug">{task.title}</h1>
          <StatusBadge status={task.status} />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#003300]/50">
          <span>{projectName}</span>
          {submittedBy && <><span>·</span><span className="inline-flex items-center gap-1"><User className="w-3 h-3" />{submittedBy}</span></>}
          {task.clientUrgency && <><span>·</span><UrgencyBadge urgency={task.clientUrgency} /></>}
        </div>
      </div>

      {task.description && (
        <CardComponent variant="default">
          <CardBody>
            <p className="text-sm text-[#003300]/80 whitespace-pre-wrap">{task.description}</p>
          </CardBody>
        </CardComponent>
      )}

      {task.status === 'declined' && task.rejectedReason && (
        <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">This request was declined</p>
            <p className="mt-0.5 text-red-600/90">{task.rejectedReason}</p>
          </div>
        </div>
      )}

      {task.status !== 'pending_review' && task.status !== 'declined' && (task.dueDate || assignedNames) && (
        <CardComponent variant="default">
          <CardBody className="space-y-2">
            <p className="text-xs font-semibold text-[#003300]/60 uppercase tracking-wide">Set by our team</p>
            {task.dueDate && (
              <p className="text-sm text-[#003300]/80 inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Target date: {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            )}
            {assignedNames && (
              <p className="text-sm text-[#003300]/80">Working on it: {assignedNames}</p>
            )}
          </CardBody>
        </CardComponent>
      )}

      <div>
        <h2 className="text-sm font-semibold text-[#003300]/70 uppercase tracking-wide mb-3">Attachments</h2>
        <MediaGrid items={media} emptyLabel="No attachments on this request." />
      </div>
    </motion.div>
  );
}
