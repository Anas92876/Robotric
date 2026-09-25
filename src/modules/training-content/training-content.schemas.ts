import { z } from 'zod';

/**
 * The training page is a CMS document (one per language) edited as a whole by
 * the CLO, so it is stored as JSON. These schemas play the role the Mongoose
 * sub-schemas did: they fill defaults and drop unknown fields.
 */
const str = z.string().catch('').default('');
const bool = (d: boolean) => z.boolean().catch(d).default(d);

export const imageSchema = z.object({ url: z.string(), publicId: z.string() });
export type ContentImage = z.infer<typeof imageSchema>;

const programSchema = z.object({
  title: str,
  age: str,
  description: str,
  hours: str,
  hoursPerLevel: str,
  levels: str,
  available: bool(true),
  prerequisite: str,
  certificate: bool(false),
  whatYouLearn: z.array(z.string()).catch([]).default([]),
  images: z.array(imageSchema).catch([]).default([]),
});

const faqSchema = z.object({ question: str, answer: str });

const departmentSchema = z.object({
  name: str,
  tagline: str,
  description: str,
  coverImage: z.object({ url: str, publicId: str }).default({ url: '', publicId: '' }),
  programs: z.array(programSchema).default([]),
});

const trackBase = { title: str, subtitle: str, description: str };
const programTrack = z.object({ ...trackBase, programs: z.array(programSchema).default([]) });

export const tracksSchema = z.object({
  summer: programTrack.default(programTrack.parse({})),
  winter: programTrack.default(programTrack.parse({})),
  yearRound: z
    .object({ ...trackBase, faq: z.array(faqSchema).default([]), departments: z.array(departmentSchema).default([]) })
    .default({ title: '', subtitle: '', description: '', faq: [], departments: [] }),
  competitions: programTrack.default(programTrack.parse({})),
});

export const statsSchema = z.object({
  studentsTrained: z.string().default('2200+'),
  programTracks: z.string().default('25+'),
  yearsExperience: z.string().default('6'),
  handsOnLearning: z.string().default('100%'),
});

export type Tracks = z.infer<typeof tracksSchema>;
export type StatsValues = z.infer<typeof statsSchema>;

export const DEFAULT_STATS: StatsValues = statsSchema.parse({});
export const DEFAULT_TRACKS: Tracks = tracksSchema.parse({});

export const upsertBody = z.object({
  statsValues: statsSchema.default(DEFAULT_STATS),
  tracks: tracksSchema.default(DEFAULT_TRACKS),
});

export const LANGS = ['ar', 'en'] as const;
export type Lang = (typeof LANGS)[number];

export const PROGRAM_TRACKS = ['summer', 'winter', 'competitions'] as const;
export type ProgramTrack = (typeof PROGRAM_TRACKS)[number];
