/**
 * Custom hook for managing users in reception dashboard
 *
 * Provides CRUD operations for users:
 * - Fetch all users with pagination and filters
 * - Create new user (student/trainer)
 * - Update existing user
 * - Delete user permanently (hard delete)
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';

/**
 * User interface
 */
export interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
  role: string;
  profile?: {
    phone?: string;
    status?: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Pagination information
 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

/**
 * Filters for user search
 */
export interface UserFilters {
  role?: string;
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

/**
 * Create user request payload
 */
export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: string;
  phone?: string;
}

/**
 * Update user request payload
 */
export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
  phone?: string;
}

/**
 * Return type for the hook
 */
interface UseReceptionUsersReturn {
  users: User[];
  pagination: Pagination | null;
  isLoading: boolean;
  error: string | null;
  filters: UserFilters;
  setFilters: (filters: UserFilters) => void;
  fetchUsers: () => Promise<void>;
  createUser: (userData: CreateUserRequest) => Promise<void>;
  updateUser: (userId: string, userData: UpdateUserRequest) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
}

/**
 * Hook to manage users with CRUD operations
 *
 * @returns Users list, pagination, CRUD functions, loading state, and error
 *
 * @example
 * const { users, createUser, updateUser, deleteUser } = useReceptionUsers();
 */
export const useReceptionUsers = (): UseReceptionUsersReturn => {
  // State management
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<UserFilters>({
    page: 1,
    limit: 20
  });

  /**
   * Fetch users from API with current filters
   */
  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();
      if (filters.role) params.append('role', filters.role);
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());

      // Fetch users from reception endpoint
      const response = await api.get(`/reception/users?${params.toString()}`);

      // Set users and pagination from response
      setUsers(response.data.data || []);
      setPagination(response.data.pagination || null);
    } catch (err: any) {
      // Handle errors
      const errorMessage = err.response?.data?.error?.message || 
                          err.response?.data?.message || 
                          'Failed to fetch users';
      setError(errorMessage);
      console.error('Error fetching users:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  /**
   * Create a new user
   *
   * @param userData - User data including name, email, password, role, phone
   */
  const createUser = useCallback(async (userData: CreateUserRequest) => {
    try {
      setError(null);

      // Send POST request to create user
      await api.post('/reception/users', userData);

      // Refresh user list after creation
      await fetchUsers();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 
                          err.response?.data?.message || 
                          'Failed to create user';
      setError(errorMessage);
      console.error('Error creating user:', err);
      throw new Error(errorMessage); // Re-throw for form error handling
    }
  }, [fetchUsers]);

  /**
   * Update an existing user
   *
   * @param userId - User ID to update
   * @param userData - Updated user data
   */
  const updateUser = useCallback(async (userId: string, userData: UpdateUserRequest) => {
    try {
      setError(null);

      // Send PUT request to update user
      await api.put(`/reception/users/${userId}`, userData);

      // Refresh user list after update
      await fetchUsers();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 
                          err.response?.data?.message || 
                          'Failed to update user';
      setError(errorMessage);
      console.error('Error updating user:', err);
      throw new Error(errorMessage); // Re-throw for form error handling
    }
  }, [fetchUsers]);

  /**
   * Delete a user permanently (hard delete)
   * 
   * Security restrictions:
   * - Cannot delete admin or CLO users
   * - Only reception staff can delete users
   * - Backend validates user exists before deletion
   *
   * @param userId - User ID to delete
   */
  const deleteUser = useCallback(async (userId: string) => {
    try {
      setError(null);

      // Send DELETE request to permanently delete user
      await api.delete(`/reception/users/${userId}`);

      // Refresh user list after deletion
      await fetchUsers();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 
                          err.response?.data?.message || 
                          'Failed to delete user';
      setError(errorMessage);
      console.error('Error deleting user:', err);
      throw new Error(errorMessage); // Re-throw for error handling
    }
  }, [fetchUsers]);

  /**
   * Fetch users when filters change
   */
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    pagination,
    isLoading,
    error,
    filters,
    setFilters,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
  };
};
