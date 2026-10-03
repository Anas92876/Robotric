/**
 * Evaluation Type Definitions
 *
 * TypeScript interfaces for the student evaluation system
 *
 * @types Evaluation
 * @version 1.0.0
 */

/**
 * Skill ratings (1-5 for each skill)
 */
export interface SkillRatings {
  technicalSkills: number;
  problemSolving: number;
  creativity: number;
  teamwork: number;
  communication: number;
}

/**
 * Attendance information
 */
export interface Attendance {
  status: 'present' | 'late' | 'absent' | 'excused';
  arrivalTime?: Date | string;
  departureTime?: Date | string;
  notes?: string;
}

/**
 * Participation metrics
 */
export interface Participation {
  level: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  contributionQuality: number; // 1-5
  questionsAsked?: number;
  helpedPeers?: boolean;
}

/**
 * Comprehension assessment
 */
export interface Comprehension {
  level: 'struggling' | 'needs_support' | 'adequate' | 'good' | 'excellent';
  conceptsUnderstood?: string[];
  conceptsNeedingWork?: string[];
  notes?: string;
}

/**
 * Behavioral assessment
 */
export interface Behavior {
  engagement: 'distracted' | 'passive' | 'engaged' | 'very_engaged' | 'exceptional';
  attitude: 'negative' | 'neutral' | 'positive' | 'enthusiastic';
  focus: number; // 1-5
  respectful?: boolean;
  followsInstructions?: boolean;
  notes?: string;
}

/**
 * Achievement record
 */
export interface Achievement {
  title: string;
  description?: string;
  category: 'technical' | 'collaboration' | 'creativity' | 'leadership' | 'improvement' | 'other';
}

/**
 * Improvement area
 */
export interface Improvement {
  area: string;
  suggestion?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Homework assignment
 */
export interface Homework {
  assigned: boolean;
  title?: string;
  description?: string;
  dueDate?: Date | string;
  estimatedHours?: number;
}

/**
 * Trainer notes
 */
export interface TrainerNotes {
  strengths?: string;
  weaknesses?: string;
  generalNotes?: string;
  privateNotes?: string; // Not shared with student/parent
}

/**
 * Progress tracking
 */
export interface Progress {
  comparedToPrevious: 'declined' | 'no_change' | 'slight_improvement' | 'good_improvement' | 'excellent_improvement';
  onTrack: boolean;
  notes?: string;
}

/**
 * Flags and alerts
 */
export interface EvaluationFlags {
  needsAttention?: boolean;
  excelling?: boolean;
  atRisk?: boolean;
  parentContactNeeded?: boolean;
}

/**
 * Visibility and sharing settings
 */
export interface Visibility {
  sharedWithStudent: boolean;
  sharedWithParent: boolean;
  sharedAt?: Date | string;
}

/**
 * Student reference (populated)
 */
export interface StudentRef {
  _id: string;
  name: string;
  email: string;
}

/**
 * Session reference (populated)
 */
export interface SessionRef {
  _id: string;
  title: string;
  scheduledDate: Date | string;
  type?: string;
  sessionNumber?: number;
}

/**
 * Group reference (populated)
 */
export interface GroupRef {
  _id: string;
  name: string;
}

/**
 * Complete student evaluation
 */
export interface StudentEvaluation {
  _id: string;
  studentId: string | StudentRef;
  trainerId: string;
  sessionId: string | SessionRef;
  groupId: string | GroupRef;
  overallRating: number; // 1-5
  skillRatings: SkillRatings;
  attendance: Attendance;
  participation: Participation;
  comprehension: Comprehension;
  behavior: Behavior;
  achievements: Achievement[];
  improvements: Improvement[];
  homework: Homework;
  trainerNotes: TrainerNotes;
  progress: Progress;
  recommendations: string[];
  flags: EvaluationFlags;
  visibility: Visibility;
  evaluationDate: Date | string;
  lastModified: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;

