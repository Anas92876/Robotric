import type { FileStorage } from '../../shared/storage/file-storage';
import { sanitizeFilename } from '../../shared/storage/file-storage';
import type { JobApplicationRow, NewJobApplicationRow } from './job-applications.table';

export interface JobApplicationRepository {
  create(data: NewJobApplicationRow): Promise<JobApplicationRow>;
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
}
