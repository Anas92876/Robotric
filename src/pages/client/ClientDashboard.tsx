import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, FolderOpen, ArrowRight, AlertCircle, RefreshCw } from "lucide-react";
import { useAuth } from "../../providers/AuthProvider";
import { useClientProjects } from "../../hooks/client/useClientProjects";
import { useClientTasks } from "../../hooks/client/useClientTasks";
import { CardComponent, CardBody, Button, LoadingState, Alert } from "../../components/ui";
import NewTaskRequestModal from "../../components/client/NewTaskRequestModal";
import type { InternalTask } from "../../hooks/cto/useCTOProjects";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

function projectIdOf(task: InternalTask): string {
  return typeof task.projectId === 'string' ? task.projectId : task.projectId._id;
}

export default function ClientDashboard() {
  const { user } = useAuth();
  const { projects, isLoading: projectsLoading, error: projectsError, getProjects } = useClientProjects();
  const { tasks, getTasks } = useClientTasks();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalProjectId, setModalProjectId] = useState<string | undefined>(undefined);

  useEffect(() => {
    getProjects();
    getTasks();
  }, [getProjects, getTasks]);

  const countsByProject = useMemo(() => {
    const map: Record<string, { total: number; pending: number; active: number; done: number }> = {};
    for (const t of tasks) {
      const pid = projectIdOf(t);
      if (!map[pid]) map[pid] = { total: 0, pending: 0, active: 0, done: 0 };
      map[pid].total += 1;
      if (t.status === 'pending_review') map[pid].pending += 1;
      else if (t.status === 'todo' || t.status === 'in_progress') map[pid].active += 1;
      else if (t.status === 'done') map[pid].done += 1;
    }
    return map;
  }, [tasks]);

  const openNewRequest = (projectId?: string) => {
    setModalProjectId(projectId);
    setModalOpen(true);
  };

  if (projectsLoading && projects.length === 0) {
    return <LoadingState type="skeleton" text="Loading your projects…" />;
  }

  if (projectsError) {
    return (
      <Alert variant="error">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold mb-1">Couldn't load your projects</p>
            <p className="text-sm opacity-90">{projectsError}</p>
          </div>
          <Button variant="ghost" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={getProjects}>Retry</Button>
        </div>
      </Alert>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-6 md:space-y-8">
      <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1
            className="text-2xl md:text-3xl font-bold"
            style={{ background: 'linear-gradient(135deg, #003300 0%, #004d00 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            Welcome back, {user?.name?.split(' ')[0] || 'there'}
          </h1>
          <p className="text-[#003300]/60 mt-1">
            {projects.length} project{projects.length === 1 ? '' : 's'} · {tasks.filter(t => t.status === 'pending_review').length} pending review
          </p>
        </div>
        {projects.length > 0 && (
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => openNewRequest()}>
            New Task Request
          </Button>
        )}
      </motion.div>

      {projects.length === 0 ? (
        <motion.div variants={itemVariants}>
          <CardComponent variant="default" className="text-center py-12">
            <CardBody>
              <FolderOpen className="w-10 h-10 text-[#003300]/30 mx-auto mb-3" />
              <p className="text-[#003300] font-medium">No projects yet</p>
              <p className="text-sm text-[#003300]/50 mt-1">Once our team links you to a project, it'll show up here.</p>
            </CardBody>
          </CardComponent>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {projects.map(project => {
            const counts = countsByProject[project._id] || { total: 0, pending: 0, active: 0, done: 0 };
            const progress = counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;
            return (
              <motion.div key={project._id} variants={itemVariants}>
                <CardComponent variant="elevated" hoverable className="h-full">
                  <CardBody>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="font-semibold text-[#003300] leading-snug">{project.name}</h3>
                      <div className="relative w-11 h-11 flex-shrink-0">
                        <svg viewBox="0 0 36 36" className="w-11 h-11 -rotate-90">
                          <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(0,51,0,0.1)" strokeWidth="4" />
                          <circle cx="18" cy="18" r="15.5" fill="none" stroke="#003300" strokeWidth="4"
                            strokeDasharray={`${progress} 100`} strokeLinecap="round" />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[#003300]">{progress}%</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {counts.pending > 0 && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                          {counts.pending} pending review
                        </span>
                      )}
                      {counts.active > 0 && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                          {counts.active} in progress
                        </span>
                      )}
                      {counts.done > 0 && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                          {counts.done} done
                        </span>
                      )}
                      {counts.total === 0 && (
                        <span className="text-xs text-[#003300]/40 italic">No requests yet</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => openNewRequest(project._id)}
                        className="text-xs font-medium text-[#003300]/70 hover:text-[#003300] inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> New request
                      </button>
                      <Link
                        to={`/client/projects/${project._id}`}
                        className="text-xs font-semibold text-[#003300] hover:underline inline-flex items-center gap-1"
                      >
                        Open project <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </CardBody>
                </CardComponent>
              </motion.div>
            );
          })}
        </div>
      )}

      <NewTaskRequestModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        projects={projects}
        defaultProjectId={modalProjectId}
        onCreated={() => { getTasks(); }}
      />
    </motion.div>
  );
}
