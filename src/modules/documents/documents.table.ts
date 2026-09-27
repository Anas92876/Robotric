import { index, integer, pgEnum, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { idRef, primaryId } from '../../shared/db/ids';
import { timestamps } from '../../shared/db/columns';
import { users } from '../users/users.table';

export const DOCUMENT_TYPES = ['national_id', 'official_photo', 'civil_registry', 'family_record', 'travel_permission'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];
export const documentType = pgEnum('student_document_type', DOCUMENT_TYPES);
export const verificationStatus = pgEnum('document_verification_status', ['pending', 'verified', 'rejected']);

/**
 * Official papers a student uploads for WRO competitions (ID, photo, ...).
 * One per type; uploading again replaces it. Files are private — the old
 * backend exposed them through public links.
 */
export const studentDocuments = pgTable(
  'student_documents',
  {
    id: primaryId(),
    studentId: idRef('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    documentType: documentType('document_type').notNull(),
    storagePath: text('storage_path').notNull(),
    originalName: text('original_name').notNull(),
    fileSize: integer('file_size').notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    verificationStatus: verificationStatus('verification_status').notNull().default('pending'),
    verificationNote: text('verification_note'),
    verifiedById: idRef('verified_by_id').references(() => users.id, { onDelete: 'set null' }),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [index('student_documents_student_type_idx').on(t.studentId, t.documentType), index('student_documents_status_idx').on(t.verificationStatus, t.createdAt)],
);

export type StudentDocumentRow = typeof studentDocuments.$inferSelect;
