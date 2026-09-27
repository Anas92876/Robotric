import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';

export interface OrderItem {
  partId: {
    _id: string;
    name: string;
    sku?: string;
  };
  qty: number;
  _id: string;
}

export interface Order {
  _id: string;
  orderNumber?: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  items: OrderItem[];
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled' | 'cancelled';
  totalQty: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  approvedBy?: {
    _id: string;
    name: string;
  };
  approvedAt?: string;
  fulfilledAt?: string;
}

export interface OrdersStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  fulfilled: number;
  cancelled: number;
  totalItems: number;
  recentOrders: Order[];
}

/**
 * Custom hook for managing orders data
 * Fetches orders, calculates stats, and provides filtering/actions
 */
export const useOrdersData = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrdersStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.get('/orders');
      const ordersData: Order[] = response.data.map((order: any) => ({
        ...order,
        totalQty: order.items?.reduce((sum: number, item: OrderItem) => sum + (item.qty || 0), 0) || 0
      }));

      setOrders(ordersData);

      // Calculate statistics
      const total = ordersData.length;
      const pending = ordersData.filter(o => o.status === 'pending').length;
      const approved = ordersData.filter(o => o.status === 'approved').length;
      const rejected = ordersData.filter(o => o.status === 'rejected').length;
      const fulfilled = ordersData.filter(o => o.status === 'fulfilled').length;
      const cancelled = ordersData.filter(o => o.status === 'cancelled').length;
      const totalItems = ordersData.reduce((sum, o) => sum + o.totalQty, 0);

      // Get recent orders (last 5)
      const recentOrders = [...ordersData]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      setStats({
        total,
        pending,
        approved,
        rejected,
        fulfilled,
        cancelled,
        totalItems,
        recentOrders
      });

    } catch (err: any) {
      console.error('Error fetching orders:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load orders';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Action methods
  const approveOrder = useCallback(async (orderId: string) => {
    try {
      await api.post(`/orders/${orderId}/approve`);
      await fetchOrders();
      return { success: true };
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to approve order';
      return { success: false, error: errorMessage };
    }
  }, [fetchOrders]);

  const rejectOrder = useCallback(async (orderId: string) => {
    try {
      await api.post(`/orders/${orderId}/reject`);
      await fetchOrders();
      return { success: true };
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to reject order';
      return { success: false, error: errorMessage };
    }
  }, [fetchOrders]);

  const fulfillOrder = useCallback(async (orderId: string) => {
    try {
      await api.post(`/orders/${orderId}/fulfill`);
      await fetchOrders();
      return { success: true };
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fulfill order';
      return { success: false, error: errorMessage };
    }
  }, [fetchOrders]);

  const cancelOrder = useCallback(async (orderId: string) => {
    try {
      await api.post(`/orders/${orderId}/cancel`);
      await fetchOrders();
      return { success: true };
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to cancel order';
      return { success: false, error: errorMessage };
    }
  }, [fetchOrders]);

  return {
    orders,
    stats,
    isLoading,
    error,
    refetch: fetchOrders,
    actions: {
      approve: approveOrder,
      reject: rejectOrder,
      fulfill: fulfillOrder,
      cancel: cancelOrder
    }
  };
};
