import type { Request, Response } from 'express';
import { currentUser } from '../../shared/http/request-user';
import { groupDoc } from '../groups/groups.controller';
import type { BoardNote, BoardTask } from './boards.repository';
import type { BoardService } from './boards.service';

const person = (p: { id: string; name: string; email: string }) => ({ _id: p.id, name: p.name, email: p.email });

function noteDoc(n: BoardNote) {
  return {
    _id: n.id,
    groupId: n.groupId,
    author: n.author ? person(n.author) : n.authorId,
    content: n.content,
    isPinned: n.isPinned,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  };
}

function taskDoc(t: BoardTask) {
  return {
    _id: t.id,
    groupId: t.groupId,
    title: t.title,
    description: t.description,
    priority: t.priority,
    status: t.status,
    assignedTo: t.assignedTo.map(person),
    createdBy: t.createdBy ? person(t.createdBy) : t.createdById,
    dueDate: t.dueDate,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

type GReq = Request<{ groupId: string }>;
type NoteReq = Request<{ groupId: string; noteId: string }>;
type TaskReq = Request<{ groupId: string; taskId: string }>;
const body = (req: Request) => (req.body ?? {}) as Record<string, unknown>;
const user = (req: Request) => {
  const u = currentUser(req);
  return { id: u.id, role: u.role };
};

/**
 * Shared by /api/trainer/board (the group's trainer) and /api/student/board
 * (group members); `as` picks the access rule.
 */
export class BoardController {
  constructor(
    private readonly boards: BoardService,
    private readonly as: 'trainer' | 'member',
  ) {}

  private group(req: Request<{ groupId: string }>) {
    return this.boards.access(req.params.groupId, user(req), this.as);
  }

  get = async (req: GReq, res: Response) => {
    const group = await this.group(req);
    const { notes, tasks } = await this.boards.board(group);
    res.json({
      success: true,
      data: { group: groupDoc(group, { course: 'id', trainer: 'id', students: 'ids' }), notes: notes.map(noteDoc), tasks: tasks.map(taskDoc) },
    });
  };

  createNote = async (req: GReq, res: Response) => {
    const note = await this.boards.createNote(await this.group(req), user(req), body(req).content);
    res.status(201).json({ success: true, data: noteDoc(note) });
  };

  updateNote = async (req: NoteReq, res: Response) => {
    const note = await this.boards.updateNote(await this.group(req), req.params.noteId, user(req), body(req));
    res.json({ success: true, data: noteDoc(note) });
  };

  deleteNote = async (req: NoteReq, res: Response) => {
    await this.boards.deleteNote(await this.group(req), req.params.noteId, user(req));
    res.json({ success: true, message: 'Note deleted' });
  };

  createTask = async (req: GReq, res: Response) => {
    const task = await this.boards.createTask(await this.group(req), user(req), body(req));
    res.status(201).json({ success: true, data: taskDoc(task) });
  };

  updateTask = async (req: TaskReq, res: Response) => {
    const task = await this.boards.updateTask(await this.group(req), req.params.taskId, body(req));
    res.json({ success: true, data: taskDoc(task) });
  };

  deleteTask = async (req: TaskReq, res: Response) => {
    await this.boards.deleteTask(await this.group(req), req.params.taskId);
    res.json({ success: true, message: 'Task deleted' });
  };

  setTaskStatus = async (req: TaskReq, res: Response) => {
    const task = await this.boards.setTaskStatus(await this.group(req), req.params.taskId, user(req), body(req).status);
    res.json({ success: true, data: taskDoc(task) });
  };
}
