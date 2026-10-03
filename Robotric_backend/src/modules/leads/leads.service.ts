import type { PasswordHasher } from '../../shared/auth/password-hasher';
import type { UnitOfWork } from '../../shared/db/unit-of-work';
import { BadRequestError, NotFoundError } from '../../shared/http/errors';
import type { Page } from '../../shared/http/pagination';
import type { User, UserRepository } from '../users/users.repository';
import type { UserProfile } from '../users/users.table';
import type { Lead, LeadRepository, LeadStats } from './leads.repository';
import type { CreateLeadInput, ListLeadsQuery, SetWaitingInput, UpdateLeadInput } from './leads.schemas';
import type { LeadRow, LeadStatus, NewLeadRow } from './leads.table';

export interface LeadRepos {
  leads: LeadRepository;
  users: UserRepository;
}

/** Narrow view of the courses module. */
export interface CourseTitleLookup {
  findById(id: string): Promise<{ id: string; title: string } | null>;
}

const notFound = () => new NotFoundError('Lead');
const ALREADY_STUDENT = 'This lead has already been converted to a student';
const EMAIL_TAKEN = 'A user with this email already exists';

/** The student profile built from a lead when an account is created for them. */
function studentProfile(lead: LeadRow): UserProfile {
  return {
    phone: lead.mobileNumber,
    status: 'active',
    dateOfBirth: lead.dateOfBirth,
    gender: lead.gender,
    address: lead.residence,
    school: lead.schoolName,
    fatherName: lead.fatherName,
    motherName: lead.motherName,
  };
}

/** Turns API field names into columns; shared by create and update. */
function toColumns(input: Partial<CreateLeadInput & UpdateLeadInput>): Partial<NewLeadRow> {
  const { assignedTo, waitingInfo, mobileNumberLabel, ...rest } = input;
  const out: Partial<NewLeadRow> = { ...rest };
  if (assignedTo !== undefined) out.assignedToId = assignedTo || null;
  if (mobileNumberLabel != null) out.mobileNumberLabel = mobileNumberLabel;
  if (waitingInfo) {
    if (waitingInfo.courseId !== undefined) out.waitingCourseId = waitingInfo.courseId || null;
    if (waitingInfo.depositAmount !== undefined) out.depositAmount = waitingInfo.depositAmount;
    if (waitingInfo.depositPaidAt !== undefined) out.depositPaidAt = waitingInfo.depositPaidAt;
    if (waitingInfo.depositMethod !== undefined) out.depositMethod = waitingInfo.depositMethod;
    if (waitingInfo.depositNotes !== undefined) out.depositNotes = waitingInfo.depositNotes;
  }
  return out;
}

