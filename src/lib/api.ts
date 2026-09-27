import type { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import axios from 'axios';
import { redirectToLogin } from './publicSite';

// Define the shape of the error response from the API
export interface ApiErrorResponse {
  success?: boolean;
  message?: string;
  statusCode?: number;
  error?: {
    message: string;
    code?: string;
    statusCode: number;
    errors?: Array<{
      field: string;
      message: string;
    }>;
  };
  [key: string]: any;
}

// Extend AxiosRequestConfig to include our custom options
export interface ApiRequestConfig extends AxiosRequestConfig {
  skipErrorToast?: boolean;
  skipAuth?: boolean;
  signal?: AbortSignal; // Support for request cancellation
}

// Create axios instance with default config
const createApiClient = (): AxiosInstance => {
  const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE || '/api',
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    timeout: 30000, // 30 second timeout (reduced from 99999ms for better performance)
  });

  // Request interceptor for API calls
  api.interceptors.request.use(
    (config) => {
      // Skip adding auth token if skipAuth is set
      if ((config as ApiRequestConfig).skipAuth) {
        return config;
      }
      
      // Get token from localStorage and add to Authorization header
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor for API calls
  api.interceptors.response.use(
    (response: AxiosResponse) => {
      // Handle successful responses (status code 2xx)
      return response;
    },
    (error: AxiosError<ApiErrorResponse>) => {
      // Handle errors (status code 4xx/5xx)
      const { response, config } = error;
      const errorConfig = config as ApiRequestConfig;
      
      // Don't process errors for cancelled requests
      if (axios.isCancel(error)) {
        return Promise.reject(error);
      }
      
      // Normalize error format: backend now returns errors in response.data.error.message
      // Copy to response.data.message for backward compatibility with existing catch blocks
      if (response?.data) {
        if (response.data.error?.message && !response.data.message) {
          response.data.message = response.data.error.message;
        }
        // Also normalize statusCode if it's in the error object
        if (response.data.error?.statusCode && !response.data.statusCode) {
          response.data.statusCode = response.data.error.statusCode;
        }
      }
      
      // Skip error toast if explicitly requested
      const shouldShowToast = errorConfig?.skipErrorToast !== true;
      const errorMessage = response?.data?.message || 
                         error.message || 
                         'An unexpected error occurred';

      if (shouldShowToast) {
        // Log error to console
        console.error('API Error:', errorMessage);

        // Show a global toast if the ToastProvider has registered a handler
        if (typeof window !== 'undefined' && window.__ROBOTRICK_TOAST__) {
          window.__ROBOTRICK_TOAST__({
            type: 'error',
            title: 'Error',
            description: errorMessage,
          });
        }
      }

      // Handle specific status codes
      if (response?.status === 401) {
        // Remove authentication data from localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        redirectToLogin();
      }

      return Promise.reject(error);
    }
  );

  return api;
};

// Create the API client instance
const api = createApiClient();

/**
 * Set or clear the authentication token for API requests
 * @param token - The JWT token or undefined to clear the token
 */
export const setAuthToken = (token?: string): void => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

/**
 * Clear the authentication token
 */
export const clearAuthToken = (): void => {
  delete api.defaults.headers.common['Authorization'];
};

// Export the configured axios instance
export { api };

export const apiGet = <T = any>(
  url: string, 
  config?: ApiRequestConfig
): Promise<AxiosResponse<T>> => api.get<T>(url, config);

export const apiPost = <T = any, D = any>(
  url: string, 
  data?: D, 
  config?: ApiRequestConfig
): Promise<AxiosResponse<T>> => api.post<T>(url, data, config);

export const apiPut = <T = any, D = any>(
  url: string, 
  data?: D, 
  config?: ApiRequestConfig
): Promise<AxiosResponse<T>> => api.put<T>(url, data, config);

export const apiPatch = <T = any, D = any>(
  url: string, 
  data?: D, 
  config?: ApiRequestConfig
): Promise<AxiosResponse<T>> => api.patch<T>(url, data, config);

export const apiDelete = <T = any>(
  url: string, 
  config?: ApiRequestConfig
): Promise<AxiosResponse<T>> => api.delete<T>(url, config);

// Export axios instance type for type safety
export type { AxiosInstance, AxiosResponse, AxiosError };
