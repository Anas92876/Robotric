import type { Request, Response } from 'express';
import { z } from 'zod';
import { parse } from '../../shared/http/validate';
import type { JobApplicationService } from './job-applications.service';
import { AVAILABILITY, EXPERIENCE_LEVELS } from './job-applications.table';

const REQUIRED = 'Full name, phone, and position are required';
const required = z.string({ error: REQUIRED }).trim().min(1, REQUIRED);
const optionalText = z.string().trim().nullish().transform((v) => v ?? '');
/** Multipart fields arrive as strings; empty means "not given". */
const optionalEnum = <T extends readonly [string, ...string[]]>(values: T, label: string) =>
  z.preprocess((v) => (v === '' ? null : v), z.enum(values, { error: `Invalid ${label}` }).nullish()).transform((v) => v ?? null);

/** Skills come as a JSON array string, a plain string, or repeated form fields. */
const skills = z
  .unknown()
  .optional()
  .transform((v): string[] => {
    if (Array.isArray(v)) return v.map(String);
    if (typeof v === 'string' && v) {
      try {
        const parsed: unknown = JSON.parse(v);
        return Array.isArray(parsed) ? parsed.map(String) : [v];
      } catch {
        return [v];
      }
    }
    return [];
  })
  .transform((list) => list.map((s) => s.trim()).filter(Boolean));

const applyBody = z.object({
  fullName: required,
  phone: required.pipe(z.string().regex(/^[0-9+\-\s()]{7,}$/, 'Invalid phone number format')),
  position: required,
  email: z
    .string()
    .trim()
    .nullish()
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Invalid email address format')
    .transform((v) => v ?? ''),
  age: z
    .union([z.string(), z.number()])
    .nullish()
    .transform((v) => (v === '' || v == null ? null : Number.parseInt(String(v), 10)))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 14 && v <= 70), 'Age must be between 14 and 70'),
  location: optionalText,
  gender: optionalEnum(['male', 'female'] as const, 'gender'),
  experienceLevel: optionalEnum(EXPERIENCE_LEVELS, 'experience level'),
  experienceDetails: optionalText,
  skills,
  portfolioLink: optionalText,
  availability: optionalEnum(AVAILABILITY, 'availability'),
  whyUs: optionalText,
  additionalInfo: optionalText,
});

export class JobApplicationController {
  constructor(private readonly applications: JobApplicationService) {}

  /** POST /api/jobs/apply — public, multipart; the CV (field "cv") is optional. */
  apply = async (req: Request, res: Response) => {
    const input = parse(applyBody, req.body);
    const app = await this.applications.submit(input, req.file);
    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: { id: app.id, fullName: app.fullName, position: app.position, hasCv: Boolean(app.cvUrl), createdAt: app.createdAt },
    });
  };
}
