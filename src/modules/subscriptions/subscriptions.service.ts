import type { UnitOfWork } from '../../shared/db/unit-of-work';
import { BadRequestError, ForbiddenError, NotFoundError, ValidationError } from '../../shared/http/errors';
import type { Logger } from '../../shared/logger';
import type { FileStorage, StoredFile } from '../../shared/storage/file-storage';
import { sanitizeFilename } from '../../shared/storage/file-storage';
import type { User } from '../users/users.repository';
import type {
  SessionReport,
  SessionRequest,
  SessionRequestRepository,
  UserSubscription,
  UserSubscriptionRepository,
} from './subscriptions.repository';
import type { SessionRequestStatus } from './subscriptions.table';

export interface PlanLookup {
  findById(id: string): Promise<{ id: string; isActive: boolean; monthlyHours: number } | null>;
}
export interface UserLookup {
  findById(id: string): Promise<User | null>;
}
export interface SubscriptionRepos {
  subscriptions: UserSubscriptionRepository;
  requests: SessionRequestRepository;
}

const toMinutes = (hhmm: string) => {
  const [h = Number.NaN, m = Number.NaN] = hhmm.split(':').map(Number);
  return { h, m, total: h * 60 + m };
};

const OPEN = 11 * 60; // 11:00
const CLOSE = 19 * 60; // 19:00

/** Private sessions run between 11:00 and 19:00 (unchanged rule). */
export function checkTimeWindow(startTime: string, durationHours: number): void {
  const { h, m, total } = toMinutes(startTime);
  if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    throw new BadRequestError('Invalid time format. Use HH:mm format (e.g., 14:30)', 'INVALID_TIME_FORMAT');
  }
  if (total < OPEN || total >= CLOSE) throw new BadRequestError('Start time must be between 11:00 and 19:00', 'TIME_WINDOW_VIOLATION');
  if (total + durationHours * 60 > CLOSE) {
    throw new BadRequestError(
      'Session end time cannot exceed 19:00. Please reduce duration or choose an earlier start time.',
      'TIME_WINDOW_VIOLATION',
    );
  }
}

// ─── Hour packages (reception) ───────────────────────────────────────────────

export class UserSubscriptionService {
  constructor(
    private readonly subscriptions: UserSubscriptionRepository,
    private readonly uow: UnitOfWork<SubscriptionRepos>,
    private readonly plans: PlanLookup,
    private readonly users: UserLookup,
    private readonly now: () => Date = () => new Date(),
  ) {}

  list(filter: { status?: string; userId?: string }): Promise<UserSubscription[]> {
    return this.subscriptions.list(filter);
  }

  current(userId: string): Promise<UserSubscription | null> {
    return this.subscriptions.findCurrent(userId, this.now());
  }

  private async require(id: string): Promise<UserSubscription> {
    const s = await this.subscriptions.findById(id);
    if (!s) throw new NotFoundError('User subscription');
    return s;
  }

  /** Assigns a plan; any running subscription of the student is cancelled in the same transaction. */
  async assign(input: { userId?: string; planId?: string; startsAt?: string; endsAt?: string }, byId: string): Promise<UserSubscription> {
    if (!input.userId) throw new ValidationError('User ID is required');
    if (!input.planId) throw new ValidationError('Plan ID is required');
    if (!input.startsAt) throw new ValidationError('Start date is required');
    if (!input.endsAt) throw new ValidationError('End date is required');
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    if (Number.isNaN(startsAt.getTime())) throw new ValidationError('Invalid start date format');
    if (Number.isNaN(endsAt.getTime())) throw new ValidationError('Invalid end date format');
    if (endsAt <= startsAt) throw new ValidationError('End date must be after start date');

    const user = await this.users.findById(input.userId);
    if (!user) throw new NotFoundError('User');
    if (user.role !== 'student') throw new BadRequestError('Subscriptions can only be assigned to students');
    const plan = await this.plans.findById(input.planId);
    if (!plan) throw new NotFoundError('Subscription plan');
    if (!plan.isActive) throw new BadRequestError('Cannot assign inactive subscription plan');

    const now = this.now();
    const id = await this.uow.run(async ({ subscriptions }) => {
      const existing = await subscriptions.findActiveNotEnded(user.id, now);
      if (existing) await subscriptions.update(existing.id, { status: 'canceled', canceledAt: now, canceledById: byId });
      return subscriptions.create({ userId: user.id, planId: plan.id, startsAt, endsAt, remainingHours: plan.monthlyHours, status: 'active' });
    });
    return this.require(id);
  }

