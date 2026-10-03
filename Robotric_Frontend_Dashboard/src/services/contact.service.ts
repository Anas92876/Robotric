/**
 * Contact API Service
 * 
 * Handles contact form submissions and management
 */

import { api } from '../lib/api';

// ==================== Types ====================

export interface Contact {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  location?: string;
  who?: 'student' | 'parent' | 'business-owner' | 'other';
  otherType?: string;
  subject: string;
  message?: string;
  status: 'new' | 'read' | 'replied' | 'archived';
  convertedToLead?: string | {
    _id: string;
    fullName: string;
    mobileNumber: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ContactFormData {
  name: string;
  phone: string;
  email?: string;
  location?: string;
  who?: 'student' | 'parent' | 'business-owner' | 'other';
  otherType?: string;
  subject: string;
  message?: string;
}

export interface ContactFilters {
  page?: number;
  limit?: number;
  status?: 'new' | 'read' | 'replied' | 'archived';
  search?: string;
  fromDate?: string;
  toDate?: string;
}

export interface ContactResponse {
  success?: boolean;
  data: Contact[];
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
  stats: {
    total: number;
    new: number;
    read: number;
    replied: number;
    archived: number;
  };
}

export interface UpdateContactData {
  status?: 'new' | 'read' | 'replied' | 'archived';
  convertedToLead?: string;
}

// ==================== API Functions ====================

/**
 * Submit contact form (Public)
 */
export const submitContact = async (data: ContactFormData): Promise<{ success: boolean; message: string; data: Partial<Contact> }> => {
  const response = await api.post('/contact', data, {
    skipAuth: true, // Public endpoint
    skipErrorToast: false
  });
  return response.data;
};

/**
 * Get all contacts (Reception only)
 */
export const getAllContacts = async (filters?: ContactFilters): Promise<ContactResponse> => {
  const params = new URLSearchParams();
  
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.status) params.append('status', filters.status);
  if (filters?.search) params.append('search', filters.search);
  if (filters?.fromDate) params.append('fromDate', filters.fromDate);
  if (filters?.toDate) params.append('toDate', filters.toDate);

  const response = await api.get(`/reception/contacts?${params.toString()}`);
  return response.data;
};

/**
 * Get contact by ID (Reception only)
 */
export const getContactById = async (id: string): Promise<Contact> => {
  const response = await api.get(`/reception/contacts/${id}`);
  return response.data.data;
};

/**
 * Update contact (Reception only)
 */
export const updateContact = async (id: string, data: UpdateContactData): Promise<{ success: boolean; message: string; data: Contact }> => {
  const response = await api.put(`/reception/contacts/${id}`, data);
  return response.data;
};

/**
 * Delete contact (Reception only)
 */
export const deleteContact = async (id: string): Promise<{ message: string }> => {
  const response = await api.delete(`/reception/contacts/${id}`);
  return response.data;
};
