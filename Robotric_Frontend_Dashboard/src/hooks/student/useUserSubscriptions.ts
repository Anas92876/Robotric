/**
 * Custom hook for managing user subscriptions (Reception)
 * 
 * Provides CRUD operations for user subscriptions
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getActiveSubscriptionPlans,
  getUserSubscriptions,
  createUserSubscription,
  updateUserSubscription,
  cancelUserSubscription,
  type SubscriptionPlan,
  type UserSubscription,
  type CreateUserSubscriptionRequest,
  type UpdateUserSubscriptionRequest,
} from '../../services/subscription.service';

interface UseUserSubscriptionsReturn {
  subscriptions: UserSubscription[];
  activePlans: SubscriptionPlan[];
  isLoading: boolean;
  error: string | null;
  filters: {
    status?: string;
    userId?: string;
  };
  setFilters: (filters: { status?: string; userId?: string }) => void;
  fetchSubscriptions: () => Promise<void>;
  fetchActivePlans: () => Promise<void>;
  createSubscription: (data: CreateUserSubscriptionRequest) => Promise<UserSubscription>;
  updateSubscription: (id: string, data: UpdateUserSubscriptionRequest) => Promise<UserSubscription>;
  cancelSubscription: (id: string) => Promise<UserSubscription>;
}

export const useUserSubscriptions = (): UseUserSubscriptionsReturn => {
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [activePlans, setActivePlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<{ status?: string; userId?: string }>({});

  const fetchSubscriptions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getUserSubscriptions(filters);
      setSubscriptions(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch user subscriptions');
      console.error('Error fetching user subscriptions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const fetchActivePlans = useCallback(async () => {
    try {
      const data = await getActiveSubscriptionPlans();
      setActivePlans(data);
    } catch (err: any) {
      console.error('Error fetching active subscription plans:', err);
    }
  }, []);

  const createSubscription = useCallback(async (
    data: CreateUserSubscriptionRequest
  ): Promise<UserSubscription> => {
    try {
      setIsLoading(true);
      setError(null);
      const newSubscription = await createUserSubscription(data);
      setSubscriptions((prev) => [newSubscription, ...prev]);
      return newSubscription;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create user subscription';
      setError(errorMessage);
      console.error('Error creating user subscription:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSubscription = useCallback(async (
    id: string,
    data: UpdateUserSubscriptionRequest
  ): Promise<UserSubscription> => {
    try {
      setIsLoading(true);
      setError(null);
      const updatedSubscription = await updateUserSubscription(id, data);
      setSubscriptions((prev) =>
        prev.map((sub) => (sub._id === id ? updatedSubscription : sub))
      );
      return updatedSubscription;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update user subscription';
      setError(errorMessage);
      console.error('Error updating user subscription:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cancelSubscription = useCallback(async (id: string): Promise<UserSubscription> => {
    try {
      setIsLoading(true);
      setError(null);
      const canceledSubscription = await cancelUserSubscription(id);
      setSubscriptions((prev) =>
        prev.map((sub) => (sub._id === id ? canceledSubscription : sub))
      );
      return canceledSubscription;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to cancel user subscription';
      setError(errorMessage);
      console.error('Error canceling user subscription:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  useEffect(() => {
    fetchActivePlans();
  }, [fetchActivePlans]);

  return {
    subscriptions,
    activePlans,
    isLoading,
    error,
    filters,
    setFilters,
    fetchSubscriptions,
    fetchActivePlans,
    createSubscription,
    updateSubscription,
    cancelSubscription,
  };
};