  async update(id: string, input: { endsAt?: string; remainingHours?: number }): Promise<UserSubscription> {
    const current = await this.require(id);
    const changes: { endsAt?: Date; remainingHours?: number } = {};
    if (input.endsAt !== undefined) {
      const endsAt = new Date(input.endsAt);
      if (Number.isNaN(endsAt.getTime())) throw new ValidationError('Invalid end date format');
      if (endsAt <= current.startsAt) throw new ValidationError('End date must be after start date');
      changes.endsAt = endsAt;
    }
    if (input.remainingHours !== undefined) {
      if (input.remainingHours < 0) throw new ValidationError('Remaining hours cannot be negative');
      changes.remainingHours = input.remainingHours;
    }
    // Saving an active subscription whose end date has passed marks it expired (old pre-save hook).
    const endsAt = changes.endsAt ?? current.endsAt;
    const status = current.status === 'active' && endsAt < this.now() ? ('expired' as const) : current.status;
    await this.subscriptions.update(id, { ...changes, status });
    return this.require(id);
  }

  async cancel(id: string, byId: string): Promise<UserSubscription> {
    const current = await this.require(id);
    if (current.status === 'canceled') throw new BadRequestError('Subscription is already canceled');
    await this.subscriptions.update(id, { status: 'canceled', canceledAt: this.now(), canceledById: byId });
    return this.require(id);
  }
}

// ─── Private session requests and reports ────────────────────────────────────