export class LeadService {
  constructor(
    private readonly leads: LeadRepository,
    private readonly uow: UnitOfWork<LeadRepos>,
    private readonly courses: CourseTitleLookup,
    private readonly hasher: PasswordHasher,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private async require(id: string): Promise<Lead> {
    const lead = await this.leads.findById(id);
    if (!lead) throw notFound();
    return lead;
  }

  list(q: ListLeadsQuery, page: Page) {
    const { sortBy, sortOrder, ...filter } = q;
    return this.leads.list(filter, { field: sortBy, dir: sortOrder }, page);
  }

  listWaiting(courseId: string | undefined, page: Page) {
    return this.leads.listWaiting(courseId, page);
  }

  get(id: string): Promise<Lead> {
    return this.require(id);
  }

  stats(): Promise<LeadStats> {
    return this.leads.stats(this.now());
  }

  async create(input: CreateLeadInput, createdById: string): Promise<Lead> {
    const id = await this.leads.create({
      ...toColumns(input),
      fullName: input.fullName,
      mobileNumber: input.mobileNumber,
      // The old default ('new') was not a valid status and made every such save fail.
      status: input.status ?? 'interest',
      leadDate: input.leadDate ?? this.now(),
      createdById,
    });
    return this.require(id);
  }

  async update(id: string, input: UpdateLeadInput): Promise<Lead> {
    if (!(await this.leads.update(id, toColumns(input)))) throw notFound();
    return this.require(id);
  }

  async delete(id: string): Promise<void> {
    if (!(await this.leads.delete(id))) throw notFound();
  }

  async addFollowUp(id: string, note: string, nextFollowUpDate: Date | null | undefined, byId: string): Promise<Lead> {
    if (!(await this.leads.findRow(id))) throw notFound();
    await this.uow.run(async ({ leads }) => {
      await leads.addFollowUp(id, { note, date: this.now(), byId });
      if (nextFollowUpDate) await leads.update(id, { nextFollowUpDate });
    });
    return this.require(id);
  }

  async changeStatus(id: string, newStatus: LeadStatus, reason: string, banned: boolean | undefined, byId: string): Promise<Lead> {
    const lead = await this.leads.findRow(id);
    if (!lead) throw notFound();
    if (lead.status === newStatus) throw new BadRequestError('Lead is already in this status');

    const changes: Partial<NewLeadRow> = { status: newStatus };
    if (newStatus === 'blacklist') {
      changes.isBannedFromPlatform = banned ?? false;
      changes.blacklistReason = reason;
    } else if (lead.status === 'blacklist') {
      changes.isBannedFromPlatform = false;
      changes.blacklistReason = null;
    }

    await this.uow.run(async ({ leads }) => {
      await leads.update(id, changes);
      await leads.addStatusChange(id, { fromStatus: lead.status, toStatus: newStatus, reason, changedById: byId });
    });
    return this.require(id);
  }

  /** Creates the student's login account; lead and account are saved together or not at all. */
  private async createAccount(repos: LeadRepos, lead: LeadRow, email: string, password: string): Promise<User> {
    if (await repos.users.emailExists(email)) throw new BadRequestError(EMAIL_TAKEN);
    return repos.users.create({
      name: lead.fullName || lead.englishName || email,
      email,
      passwordHash: await this.hasher.hash(password),
      role: 'student',
      profile: studentProfile(lead),
    });
  }

  async convertToStudent(id: string, email: string, password: string): Promise<{ student: User; lead: Lead }> {
    const lead = await this.leads.findRow(id);
    if (!lead) throw notFound();
    if (lead.status === 'student' || lead.convertedAt) throw new BadRequestError(ALREADY_STUDENT);

    const student = await this.uow.run(async (repos) => {
      const user = await this.createAccount(repos, lead, email, password);
      await repos.leads.update(id, { status: 'student', convertedToStudentId: user.id, convertedAt: this.now() });
      return user;
    });
    return { student, lead: await this.require(id) };
  }

  async setWaiting(id: string, input: SetWaitingInput, byId: string): Promise<{ user: User; lead: Lead }> {
    const lead = await this.leads.findRow(id);
    if (!lead) throw notFound();
    if (lead.status === 'student') throw new BadRequestError(ALREADY_STUDENT);
    const course = await this.courses.findById(input.courseId);
    if (!course) throw new NotFoundError('Course');

    const deposit = input.depositAmount;
    const user = await this.uow.run(async (repos) => {
      const account = await this.createAccount(repos, lead, input.email, input.password);
      await repos.leads.update(id, {
        status: 'waiting',
        convertedToStudentId: account.id,
        waitingCourseId: course.id,
        depositAmount: deposit,
        depositPaidAt: deposit > 0 ? this.now() : null,
        depositMethod: input.depositMethod,
        depositNotes: input.depositNotes,
      });
      await repos.leads.addStatusChange(id, {
        fromStatus: lead.status,
        toStatus: 'waiting',
        reason: `Set to waiting list for course: ${course.title}${deposit > 0 ? `. Deposit: $${deposit}` : ''}`,
        changedById: byId,
      });
      return account;
    });
    return { user, lead: await this.require(id) };
  }
}
