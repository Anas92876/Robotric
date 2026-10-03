import { newId } from '../../shared/db/ids';
import { BadRequestError, NotFoundError } from '../../shared/http/errors';
import type { Logger } from '../../shared/logger';
import type { User } from '../users/users.repository';
import type {
  AttendanceBreakdown,
  GroupActivityReader,
  GroupChatMembership,
  GroupEnrollmentReader,
  GroupSessionSummary,
  MemberEnrollment,
} from './groups.ports';
import type { Group, GroupFilter, GroupMember, GroupRepository } from './groups.repository';
import type { NewGroupRow, ScheduleSlot } from './groups.table';

export interface CourseLookup {
  findById(id: string): Promise<{ id: string; type: string } | null>;
}
export interface UserLookup {
  findById(id: string): Promise<User | null>;
}

export interface GroupInput {
  name?: string;
  description?: string | null;
  courseId?: string;
  trainerId?: string;
  startDate?: Date;
  endDate?: Date;
  schedule?: ScheduleInput[];
  maxStudents?: number;
  thumbnail?: string | null;
  color?: string;
  status?: NewGroupRow['status'];
  boardEnabled?: boolean;
  startingSessionNumber?: number;
}

export type ScheduleInput = Omit<ScheduleSlot, '_id'> & { _id?: string };

export interface GroupWithMembers extends Group {
  members: GroupMember[];
}

const toMinutes = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

function checkSchedule(schedule: GroupInput['schedule']): ScheduleSlot[] | undefined {
  if (!schedule) return undefined;
  return schedule.map((slot) => {
    if (slot.startTime && slot.endTime && toMinutes(slot.endTime) <= toMinutes(slot.startTime)) {
      throw new BadRequestError(
        `Invalid schedule times for ${slot.day}: End time (${slot.endTime}) must be after start time (${slot.startTime})`,
      );
    }
    return { ...slot, _id: slot._id ?? newId() };
  });
}

const groupNotFound = () => new NotFoundError('Group');

export class GroupService {
  constructor(
    private readonly groups: GroupRepository,
    private readonly courses: CourseLookup,
    private readonly users: UserLookup,
    private readonly activity: GroupActivityReader,
    private readonly enrollments: GroupEnrollmentReader,
    private readonly chat: GroupChatMembership,
    private readonly logger: Logger,
  ) {}

  private async require(id: string, trainerId?: string): Promise<Group> {
    const group = await this.groups.findById(id);
    // A trainer only ever sees their own groups; anyone else's is "not found".
    if (!group || (trainerId && group.trainerId !== trainerId)) throw groupNotFound();
    return group;
  }

  private async withMembers(list: Group[]): Promise<GroupWithMembers[]> {
    const members = await this.groups.membersOf(list.map((g) => g.id));
    return list.map((g) => ({ ...g, members: members.get(g.id) ?? [] }));
  }

  private async assertCourse(courseId: string, action: 'create' | 'move'): Promise<void> {
    const course = await this.courses.findById(courseId);
    if (!course) throw new NotFoundError('Course');
    if (course.type === 'bundle') {
      throw new BadRequestError(
        action === 'create'
          ? 'Cannot create a group directly under a bundle course. Select one of its sub-courses instead.'
          : 'Cannot move a group directly under a bundle course. Select one of its sub-courses instead.',
      );
    }
  }

  private async assertTrainer(trainerId: string): Promise<void> {
    const trainer = await this.users.findById(trainerId);
    if (!trainer || trainer.role !== 'trainer') throw new NotFoundError('Trainer');
  }

  private async sessionSummaries(ids: string[]): Promise<Map<string, GroupSessionSummary>> {
    return this.activity.summarize(ids);
  }

  // ─── Reading ─────────────────────────────────────────────────────────────

  async list(filter: GroupFilter): Promise<{ group: GroupWithMembers; summary: GroupSessionSummary }[]> {
    const list = await this.withMembers(await this.groups.list(filter));
    const summaries = await this.sessionSummaries(list.map((g) => g.id));
    return list.map((group) => ({ group, summary: summaries.get(group.id)! }));
  }

  async details(id: string, trainerId?: string) {
    const [group] = await this.withMembers([await this.require(id, trainerId)]);
    const [summaries, recentAttendance, enrollments] = await Promise.all([
      this.sessionSummaries([id]),
      this.activity.recentAttendance(id, 10),
      this.enrollments.forStudentsInCourse(group!.members.map((m) => m.id), group!.courseId),
    ]);
    return { group: group!, summary: summaries.get(id)!, recentAttendance, enrollments: [...enrollments.values()] };
  }

  async students(id: string, trainerId?: string): Promise<{
    group: Group;
    students: { member: GroupMember; attendance: AttendanceBreakdown; enrollment: MemberEnrollment | null }[];
  }> {
    const group = await this.require(id, trainerId);
    const members = (await this.groups.membersOf([id])).get(id) ?? [];
    const ids = members.map((m) => m.id);
    const [attendance, enrollments] = await Promise.all([
      this.activity.studentAttendance(id, ids),
      this.enrollments.forStudentsInCourse(ids, group.courseId),
    ]);
    return {
      group,
      students: members.map((member) => ({
        member,
        attendance: attendance.get(member.id) ?? { present: 0, late: 0, absent: 0, total: 0 },
        enrollment: enrollments.get(member.id) ?? null,
      })),
    };
  }

