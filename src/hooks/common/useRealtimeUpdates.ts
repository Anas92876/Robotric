import { useEffect } from 'react';
import { socket } from '../../lib/socket';
import { useToast } from '../../components/ui';

interface RealtimeUpdateHandlers {
  onStockUpdate?: (data: any) => void;
  onOrderCreated?: (data: any) => void;
  onOrderUpdated?: (data: any) => void;
  onProjectUpdated?: (data: any) => void;
  onTeamUpdate?: (data: any) => void;
  onNotification?: (data: any) => void;
}

/**
 * Hook for handling real-time Socket.io updates
 * @param handlers - Object containing event handlers
 * @param enabled - Whether to enable real-time updates (default: true)
 */
export const useRealtimeUpdates = (
  handlers: RealtimeUpdateHandlers = {},
  enabled: boolean = true
) => {
  const toast = useToast();

  useEffect(() => {
    if (!enabled || !socket) return;

    // Connect socket if not already connected
    if (!socket.connected) {
      socket.connect();
    }

    // Stock updates
    if (handlers.onStockUpdate) {
      socket.on('stock:updated', (data) => {
        handlers.onStockUpdate?.(data);
        toast.info('Stock Updated', `${data.partName || 'Part'} stock updated`);
      });
    }

    // Order created
    if (handlers.onOrderCreated) {
      socket.on('order:created', (data) => {
        handlers.onOrderCreated?.(data);
        toast.success('New Order', `Order #${data.orderNumber || data._id} created`);
      });
    }

    // Order updated
    if (handlers.onOrderUpdated) {
      socket.on('order:updated', (data) => {
        handlers.onOrderUpdated?.(data);
        toast.info('Order Updated', `Order #${data.orderNumber || data._id} updated`);
      });
    }

    // Project updated
    if (handlers.onProjectUpdated) {
      socket.on('project:updated', (data) => {
        handlers.onProjectUpdated?.(data);
        toast.info('Project Updated', data.name || 'A project was updated');
      });
    }

    // Team updates
    if (handlers.onTeamUpdate) {
      socket.on('team:updated', (data) => {
        handlers.onTeamUpdate?.(data);
      });
    }

    // General notifications
    if (handlers.onNotification) {
      socket.on('notification', (data) => {
        handlers.onNotification?.(data);

        const variant = data.type === 'error' ? 'error' :
                       data.type === 'warning' ? 'warning' :
                       data.type === 'success' ? 'success' : 'info';

        toast[variant](data.title || 'Notification', data.message);
      });
    }

    // Web notification events
    socket.on('notification:new', (data: { notification: any }) => {
      const notification = data.notification;
      if (notification) {
        // Show toast for new notifications
        const variant = notification.isImportant ? 'warning' : 'info';
        toast[variant](notification.title || 'New Notification', notification.message);
      }
    });

    // Cleanup on unmount
    return () => {
      socket.off('stock:updated');
      socket.off('order:created');
      socket.off('order:updated');
      socket.off('project:updated');
      socket.off('team:updated');
      socket.off('notification');
      socket.off('notification:new');
    };
  }, [enabled, handlers, toast]);

  return {
    socket,
    isConnected: socket?.connected || false,
  };
};

/**
 * Hook specifically for dashboard real-time updates
 * Combines all relevant events for the dashboard
 */
export const useDashboardRealtimeUpdates = (refetchStats: () => void) => {
  const toast = useToast();

  useEffect(() => {
    if (!socket) return;

    if (!socket.connected) {
      socket.connect();
    }

    // Refresh stats on any significant change
    const handleUpdate = (eventName: string, data?: any) => {
      console.log(`[Realtime] ${eventName}:`, data);
      refetchStats();
    };

    socket.on('stock:updated', (data) => handleUpdate('stock:updated', data));
    socket.on('order:created', (data) => {
      handleUpdate('order:created', data);
      toast.success('New Order', `Order created successfully`);
    });
    socket.on('order:updated', (data) => handleUpdate('order:updated', data));
    socket.on('project:updated', (data) => handleUpdate('project:updated', data));
    socket.on('team:updated', (data) => handleUpdate('team:updated', data));

    // Admin notifications
    socket.on('admin:notification', (data) => {
      toast.info('Admin Alert', data.message);
      refetchStats();
    });

    return () => {
      socket.off('stock:updated');
      socket.off('order:created');
      socket.off('order:updated');
      socket.off('project:updated');
      socket.off('team:updated');
      socket.off('admin:notification');
    };
  }, [refetchStats, toast]);

  return {
    socket,
    isConnected: socket?.connected || false,
  };
};

