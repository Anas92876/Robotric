/**
 * Subscription API Service
 * 
 * Centralized API calls for subscription system:
 * - Subscription Plans (CLO)
 * - User Subscriptions (Reception)
 * - Session Requests (Student/Reception)
 * - Session Reports (Reception)
 */

import { api } from '../lib/api';

// ==================== Types ====================

export interface SubscriptionPlan {
  _id: string;
  name: string;
  monthlyHours: number;
  price: number;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSubscription {
  _id: string;
  userId: string | {
    _id: string;
    name: string;
    email: string;
  };
  planId: string | {
    _id: string;
    name: string;
    monthlyHours: number;
    price: number;
  };
  startsAt: string;
  endsAt: string;
  remainingHours: number;
  status: 'active' | 'expired' | 'canceled';
  canceledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionRequest {
  _id: string;
  userId: string | {
    _id: string;
    name: string;
    email: string;
  };
  date: string;
  startTime: string;
  durationHours: number;
  description?: string;
  status: 'pending' | 'approved' | 'declined' | 'canceled' | 'completed' | 'no_show';
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  declinedAt?: string;
  declinedBy?: string;
  declineReason?: string;
  canceledAt?: string;
  completedAt?: string;
}

export interface SessionReport {
  _id: string;
  sessionRequestId: string;
  sessionRequest?: {
    _id: string;
    date: string;
    startTime: string;
    durationHours: number;
    description?: string;
    status: string;
    userId: {
      _id: string;
      name: string;
      email: string;
    } | null;
  };
  notes: string;
  pdfUrl?: string;
  attendance: boolean;
  createdAt: string;
  createdBy?: {
    _id: string;
    name: string;
    email?: string;
  };
}

export interface CreateSubscriptionPlanRequest {
  name: string;
  monthlyHours: number;
  price: number;
  isActive?: boolean;
  description?: string;
}

export interface UpdateSubscriptionPlanRequest {
  name?: string;
  monthlyHours?: number;
  price?: number;
  isActive?: boolean;
  description?: string;
}

export interface CreateUserSubscriptionRequest {
  userId: string;
  planId: string;
  startsAt: string;
  endsAt: string;
}

export interface UpdateUserSubscriptionRequest {
  endsAt?: string;
  remainingHours?: number;
}

export interface CreateSessionRequestRequest {
  date: string;
  startTime: string;
  durationHours: number;
  description?: string;
}

export interface CreateSessionReportRequest {
  notes: string;
  attendance: boolean;
  pdf?: File;
}

// ==================== CLO - Subscription Plans ====================

/**
 * Get all subscription plans
 */
export const getSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  const response = await api.get<{ success: boolean; data: { plans: SubscriptionPlan[] } }>(
    '/clo/subscription-plans'
  );
  return response.data.data.plans;
};

/**
 * Get single subscription plan
 */
export const getSubscriptionPlan = async (id: string): Promise<SubscriptionPlan> => {
  const response = await api.get<{ success: boolean; data: SubscriptionPlan }>(
    `/clo/subscription-plans/${id}`
  );
  return response.data.data;
};

/**
 * Create subscription plan
 */
export const createSubscriptionPlan = async (
  data: CreateSubscriptionPlanRequest
): Promise<SubscriptionPlan> => {
  const response = await api.post<{ success: boolean; data: SubscriptionPlan }>(
    '/clo/subscription-plans',
    data
  );
  return response.data.data;
};

/**
 * Update subscription plan
 */
export const updateSubscriptionPlan = async (
  id: string,
  data: UpdateSubscriptionPlanRequest
): Promise<SubscriptionPlan> => {
  const response = await api.put<{ success: boolean; data: SubscriptionPlan }>(
    `/clo/subscription-plans/${id}`,
    data
  );
  return response.data.data;
};

/**
 * Delete subscription plan
 */
export const deleteSubscriptionPlan = async (id: string): Promise<void> => {
  await api.delete(`/clo/subscription-plans/${id}`);
};

// ==================== Reception - User Subscriptions ====================

/**
 * Get active subscription plans (for dropdown)
 */
export const getActiveSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  const response = await api.get<{ success: boolean; data: { plans: SubscriptionPlan[] } }>(
    '/reception/subscription-plans/active'
  );
  return response.data.data.plans;
};

/**
 * Get all user subscriptions
 */
