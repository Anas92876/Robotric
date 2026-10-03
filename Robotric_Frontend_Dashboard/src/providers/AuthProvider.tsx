import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User, LoginRequest } from '../types/auth.types';
import type { AuthState } from '../types/auth.types';
import { UserRole } from '../types/auth.types';
import { ROUTES } from '../constants/routes.constants';
import { api } from '../lib/api';
import { redirectToPublicHome } from '../lib/publicSite';

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider component that manages authentication state and provides
 * authentication methods to child components via context.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('token');
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: hasToken, // Only show loading state if there's a token to validate
    error: null,
  });

  const navigate = useNavigate();

  // useEffect moved below after refreshUser is declared

  /**
   * Refresh the current user's data
   */
  const refreshUser = useCallback(async () => {
    // Skip auth check if no token exists — avoids unnecessary API call for public visitors
    const token = localStorage.getItem('token');
    if (!token) {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      return;
    }

    try {
      const response = await api.get('/auth/me');
      // ✅ البيانات في response.data.data
      const user = response.data.data;
      setState({
        user: user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      // إذا كان 401، المستخدم غير مسجل دخول
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: 'Not authenticated',
        });
      } else {
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: error.response?.data?.error?.message || 'Failed to get user',
        });
      }
    }
  }, []);

  // On app load, fetch user from cookie-backed session
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  /**
   * Handle user login
   */
  const login = async (credentials: LoginRequest) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await api.post('/auth/login', credentials);
      
      // ✅ المهم: البيانات الآن في response.data.data
      const { token, ...userData } = response.data.data;
      
      // حفظ الـ token في localStorage
      if (token) {
        try {
          localStorage.setItem('token', token);
          console.log('💾 [AuthProvider] Token saved to localStorage');
        } catch (e) {
          console.warn('⚠️ [AuthProvider] Could not save token to localStorage:', e);
        }
      }
      
      // حفظ بيانات المستخدم (اختياري)
      try {
        localStorage.setItem('user', JSON.stringify(userData));
      } catch (e) {
        console.warn('⚠️ [AuthProvider] Could not save user to localStorage:', e);
      }
      
      await refreshUser();

      // Redirect based on user role
      const userRole = userData?.role || response.data.data?.role;
      if (userRole === UserRole.STUDENT || userRole === 'student') {
        navigate('/student');
      } else {
        navigate(ROUTES.DASHBOARD);
      }
    } catch (error: any) {
      // معالجة الأخطاء
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          'Login failed. Please check your credentials.';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw new Error(errorMessage);
    }
  };

  /**
   * Handle user logout
   */
  const logout = async () => {
    try {
      // Logout الآن يتطلب authentication
      await api.post('/auth/logout');
    } catch (error: any) {
      // حتى لو فشل (مثلاً token منتهي)، نكمل عملية الـ logout محلياً
      console.warn('Logout request failed:', error);
    } finally {
      // دائماً احذف البيانات المحلية
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      
      // إعادة توجيه للصفحة الرئيسية (الموقع العام)
      redirectToPublicHome();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isLoading: state.isLoading,
        error: state.error,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to access the auth context
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

