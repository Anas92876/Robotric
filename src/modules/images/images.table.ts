import { boolean, index, integer, pgEnum, pgTable, text, varchar } from 'drizzle-orm/pg-core';
import { idRef, primaryId } from '../../shared/db/ids';
import { timestamps } from '../../shared/db/columns';
import { users } from '../users/users.table';

export const IMAGE_TYPES = ['profile', 'part', 'project', 'post', 'other'] as const;
export const imageType = pgEnum('image_type', IMAGE_TYPES);

/**
 * An uploaded picture (part photos, post covers, …) in the public images
 * bucket. The old backend kept these on the server's disk, which does not
 * survive on Vercel.
 */
export const images = pgTable(
  'images',
  {
    id: primaryId(),
    filename: text('filename').notNull(),
    originalname: text('originalname').notNull(),
    mimetype: varchar('mimetype', { length: 100 }).notNull(),
    size: integer('size').notNull(),
    storagePath: text('storage_path').notNull(),
    imageType: imageType('image_type').notNull(),
    /** The part / post / project / user the image belongs to (no foreign key: it can be any of them). */
    associatedId: idRef('associated_id'),
    associatedModel: varchar('associated_model', { length: 20 }),
    uploadedById: idRef('uploaded_by_id').references(() => users.id, { onDelete: 'set null' }),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps(),
  },
  (t) => [index('images_type_associated_idx').on(t.imageType, t.associatedId, t.createdAt)],
);

export type ImageRow = typeof images.$inferSelect;
