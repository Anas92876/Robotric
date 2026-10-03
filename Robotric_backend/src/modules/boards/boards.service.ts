import { isValidId } from '../../shared/db/ids';
import { AppError, BadRequestError, ForbiddenError } from '../../shared/http/errors';
import type { GroupRepository } from '../groups/groups.repository';
import type { GroupWithMembers } from '../groups/groups.service';
import type { BoardRepository, BoardTask } from './boards.repository';
import { BOARD_TASK_STATUSES } from './boards.table';

export interface BoardUser {
  id: string;
  role: string;
}

const TRAINER_ROLES = ['trainer', 'teacher'];
const isTrainer = (u: BoardUser) => TRAINER_ROLES.includes(u.role);
const groupNotFound = () => new AppError('Group not found', 404, 'GROUP_NOT_FOUND');

/** Group boards: shared notes plus a trainer-managed to-do list. Both areas need the board switched on. */
export class BoardService {
  constructor(
    private readonly boards: BoardRepository,
    private readonly groups: Pick<GroupRepository, 'findById' | 'membersOf'>,
  ) {}

  /**
   * Trainers must own the group; students must belong to it (the group's
   * trainer is let in too). Then the board has to be enabled.
   */
  async access(groupId: string, user: BoardUser, as: 'trainer' | 'member'): Promise<GroupWithMembers> {
    if (as === 'trainer' && user.role !== 'trainer' && user.role !== 'admin' && user.role !== 'superadmin') {
      throw new ForbiddenError('Only trainers can own groups', 'NOT_TRAINER');
    }
    const group = isValidId(groupId) ? await this.groups.findById(groupId) : null;
    if (!group) throw groupNotFound();
    const members = (await this.groups.membersOf([group.id])).get(group.id) ?? [];
    if (as === 'trainer') {
      if (group.trainerId !== user.id) throw new ForbiddenError('You do not own this group', 'GROUP_OWNERSHIP_REQUIRED');
    } else if (group.trainerId !== user.id && !members.some((m) => m.id === user.id)) {
      throw new ForbiddenError('You are not a member of this group', 'GROUP_MEMBERSHIP_REQUIRED');
    }
    if (!group.boardEnabled) throw new ForbiddenError('Board is not enabled for this group', 'BOARD_NOT_ENABLED');
    return { ...group, members } as GroupWithMembers;
  }

  async board(group: GroupWithMembers) {
    const [notes, tasks] = await Promise.all([this.boards.notes(group.id), this.boards.tasks(group.id)]);
    return { notes, tasks };
  }

  // ---- Notes ----

  async createNote(group: GroupWithMembers, user: BoardUser, content: unknown) {
    if (typeof content !== 'string' || !content.trim()) throw new BadRequestError('Content is required', 'CONTENT_REQUIRED');
    if (content.trim().length > 2000) throw new BadRequestError('Note cannot exceed 2000 characters');
    const id = await this.boards.createNote({ groupId: group.id, authorId: user.id, content: content.trim() });
    return (await this.boards.findNote(group.id, id))!;
  }

  private async note(group: GroupWithMembers, noteId: string, user: BoardUser, action: 'edit' | 'delete') {
    const note = isValidId(noteId) ? await this.boards.findNote(group.id, noteId) : null;
    if (!note) throw new AppError('Note not found', 404, 'NOTE_NOT_FOUND');
    if (!isTrainer(user) && note.authorId !== user.id) throw new ForbiddenError(`You can only ${action} your own notes`, 'FORBIDDEN');
    return note;
  }

  async updateNote(group: GroupWithMembers, noteId: string, user: BoardUser, body: { content?: unknown; isPinned?: unknown }) {
    const note = await this.note(group, noteId, user, 'edit');
    const patch: { content?: string; isPinned?: boolean } = {};
    if (typeof body.content === 'string') {
      if (!body.content.trim()) throw new BadRequestError('Note content is required');
      patch.content = body.content.trim().slice(0, 2000);
    }
    // Only the trainer can pin.
    if (typeof body.isPinned === 'boolean' && isTrainer(user)) patch.isPinned = body.isPinned;
    if (Object.keys(patch).length) await this.boards.updateNote(note.id, patch);
    return (await this.boards.findNote(group.id, note.id))!;
  }

  async deleteNote(group: GroupWithMembers, noteId: string, user: BoardUser) {
    const note = await this.note(group, noteId, user, 'delete');
    await this.boards.deleteNote(note.id);
  }

