import { z } from 'zod';
import { newId } from '../../shared/db/ids';
import { PARAMETER_TYPES } from './evaluations.table';

/** A whole-number 1–5 rating (numbers sent as strings are accepted, as Mongoose did). */
const rating15 = (label: string) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() !== '' ? Number(v) : v),
    z.number({ error: `${label} must be a number` }).min(1, `${label} must be at least 1`).max(5, `${label} cannot exceed 5`),
  );
const text = (max: number, label: string) => z.string().trim().max(max, `${label} cannot exceed ${max} characters`);
const date = z
  .preprocess((v) => (v === '' || v === null ? undefined : v), z.coerce.date({ error: 'Invalid date' }).optional())
  .transform((d) => d?.toISOString())
  .optional();

export const skillRatingsSchema = z
  .object({
    technicalSkills: rating15('Technical skills').default(3),
    problemSolving: rating15('Problem solving').default(3),
    creativity: rating15('Creativity').default(3),
    teamwork: rating15('Teamwork').default(3),
    communication: rating15('Communication').default(3),
  })
  .default({ technicalSkills: 3, problemSolving: 3, creativity: 3, teamwork: 3, communication: 3 });

export const attendanceSchema = z
  .object({
    status: z.enum(['present', 'late', 'absent', 'excused'], { error: 'Invalid attendance status' }).default('present'),
    arrivalTime: date,
    departureTime: date,
    notes: text(200, 'Attendance notes').optional(),
  })
  .default({ status: 'present' });

export const participationSchema = z
  .object({
    level: z.enum(['very_low', 'low', 'medium', 'high', 'very_high'], { error: 'Invalid participation level' }).default('medium'),
    contributionQuality: rating15('Contribution quality').default(3),
    questionsAsked: z.coerce.number().min(0, 'Questions asked cannot be negative').default(0),
    helpedPeers: z.boolean().default(false),
  })
  .default({ level: 'medium', contributionQuality: 3, questionsAsked: 0, helpedPeers: false });

export const comprehensionSchema = z
  .object({
    level: z.enum(['struggling', 'needs_support', 'adequate', 'good', 'excellent'], { error: 'Invalid comprehension level' }).default('adequate'),
    conceptsUnderstood: z.array(text(100, 'Concept name')).default([]),
    conceptsNeedingWork: z.array(text(100, 'Concept name')).default([]),
    notes: text(500, 'Comprehension notes').optional(),
  })
  .default({ level: 'adequate', conceptsUnderstood: [], conceptsNeedingWork: [] });

export const behaviorSchema = z
  .object({
    engagement: z.enum(['distracted', 'passive', 'engaged', 'very_engaged', 'exceptional'], { error: 'Invalid engagement' }).default('engaged'),
    attitude: z.enum(['negative', 'neutral', 'positive', 'enthusiastic'], { error: 'Invalid attitude' }).default('positive'),
    focus: rating15('Focus').default(3),
    respectful: z.boolean().default(true),
    followsInstructions: z.boolean().default(true),
    notes: text(300, 'Behavior notes').optional(),
  })
  .default({ engagement: 'engaged', attitude: 'positive', focus: 3, respectful: true, followsInstructions: true });

export const achievementsSchema = z
  .array(
    z.object({
      title: text(100, 'Achievement title').min(1, 'Achievement title is required'),
      description: text(300, 'Achievement description').optional(),
      category: z.enum(['technical', 'collaboration', 'creativity', 'leadership', 'improvement', 'other'], { error: 'Invalid achievement category' }).default('other'),
    }),
  )
  .transform((list) => list.map((a) => ({ _id: newId(), ...a })))
  .default([]);

export const improvementsSchema = z
  .array(
    z.object({
      area: text(100, 'Improvement area').min(1, 'Improvement area is required'),
      suggestion: text(300, 'Suggestion').optional(),
      priority: z.enum(['low', 'medium', 'high', 'critical'], { error: 'Invalid priority' }).default('medium'),
    }),
  )
  .transform((list) => list.map((i) => ({ _id: newId(), ...i })))
  .default([]);

