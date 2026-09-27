/**
 * NotificationItem Component
 *
 * Displays a single notification item with actions
 */

import React from 'react';
import { Bell, Check, X, ExternalLink } from 'lucide-react';
import { Button } from '../ui';
import type { Notification } from '../../hooks/common/useWebNotifications';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onClick?: () => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onDelete,
  onClick
}) => {
  const getTypeIcon = (type: Notification['type']) => {
    switch (type) {
      case 'enrollment':
        return '📚';
      case 'payment':
        return '💳';
      case 'evaluation':
        return '⭐';
      case 'session':
        return '📅';
      case 'assignment':
        return '📝';
      case 'system':
        return '🔔';
      default:
        return '🔔';
    }
  };

  const getTypeColor = (type: Notification['type']) => {
    switch (type) {
      case 'enrollment':
        return 'bg-blue-100 text-blue-700';
      case 'payment':
        return 'bg-green-100 text-green-700';
      case 'evaluation':
        return 'bg-yellow-100 text-yellow-700';
      case 'session':
        return 'bg-purple-100 text-purple-700';
      case 'assignment':
        return 'bg-orange-100 text-orange-700';
      case 'system':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleClick = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification._id);
    }
    if (onClick) {
      onClick();
    }
  };

  return (
    <div
      className={`p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer ${
        !notification.isRead ? 'bg-blue-50/50' : ''
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg ${getTypeColor(notification.type)}`}>
          {getTypeIcon(notification.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className={`font-semibold text-sm ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                  {notification.title}
                </h4>
                {!notification.isRead && (
                  <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                )}
                {notification.isImportant && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                    Important
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                {notification.message}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {formatTime(notification.createdAt)}
                </span>
                {notification.actionUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (notification.actionUrl) {
                        window.location.href = notification.actionUrl;
                      }
                    }}
                    className="text-xs h-6 px-2"
                  >
                    {notification.actionLabel || 'View'}
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {!notification.isRead && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsRead(notification._id);
                  }}
                  className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                  title="Mark as read"
                >
                  <Check className="w-4 h-4 text-gray-600" />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(notification._id);
                }}
                className="p-1.5 rounded hover:bg-red-100 transition-colors"
                title="Delete"
              >
                <X className="w-4 h-4 text-gray-600 hover:text-red-600" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
