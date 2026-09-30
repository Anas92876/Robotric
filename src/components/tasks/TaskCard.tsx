import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { type Task } from '../../hooks/student/useTasks';
import { Badge, CardComponent, CardBody } from '../ui';
import { motion } from 'framer-motion';

interface TaskCardProps {
  task: Task;
}

export const TaskCard: React.FC<TaskCardProps> = React.memo(({ task }) => {
  const isOverdue = new Date(task.deadline) < new Date() && task.status === 'open';
  const isSubmitted = task.submission?.status && task.submission.status !== 'not_submitted';
  const isGraded = task.submission?.status === 'graded';

  const getStatusBadge = () => {
    if (isGraded) {
      return <Badge variant="success" size="sm">Graded</Badge>;
    }
    if (task.submission?.status === 'pending_review') {
      return <Badge variant="warning" size="sm">Pending Review</Badge>;
    }
    if (task.submission?.status === 'returned') {
      return <Badge variant="error" size="sm">Returned</Badge>;
    }
    if (isOverdue) {
      return <Badge variant="error" size="sm">Overdue</Badge>;
    }
    if (task.status === 'closed') {
      return <Badge variant="secondary" size="sm">Closed</Badge>;
    }
    return <Badge variant="primary" size="sm">Open</Badge>;
  };

  const formatDeadline = (deadline: string) => {
    const date = new Date(deadline);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Link to={`/student/tasks/${task._id}`}>
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
      >
        <CardComponent variant="glass" hover className="h-full">
          <CardBody>
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-ink mb-1 truncate">
                  {task.title}
                </h3>
                {task.courseId && (
                  <p className="text-sm text-ink/60 truncate">
                    {task.courseId.title}
                  </p>
                )}
              </div>
              {getStatusBadge()}
            </div>

            <p className="text-sm text-ink/70 mb-4 line-clamp-2">
              {task.description}
            </p>

            <div className="flex items-center gap-4 text-xs text-ink/60 mb-3">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{formatDeadline(task.deadline)}</span>
              </div>
              {task.hasQuestions && (
                <div className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  <span>Questions</span>
                </div>
              )}
            </div>

            {isSubmitted && (
              <div className="flex items-center justify-between pt-3 border-t border-primary/10">
                <div className="flex items-center gap-2">
                  {isGraded ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-600">
                        Score: {task.submission?.score || 0}/{task.maxScore}
                      </span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm text-yellow-600">Under Review</span>
                    </>
                  )}
                </div>
                {task.submission?.isLate && (
                  <Badge variant="error" size="sm">Late</Badge>
                )}
              </div>
            )}

            {isOverdue && !isSubmitted && (
              <div className="flex items-center gap-2 pt-3 border-t border-primary/10">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm text-red-600">Deadline passed</span>
              </div>
            )}
          </CardBody>
        </CardComponent>
      </motion.div>
    </Link>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return prevProps.task._id === nextProps.task._id &&
         prevProps.task.status === nextProps.task.status &&
         prevProps.task.submission?.status === nextProps.task.submission?.status &&
         prevProps.task.submission?.score === nextProps.task.submission?.score;
});