  // ---- Tasks ----

  /** Assignees must be students of the group or its trainer. */
  private checkAssignees(group: GroupWithMembers, assignedTo: unknown): string[] {
    if (assignedTo === undefined || assignedTo === null) return [];
    if (!Array.isArray(assignedTo)) throw new BadRequestError('assignedTo must be an array');
    const members = new Set([...group.members.map((m) => m.id), group.trainerId]);
    for (const id of assignedTo) {
      if (typeof id !== 'string' || !members.has(id)) throw new BadRequestError(`User ${String(id)} is not a member of this group`, 'USER_NOT_IN_GROUP');
    }
    return assignedTo as string[];
  }

  private static priority(v: unknown): number | undefined {
    if (v === undefined || v === null || v === '') return undefined;
    const n = Number(v);
    if (![1, 2, 3].includes(n)) throw new BadRequestError('Priority must be 1, 2 or 3');
    return n;
  }

  private static dueDate(v: unknown): Date | null {
    if (!v) return null;
    const d = new Date(String(v));
    if (Number.isNaN(d.getTime())) throw new BadRequestError('Invalid due date');
    return d;
  }

  async createTask(group: GroupWithMembers, user: BoardUser, body: Record<string, unknown>): Promise<BoardTask> {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) throw new BadRequestError('Title is required', 'TITLE_REQUIRED');
    if (title.length > 300) throw new BadRequestError('Title cannot exceed 300 characters');
    const assignees = this.checkAssignees(group, body.assignedTo);
    const id = await this.boards.createTask(
      {
        groupId: group.id,
        title,
        description: typeof body.description === 'string' ? body.description.trim().slice(0, 2000) : null,
        priority: BoardService.priority(body.priority) ?? 3,
        createdById: user.id,
        dueDate: BoardService.dueDate(body.dueDate),
      },
      assignees,
    );
    return (await this.boards.findTask(group.id, id))!;
  }

  private async task(group: GroupWithMembers, taskId: string) {
    const task = isValidId(taskId) ? await this.boards.findTask(group.id, taskId) : null;
    if (!task) throw new AppError('Task not found', 404, 'TASK_NOT_FOUND');
    return task;
  }

  private static status(v: unknown) {
    if (!BOARD_TASK_STATUSES.includes(v as (typeof BOARD_TASK_STATUSES)[number])) {
      throw new BadRequestError(`Status must be one of: ${BOARD_TASK_STATUSES.join(', ')}`, 'INVALID_STATUS');
    }
    return v as (typeof BOARD_TASK_STATUSES)[number];
  }

  async updateTask(group: GroupWithMembers, taskId: string, body: Record<string, unknown>): Promise<BoardTask> {
    const task = await this.task(group, taskId);
    const patch: Record<string, unknown> = {};
    if (typeof body.title === 'string') {
      if (!body.title.trim()) throw new BadRequestError('Title is required', 'TITLE_REQUIRED');
      patch.title = body.title.trim().slice(0, 300);
    }
    if (typeof body.description === 'string') patch.description = body.description.trim().slice(0, 2000);
    const priority = BoardService.priority(body.priority);
    if (priority !== undefined) patch.priority = priority;
    if (body.status !== undefined) patch.status = BoardService.status(body.status);
    if (body.dueDate !== undefined) patch.dueDate = BoardService.dueDate(body.dueDate);
    const assignees = body.assignedTo !== undefined ? this.checkAssignees(group, body.assignedTo) : undefined;
    await this.boards.updateTask(task.id, patch, assignees);
    return (await this.boards.findTask(group.id, task.id))!;
  }

  async deleteTask(group: GroupWithMembers, taskId: string) {
    const task = await this.task(group, taskId);
    await this.boards.deleteTask(task.id);
  }

  /** Students may only move tasks they are assigned to. */
  async setTaskStatus(group: GroupWithMembers, taskId: string, user: BoardUser, status: unknown): Promise<BoardTask> {
    const value = BoardService.status(status);
    const task = await this.task(group, taskId);
    if (!task.assignedTo.some((a) => a.id === user.id)) throw new ForbiddenError('You are not assigned to this task', 'NOT_ASSIGNED');
    await this.boards.updateTask(task.id, { status: value });
    return (await this.boards.findTask(group.id, task.id))!;
  }
}
