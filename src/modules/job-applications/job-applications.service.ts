import { isValidId } from '../../shared/db/ids';
import { AppError, BadRequestError } from '../../shared/http/errors';
import type { FileStorage } from '../../shared/storage/file-storage';
import { sanitizeFilename } from '../../shared/storage/file-storage';
import { JOB_STATUSES, type JobApplicationRow, type NewJobApplicationRow } from './job-applications.table';

export interface JobApplication extends JobApplicationRow {
  reviewedBy: { id: string; name: string; email: string } | null;
}

export interface ApplicationFilter {
  status?: string;
  position?: string;
  search?: string;
  fromDate?: Date;
  toDate?: Date;
}

export interface JobApplicationRepository {
  create(data: NewJobApplicationRow): Promise<JobApplicationRow>;
  list(filter: ApplicationFilter, page: { limit: number; offset: number }): Promise<JobApplication[]>;
  count(filter: ApplicationFilter): Promise<number>;
  statusCounts(): Promise<Map<string, number>>;
  positions(): Promise<string[]>;
  findById(id: string): Promise<JobApplication | null>;
  update(id: string, patch: Partial<NewJobApplicationRow>): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface CvUpload {
  buffer: Buffer;
  originalname: string;
}

/** Folder-friendly slug; keeps Arabic letters so Arabic position names stay readable. */
const slug = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ]+/g, '-')
    .substring(0, 60);

const notFound = () => new AppError('Job application not found', 404, 'NOT_FOUND');
const day = (v?: string) => {
  const d = v ? new Date(v) : undefined;
  return d && !Number.isNaN(d.getTime()) ? d : undefined;
};

export class JobApplicationService {
  constructor(
    private readonly applications: JobApplicationRepository,
    private readonly storage: FileStorage,
    private readonly cvBucket: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Stores the optional CV in the private bucket, then saves the application. */
  async submit(data: Omit<NewJobApplicationRow, 'cvUrl' | 'cvBucket'>, cv?: CvUpload): Promise<JobApplicationRow> {
    let cvUrl = '';
    let cvBucket = '';
    if (cv) {
      const now = this.now();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const name = sanitizeFilename(cv.originalname).substring(0, 80);
      const stored = await this.storage.upload({
        bucket: this.cvBucket,
        path: `cvs/${slug(data.position)}/${month}/${now.getTime()}-${name}`,
        body: cv.buffer,
        contentType: 'application/pdf',
      });
      cvUrl = stored.path;
      cvBucket = stored.bucket;
    }
    return this.applications.create({ ...data, cvUrl, cvBucket });
  }

  // ---- Reception ----

  async list(q: Record<string, string | undefined>, page: { limit: number; offset: number }) {
    const filter: ApplicationFilter = { status: q.status || undefined, position: q.position || undefined, search: q.search || undefined, fromDate: day(q.fromDate), toDate: day(q.toDate) };
    const [rows, total, counts, positions] = await Promise.all([
      this.applications.list(filter, page),
      this.applications.count(filter),
      this.applications.statusCounts(),
      this.applications.positions(),
    ]);
    const stats: Record<string, number> = { total: 0, new: 0, reviewed: 0, interview: 0, accepted: 0, rejected: 0 };
    for (const [status, n] of counts) {
      stats[status] = n;
      stats.total = (stats.total ?? 0) + n;
    }
    return { rows, total, stats, positions };
  }

  async get(id: string): Promise<JobApplication> {
    const app = isValidId(id) ? await this.applications.findById(id) : null;
    if (!app) throw notFound();
    return app;
  }

  /** A status change records who reviewed it and when. */
  async update(id: string, reviewerId: string, body: { status?: unknown; notes?: unknown }): Promise<JobApplication> {
    await this.get(id);
    const patch: Partial<NewJobApplicationRow> = {};
    if (body.status) {
      if (!JOB_STATUSES.includes(body.status as (typeof JOB_STATUSES)[number])) throw new BadRequestError(`Status must be one of: ${JOB_STATUSES.join(', ')}`);
      Object.assign(patch, { status: body.status, reviewedById: reviewerId, reviewedAt: this.now() });
    }
    if (typeof body.notes === 'string') patch.notes = body.notes;
    if (Object.keys(patch).length) await this.applications.update(id, patch);
    return this.get(id);
  }

  async delete(id: string): Promise<void> {
    const app = await this.get(id);
    await this.applications.delete(app.id);
    if (app.cvUrl && app.cvBucket) await this.storage.remove({ bucket: app.cvBucket, path: app.cvUrl });
  }

  /** A one-hour link to the CV, with a readable file name. */
  async cvLink(id: string) {
    const app = await this.get(id);
    if (!app.cvUrl) throw new AppError('No CV attached to this application', 404, 'NOT_FOUND');
    const signedUrl = await this.storage.signedUrl({ bucket: app.cvBucket || this.cvBucket, path: app.cvUrl }, 3600);
    const filename = `${app.position} - ${app.fullName} - ${app.createdAt.toISOString().slice(0, 10)}.pdf`.replace(/[/\\?%*:|"<>]/g, '-');
    return { signedUrl, filename, expiresIn: 3600 };
  }
}
