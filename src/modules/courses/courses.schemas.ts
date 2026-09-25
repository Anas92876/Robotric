import { z } from 'zod';
import { newId } from '../../shared/db/ids';
import { booleanish, numeric } from '../../shared/http/validate';
import { COURSE_SORT_FIELDS } from './courses.repository';
import { COURSE_LEVELS, COURSE_STATUSES, COURSE_TYPES, type SyllabusItem } from './courses.table';

const stringList = z.array(z.string().trim()).catch([]);
const optionalDate = z.union([z.coerce.date(), z.null()]).optional();

/** Syllabus entries were Mongoose sub-documents, so each carries an `_id`. */
const syllabus = z
  .array(
    z.object({
      _id: z.string().optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      duration: numeric('Syllabus duration must be a number').optional(),
      order: numeric('Syllabus order must be a number').optional(),
    }),
  )
  .transform((items): SyllabusItem[] => items.map((i) => ({ ...i, _id: i._id ?? newId() })));

const level = z.enum(COURSE_LEVELS, { error: 'Invalid level' });
const status = z.enum(COURSE_STATUSES, { error: 'Invalid status' });
const type = z.enum(COURSE_TYPES, { error: 'Invalid course type' });
const instructor = z.string().nullish();

export const listQuery = z.object({
  status: z.string().optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  type: z.string().optional(),
  // The old check was `if (!req.query.includeSubCourses)`: any non-empty value means yes.
  includeSubCourses: z.string().optional().transform((v) => Boolean(v)),
  sortBy: z.enum(COURSE_SORT_FIELDS).catch('createdAt'),
  order: z.enum(['asc', 'desc']).catch('desc'),
});

export const createBody = z.object({
  title: z.string({ error: 'Title and category are required' }).trim().min(1, 'Title and category are required'),
  category: z.string({ error: 'Title and category are required' }).trim().min(1, 'Title and category are required'),
  description: z.string({ error: 'Course description is required' }).min(1, 'Course description is required').max(2000, 'Description cannot exceed 2000 characters'),
  level: level.optional(),
  duration: z.union([z.string(), z.number()]).optional(),
  price: numeric('Price must be a number').refine((v) => v >= 0, 'Price cannot be negative').optional(),
  instructor,
  thumbnail: z.string().nullish(),
  syllabus: syllabus.optional(),
  objectives: stringList.optional(),
  prerequisites: stringList.optional(),
  type: type.optional(),
  bundlePrice: numeric('Bundle price is required for bundle courses').nullish(),
  parentBundle: z.string().nullish(),
  wroDocumentsRequired: booleanish.optional(),
});

/** Fields a PUT may change. Anything else in the body (e.g. an echoed `_id`) is ignored. */
export const updateBody = z.object({
  title: z.string().trim().min(1, 'Course title is required').max(200, 'Title cannot exceed 200 characters').optional(),
  description: z.string().max(2000, 'Description cannot exceed 2000 characters').optional(),
  category: z.string().trim().min(1, 'Category is required').optional(),
  level: level.optional(),
  duration: z.union([z.string(), z.number()]).optional(),
  price: numeric('Price must be a number').refine((v) => v >= 0, 'Price cannot be negative').optional(),
  instructor,
  thumbnail: z.string().nullish(),
  syllabus: syllabus.optional(),
  objectives: stringList.optional(),
  prerequisites: stringList.optional(),
  learningOutcomes: stringList.optional(),
  tags: z.array(z.string().trim().toLowerCase()).catch([]).optional(),
  status: status.optional(),
  startDate: optionalDate,
  endDate: optionalDate,
  maxStudents: numeric('Maximum students must be a number').refine((v) => v >= 1, 'Maximum students must be at least 1').nullish(),
  isActive: booleanish.optional(),
  wroDocumentsRequired: booleanish.optional(),
  type: type.optional(),
  bundlePrice: numeric('Bundle price must be a number').refine((v) => v >= 0, 'Bundle price cannot be negative').nullish(),
});

export const archiveBody = z.object({ action: z.enum(['archive', 'unarchive']).catch('archive').default('archive') });
export const statisticsQuery = z.object({ period: z.coerce.number().int().positive().catch(30).default(30) });
export const addSubCourseBody = z.object({ courseId: z.string({ error: 'courseId is required' }).min(1, 'courseId is required') });

export type CreateCourseInput = z.infer<typeof createBody>;
export type UpdateCourseInput = z.infer<typeof updateBody>;
export type CourseListQuery = z.infer<typeof listQuery>;
