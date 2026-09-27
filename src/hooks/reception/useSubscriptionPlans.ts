/**
 * Custom hook for managing subscription plans (CLO)
 * 
 * Provides CRUD operations for subscription plans
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getSubscriptionPlans,
  getSubscriptionPlan,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  type SubscriptionPlan,
  type CreateSubscriptionPlanRequest,
  type UpdateSubscriptionPlanRequest,
} from '../../services/subscription.service';

interface UseSubscriptionPlansReturn {
  plans: SubscriptionPlan[];
  isLoading: boolean;
  error: string | null;
  fetchPlans: () => Promise<void>;
  fetchPlan: (id: string) => Promise<SubscriptionPlan | null>;
  createPlan: (data: CreateSubscriptionPlanRequest) => Promise<SubscriptionPlan>;
  updatePlan: (id: string, data: UpdateSubscriptionPlanRequest) => Promise<SubscriptionPlan>;
  deletePlan: (id: string) => Promise<void>;
}

export const useSubscriptionPlans = (): UseSubscriptionPlansReturn => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getSubscriptionPlans();
      setPlans(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch subscription plans');
      console.error('Error fetching subscription plans:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPlan = useCallback(async (id: string): Promise<SubscriptionPlan | null> => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getSubscriptionPlan(id);
      return data;
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch subscription plan');
      console.error('Error fetching subscription plan:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createPlan = useCallback(async (data: CreateSubscriptionPlanRequest): Promise<SubscriptionPlan> => {
    try {
      setIsLoading(true);
      setError(null);
      const newPlan = await createSubscriptionPlan(data);
      setPlans((prev) => [newPlan, ...prev]);
      return newPlan;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create subscription plan';
      setError(errorMessage);
      console.error('Error creating subscription plan:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updatePlan = useCallback(async (
    id: string,
    data: UpdateSubscriptionPlanRequest
  ): Promise<SubscriptionPlan> => {
    try {
      setIsLoading(true);
      setError(null);
      const updatedPlan = await updateSubscriptionPlan(id, data);
      setPlans((prev) =>
        prev.map((plan) => (plan._id === id ? updatedPlan : plan))
      );
      return updatedPlan;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update subscription plan';
      setError(errorMessage);
      console.error('Error updating subscription plan:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deletePlan = useCallback(async (id: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      await deleteSubscriptionPlan(id);
      setPlans((prev) => prev.filter((plan) => plan._id !== id));
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete subscription plan';
      setError(errorMessage);
      console.error('Error deleting subscription plan:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  return {
    plans,
    isLoading,
    error,
    fetchPlans,
    fetchPlan,
    createPlan,
    updatePlan,
    deletePlan,
  };
};
