/**
 * Custom hook for students to check their subscription status
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getMySubscription,
  type UserSubscription,
} from '../../services/subscription.service';

interface UseMySubscriptionReturn {
  hasActiveSubscription: boolean;
  subscription: UserSubscription | null;
  isLoading: boolean;
  error: string | null;
  fetchSubscription: () => Promise<void>;
}

export const useMySubscription = (): UseMySubscriptionReturn => {
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getMySubscription();
      setHasActiveSubscription(data.hasActiveSubscription);
      setSubscription(data.subscription);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch subscription');
      console.error('Error fetching subscription:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return {
    hasActiveSubscription,
    subscription,
    isLoading,
    error,
    fetchSubscription,
  };
};
