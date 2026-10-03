/**
 * Resource Type Definitions
 * Two-Phase System: Upload → Assign
 */

// ============================================
// Enums & Types
// ============================================

export type ResourceCategory = 
  | 'lecture'
  | 'assignment'
  | 'lab'
  | 'exam'
  | 'reference'
  | 'other';

export type ResourceStatus = 
  | 'active'
  | 'archived'
  | 'deleted';

// ============================================
// Main Resource Interface
// ============================================

export interface Resource {
  _id: string;
  title: string;
  description: string;
  originalName: string;
  storagePath: string;
  fileSize: number;
  mimeType: string;
  category: ResourceCategory;
  courseId: {
    _id: string;
    title: string;
    category?: string;
    level?: string;
  };
  uploadedBy: {
    _id: string;
    name: string;
    email?: string;
  };
  status: ResourceStatus;
  assignments?: AssignmentSummary;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Assignment Types
// ============================================

export interface AssignmentSummary {
  groupCount: number;
  sessionCount: number;
  details: AssignmentDetail[];
}

export interface AssignmentSession {
  sessionId: string;
  sessionNumber: number;
  title: string;
  scheduledDate?: string;
}

export interface AssignmentDetail {
  groupId: string;
  groupName: string;
  sessions: AssignmentSession[];
}

export interface ResourceAssignment {
  _id: string;
  resourceId: string;
  groupId: string;
  sessionId: string;
  assignedBy: string;
  assignedAt: string;
  isVisible: boolean;
  notes?: string;
}

// ============================================
// Form Data Types (Phase 1: Upload)
// ============================================

export interface ResourceUploadFormData {
  file: File | null;
  title: string;
  description: string;
  courseId: string;
}

// Alias for new two-phase system
export type UploadFormData = ResourceUploadFormData;

// ============================================
// Form Data Types (Phase 2: Assignment)
// ============================================

export interface AssignmentFormData {
  resourceId: string;
  assignments: GroupAssignment[];
}

export interface GroupAssignment {
  groupId: string;
  sessionIds: string[];
}

// ============================================
// Assignment Modal State
// ============================================

export interface AssignmentModalState {
  selectedGroups: Map<string, SelectedGroup>;
  allGroups: Group[];
  groupSessions: Map<string, Session[]>;
  loadingGroups: boolean;
  loadingSessions: Map<string, boolean>;
}

export interface SelectedGroup {
  groupId: string;
  groupName: string;
  studentsCount: number;
  trainerName: string;
  selectedSessionIds: Set<string>;
}

export interface Group {
  _id: string;
  name: string;
  courseId: string;
  students: string[];
  trainerId: {
    _id: string;
    name: string;
  };
}

export interface Session {
  _id: string;
  title: string;
  sessionNumber: number;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  groupId: string;
  courseId: string;
}

// ============================================
// API Response Types
// ============================================

export interface ResourceUploadResponse {
  success: boolean;
  message: string;
  data: Resource;
}

export interface ResourceListResponse {
  success: boolean;
  count: number;
  data: Resource[];
}

export interface AssignmentResponse {
  success: boolean;
  message: string;
  data: {
    assignmentsCreated: number;
    totalGroups: number;
    totalSessions: number;
  };
}

export interface ResourceViewerData {
  viewerUrl: string;
  expiresIn: number;
  title: string;
  filename: string;
}

export interface ResourceViewerResponse {
  success: boolean;
  message?: string;
  data: ResourceViewerData;
}

// ============================================
// UI State Types
// ============================================

export interface ResourceFilters {
  courseId: string;
  category: string;
  search: string;
}
