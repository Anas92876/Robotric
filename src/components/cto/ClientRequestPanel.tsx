import { useEffect, useState } from "react";
import { UserCircle2 } from "lucide-react";
import { api } from "../../lib/api";
import MediaGrid from "../media/MediaGrid";
import type { InternalTask, ClientMediaItem } from "../../hooks/cto/useCTOProjects";

const URGENCY_LABEL: Record<string, string> = {
  whenever: 'Whenever works',
  soon: 'Soon',
  urgent: 'Urgent',
};

interface ClientRequestPanelProps {
  task: InternalTask;
  mode: 'cto' | 'engineer';
}

export default function ClientRequestPanel({ task, mode }: ClientRequestPanelProps) {
  const [media, setMedia] = useState<ClientMediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const base = mode === 'cto' ? '/cto/internal' : '/engineer';
    setLoading(true);
    api.get(`${base}/tasks/${task._id}/client-media`)
      .then(res => { if (!cancelled) setMedia(res.data.data || []); })
      .catch(() => { if (!cancelled) setMedia([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [task._id, mode]);

  const requester = typeof task.clientId === 'object' && task.clientId ? task.clientId : null;

  return (
    <div className="mt-3 rounded-xl border border-[#003300]/12 bg-[#003300]/[0.02] p-4">
      <div className="flex items-center gap-2 mb-3">
        <UserCircle2 className="w-4 h-4 text-[#003300]/50" />
        <span className="text-sm font-medium text-[#003300]">
          Client request{requester ? ` from ${requester.name}` : ''}
        </span>
        {task.clientUrgency && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#003300]/8 text-[#003300]/70 border border-[#003300]/15">
            {URGENCY_LABEL[task.clientUrgency] || task.clientUrgency}
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-[#003300]/40">Loading attachments…</p>
      ) : (
        <MediaGrid items={media} emptyLabel="No attachments on this request." />
      )}
    </div>
  );
}
