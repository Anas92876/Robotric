import {
  type AnyPgColumn,
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { idRef, primaryId } from '../../shared/db/ids';
import { timestamps } from '../../shared/db/columns';
import { users } from '../users/users.table';

// The old schema accepted both casings, and existing clients send either.
export const COURSE_LEVELS = ['beginner', 'intermediate', 'advanced', 'Beginner', 'Intermediate', 'Advanced'] as const;
export const COURSE_STATUSES = ['draft', 'published', 'archived'] as const;
export const COURSE_TYPES = ['single', 'bundle'] as const;

export const courseLevel = pgEnum('course_level', COURSE_LEVELS);
export const courseStatus = pgEnum('course_status', COURSE_STATUSES);
export const courseType = pgEnum('course_type', COURSE_TYPES);

export interface SyllabusItem {
  _id: string;
  title?: string;
  description?: string;
  duration?: number;
  order?: number;
}

export const courses = pgTable(
  'courses',
  {
    id: primaryId(),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description').notNull(),
    instructorId: idRef('instructor_id').references(() => users.id, { onDelete: 'set null' }),
    duration: varchar('duration', { length: 50 }).notNull(),
    totalHours: doublePrecision('total_hours').notNull().default(0),
    price: doublePrecision('price').notNull(),
    thumbnail: text('thumbnail'),
    category: varchar('category', { length: 100 }).notNull(),
    level: courseLevel('level').notNull(),
    status: courseStatus('status').notNull().default('draft'),
    startDate: timestamp('start_date', { withTimezone: true }),
    endDate: timestamp('end_date', { withTimezone: true }),
    maxStudents: integer('max_students'),
    enrolledStudents: integer('enrolled_students').notNull().default(0),
    syllabus: jsonb('syllabus').$type<SyllabusItem[]>().notNull().default([]),
    prerequisites: text('prerequisites').array().notNull().default([]),
    objectives: text('objectives').array().notNull().default([]),
    learningOutcomes: text('learning_outcomes').array().notNull().default([]),
    tags: text('tags').array().notNull().default([]),
    isActive: boolean('is_active').notNull().default(true),
    wroDocumentsRequired: boolean('wro_documents_required').notNull().default(false),
    type: courseType('type').notNull().default('single'),
    bundlePrice: doublePrecision('bundle_price'),
    /**
     * A sub-course points at its bundle. This single column replaces the old
     * pair `parentBundle` + `bundleCourses[]`, which had to be kept in sync by
     * hand; a bundle's courses are simply the rows pointing at it.
     */
    parentBundleId: idRef('parent_bundle_id').references((): AnyPgColumn => courses.id, { onDelete: 'set null' }),
    /** When the course joined its bundle — keeps the bundle's list in the order courses were added. */
    bundleLinkedAt: timestamp('bundle_linked_at', { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    index('courses_instructor_status_idx').on(t.instructorId, t.status),
    index('courses_category_level_idx').on(t.category, t.level),
    index('courses_parent_bundle_idx').on(t.parentBundleId),
    index('courses_type_idx').on(t.type),
  ],
);

export type CourseRow = typeof courses.$inferSelect;
export type NewCourseRow = typeof courses.$inferInsert;
export type CourseLevel = (typeof COURSE_LEVELS)[number];
export type CourseStatus = (typeof COURSE_STATUSES)[number];
