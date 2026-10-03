/**
 * MaterialCard Component
 * Displays course material for students with view action
 */

import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Eye, Calendar } from 'lucide-react';
import { CardComponent, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface MaterialCardProps {
  material: {
    _id: string;
    title: string;
    description?: string;
    category?: string;
    createdAt?: string | null;
    fileSize?: number;
  };
  onView: (materialId: string) => void;
}

export const MaterialCard: React.FC<MaterialCardProps> = ({
  material,
  onView
}) => {
  // Format file size
  const formatFileSize = (bytes: number | null | undefined): string => {
    if (!bytes && bytes !== 0) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format date
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Get badge variant for category
  const getCategoryVariant = (category: string) => {
    const variants: Record<string, any> = {
      lecture: 'primary',
      assignment: 'warning',
      lab: 'info',
      exam: 'error',
      reference: 'secondary',
      other: 'secondary'
    };
    return variants[category] || 'secondary';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <CardComponent variant="glass" className="h-full hover:border-white/20 transition-all">
        <CardBody className="p-6 flex flex-col h-full">
          {/* Icon & Badge */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-400" />
            </div>
            <Badge variant={getCategoryVariant(material.category || 'Documents')}>
              {material.category || 'Documents'}
            </Badge>
          </div>

          {/* Content */}
          <div className="flex-1 mb-4">
            <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
              {material.title}
            </h3>
            
            {material.description && (
              <p className="text-sm text-white/60 line-clamp-2 mb-3">
                {material.description}
              </p>
            )}

            {/* Metadata */}
            <div className="flex items-center gap-4 text-xs text-white/50">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Added {formatDate(material.createdAt)}
              </span>
              <span>PDF • {formatFileSize(material.fileSize)}</span>
            </div>
          </div>

          {/* Action Button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              if (!material._id) return;
              onView(material._id);
            }}
          >
            <Eye className="w-4 h-4 mr-2" />
            View Material
          </Button>
        </CardBody>
      </CardComponent>
    </motion.div>
  );
};
