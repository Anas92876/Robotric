import { Badge } from '../ui';

interface ProjectStatusBadgeProps {
  status: 'in_progress' | 'completed' | 'submitted';
  size?: 'sm' | 'md' | 'lg';
}

export const ProjectStatusBadge: React.FC<ProjectStatusBadgeProps> = ({ status, size = 'sm' }) => {
  const getVariant = () => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'submitted':
        return 'primary';
      default:
        return 'warning';
    }
  };

  const getLabel = () => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'submitted':
        return 'Submitted';
      default:
        return 'In Progress';
    }
  };

  return (
    <Badge variant={getVariant()} size={size}>
      {getLabel()}
    </Badge>
  );
};
