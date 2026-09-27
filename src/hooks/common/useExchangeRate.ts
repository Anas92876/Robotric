/**
 * Hook for fetching and updating the USD to Syrian Pound exchange rate
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';

const DEFAULT_EXCHANGE_RATE = 120;

export interface UseExchangeRateResult {
  exchangeRate: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateExchangeRate: (newRate: number) => Promise<void>;
}

export function useExchangeRate(): UseExchangeRateResult {
  const [exchangeRate, setExchangeRate] = useState<number>(DEFAULT_EXCHANGE_RATE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRate = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get<{ success: boolean; data: { usdToSypExchangeRate: number } }>(
        '/reception/settings/exchange-rate'
      );
      if (response.data?.data?.usdToSypExchangeRate != null) {
        setExchangeRate(response.data.data.usdToSypExchangeRate);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch exchange rate');
      setExchangeRate(DEFAULT_EXCHANGE_RATE);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRate();
  }, [fetchRate]);

  const updateExchangeRate = useCallback(
    async (newRate: number) => {
      const response = await api.put<{ success: boolean; data: { usdToSypExchangeRate: number } }>(
        '/reception/settings/exchange-rate',
        { usdToSypExchangeRate: newRate }
      );
      if (response.data?.data?.usdToSypExchangeRate != null) {
        setExchangeRate(response.data.data.usdToSypExchangeRate);
      }
    },
    []
  );

  return {
    exchangeRate,
    isLoading,
    error,
    refetch: fetchRate,
    updateExchangeRate
  };
}
