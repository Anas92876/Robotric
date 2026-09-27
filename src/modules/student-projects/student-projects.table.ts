import { doublePrecision, index, jsonb, pgEnum, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { idRef, primaryId } from '../../shared/db/ids';
import { timestamps } from '../../shared/db/columns';
import { courses } from '../courses/courses.table';
import { groups } from '../groups/groups.table';
import { users } from '../users/users.table';

export const studentProjectStatus = pgEnum('student_project_status', ['in_progress', 'completed', 'submitted']);
export const STUDENT_PROJECT_STATUSES = ['in_progress', 'completed', 'submitted'] as const;

/** A project photo in private storage (the old Cloudinary fields are rebuilt from it on read). */
export interface ProjectImage {
  _id: string;
  storagePath: string;
  order: number;
}

/**
 * A student's course project, created and graded by the group's trainer.
 * The old backend shared one collection with the inventory "projects"
 * (phase 6); they are separate tables now.
 */
export const studentProjects = pgTable(
  'student_projects',
  {
    id: primaryId(),
    title: varchar('title', { length: 200 }).notNull(),
    titleAr: varchar('title_ar', { length: 200 }),
    description: text('description'),
    descriptionAr: varchar('description_ar', { length: 5000 }),
    studentId: idRef('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    groupId: idRef('group_id').references(() => groups.id, { onDelete: 'set null' }),
    courseId: idRef('course_id').references(() => courses.id, { onDelete: 'set null' }),
    createdById: idRef('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    images: jsonb('images').$type<ProjectImage[]>().notNull().default([]),
    components: jsonb('components').$type<string[]>().notNull().default([]),
    technologies: jsonb('technologies').$type<string[]>().notNull().default([]),
    status: studentProjectStatus('status').notNull().default('in_progress'),
    grade: doublePrecision('grade'),
    feedback: varchar('feedback', { length: 5000 }),
    gradedAt: timestamp('graded_at', { withTimezone: true }),
    gradedById: idRef('graded_by_id').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps(),
  },
  (t) => [
    index('student_projects_student_idx').on(t.studentId),
    index('student_projects_group_idx').on(t.groupId, t.createdAt),
    index('student_projects_course_idx').on(t.courseId),
  ],
);

export type StudentProjectRow = typeof studentProjects.$inferSelect;
export type NewStudentProjectRow = typeof studentProjects.$inferInsert;
