import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

interface DashboardStats {
  orders: {
    total: number;
    active: number;
    completed: number;
    trend: number;
  };
  projects: {
    total: number;
    active: number;
    completed: number;
    trend: number;
  };
  teams: {
    total: number;
    members: number;
    trend: number;
  };
  parts: {
    total: number;
    lowStock: number;
    outOfStock: number;
  };
}

interface RecentActivity {
  id: string;
  type: 'order' | 'project' | 'team' | 'inventory' | 'system';
  title: string;
  description: string;
  timestamp: string;
  user?: {
    name: string;
    avatar?: string;
  };
}

export const useDashboardStats = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch all required data in parallel
      const [ordersRes, projectsRes, teamsRes, partsRes] = await Promise.all([
        api.get('/orders'),
        api.get('/projects'),
        api.get('/teams'),
        api.get('/parts'),
      ]);

      const orders = ordersRes.data.data || ordersRes.data || [];
      const projects = projectsRes.data.data || projectsRes.data || [];
      const teams = teamsRes.data.data || teamsRes.data || [];
      const parts = partsRes.data.data || partsRes.data || [];

      // Calculate statistics
      const activeOrders = Array.isArray(orders)
        ? orders.filter((o: any) => o.status === 'pending' || o.status === 'approved').length
        : 0;

      const completedOrders = Array.isArray(orders)
        ? orders.filter((o: any) => o.status === 'delivered' || o.status === 'completed').length
        : 0;

      const activeProjects = Array.isArray(projects)
        ? projects.filter((p: any) => p.status === 'in_progress' || p.status === 'active').length
        : 0;

      const completedProjects = Array.isArray(projects)
        ? projects.filter((p: any) => p.status === 'completed').length
        : 0;

      const totalMembers = Array.isArray(teams)
        ? teams.reduce((sum: number, team: any) => sum + (team.members?.length || 0), 0)
        : 0;

      const lowStockParts = Array.isArray(parts)
        ? parts.filter((p: any) => {
            const quantity = p.stockLevel?.quantity || p.quantity || 0;
            const minQuantity = p.stockLevel?.minQuantity || p.minQuantity || 10;
            return quantity > 0 && quantity <= minQuantity;
          }).length
        : 0;

      const outOfStockParts = Array.isArray(parts)
        ? parts.filter((p: any) => {
            const quantity = p.stockLevel?.quantity || p.quantity || 0;
            return quantity === 0;
          }).length
        : 0;

      setStats({
        orders: {
          total: Array.isArray(orders) ? orders.length : 0,
          active: activeOrders,
          completed: completedOrders,
          trend: 25, // Mock trend for now
        },
        projects: {
          total: Array.isArray(projects) ? projects.length : 0,
          active: activeProjects,
          completed: completedProjects,
          trend: 12.5,
        },
        teams: {
          total: Array.isArray(teams) ? teams.length : 0,
          members: totalMembers,
          trend: 5,
        },
        parts: {
          total: Array.isArray(parts) ? parts.length : 0,
          lowStock: lowStockParts,
          outOfStock: outOfStockParts,
        },
      });

      // Generate recent activity from actual data
      const activities: RecentActivity[] = [];

      // Add recent orders
      if (Array.isArray(orders)) {
        orders
          .slice(0, 2)
          .forEach((order: any) => {
            activities.push({
              id: order._id,
              type: 'order',
              title: `Order #${order.orderNumber || order._id.slice(-4)}`,
              description: `Status: ${order.status}`,
              timestamp: order.createdAt || new Date().toISOString(),
            });
          });
      }

      // Add recent projects
      if (Array.isArray(projects)) {
        projects
          .slice(0, 2)
          .forEach((project: any) => {
            activities.push({
              id: project._id,
              type: 'project',
              title: project.name || 'Untitled Project',
              description: `Status: ${project.status || 'active'}`,
              timestamp: project.updatedAt || project.createdAt || new Date().toISOString(),
            });
          });
      }

      // Sort by timestamp
      activities.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setRecentActivity(activities.slice(0, 5));
    } catch (err: any) {
      console.error('Failed to fetch dashboard stats:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return {
    stats,
    recentActivity,
    isLoading,
    error,
    refetch: fetchStats,
  };
};
