import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Inbox } from "lucide-react";
import { useClientProjects } from "../../hooks/client/useClientProjects";
import { useClientTasks } from "../../hooks/client/useClientTasks";
import { CardComponent, CardBody, Button, LoadingState } from "../../components/ui";
import NewTaskRequestModal from "../../components/client/NewTaskRequestModal";
import { StatusBadge } from "./clientStatus";
import type { TaskStatus } from "../../hooks/cto/useCTOProjects";

const TABS: { value: TaskStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'todo', label: 'Queued' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
  { value: 'declined', label: 'Declined' },
];

export default function ClientTasks() {
  const { projects, getProjects } = useClientProjects();
  const { tasks, isLoading, getTasks } = useClientTasks();
  const [tab, setTab] = useState<TaskStatus | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    getProjects();
    getTasks();
  }, [getProjects, getTasks]);

  const filtered = tab === 'all' ? tasks : tasks.filter(t => t.status === tab);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-[#003300]">My Requests</h1>
        {projects.length > 0 && (
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>
            New Task Request
          </Button>
        )}
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border
              ${tab === t.value ? 'bg-[#003300] text-white border-[#003300]' : 'bg-white text-[#003300]/70 border-[#003300]/15 hover:border-[#003300]/30'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading && tasks.length === 0 ? (
        <LoadingState type="skeleton" text="Loading requests…" />
      ) : filtered.length === 0 ? (
        <CardComponent variant="default" className="text-center py-12">
          <CardBody>
            <Inbox className="w-9 h-9 text-[#003300]/30 mx-auto mb-2" />
            <p className="text-[#003300]/60 text-sm">No requests here yet.</p>
          </CardBody>
        </CardComponent>
      ) : (
        <div className="space-y-2">
          {filtered.map(task => (
            <Link key={task._id} to={`/client/tasks/${task._id}`}>
              <CardComponent variant="default" hoverable>
                <CardBody>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-[#003300] truncate">{task.title}</p>
                      <p className="text-xs text-[#003300]/50 mt-0.5 truncate">
                        {typeof task.projectId === 'object' ? task.projectId.name : ''}
                      </p>
                    </div>
                    <StatusBadge status={task.status} />
                  </div>
                </CardBody>
              </CardComponent>
            </Link>
          ))}
        </div>
      )}

      <NewTaskRequestModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        projects={projects}
        onCreated={() => getTasks()}
      />
    </motion.div>
  );
}
