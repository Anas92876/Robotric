/**
 * User role types for role-based access control
 */
export type UserRole = 'admin' | 'superadmin' | 'judge' | 'editor' | 'organizer' | 'student' | 'trainer' | 'teacher' | 'reception' | 'clo' | 'social' | 'team_lead' | 'member' | 'guest' | 'cto' | 'engineer' | 'driver' | 'client';

export const UserRole = {
  ADMIN: 'admin' as const,
  SUPERADMIN: 'superadmin' as const,
  JUDGE: 'judge' as const,
  EDITOR: 'editor' as const,
  ORGANIZER: 'organizer' as const,
  STUDENT: 'student' as const,
  TRAINER: 'trainer' as const,
  TEACHER: 'teacher' as const, // Alias for trainer
  RECEPTION: 'reception' as const, // Reception/Front desk staff
  CLO: 'clo' as const, // Chief Learning Officer
  SOCIAL: 'social' as const, // Content creator / Social media manager
  TEAM_LEAD: 'team_lead' as const,
  MEMBER: 'member' as const,
  GUEST: 'guest' as const,
  CTO: 'cto' as const,
  ENGINEER: 'engineer' as const,
  DRIVER: 'driver' as const,
  CLIENT: 'client' as const, // External client — submits task requests, no internal-tool access
} as const;

/**
 * User interface representing the authenticated user
 */
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  teamId?: string;
  createdAt?: string;
  updatedAt?: string;
  _id?: string;
}

/**
 * Authentication state interface
 */
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Login request payload
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Registration request payload
 */
export interface RegisterRequest extends LoginRequest {
  name: string;
  teamId?: string;
}

/**
 * Authentication response from the API
 */
export interface AuthResponse {
  user: User;
  token: string;
  expiresIn: number;
}

