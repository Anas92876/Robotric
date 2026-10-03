import { index, integer, pgEnum, pgTable, text, varchar } from 'drizzle-orm/pg-core';
import { idRef, primaryId } from '../../shared/db/ids';
import { timestamps } from '../../shared/db/columns';
import { groups } from '../groups/groups.table';
import { studentProjects } from '../student-projects/student-projects.table';
import { users } from '../users/users.table';

export const galleryType = pgEnum('gallery_type', ['moment', 'project']);

/**
 * A photo in a group's gallery: a class "moment" (trainer or reception) or a
 * student project photo. Photos of students are private; links are signed on
 * read. Reception can post one photo to several groups, so rows may share a
 * storage path (the file is removed with the last row).
 */
export const galleryImages = pgTable(
  'gallery_images',
  {
    id: primaryId(),
    groupId: idRef('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    type: galleryType('type').notNull(),
    uploadedById: idRef('uploaded_by_id').references(() => users.id, { onDelete: 'set null' }),
    storagePath: text('storage_path').notNull(),
    studentId: idRef('student_id').references(() => users.id, { onDelete: 'set null' }),
    projectId: idRef('project_id').references(() => studentProjects.id, { onDelete: 'set null' }),
    title: varchar('title', { length: 200 }),
    description: varchar('description', { length: 2000 }),
    order: integer('order').notNull().default(0),
    ...timestamps(),
  },
  (t) => [
    index('gallery_images_group_type_idx').on(t.groupId, t.type),
    index('gallery_images_uploader_idx').on(t.uploadedById),
    index('gallery_images_path_idx').on(t.storagePath),
  ],
);

export type GalleryImageRow = typeof galleryImages.$inferSelect;
export type NewGalleryImageRow = typeof galleryImages.$inferInsert;
