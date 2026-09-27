import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { DbExecutor } from '../../shared/db/client';
import { users } from '../users/users.table';
import { type BoardNoteRow, boardNotes, boardTaskAssignees, type BoardTaskRow, boardTasks } from './boards.table';

type Person = { id: string; name: string; email: string };

export interface BoardNote extends BoardNoteRow {
  author: Person | null;
}
export interface BoardTask extends BoardTaskRow {
  assignedTo: Person[];
  createdBy: Person | null;
}

export interface BoardRepository {
  notes(groupId: string): Promise<BoardNote[]>;
  findNote(groupId: string, noteId: string): Promise<BoardNote | null>;
  createNote(row: typeof boardNotes.$inferInsert): Promise<string>;
  updateNote(id: string, patch: Partial<typeof boardNotes.$inferInsert>): Promise<void>;
  deleteNote(id: string): Promise<void>;

  tasks(groupId: string): Promise<BoardTask[]>;
  findTask(groupId: string, taskId: string): Promise<BoardTask | null>;
  createTask(row: typeof boardTasks.$inferInsert, assignees: string[]): Promise<string>;
  updateTask(id: string, patch: Partial<typeof boardTasks.$inferInsert>, assignees?: string[]): Promise<void>;
  deleteTask(id: string): Promise<void>;
}

const creator = alias(users, 'board_task_creator');

export class DrizzleBoardRepository implements BoardRepository {
  constructor(private readonly db: DbExecutor) {}

  private noteQuery() {
    return this.db
      .select({ n: boardNotes, author: { id: users.id, name: users.name, email: users.email } })
      .from(boardNotes)
      .leftJoin(users, eq(users.id, boardNotes.authorId));
  }

  async notes(groupId: string) {
    const rows = await this.noteQuery().where(eq(boardNotes.groupId, groupId)).orderBy(desc(boardNotes.isPinned), desc(boardNotes.createdAt));
    return rows.map((r) => ({ ...r.n, author: r.author?.id ? r.author : null }));
  }

  async findNote(groupId: string, noteId: string) {
    const [r] = await this.noteQuery()
      .where(and(eq(boardNotes.id, noteId), eq(boardNotes.groupId, groupId)))
      .limit(1);
    return r ? { ...r.n, author: r.author?.id ? r.author : null } : null;
  }

  async createNote(row: typeof boardNotes.$inferInsert) {
    const [created] = await this.db.insert(boardNotes).values(row).returning({ id: boardNotes.id });
    if (!created) throw new Error('Insert returned no row');
    return created.id;
  }

  async updateNote(id: string, patch: Partial<typeof boardNotes.$inferInsert>) {
    await this.db.update(boardNotes).set(patch).where(eq(boardNotes.id, id));
  }

  async deleteNote(id: string) {
    await this.db.delete(boardNotes).where(eq(boardNotes.id, id));
  }

  private async hydrate(rows: { t: BoardTaskRow; createdBy: Person | null }[]): Promise<BoardTask[]> {
    const ids = rows.map((r) => r.t.id);
    const assignees = ids.length
      ? await this.db
          .select({ taskId: boardTaskAssignees.taskId, id: users.id, name: users.name, email: users.email })
          .from(boardTaskAssignees)
          .innerJoin(users, eq(users.id, boardTaskAssignees.userId))
          .where(inArray(boardTaskAssignees.taskId, ids))
          .orderBy(asc(boardTaskAssignees.position))
      : [];
    return rows.map((r) => ({
      ...r.t,
      createdBy: r.createdBy?.id ? r.createdBy : null,
      assignedTo: assignees.filter((a) => a.taskId === r.t.id).map(({ taskId: _t, ...p }) => p),
    }));
  }

  private taskQuery() {
    return this.db
      .select({ t: boardTasks, createdBy: { id: creator.id, name: creator.name, email: creator.email } })
      .from(boardTasks)
      .leftJoin(creator, eq(creator.id, boardTasks.createdById));
  }

  async tasks(groupId: string) {
    // Priority first, then the nearest due date (tasks without one last), then oldest.
    const rows = await this.taskQuery()
      .where(eq(boardTasks.groupId, groupId))
      .orderBy(asc(boardTasks.priority), sql`${boardTasks.dueDate} asc nulls last`, asc(boardTasks.createdAt));
    return this.hydrate(rows);
  }

  async findTask(groupId: string, taskId: string) {
    const rows = await this.taskQuery()
      .where(and(eq(boardTasks.id, taskId), eq(boardTasks.groupId, groupId)))
      .limit(1);
    return (await this.hydrate(rows))[0] ?? null;
  }

  private async setAssignees(tx: DbExecutor, taskId: string, userIds: string[]) {
    await tx.delete(boardTaskAssignees).where(eq(boardTaskAssignees.taskId, taskId));
    const unique = [...new Set(userIds)];
    if (unique.length) await tx.insert(boardTaskAssignees).values(unique.map((userId, position) => ({ taskId, userId, position })));
  }

  async createTask(row: typeof boardTasks.$inferInsert, assignees: string[]) {
    return this.db.transaction(async (tx) => {
      const [created] = await tx.insert(boardTasks).values(row).returning({ id: boardTasks.id });
      if (!created) throw new Error('Insert returned no row');
      await this.setAssignees(tx, created.id, assignees);
      return created.id;
    });
  }

  async updateTask(id: string, patch: Partial<typeof boardTasks.$inferInsert>, assignees?: string[]) {
    await this.db.transaction(async (tx) => {
      if (Object.keys(patch).length) await tx.update(boardTasks).set(patch).where(eq(boardTasks.id, id));
      if (assignees) await this.setAssignees(tx, id, assignees);
    });
  }

  async deleteTask(id: string) {
    await this.db.delete(boardTasks).where(eq(boardTasks.id, id));
  }
}