/**
 * Hook specifically for inventory real-time updates
 * Listens to stock updates and part changes
 */
export const useInventoryRealtimeUpdates = (refetchInventory: () => void) => {
  const toast = useToast();

  useEffect(() => {
    if (!socket) return;

    if (!socket.connected) {
      socket.connect();
    }

    // Stock updates
    socket.on('stock:updated', (data) => {
      console.log('[Realtime] Stock updated:', data);
      refetchInventory();
      toast.info('Stock Updated', data.partName ? `${data.partName} stock updated` : 'Part stock updated');
    });

    // Part created
    socket.on('part:created', (data) => {
      console.log('[Realtime] Part created:', data);
      refetchInventory();
      toast.success('Part Added', data.name || 'New part added to inventory');
    });

    // Part updated
    socket.on('part:updated', (data) => {
      console.log('[Realtime] Part updated:', data);
      refetchInventory();
      toast.info('Part Updated', data.name || 'Part information updated');
    });

    // Part deleted
    socket.on('part:deleted', (data) => {
      console.log('[Realtime] Part deleted:', data);
      refetchInventory();
      toast.warning('Part Removed', data.name || 'Part removed from inventory');
    });

    // Low stock alerts
    socket.on('stock:low', (data) => {
      console.log('[Realtime] Low stock alert:', data);
      toast.warning('Low Stock Alert', `${data.partName} is running low (${data.quantity} remaining)`);
      refetchInventory();
    });

    // Out of stock alerts
    socket.on('stock:out', (data) => {
      console.log('[Realtime] Out of stock:', data);
      toast.error('Out of Stock', `${data.partName} is out of stock`);
      refetchInventory();
    });

    return () => {
      socket.off('stock:updated');
      socket.off('part:created');
      socket.off('part:updated');
      socket.off('part:deleted');
      socket.off('stock:low');
      socket.off('stock:out');
    };
  }, [refetchInventory, toast]);

  return {
    socket,
    isConnected: socket?.connected || false,
  };
};

/**
 * Hook specifically for orders real-time updates
 * Listens to order status changes and new orders
 */
export const useOrdersRealtimeUpdates = (refetchOrders: () => void) => {
  const toast = useToast();

  useEffect(() => {
    if (!socket) return;

    if (!socket.connected) {
      socket.connect();
    }

    // Order created
    socket.on('order:created', (data) => {
      console.log('[Realtime] Order created:', data);
      refetchOrders();
      toast.success('New Order', `Order #${data.orderNumber || data._id} created`);
    });

    // Order updated (generic)
    socket.on('order:updated', (data) => {
      console.log('[Realtime] Order updated:', data);
      refetchOrders();
      toast.info('Order Updated', `Order #${data.orderNumber || data._id} updated`);
    });

    // Order approved
    socket.on('order:approved', (data) => {
      console.log('[Realtime] Order approved:', data);
      refetchOrders();
      toast.success('Order Approved', `Order #${data.orderNumber || data._id} has been approved`);
    });

    // Order rejected
    socket.on('order:rejected', (data) => {
      console.log('[Realtime] Order rejected:', data);
      refetchOrders();
      toast.error('Order Rejected', `Order #${data.orderNumber || data._id} has been rejected`);
    });

    // Order fulfilled
    socket.on('order:fulfilled', (data) => {
      console.log('[Realtime] Order fulfilled:', data);
      refetchOrders();
      toast.success('Order Fulfilled', `Order #${data.orderNumber || data._id} has been fulfilled`);
    });

    // Order cancelled
    socket.on('order:cancelled', (data) => {
      console.log('[Realtime] Order cancelled:', data);
      refetchOrders();
      toast.warning('Order Cancelled', `Order #${data.orderNumber || data._id} has been cancelled`);
    });

    // Legacy event names (for backward compatibility)
    socket.on('order:new', (data) => {
      console.log('[Realtime] New order (legacy):', data);
      refetchOrders();
    });

    socket.on('order:update', (data) => {
      console.log('[Realtime] Order update (legacy):', data);
      refetchOrders();
    });

    return () => {
      socket.off('order:created');
      socket.off('order:updated');
      socket.off('order:approved');
      socket.off('order:rejected');
      socket.off('order:fulfilled');
      socket.off('order:cancelled');
      socket.off('order:new');
      socket.off('order:update');
    };
  }, [refetchOrders, toast]);

  return {
    socket,
    isConnected: socket?.connected || false,
  };
};