  async stats(id: string, trainerId: string) {
    const group = await this.require(id, trainerId);
    const [counts, summaries] = await Promise.all([this.groups.memberCounts([id]), this.sessionSummaries([id])]);
    return { group, enrolled: counts.get(id) ?? 0, summary: summaries.get(id)! };
  }

  // ─── Writing (CLO) ───────────────────────────────────────────────────────

  async create(input: GroupInput): Promise<GroupWithMembers> {
    if (!input.name || !input.courseId || !input.trainerId) throw new BadRequestError('Name, course, and trainer are required');
    if (!input.startDate) throw new BadRequestError('Start date is required');
    if (!input.endDate) throw new BadRequestError('End date is required');
    if (input.endDate <= input.startDate) throw new BadRequestError('End date must be after start date');
    await this.assertCourse(input.courseId, 'create');
    await this.assertTrainer(input.trainerId);

    const id = await this.groups.create({
      name: input.name,
      description: input.description ?? null,
      courseId: input.courseId,
      trainerId: input.trainerId,
      startDate: input.startDate,
      endDate: input.endDate,
      schedule: checkSchedule(input.schedule) ?? [],
      maxStudents: input.maxStudents ?? 30,
      ...(input.color ? { color: input.color } : {}),
      thumbnail: input.thumbnail ?? null,
      status: 'active',
    });
    const [group] = await this.withMembers([await this.require(id)]);
    return group!;
  }

  async update(id: string, input: GroupInput): Promise<GroupWithMembers> {
    const current = await this.require(id);
    if (input.courseId) await this.assertCourse(input.courseId, 'move');
    if (input.trainerId) await this.assertTrainer(input.trainerId);
    const start = input.startDate ?? current.startDate;
    const end = input.endDate ?? current.endDate;
    if (end <= start) throw new BadRequestError('End date must be after start date');

    const { schedule, ...rest } = input;
    const changes: Partial<NewGroupRow> = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
    const slots = checkSchedule(schedule);
    if (slots) changes.schedule = slots;
    if (Object.keys(changes).length > 0) await this.groups.update(id, changes);
    const [group] = await this.withMembers([await this.require(id)]);
    return group!;
  }

  async delete(id: string): Promise<void> {
    await this.require(id);
    const count = (await this.groups.memberCounts([id])).get(id) ?? 0;
    if (count > 0) {
      throw new BadRequestError('Cannot delete a group with enrolled students. Close the group instead to preserve student records.');
    }
    await this.groups.delete(id);
  }

  async setClosed(id: string, action: 'close' | 'reopen'): Promise<Group> {
    await this.require(id);
    await this.groups.update(id, { status: action === 'close' ? 'completed' : 'active' });
    return this.require(id);
  }

  async assignTrainer(id: string, trainerId: string | undefined): Promise<GroupWithMembers> {
    if (!trainerId) throw new BadRequestError('Trainer ID is required');
    await this.require(id);
    await this.assertTrainer(trainerId);
    await this.groups.update(id, { trainerId });
    const [group] = await this.withMembers([await this.require(id)]);
    return group!;
  }

  async toggleBoard(id: string): Promise<boolean> {
    const group = await this.require(id);
    await this.groups.update(id, { boardEnabled: !group.boardEnabled });
    return !group.boardEnabled;
  }

  // ─── Membership (CLO and trainer) ────────────────────────────────────────

  /**
   * Adds a student. The old CLO endpoint checked a non-existent `maxCapacity`
   * field, so capacity was never enforced there; it is now, for everyone.
   */
  async addStudent(id: string, studentId: string | undefined, opts: { trainerId?: string; studentLabel: 'Student' | 'Valid student' }): Promise<GroupWithMembers> {
    if (!studentId) throw new BadRequestError('Student ID is required');
    await this.require(id, opts.trainerId);
    const student = await this.users.findById(studentId);
    if (!student || student.role !== 'student') throw new NotFoundError(opts.studentLabel);

    const result = await this.groups.addStudent(id, studentId, true);
    if (result === 'full') throw new BadRequestError(opts.trainerId ? 'Group is full' : 'Group has reached maximum capacity');
    if (result === 'already_member') {
      throw new BadRequestError(opts.trainerId ? 'Student already enrolled in this group' : 'Student is already in this group');
    }
    await this.chat.studentJoined(id, studentId).catch((err: unknown) => this.logger.warn({ err }, 'Group chat join failed'));
    const [group] = await this.withMembers([await this.require(id)]);
    return group!;
  }

  async removeStudent(id: string, studentId: string, trainerId?: string): Promise<GroupWithMembers> {
    await this.require(id, trainerId);
    const removed = await this.groups.removeStudent(id, studentId);
    // The CLO endpoint reported a non-member as an error; the trainer one did not.
    if (!removed && !trainerId) throw new BadRequestError('Student is not in this group');
    await this.chat.studentLeft(id, studentId).catch((err: unknown) => this.logger.warn({ err }, 'Group chat leave failed'));
    const [group] = await this.withMembers([await this.require(id)]);
    return group!;
  }
}
