import type { DbExecutor } from '../../shared/db/client';
import type { JobApplicationRepository } from './job-applications.service';
import { type JobApplicationRow, jobApplications, type NewJobApplicationRow } from './job-applications.table';

export class DrizzleJobApplicationRepository implements JobApplicationRepository {
  constructor(private readonly db: DbExecutor) {}

  async create(data: NewJobApplicationRow): Promise<JobApplicationRow> {
    const [row] = await this.db.insert(jobApplications).values(data).returning();
    if (!row) throw new Error('Insert returned no row');
    return row;
  }
}
