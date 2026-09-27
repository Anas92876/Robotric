import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Inbox } from "lucide-react";
import { useClientProjects } from "../../hooks/client/useClientProjects";
import { useClientTasks } from "../../hooks/client/useClientTasks";
import { CardComponent, CardBody, Button, LoadingState } from "../../components/ui";
import NewTaskRequestModal from "../../components/client/NewTaskRequestModal";
import { StatusBadge } from "./clientStatus";

export default function ClientProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentProject, isLoading: projectLoading, getProjectById } = useClientProjects();
  const { tasks, isLoading: tasksLoading, getTasks } = useClientTasks();
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    getProjectById(id);
    getTasks({ projectId: id });
  }, [id, getProjectById, getTasks]);

  if (projectLoading && !currentProject) {
    return <LoadingState type="skeleton" text="Loading project…" />;
  }

  if (!currentProject) {
    return null;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <button onClick={() => navigate('/client/dashboard')} className="inline-flex items-center gap-1.5 text-sm text-[#003300]/60 hover:text-[#003300]">
        <ArrowLeft className="w-4 h-4" /> Back to dashboard
      </button>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#003300]">{currentProject.name}</h1>
          {currentProject.description && <p className="text-[#003300]/60 mt-1 max-w-2xl">{currentProject.description}</p>}
        </div>
        <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>
          New Task Request
        </Button>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-[#003300]/70 uppercase tracking-wide mb-3">Requests on this project</h2>

        {tasksLoading && tasks.length === 0 ? (
          <LoadingState type="skeleton" text="Loading requests…" />
        ) : tasks.length === 0 ? (
          <CardComponent variant="default" className="text-center py-10">
            <CardBody>
              <Inbox className="w-8 h-8 text-[#003300]/30 mx-auto mb-2" />
              <p className="text-[#003300]/60 text-sm">No requests submitted on this project yet.</p>
            </CardBody>
          </CardComponent>
        ) : (
          <div className="space-y-2">
            {tasks.map(task => (
              <Link key={task._id} to={`/client/tasks/${task._id}`}>
                <CardComponent variant="default" hoverable className="transition-shadow">
                  <CardBody>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-[#003300] truncate">{task.title}</p>
                        <p className="text-xs text-[#003300]/50 mt-0.5">
                          {typeof task.clientId === 'object' && task.clientId ? `Submitted by ${task.clientId.name}` : ''}
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
      </div>

      <NewTaskRequestModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        projects={[currentProject]}
        defaultProjectId={currentProject._id}
        onCreated={() => id && getTasks({ projectId: id })}
      />
    </motion.div>
  );
}
