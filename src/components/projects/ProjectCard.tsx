import React from 'react';
import { Link } from 'react-router-dom';
import { Image, Calendar, Award, Code, FileText, User } from 'lucide-react';
import { type StudentProject } from '../../hooks/student/useStudentProjects';
import { Badge, CardComponent, CardBody } from '../ui';
import { motion } from 'framer-motion';

interface ProjectCardProps {
  project: StudentProject;
  isStudent?: boolean;
  studentsMap?: Map<string, { name: string; email?: string }>; // Optional map to look up student names by ID
}

export const ProjectCard: React.FC<ProjectCardProps> = React.memo(({ 
  project, 
  isStudent = false,
  studentsMap 
}) => {
  // Get student name - either from populated studentId object or from studentsMap
  const getStudentName = (): string | null => {
    if (typeof project.studentId === 'object' && project.studentId.name) {
      return project.studentId.name;
    }
    if (typeof project.studentId === 'string' && studentsMap) {
      const student = studentsMap.get(project.studentId);
      return student?.name || null;
    }
    return null;
  };

  const studentName = getStudentName();
  const getStatusBadge = () => {
    switch (project.status) {
      case 'completed':
        return <Badge variant="success" size="sm">Completed</Badge>;
      case 'submitted':
        return <Badge variant="primary" size="sm">Submitted</Badge>;
      default:
        return <Badge variant="warning" size="sm">In Progress</Badge>;
    }
  };

  const linkPath = isStudent
    ? `/student/projects/${project._id}`
    : `/trainer/projects/${project._id}`;

  return (
    <Link to={linkPath}>
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
      >
        <CardComponent variant="glass" hover className="h-full">
          <CardBody>
            {/* Image Preview */}
            {project.images && project.images.length > 0 && (
              <div className="relative w-full h-48 mb-4 rounded-lg overflow-hidden">
                <img
                  src={project.images[0].cloudinaryUrl}
                  alt={project.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {project.images.length > 1 && (
                  <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                    +{project.images.length - 1} more
                  </div>
                )}
              </div>
            )}

            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-[#003300] mb-1 truncate">
                  {project.title}
                </h3>
                {project.courseId && (
                  <p className="text-sm text-[#003300]/60 truncate">
                    {project.courseId.title}
                  </p>
                )}
                {/* Student Name */}
                {studentName && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <User className="w-3.5 h-3.5 text-[#003300]/50" />
                    <p className="text-sm text-[#003300]/70 font-medium">
                      {studentName}
                    </p>
                  </div>
                )}
              </div>
              {getStatusBadge()}
            </div>

            {project.description && (
              <p className="text-sm text-[#003300]/70 mb-4 line-clamp-2">
                {project.description}
              </p>
            )}

            {/* Technologies & Components */}
            {(project.technologies && project.technologies.length > 0) ||
            (project.components && project.components.length > 0) ? (
              <div className="space-y-2 mb-4">
                {project.technologies && project.technologies.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Code className="w-4 h-4 text-[#003300]/60" />
                    {project.technologies.slice(0, 3).map((tech, index) => (
                      <Badge key={index} variant="secondary" size="sm">
                        {tech}
                      </Badge>
                    ))}
                    {project.technologies.length > 3 && (
                      <span className="text-xs text-[#003300]/60">
                        +{project.technologies.length - 3} more
                      </span>
                    )}
                  </div>
                )}
                {project.components && project.components.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <FileText className="w-4 h-4 text-[#003300]/60" />
                    <span className="text-xs text-[#003300]/60">
                      {project.components.length} component{project.components.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            ) : null}

            {/* Grade & Date */}
            <div className="flex items-center justify-between pt-3 border-t border-primary/10">
              {project.grade !== undefined && (
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">
                    Grade: {project.grade}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1 text-xs text-[#003300]/60">
                <Calendar className="w-3 h-3" />
                <span>
                  {new Date(project.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </CardBody>
        </CardComponent>
      </motion.div>
    </Link>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return prevProps.project._id === nextProps.project._id &&
         prevProps.project.status === nextProps.project.status &&
         prevProps.project.grade === nextProps.project.grade &&
         prevProps.isStudent === nextProps.isStudent;
});