  // Virtuals (computed fields)
  averageSkillRating?: number;
  performanceScore?: number;
  participationScore?: number;
  needsReview?: boolean;
}

/**
 * Evaluation creation/update input
 */
export interface EvaluationInput {
  studentId: string;
  sessionId: string;
  groupId: string;
  overallRating: number;
  skillRatings?: Partial<SkillRatings>;
  attendance?: Partial<Attendance>;
  participation?: Partial<Participation>;
  comprehension?: Partial<Comprehension>;
  behavior?: Partial<Behavior>;
  achievements?: Achievement[];
  improvements?: Improvement[];
  homework?: Partial<Homework>;
  trainerNotes?: Partial<TrainerNotes>;
  progress?: Partial<Progress>;
  recommendations?: string[];
  flags?: Partial<EvaluationFlags>;
}

/**
 * Filters for querying evaluations
 */
export interface EvaluationFilters {
  studentId?: string;
  sessionId?: string;
  groupId?: string;
  minRating?: number;
  maxRating?: number;
  needsAttention?: boolean;
  atRisk?: boolean;
  excelling?: boolean;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Session evaluations response
 */
export interface SessionEvaluationsData {
  evaluations: StudentEvaluation[];
  unevaluatedStudents: StudentRef[];
  stats: {
    totalStudents: number;
    evaluated: number;
    pending: number;
  };
}

/**
 * Student statistics
 */
export interface StudentStats {
  totalEvaluations: number;
  averageRating: string | number;
  averagePerformanceScore: number;
  averageSkillRating: string | number;
  attendanceRate: number;
  averageParticipation: string | number;
}

/**
 * Progress data point
 */
export interface ProgressDataPoint {
  date: Date | string;
  sessionDate?: Date | string;
  overallRating: number;
  performanceScore: number;
  skillRatings: SkillRatings;
  participation: number;
  comprehension: string;
}

/**
 * Student progress response
 */
export interface StudentProgressData {
  evaluations: StudentEvaluation[];
  stats: StudentStats;
  progress: ProgressDataPoint[];
}

/**
 * Evaluation statistics
 */
export interface EvaluationStats {
  total: number;
  averageRating: string | number;
  averagePerformanceScore: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  attendanceRate: number;
  flaggedStudents: {
    needsAttention: number;
    atRisk: number;
    excelling: number;
  };
}

/**
 * Flagged student data
 */
export interface FlaggedStudent {
  student: StudentRef;
  group: GroupRef;
  evaluations: StudentEvaluation[];
  flags: {
    needsAttention: boolean;
    atRisk: boolean;
    parentContactNeeded: boolean;
  };
}

/**
 * Bulk evaluation input
 */
export interface BulkEvaluationInput {
  sessionId: string;
  evaluations: EvaluationInput[];
}

/**
 * Share evaluation input
 */
export interface ShareEvaluationInput {
  shareWithStudent?: boolean;
  shareWithParent?: boolean;
}

/**
 * API response wrapper
 */
export interface EvaluationResponse<T = StudentEvaluation> {
  success: boolean;
  message?: string;
  data: T;
}

/**
 * Paginated response
 */
export interface PaginatedEvaluationResponse {
  success: boolean;
  data: StudentEvaluation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/**
 * Quick evaluation (minimal fields)
 */
export interface QuickEvaluationInput {
  studentId: string;
  sessionId: string;
  groupId: string;
  overallRating: number;
  attendance: {
    status: Attendance['status'];
  };
}

/**
 * Evaluation form state
 */
export interface EvaluationFormState extends EvaluationInput {
  isSubmitting?: boolean;
  errors?: Record<string, string>;
}

/**
 * Evaluation list item (simplified for lists)
 */
export interface EvaluationListItem {
  _id: string;
  student: StudentRef;
  session: SessionRef;
  overallRating: number;
  performanceScore: number;
  attendance: Attendance['status'];
  evaluationDate: Date | string;
  flags: EvaluationFlags;
}

/**
 * Rating labels
 */
export const RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Below Average',
  3: 'Average',
  4: 'Good',
  5: 'Excellent'
};

/**
 * Participation level labels
 */
export const PARTICIPATION_LABELS: Record<Participation['level'], string> = {
  very_low: 'Very Low',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  very_high: 'Very High'
};

/**
 * Comprehension level labels
 */
export const COMPREHENSION_LABELS: Record<Comprehension['level'], string> = {
  struggling: 'Struggling',
  needs_support: 'Needs Support',
  adequate: 'Adequate',
  good: 'Good',
  excellent: 'Excellent'
};

/**
 * Engagement level labels
 */
export const ENGAGEMENT_LABELS: Record<Behavior['engagement'], string> = {
  distracted: 'Distracted',
  passive: 'Passive',
  engaged: 'Engaged',
  very_engaged: 'Very Engaged',
  exceptional: 'Exceptional'
};

/**
 * Attitude labels
 */
export const ATTITUDE_LABELS: Record<Behavior['attitude'], string> = {
  negative: 'Negative',
  neutral: 'Neutral',
  positive: 'Positive',
  enthusiastic: 'Enthusiastic'
};

/**
 * Progress comparison labels
 */
export const PROGRESS_LABELS: Record<Progress['comparedToPrevious'], string> = {
  declined: 'Declined',
  no_change: 'No Change',
  slight_improvement: 'Slight Improvement',
  good_improvement: 'Good Improvement',
  excellent_improvement: 'Excellent Improvement'
};

/**
 * Achievement category labels
 */
export const ACHIEVEMENT_CATEGORY_LABELS: Record<Achievement['category'], string> = {
  technical: 'Technical',
  collaboration: 'Collaboration',
  creativity: 'Creativity',
  leadership: 'Leadership',
  improvement: 'Improvement',
  other: 'Other'
};

/**
 * Priority labels
 */
export const PRIORITY_LABELS: Record<Improvement['priority'], string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical'
};

