/**
 * useWebNotifications Hook
 *
 * Custom hook for managing in-app web notifications
 * Provides notification fetching, marking as read, deletion, and real-time updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../lib/api';
import { socket } from '../../lib/socket';

export interface Notification {
  _id: string;
  userId: string;
  type: 'enrollment' | 'payment' | 'evaluation' | 'session' | 'assignment' | 'system';
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  isImportant: boolean;
  actionUrl?: string;
  actionLabel?: string;
  readAt?: string;
  createdAt: string;
}

export interface NotificationFilters {
  type?: Notification['type'];
  isRead?: boolean;
  isImportant?: boolean;
  limit?: number;
  page?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface NotificationPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface UseWebNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  pagination: NotificationPagination | null;
  fetchNotifications: (filters?: NotificationFilters) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

export const useWebNotifications = (
  autoFetch: boolean = true,
  initialFilters?: NotificationFilters
): UseWebNotificationsReturn => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<NotificationPagination | null>(null);
  const [filters, setFilters] = useState<NotificationFilters>(initialFilters || {});
  
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  // Fetch notifications
  const fetchNotifications = useCallback(async (newFilters?: NotificationFilters) => {
    try {
      setIsLoading(true);
      setError(null);

      const filtersToUse = newFilters || filtersRef.current;
      const params = new URLSearchParams();

      if (filtersToUse.type) params.append('type', filtersToUse.type);
      if (filtersToUse.isRead !== undefined) params.append('isRead', String(filtersToUse.isRead));
      if (filtersToUse.isImportant !== undefined) params.append('isImportant', String(filtersToUse.isImportant));
      if (filtersToUse.limit) params.append('limit', String(filtersToUse.limit));
      if (filtersToUse.page) params.append('page', String(filtersToUse.page));
      if (filtersToUse.sortBy) params.append('sortBy', filtersToUse.sortBy);
      if (filtersToUse.sortOrder) params.append('sortOrder', filtersToUse.sortOrder);

      const queryString = params.toString();
      const url = `/web-notifications${queryString ? `?${queryString}` : ''}`;

      const response = await api.get<{
        success: boolean;
        data: Notification[];
        pagination: NotificationPagination;
      }>(url);

      setNotifications(response.data.data || []);
      setPagination(response.data.pagination || null);

      if (newFilters) {
        setFilters(newFilters);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 
                          err.response?.data?.message || 
                          'Failed to fetch notifications';
      setError(errorMessage);
      console.error('Error fetching notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await api.get<{
        success: boolean;
        data: { unreadCount: number };
      }>('/web-notifications/unread-count');

      setUnreadCount(response.data.data.unreadCount || 0);
    } catch (err: any) {
      console.error('Error fetching unread count:', err);
      // Don't set error for unread count failures
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      await api.put(`/web-notifications/${id}/read`);

      // Update local state
      setNotifications(prev =>
        prev.map(notif =>
          notif._id === id
            ? { ...notif, isRead: true, readAt: new Date().toISOString() }
            : notif
        )
      );

      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 
                          err.response?.data?.message || 
                          'Failed to mark notification as read';
      setError(errorMessage);
      console.error('Error marking notification as read:', err);
      throw err;
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await api.put('/web-notifications/read-all');

      // Update local state
      setNotifications(prev =>
        prev.map(notif => ({
          ...notif,
          isRead: true,
          readAt: notif.readAt || new Date().toISOString()
        }))
      );

      // Reset unread count
      setUnreadCount(0);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 
                          err.response?.data?.message || 
                          'Failed to mark all notifications as read';
      setError(errorMessage);
      console.error('Error marking all notifications as read:', err);
      throw err;
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (id: string) => {
    try {
      await api.delete(`/web-notifications/${id}`);

      // Update local state
      const deletedNotification = notifications.find(n => n._id === id);
      setNotifications(prev => prev.filter(notif => notif._id !== id));

      // Update unread count if deleted notification was unread
      if (deletedNotification && !deletedNotification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 
                          err.response?.data?.message || 
                          'Failed to delete notification';
      setError(errorMessage);
      console.error('Error deleting notification:', err);
      throw err;
    }
  }, [notifications]);

  // Refresh notifications
  const refreshNotifications = useCallback(async () => {
    await Promise.all([
      fetchNotifications(),
      fetchUnreadCount()
    ]);
  }, [fetchNotifications, fetchUnreadCount]);

  // Initial fetch
  useEffect(() => {
    if (autoFetch) {
      fetchNotifications();
      fetchUnreadCount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch]); // Only run on mount or when autoFetch changes

  // Real-time updates via Socket.io
  useEffect(() => {
    if (!socket) return;

    // Connect socket if not already connected
    if (!socket.connected) {
      socket.connect();
    }

    // Listen for new notifications
    const handleNewNotification = (data: { notification: Notification }) => {
      setNotifications(prev => [data.notification, ...prev]);
      if (!data.notification.isRead) {
        setUnreadCount(prev => prev + 1);
      }
    };

    // Listen for notification read
    const handleNotificationRead = (data: { notificationId: string }) => {
      setNotifications(prev =>
        prev.map(notif =>
          notif._id === data.notificationId
            ? { ...notif, isRead: true, readAt: new Date().toISOString() }
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    };

    // Listen for notification deleted
    const handleNotificationDeleted = (data: { notificationId: string }) => {
      const deletedNotification = notifications.find(n => n._id === data.notificationId);
      setNotifications(prev => prev.filter(notif => notif._id !== data.notificationId));
      
      if (deletedNotification && !deletedNotification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    };

    // Listen for all notifications read
    const handleAllRead = () => {
      setNotifications(prev =>
        prev.map(notif => ({
          ...notif,
          isRead: true,
          readAt: notif.readAt || new Date().toISOString()
        }))
      );
      setUnreadCount(0);
    };

    // Listen for unread count updates
    const handleCountUpdate = (data: { unreadCount: number }) => {
      setUnreadCount(data.unreadCount || 0);
    };

    // Register event listeners
    socket.on('notification:new', handleNewNotification);
    socket.on('notification:read', handleNotificationRead);
    socket.on('notification:deleted', handleNotificationDeleted);
    socket.on('notification:read-all', handleAllRead);
    socket.on('notification:count', handleCountUpdate);

    // Cleanup
    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('notification:read', handleNotificationRead);
      socket.off('notification:deleted', handleNotificationDeleted);
      socket.off('notification:read-all', handleAllRead);
      socket.off('notification:count', handleCountUpdate);
    };
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    pagination,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications
  };
};
