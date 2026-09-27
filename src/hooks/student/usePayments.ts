import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';

export interface Payment {
  _id: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'online';
  transactionId?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paidAt?: string;
  receipt: {
    receiptNumber?: string;
    receiptUrl?: string;
    generatedAt?: string;
  };
  installmentNumber?: number;
  notes?: string;
  createdAt: string;
  type?: 'course' | 'transportation'; // Receipt type
  course?: {
    _id: string;
    title: string;
  };
}

export interface PaymentSummary {
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  totalPayments: number;
  completedPayments: number;
  pendingPayments: number;
  overduePayments: number;
  nextPaymentDue?: {
    amount: number;
    dueDate: string;
    isOverdue: boolean;
  };
  // Transportation summary
  transportationTotal?: number;
  transportationPaid?: number;
  transportationRemaining?: number;
  transportationPendingPayments?: number;
  transportationOverduePayments?: number;
  transportationNextPaymentDue?: {
    amount: number;
    dueDate: string;
    isOverdue: boolean;
  };
}

export interface InitiatePaymentData {
  enrollmentId: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'bank_transfer';
  installmentNumber?: number;
}

interface UsePaymentsReturn {
  payments: Payment[];
  summary: PaymentSummary | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  downloadReceipt: (paymentId: string) => Promise<void>;
  initiatePayment: (data: InitiatePaymentData) => Promise<any>;
  confirmPayment: (paymentId: string, transactionId: string) => Promise<void>;
}

export const usePayments = (courseId?: string): UsePaymentsReturn => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (courseId) {
        // Fetch payments for a specific course
        const response = await api.get(`/student/payments/courses/${courseId}`);
        setPayments(response.data.data || []);
      } else {
        // Fetch all payments and summary
        const [paymentsRes, summaryRes] = await Promise.all([
          api.get('/student/payments'),
          api.get('/student/payments/summary'),
        ]);

        setPayments(paymentsRes.data.data || []);
        setSummary(summaryRes.data.data || null);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 
                          err.response?.data?.message || 
                          'Failed to fetch payments';
      setError(errorMessage);
      console.error('Error fetching payments:', err);
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const downloadReceipt = useCallback(async (paymentId: string) => {
    try {
      const response = await api.get(`/student/payments/${paymentId}/receipt`, {
        responseType: 'blob',
      });

      // Create blob URL
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Extract filename from Content-Disposition header or use fallback
      const contentDisposition = response.headers['content-disposition'];
      let filename = `receipt-${paymentId}.pdf`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        } else {
          // Try without quotes
          const filenameMatch2 = contentDisposition.match(/filename=(.+)/);
          if (filenameMatch2) {
            filename = filenameMatch2[1];
          }
        }
      }
      
      // Create download link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (err: any) {
      console.error('Error downloading receipt:', err);
      const errorMessage = err.response?.data?.error?.message || 
                          err.response?.data?.message || 
                          'Failed to download receipt';
      throw new Error(errorMessage);
    }
  }, []);

  const initiatePayment = useCallback(async (data: InitiatePaymentData) => {
    try {
      const response = await api.post('/student/payments/initiate', data);
      // Refresh payments after initiating
      await fetchPayments();
      return response.data.data;
    } catch (err: any) {
      console.error('Error initiating payment:', err);
      throw new Error(err.response?.data?.message || 'Failed to initiate payment');
    }
  }, [fetchPayments]);

  const confirmPayment = useCallback(async (paymentId: string, transactionId: string) => {
    try {
      await api.post(`/student/payments/${paymentId}/confirm`, { transactionId });
      // Refresh payments after confirmation
      await fetchPayments();
    } catch (err: any) {
      console.error('Error confirming payment:', err);
      throw new Error(err.response?.data?.message || 'Failed to confirm payment');
    }
  }, [fetchPayments]);

  return {
    payments,
    summary,
    isLoading,
    error,
    refetch: fetchPayments,
    downloadReceipt,
    initiatePayment,
    confirmPayment,
  };
};