export const homeworkSchema = z
  .object({
    assigned: z.boolean().default(false),
    title: text(200, 'Homework title').optional(),
    description: text(500, 'Homework description').optional(),
    dueDate: date,
    estimatedHours: z.coerce.number().min(0).max(100, 'Estimated hours cannot exceed 100').optional(),
  })
  .default({ assigned: false });

/** A plain string is taken as the general notes, as before. */
export const trainerNotesSchema = z.preprocess(
  (v) => (typeof v === 'string' ? { generalNotes: v } : v),
  z
    .object({
      strengths: text(500, 'Strengths notes').optional(),
      weaknesses: text(500, 'Weaknesses notes').optional(),
      generalNotes: text(1000, 'General notes').optional(),
      privateNotes: text(500, 'Private notes').optional(),
    })
    .default({}),
);

export const progressSchema = z
  .object({
    comparedToPrevious: z
      .enum(['declined', 'no_change', 'slight_improvement', 'good_improvement', 'excellent_improvement'], { error: 'Invalid progress value' })
      .default('no_change'),
    onTrack: z.boolean().default(true),
    notes: text(300, 'Progress notes').optional(),
  })
  .default({ comparedToPrevious: 'no_change', onTrack: true });

export const recommendationsSchema = z.array(text(200, 'Recommendation')).default([]);

export const flagsSchema = z.object({
  needsAttention: z.boolean().optional(),
  excelling: z.boolean().optional(),
  atRisk: z.boolean().optional(),
  parentContactNeeded: z.boolean().optional(),
});

/** Rounded to a whole number first, as before. */
export const overallRatingSchema = z.preprocess(
  (v) => (v === undefined || v === null || v === '' ? v : Math.round(Number(v))),
  z.number({ error: 'Overall rating is required' }).min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
);

export const parametersSchema = z.record(z.string(), z.unknown()).default({});

/** Every writable section; used for both create (with defaults) and update (only what was sent). */
export const evaluationFields = {
  overallRating: overallRatingSchema,
  skillRatings: skillRatingsSchema,
  attendance: attendanceSchema,
  participation: participationSchema,
  comprehension: comprehensionSchema,
  behavior: behaviorSchema,
  achievements: achievementsSchema,
  improvements: improvementsSchema,
  homework: homeworkSchema,
  trainerNotes: trainerNotesSchema,
  progress: progressSchema,
  recommendations: recommendationsSchema,
  flags: flagsSchema,
  parameters: parametersSchema,
};
export type EvaluationField = keyof typeof evaluationFields;

// ---- Criteria ----

export const criteriaParameterSchema = z.object({
  _id: z.string().regex(/^[a-f0-9]{24}$/).optional(),
  name: z.string({ error: 'Parameter name is required' }).trim().min(1, 'Parameter name is required').max(100, 'Parameter name cannot exceed 100 characters'),
  description: z.string().trim().max(200, 'Parameter description cannot exceed 200 characters').optional(),
  type: z.enum(PARAMETER_TYPES, { error: 'Invalid parameter type' }).default('rating'),
  ratingScale: z
    .object({
      min: z.coerce.number().default(1),
      max: z.coerce.number().default(5),
      labels: z.record(z.string(), z.string()).optional(),
    })
    .default({ min: 1, max: 5 }),
  weight: z.coerce.number().min(0, 'Weight cannot be negative').max(100, 'Weight cannot exceed 100').default(0),
  required: z.boolean().default(true),
  order: z.coerce.number().default(0),
});

export const criteriaParametersSchema = z
  .array(criteriaParameterSchema)
  .transform((list) => list.map((p) => ({ ...p, _id: p._id ?? newId() })).sort((a, b) => a.order - b.order));

export const overallRatingScaleSchema = z.object({ min: z.coerce.number().default(1), max: z.coerce.number().default(5) });
