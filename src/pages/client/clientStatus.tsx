import type { TaskStatus, ClientUrgency } from "../../hooks/cto/useCTOProjects";

const STATUS_META: Record<TaskStatus, { label: string; className: string }> = {
  pending_review: { label: "Pending Review", className: "bg-amber-100 text-amber-700 border-amber-200" },
  todo: { label: "Queued", className: "bg-slate-100 text-slate-700 border-slate-200" },
  in_progress: { label: "In Progress", className: "bg-blue-100 text-blue-700 border-blue-200" },
  done: { label: "Done", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  declined: { label: "Declined", className: "bg-red-100 text-red-700 border-red-200" },
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.todo;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${meta.className}`}>
      {meta.label}
    </span>
  );
}

const URGENCY_META: Record<ClientUrgency, { label: string }> = {
  whenever: { label: 'Whenever works' },
  soon: { label: 'Soon' },
  urgent: { label: 'Urgent' },
};

export function UrgencyBadge({ urgency }: { urgency: ClientUrgency }) {
  const meta = URGENCY_META[urgency];
  if (!meta) return null;
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#003300]/8 text-[#003300]/70 border border-[#003300]/15">
      {meta.label}
    </span>
  );
}
