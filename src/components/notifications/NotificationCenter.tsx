/**
 * NotificationCenter Component
 *
 * Bell icon with badge showing unread count
 * Dropdown/popover with notification list
 */

import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, Filter, X } from 'lucide-react';
import { useWebNotifications, type Notification } from '../../hooks/common/useWebNotifications';
import { NotificationItem } from './NotificationItem';
import { Button, Badge, LoadingState } from '../ui';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../ui';
import { useTranslation } from 'react-i18next';

interface NotificationCenterProps {
  maxNotifications?: number;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  maxNotifications = 10
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'important'>('all');
  const [typeFilter, setTypeFilter] = useState<Notification['type'] | 'all'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const toast = useToast();
  const { t, i18n } = useTranslation('dashboardCommon');
  const isRTL = i18n.language === 'ar';

  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useWebNotifications(true, { limit: maxNotifications });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Filter notifications
  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread' && notif.isRead) return false;
    if (filter === 'important' && !notif.isImportant) return false;
    if (typeFilter !== 'all' && notif.type !== typeFilter) return false;
    return true;
  });

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification._id).catch(() => {
        toast.error('Error', 'Failed to mark notification as read');
      });
    }

    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      setIsOpen(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      toast.success('Success', 'All notifications marked as read');
    } catch {
      toast.error('Error', 'Failed to mark all notifications as read');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id);
      toast.success('Success', 'Notification deleted');
    } catch {
      toast.error('Error', 'Failed to delete notification');
    }
  };

  const handleViewAll = () => {
    navigate('/notifications');
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-xl p-2.5 transition-all duration-300 hover:bg-[#cccc99]/20 border border-transparent hover:border-[#cccc99]/40 focus:outline-none focus:ring-2 focus:ring-[#cccc99]/50"
        style={{ color: '#cccc99' }}
        aria-label={t('notifications')}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#cccc99' + '30';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <Bell className="w-5 h-5" style={{ color: '#cccc99' }} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center px-1.5 rounded-full text-[10px] font-bold text-white bg-red-500 border-2 border-[#003300] shadow-md"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[600px] flex flex-col ${isRTL ? 'font-arabic' : ''}`}>
          {/* Header */}
          <div className={`p-4 border-b border-gray-200 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h3 className="font-semibold text-gray-900">{t('notifications')}</h3>
              {unreadCount > 0 && (
                <Badge variant="primary" size="sm">
                  {unreadCount} {t('newBadge')}
                </Badge>
              )}
            </div>
            <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                  title={t('markAllRead')}
                >
                  <CheckCheck className="w-4 h-4 text-gray-600" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                title={t('close')}
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className={`p-3 border-b border-gray-200 flex items-center gap-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center gap-1 flex-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as typeof filter)}
                className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/20"
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                <option value="all">{t('all')}</option>
                <option value="unread">{t('unread')}</option>
                <option value="important">{t('important')}</option>
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
                className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/20"
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                <option value="all">{t('allTypes')}</option>
                <option value="enrollment">{t('enrollment')}</option>
                <option value="payment">{t('payment')}</option>
                <option value="evaluation">{t('evaluation')}</option>
                <option value="session">{t('session')}</option>
                <option value="assignment">{t('assignment')}</option>
                <option value="system">{t('system')}</option>
              </select>
            </div>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="p-8">
                <LoadingState message={t('loadingNotifications')} />
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-600 text-sm">
                {error}
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>{t('noNotifications')}</p>
              </div>
            ) : (
              <div>
                {filteredNotifications.map((notification) => (
                  <NotificationItem
                    key={notification._id}
                    notification={notification}
                    onMarkAsRead={markAsRead}
                    onDelete={handleDelete}
                    onClick={() => handleNotificationClick(notification)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {filteredNotifications.length > 0 && (
            <div className="p-3 border-t border-gray-200">
              <Button
                variant="outline"
                size="sm"
                fullWidth
                onClick={handleViewAll}
              >
                {t('viewAllNotifications')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