export const getUserSubscriptions = async (params?: {
  status?: string;
  userId?: string;
}): Promise<UserSubscription[]> => {
  const response = await api.get<{ success: boolean; data: { subscriptions: UserSubscription[] } }>(
    '/reception/user-subscriptions',
    { params }
  );
  return response.data.data.subscriptions;
};

/**
 * Create user subscription
 */
export const createUserSubscription = async (
  data: CreateUserSubscriptionRequest
): Promise<UserSubscription> => {
  const response = await api.post<{ success: boolean; data: UserSubscription }>(
    '/reception/user-subscriptions',
    data
  );
  return response.data.data;
};

/**
 * Update user subscription
 */
export const updateUserSubscription = async (
  id: string,
  data: UpdateUserSubscriptionRequest
): Promise<UserSubscription> => {
  const response = await api.put<{ success: boolean; data: UserSubscription }>(
    `/reception/user-subscriptions/${id}`,
    data
  );
  return response.data.data;
};

/**
 * Cancel user subscription
 */
export const cancelUserSubscription = async (id: string): Promise<UserSubscription> => {
  const response = await api.post<{ success: boolean; data: UserSubscription }>(
    `/reception/user-subscriptions/${id}/cancel`
  );
  return response.data.data;
};

// ==================== Student - Session Requests ====================

/**
 * Get my subscription status
 */
export const getMySubscription = async (): Promise<{
  hasActiveSubscription: boolean;
  subscription: UserSubscription | null;
}> => {
  const response = await api.get<{ success: boolean; data: { hasActiveSubscription: boolean; subscription: UserSubscription | null } }>(
    '/subscriptions/me'
  );
  return response.data.data;
};

/**
 * Get my session requests
 */
export const getMySessionRequests = async (): Promise<SessionRequest[]> => {
  const response = await api.get<{ success: boolean; data: { requests: SessionRequest[] } }>(
    '/subscriptions/my-requests'
  );
  return response.data.data.requests;
};

/**
 * Create session request
 */
export const createSessionRequest = async (
  data: CreateSessionRequestRequest
): Promise<SessionRequest> => {
  const response = await api.post<{ success: boolean; data: SessionRequest }>(
    '/subscriptions/session-requests',
    data
  );
  return response.data.data;
};

/**
 * Cancel session request
 */
export const cancelSessionRequest = async (id: string): Promise<SessionRequest> => {
  const response = await api.post<{ success: boolean; data: SessionRequest }>(
    `/subscriptions/session-requests/${id}/cancel`
  );
  return response.data.data;
};

// ==================== Reception - Session Requests ====================

/**
 * Get all session requests
 */
export const getAllSessionRequests = async (params?: {
  status?: string;
}): Promise<SessionRequest[]> => {
  const response = await api.get<{ success: boolean; data: { requests: SessionRequest[] } }>(
    '/reception/session-requests',
    { params }
  );
  return response.data.data.requests;
};

/**
 * Approve session request
 */
export const approveSessionRequest = async (id: string): Promise<SessionRequest> => {
  const response = await api.post<{ success: boolean; data: SessionRequest }>(
    `/reception/session-requests/${id}/approve`
  );
  return response.data.data;
};

/**
 * Decline session request
 */
export const declineSessionRequest = async (
  id: string,
  reason?: string
): Promise<SessionRequest> => {
  const response = await api.post<{ success: boolean; data: SessionRequest }>(
    `/reception/session-requests/${id}/decline`,
    { reason }
  );
  return response.data.data;
};

// ==================== Reception - Session Reports ====================

/**
 * Create session report
 */
export const createSessionReport = async (
  sessionId: string,
  data: CreateSessionReportRequest
): Promise<SessionReport> => {
  const formData = new FormData();
  formData.append('notes', data.notes);
  formData.append('attendance', data.attendance.toString());
  if (data.pdf) {
    formData.append('pdf', data.pdf);
  }

  const response = await api.post<{ success: boolean; data: SessionReport }>(
    `/reception/session-requests/${sessionId}/report`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data.data;
};

/**
 * Get the report of one session request (reception).
 * Reception has no single-report endpoint, so it is picked from the full list.
 */
export const getSessionReport = async (sessionId: string): Promise<SessionReport | null> => {
  const reports = await getAllSessionReports();
  return reports.find((r) => r.sessionRequestId === sessionId) ?? null;
};

/**
 * Get all session reports (created by current reception user)
 */
export const getAllSessionReports = async (): Promise<SessionReport[]> => {
  const response = await api.get<{ success: boolean; data: { reports: SessionReport[] } }>(
    '/reception/session-reports'
  );
  return response.data.data.reports;
};