export interface ReportPdf {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

export class SessionRequestService {
  constructor(
    private readonly subscriptions: UserSubscriptionRepository,
    private readonly requests: SessionRequestRepository,
    private readonly uow: UnitOfWork<SubscriptionRepos>,
    private readonly storage: FileStorage,
    private readonly bucket: string,
    private readonly logger: Logger,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Signed download link for a report's PDF, or null. */
  async pdfLink(report: SessionReport): Promise<string | null> {
    if (!report.pdfPath) return null;
    try {
      return await this.storage.signedUrl({ bucket: this.bucket, path: report.pdfPath });
    } catch (err) {
      this.logger.warn({ err, reportId: report.id }, 'Could not sign session report PDF link');
      return null;
    }
  }

  // Student side

  async request(userId: string, input: { date?: string; startTime?: string; durationHours?: number; description?: string }): Promise<SessionRequest> {
    if (!input.date || !input.startTime || !input.durationHours) throw new ValidationError('Date, start time, and duration are required');
    if (input.durationHours <= 0) throw new ValidationError('Duration must be greater than 0');
    const date = new Date(input.date);
    if (Number.isNaN(date.getTime())) throw new ValidationError('Invalid date format');

    const subscription = await this.subscriptions.findCurrent(userId, this.now());
    if (!subscription) throw new ForbiddenError('Active subscription required to create session request', 'SUBSCRIPTION_REQUIRED');
    if (subscription.remainingHours < input.durationHours) {
      throw new BadRequestError(`Insufficient hours. Available: ${subscription.remainingHours}, Requested: ${input.durationHours}`, 'INSUFFICIENT_HOURS');
    }

    const startTime = input.startTime.trim();
    checkTimeWindow(startTime, input.durationHours);
    const start = toMinutes(startTime).total;
    const end = start + input.durationHours * 60;
    const clash = (await this.requests.activeOnDay(userId, date)).some((r) => {
      const rs = toMinutes(r.startTime).total;
      return start < rs + r.durationHours * 60 && end > rs;
    });
    if (clash) throw new BadRequestError('You already have a session scheduled at this time. Please choose a different time.', 'SESSION_OVERLAP');

    const id = await this.requests.create({
      userId,
      subscriptionId: subscription.id,
      date,
      startTime,
      durationHours: input.durationHours,
      description: input.description?.trim() || null,
      status: 'pending',
    });
    return (await this.requests.findById(id))!;
  }

  mine(userId: string): Promise<SessionRequest[]> {
    return this.requests.list({ userId });
  }

  async cancel(userId: string, id: string): Promise<SessionRequest> {
    const r = await this.requests.findById(id);
    if (!r) throw new NotFoundError('Session request');
    if (r.userId !== userId) throw new ForbiddenError('You can only cancel your own session requests', 'FORBIDDEN');
    if (['canceled', 'completed', 'no_show'].includes(r.status)) {
      throw new BadRequestError(`Cannot cancel session with status: ${r.status}`, 'INVALID_STATUS');
    }
    const today = this.now();
    today.setHours(0, 0, 0, 0);
    const day = new Date(r.date);
    day.setHours(0, 0, 0, 0);
    if (day <= today) {
      throw new BadRequestError(
        'Cannot cancel session on the same day or in the past. Cancellation must be done before the session date.',
        'CANCELLATION_NOT_ALLOWED',
      );
    }
    await this.requests.update(id, { status: 'canceled', canceledAt: this.now(), canceledById: userId });
    return (await this.requests.findById(id))!;
  }

  async reportFor(userId: string, requestId: string): Promise<SessionReport> {
    const r = await this.requests.findById(requestId);
    if (!r) throw new NotFoundError('Session request');
    if (r.userId !== userId) throw new ForbiddenError('You can only view reports for your own sessions', 'FORBIDDEN');
    const report = await this.requests.findReport(requestId);
    if (!report) throw new NotFoundError('Session report');
    return report;
  }

  myReports(userId: string): Promise<SessionReport[]> {
    return this.requests.reports({ userId });
  }

  // Reception side

  all(status?: SessionRequestStatus): Promise<SessionRequest[]> {
    return this.requests.list({ status });
  }

  private async requirePending(id: string, verb: 'approve' | 'decline'): Promise<SessionRequest> {
    const r = await this.requests.findById(id);
    if (!r) throw new NotFoundError('Session request');
    if (r.status !== 'pending') throw new BadRequestError(`Cannot ${verb} request with status: ${r.status}`, 'INVALID_STATUS');
    return r;
  }

  async approve(id: string, byId: string): Promise<SessionRequest> {
    await this.requirePending(id, 'approve');
    await this.requests.update(id, { status: 'approved', approvedAt: this.now(), approvedById: byId });
    return (await this.requests.findById(id))!;
  }

  async decline(id: string, reason: string | undefined, byId: string): Promise<SessionRequest> {
    await this.requirePending(id, 'decline');
    await this.requests.update(id, { status: 'declined', declinedAt: this.now(), declinedById: byId, declineReason: reason?.trim() || null });
    return (await this.requests.findById(id))!;
  }

  /**
   * Closes an approved session: deducts its hours, stores the report and
   * marks the request completed / no-show — all or nothing. (The old code
   * deducted first and could then fail to save the report.)
   */
  async report(id: string, input: { notes?: string; attendance?: unknown }, pdf: ReportPdf | undefined, byId: string): Promise<SessionReport> {
    const notes = input.notes?.trim();
    if (!notes) throw new ValidationError('Notes are required');
    if (input.attendance === undefined || input.attendance === null) throw new ValidationError('Attendance is required');
    const attended = input.attendance === true || input.attendance === 'true';

    const r = await this.requests.findById(id);
    if (!r) throw new NotFoundError('Session request');
    if (r.status !== 'approved') {
      throw new BadRequestError(`Cannot create report for session with status: ${r.status}. Session must be approved.`, 'INVALID_STATUS');
    }
    if (await this.requests.findReport(id)) throw new BadRequestError('Report already exists for this session', 'REPORT_EXISTS');

    let stored: StoredFile | null = null;
    if (pdf) {
      try {
        stored = await this.storage.upload({
          bucket: this.bucket,
          path: `session-reports/${id}/${this.now().getTime()}-${sanitizeFilename(pdf.originalname)}`,
          body: pdf.buffer,
          contentType: pdf.mimetype,
        });
      } catch (err) {
        // As before, a failed upload does not stop the report.
        this.logger.error({ err, requestId: id }, 'Session report PDF upload failed');
      }
    }

    try {
      await this.uow.run(async ({ subscriptions, requests }) => {
        if (!(await subscriptions.deductHours(r.subscriptionId, r.durationHours))) {
          const sub = await subscriptions.findById(r.subscriptionId);
          if (!sub) throw new BadRequestError('Subscription not found', 'SUBSCRIPTION_NOT_FOUND');
          throw new BadRequestError(`Insufficient hours. Available: ${sub.remainingHours}, Required: ${r.durationHours}`, 'INSUFFICIENT_HOURS');
        }
        await requests.createReport({ sessionRequestId: id, createdById: byId, notes, pdfPath: stored?.path ?? null, attendance: attended });
        await requests.update(id, { status: attended ? 'completed' : 'no_show', completedAt: this.now() });
      });
    } catch (err) {
      // Nothing was saved, so the uploaded PDF would be an orphan.
      if (stored) await this.storage.remove(stored);
      throw err;
    }
    return (await this.requests.findReport(id))!;
  }

  receptionReports(createdById: string): Promise<SessionReport[]> {
    return this.requests.reports({ createdById });
  }
}