/**
 * Hook specifically for projects real-time updates
 * Listens to project changes and updates
 */
export const useProjectsRealtimeUpdates = (refetchProjects: () => void) => {
  const toast = useToast();

  useEffect(() => {
    if (!socket) return;

    if (!socket.connected) {
      socket.connect();
    }

    // Project created
    socket.on('project:created', (data) => {
      console.log('[Realtime] Project created:', data);
      refetchProjects();
      toast.success('New Project', data.title || 'New project created');
    });

    // Project updated
    socket.on('project:updated', (data) => {
      console.log('[Realtime] Project updated:', data);
      refetchProjects();
      toast.info('Project Updated', data.title || 'Project information updated');
    });

    // Project deleted
    socket.on('project:deleted', (data) => {
      console.log('[Realtime] Project deleted:', data);
      refetchProjects();
      toast.warning('Project Removed', data.title || 'Project removed');
    });

    // Project status changed
    socket.on('project:status', (data) => {
      console.log('[Realtime] Project status changed:', data);
      refetchProjects();
      toast.info('Status Changed', `${data.title} is now ${data.status}`);
    });

    return () => {
      socket.off('project:created');
      socket.off('project:updated');
      socket.off('project:deleted');
      socket.off('project:status');
    };
  }, [refetchProjects, toast]);

  return {
    socket,
    isConnected: socket?.connected || false,
  };
};

/**
 * Hook for teams real-time updates
 */
export const useTeamsRealtimeUpdates = (refetchTeams: () => void) => {
  const toast = useToast();

  useEffect(() => {
    if (!socket) return;
    if (!socket.connected) socket.connect();

    socket.on('team:created', (data) => {
      console.log('[Realtime] Team created:', data);
      refetchTeams();
      toast.success('New Team', data.name || 'New team created');
    });

    socket.on('team:updated', (data) => {
      console.log('[Realtime] Team updated:', data);
      refetchTeams();
      toast.info('Team Updated', data.name || 'Team information updated');
    });

    socket.on('team:deleted', (data) => {
      console.log('[Realtime] Team deleted:', data);
      refetchTeams();
      toast.warning('Team Removed', data.name || 'Team removed');
    });

    return () => {
      socket.off('team:created');
      socket.off('team:updated');
      socket.off('team:deleted');
    };
  }, [refetchTeams, toast]);

  return { socket, isConnected: socket?.connected || false };
};

/**
 * Hook for competitions real-time updates
 */
export const useCompetitionsRealtimeUpdates = (refetchCompetitions: () => void) => {
  const toast = useToast();

  useEffect(() => {
    if (!socket) return;
    if (!socket.connected) socket.connect();

    socket.on('competition:created', (data) => {
      console.log('[Realtime] Competition created:', data);
      refetchCompetitions();
      toast.success('New Competition', data.title || 'New competition created');
    });

    socket.on('competition:updated', (data) => {
      console.log('[Realtime] Competition updated:', data);
      refetchCompetitions();
      toast.info('Competition Updated', data.title || 'Competition information updated');
    });

    socket.on('competition:deleted', (data) => {
      console.log('[Realtime] Competition deleted:', data);
      refetchCompetitions();
      toast.warning('Competition Removed', data.title || 'Competition removed');
    });

    return () => {
      socket.off('competition:created');
      socket.off('competition:updated');
      socket.off('competition:deleted');
    };
  }, [refetchCompetitions, toast]);

  return { socket, isConnected: socket?.connected || false };
};
