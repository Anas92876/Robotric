import { boolean, index, integer, jsonb, pgEnum, pgTable, primaryKey, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { idRef, primaryId } from '../../shared/db/ids';
import { timestamps } from '../../shared/db/columns';
import { courses } from '../courses/courses.table';
import { groups } from '../groups/groups.table';
import { sessions } from '../sessions/sessions.table';
import { users } from '../users/users.table';

// ---- Evaluation criteria (configured by the CLO) ----

export const PARAMETER_TYPES = ['rating', 'percentage', 'grade', 'boolean', 'text'] as const;
export const criteriaScope = pgEnum('criteria_scope', ['course', 'groups']);
export const criteriaStatus = pgEnum('criteria_status', ['active', 'inactive', 'archived']);

export interface RatingScale {
  min: number;
  max: number;
  labels?: Record<string, string>;
}
export interface CriteriaParameter {
  _id: string;
  name: string;
  description?: string;
  type: (typeof PARAMETER_TYPES)[number];
  ratingScale: RatingScale;
  weight: number;
  required: boolean;
  order: number;
}

export const evaluationCriteria = pgTable(
  'evaluation_criteria',
  {
    id: primaryId(),
    name: varchar('name', { length: 200 }).notNull(),
    description: varchar('description', { length: 500 }),
    appliesTo: criteriaScope('applies_to').notNull().default('course'),
    createdById: idRef('created_by_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    parameters: jsonb('parameters').$type<CriteriaParameter[]>().notNull().default([]),
    includeOverallRating: boolean('include_overall_rating').notNull().default(true),
    overallRatingScale: jsonb('overall_rating_scale').$type<{ min: number; max: number }>().notNull().default({ min: 1, max: 5 }),
    status: criteriaStatus('status').notNull().default('active'),
    ...timestamps(),
  },
  (t) => [index('evaluation_criteria_creator_idx').on(t.createdById, t.updatedAt), index('evaluation_criteria_status_idx').on(t.status)],
);

/** The courses a criteria set covers (the old `courseIds` array), in the order given. */
export const evaluationCriteriaCourses = pgTable(
  'evaluation_criteria_courses',
  {
    criteriaId: idRef('criteria_id')
      .notNull()
      .references(() => evaluationCriteria.id, { onDelete: 'cascade' }),
    courseId: idRef('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.criteriaId, t.courseId] }), index('evaluation_criteria_courses_course_idx').on(t.courseId)],
);

/** When `appliesTo` is 'groups': the groups it covers (the old `groupIds` array). */
export const evaluationCriteriaGroups = pgTable(
  'evaluation_criteria_groups',
  {
    criteriaId: idRef('criteria_id')
      .notNull()
      .references(() => evaluationCriteria.id, { onDelete: 'cascade' }),
    groupId: idRef('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.criteriaId, t.groupId] }), index('evaluation_criteria_groups_group_idx').on(t.groupId)],
);

// ---- Student evaluations (written by trainers after a session) ----

export interface SkillRatings {
  technicalSkills: number;
  problemSolving: number;
  creativity: number;
  teamwork: number;
  communication: number;
}
export interface EvalAttendance {
  status: 'present' | 'late' | 'absent' | 'excused';
  arrivalTime?: string;
  departureTime?: string;
  notes?: string;
}
export interface Participation {
  level: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  contributionQuality: number;
  questionsAsked: number;
  helpedPeers: boolean;
}
export interface Comprehension {
  level: 'struggling' | 'needs_support' | 'adequate' | 'good' | 'excellent';
  conceptsUnderstood: string[];
  conceptsNeedingWork: string[];
  notes?: string;
}
export interface Behavior {
  engagement: 'distracted' | 'passive' | 'engaged' | 'very_engaged' | 'exceptional';
  attitude: 'negative' | 'neutral' | 'positive' | 'enthusiastic';
  focus: number;
  respectful: boolean;
  followsInstructions: boolean;
  notes?: string;
}
export interface Achievement {
  _id: string;
  title: string;
  description?: string;
  category: 'technical' | 'collaboration' | 'creativity' | 'leadership' | 'improvement' | 'other';
}
export interface Improvement {
  _id: string;
  area: string;
  suggestion?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}
export interface Homework {
  assigned: boolean;
  title?: string;
  description?: string;
  dueDate?: string;
  estimatedHours?: number;
}
export interface TrainerNotes {
  strengths?: string;
  weaknesses?: string;
  generalNotes?: string;
  privateNotes?: string;
}
export interface EvalProgress {
  comparedToPrevious: 'declined' | 'no_change' | 'slight_improvement' | 'good_improvement' | 'excellent_improvement';
  onTrack: boolean;
  notes?: string;
}
/** A snapshot of the criteria used, so the score stays stable if the criteria change. */
export interface CriteriaMetadata {
  parametersConfig: { name: string; type: string; weight: number; ratingScale?: RatingScale }[];
  includeOverallRating: boolean;
  overallRatingScale: { min: number; max: number };
}

export const studentEvaluations = pgTable(
  'student_evaluations',
  {
    id: primaryId(),
    studentId: idRef('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    trainerId: idRef('trainer_id').references(() => users.id, { onDelete: 'set null' }),
    sessionId: idRef('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    groupId: idRef('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    overallRating: integer('overall_rating').notNull(),
    skillRatings: jsonb('skill_ratings').$type<SkillRatings>().notNull(),
    attendance: jsonb('attendance').$type<EvalAttendance>().notNull(),
    participation: jsonb('participation').$type<Participation>().notNull(),
    comprehension: jsonb('comprehension').$type<Comprehension>().notNull(),
    behavior: jsonb('behavior').$type<Behavior>().notNull(),
    achievements: jsonb('achievements').$type<Achievement[]>().notNull().default([]),
    improvements: jsonb('improvements').$type<Improvement[]>().notNull().default([]),
    homework: jsonb('homework').$type<Homework>().notNull(),
    trainerNotes: jsonb('trainer_notes').$type<TrainerNotes>().notNull().default({}),
    progress: jsonb('progress').$type<EvalProgress>().notNull(),
    recommendations: jsonb('recommendations').$type<string[]>().notNull().default([]),
    /** Values for the CLO-defined criteria parameters, keyed by parameter name. */
    parameters: jsonb('parameters').$type<Record<string, unknown>>().notNull().default({}),
    criteriaMetadata: jsonb('criteria_metadata').$type<CriteriaMetadata | null>(),
    needsAttention: boolean('needs_attention').notNull().default(false),
    excelling: boolean('excelling').notNull().default(false),
    atRisk: boolean('at_risk').notNull().default(false),
    parentContactNeeded: boolean('parent_contact_needed').notNull().default(false),
    sharedWithStudent: boolean('shared_with_student').notNull().default(false),
    sharedWithParent: boolean('shared_with_parent').notNull().default(false),
    sharedAt: timestamp('shared_at', { withTimezone: true }),
    evaluationDate: timestamp('evaluation_date', { withTimezone: true }).notNull().defaultNow(),
    lastModified: timestamp('last_modified', { withTimezone: true }).notNull().defaultNow(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('student_evaluations_session_student_unique').on(t.sessionId, t.studentId),
    index('student_evaluations_student_date_idx').on(t.studentId, t.evaluationDate),
    index('student_evaluations_trainer_session_idx').on(t.trainerId, t.sessionId),
    index('student_evaluations_group_date_idx').on(t.groupId, t.evaluationDate),
    index('student_evaluations_attention_idx').on(t.needsAttention),
  ],
);

export type CriteriaRow = typeof evaluationCriteria.$inferSelect;
export type StudentEvaluationRow = typeof studentEvaluations.$inferSelect;
export type NewStudentEvaluationRow = typeof studentEvaluations.$inferInsert;
