import { isValidId, newId } from '../../shared/db/ids';
import { AppError, BadRequestError, ForbiddenError } from '../../shared/http/errors';
import type { FileStorage } from '../../shared/storage/file-storage';
import { sanitizeFilename } from '../../shared/storage/file-storage';
import type { InternalWorkRepository, Project, StatusCounts, Task } from './internal-work.repository';
import { type ClientMedia, TASK_STATUSES, type InternalTaskStatus, type TaskImage } from './internal-work.table';

export interface Actor {
  id: string;
  role: string;
  name: string;
}

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/** Notifications for the internal work area (they arrive in phase 9). */
export interface WorkNotifier {
  tasksAssigned(userIds: string[], title: string): Promise<void>;
  toUsers(userIds: string[], title: string, body: string): Promise<void>;
}
export const silentWorkNotifier: WorkNotifier = { tasksAssigned: async () => {}, toUsers: async () => {} };

const MEDIA_KINDS: Record<string, 'image' | 'video' | 'audio'> = {
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'video/mp4': 'video',
  'video/quicktime': 'video',
  'video/webm': 'video',
  'audio/webm': 'audio',
  'audio/mp4': 'audio',
  'audio/x-m4a': 'audio',
  'audio/mpeg': 'audio',
  'audio/ogg': 'audio',
};
const MEDIA_MAX_BYTES = { image: 15 * 1024 * 1024, video: 300 * 1024 * 1024, audio: 20 * 1024 * 1024 };
const MAX_MEDIA_ITEMS = 15;

const projectNotFound = () => new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
const taskNotFound = () => new AppError('Task not found', 404, 'TASK_NOT_FOUND');
const notAssigned = () => new BadRequestError('You are not assigned to this task', 'NOT_ASSIGNED');
const EMPTY_COUNTS = { total: 0, todo: 0, in_progress: 0, done: 0 };
const CLIENT_COUNTS = { total: 0, pending_review: 0, todo: 0, in_progress: 0, done: 0, declined: 0 };

/** The old counters: only the keys of `base` plus `total` (over those keys). */
function tally(counts: StatusCounts | undefined, base: Record<string, number>) {
  const out: Record<string, number> = { ...base };
  for (const [status, n] of Object.entries(counts ?? {})) {
    out[status] = n;
    out.total = (out.total ?? 0) + n;
  }
  return out;
}

const priorityOf = (v: unknown) => {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  if (![1, 2, 3].includes(n)) throw new BadRequestError('Priority must be 1, 2 or 3', 'INVALID_PRIORITY');
  return n;
};
const dateOf = (v: unknown) => {
  if (!v) return null;
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) throw new BadRequestError('Invalid date', 'INVALID_DATE');
  return d;
};
const idList = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : v ? [String(v)] : []);
const isHttpsUrl = (s: string) => {
  try {
    const u = new URL(s);
    return u.protocol === 'https:' && u.hostname.length > 0;
  } catch {
    return false;
  }
};

/**
 * The CTO's internal work system: projects (one level of sub-projects),
 * tasks for engineers, client requests, sub-tasks and deadline extensions.
 */
export class InternalWorkService {
  constructor(
    private readonly work: InternalWorkRepository,
    private readonly storage: FileStorage,
    private readonly imagesBucket: string,
    private readonly mediaBucket: string,
    private readonly notifier: WorkNotifier,
    private readonly now: () => Date = () => new Date(),
  ) {}

  imageUrl(img: TaskImage) {
    return this.storage.publicUrl({ bucket: this.imagesBucket, path: img.publicId });
  }

  async mediaWithUrls(media: ClientMedia[]) {
    return Promise.all(media.map(async (m) => ({ ...m, url: await this.storage.signedUrl({ bucket: m.storageBucket, path: m.storagePath }).catch(() => null) })));
  }

  // ════════════════ People ════════════════

  staff() {
    return this.work.staff();
  }

  clients() {
    return this.work.clients();
  }

  private async checkUsers(ids: string[], error: () => AppError) {
    if (ids.some((id) => !isValidId(id))) throw error();
    const found = await this.work.usersByIds([...new Set(ids)]);
    if (found.length !== new Set(ids).size) throw error();
    return found;
  }

  private async checkClients(ids: string[]) {
    const users = await this.checkUsers(ids, () => new BadRequestError('One or more client IDs are invalid', 'INVALID_CLIENT_IDS'));
    if (users.some((u) => u.role !== 'client')) throw new BadRequestError('One or more IDs do not belong to a client account', 'NOT_A_CLIENT');
  }

  // ════════════════ Projects (CTO) ════════════════

  async createProject(actor: Actor, body: Record<string, unknown>) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) throw new BadRequestError('Project name is required', 'NAME_REQUIRED');
    const engineers = idList(body.assignedEngineers);
    const clients = idList(body.clients);
    await this.checkUsers(engineers, () => new BadRequestError('One or more assigned user IDs are invalid', 'INVALID_USER_IDS'));
    await this.checkClients(clients);
    let parentProjectId: string | null = null;
    if (body.parentProject) {
      const parent = isValidId(body.parentProject) ? await this.work.findProject(body.parentProject) : null;
      if (!parent) throw new AppError('Parent project not found', 404, 'PARENT_PROJECT_NOT_FOUND');
      if (parent.parentProjectId) throw new BadRequestError('Cannot nest sub-projects more than one level deep', 'NESTING_NOT_ALLOWED');
      parentProjectId = parent.id;
    }
    const id = await this.work.createProject(
      { name: name.slice(0, 200), description: typeof body.description === 'string' ? body.description.trim().slice(0, 2000) : null, priority: priorityOf(body.priority) ?? 3, createdById: actor.id, parentProjectId },
      engineers,
      clients,
    );
    return (await this.work.findProject(id))!;
  }

  /** Top-level projects with their task counts (direct tasks only) and number of sub-projects. */
  async projects() {
    const list = await this.work.listProjects({ parentId: null });
    const ids = list.map((p) => p.id);
    const [counts, subs] = await Promise.all([this.work.statusCounts('project', { projectIds: ids, subProjectId: null }), this.work.subProjectCounts(ids)]);
    return list.map((p) => ({ project: p, taskCounts: tally(counts.get(p.id), EMPTY_COUNTS), subProjectCount: subs.get(p.id) ?? 0 }));
  }

  private async project(id: string): Promise<Project> {
    const p = isValidId(id) ? await this.work.findProject(id) : null;
    if (!p) throw projectNotFound();
    return p;
  }

  async projectDetails(id: string) {
    const project = await this.project(id);
    const isSub = Boolean(project.parentProjectId);
    const counts = await this.work.statusCounts('project', isSub ? { projectId: project.parentProjectId!, subProjectId: project.id } : { projectId: project.id, subProjectId: null });
    const c = counts.get(isSub ? project.parentProjectId! : project.id) ?? {};
    const todo = c.todo ?? 0;
    const inProgress = c.in_progress ?? 0;
    const done = c.done ?? 0;
    return { project, taskCounts: { total: todo + inProgress + done, todo, in_progress: inProgress, done } };
  }

  async subProjects(id: string) {
    const parent = await this.project(id);
    const list = await this.work.listProjects({ parentId: parent.id });
    const counts = await this.work.statusCounts('subProject', { subProjectId: undefined, projectId: parent.id });
    return list.map((p) => ({ project: p, taskCounts: tally(counts.get(p.id), EMPTY_COUNTS) }));
  }

  /** Makes a top-level project (without sub-projects of its own) a sub-project of another. */
  async moveProject(id: string, parentId: unknown) {
    if (!parentId) throw new BadRequestError('parentProject is required', 'MISSING_PARENT');
    const project = await this.project(id);
    if (project.id === String(parentId)) throw new BadRequestError('A project cannot be its own parent', 'SELF_REFERENCE');
    if (project.parentProjectId) throw new BadRequestError('Project is already a sub-project. Promote it first.', 'ALREADY_SUBPROJECT');
    const target = isValidId(parentId) ? await this.work.findProject(parentId) : null;
    if (!target) throw new AppError('Target project not found', 404, 'TARGET_NOT_FOUND');
    // New: a project that has sub-projects would create a second level.
    if (target.parentProjectId || ((await this.work.subProjectCounts([project.id])).get(project.id) ?? 0) > 0) {
      throw new BadRequestError('Cannot nest sub-projects more than one level deep', 'NESTING_NOT_ALLOWED');
    }
    await this.work.moveProject(project.id, target.id);
    return (await this.work.findProject(project.id))!;
  }

  async updateProject(id: string, body: Record<string, unknown>) {
    const project = await this.project(id);
    const engineers = body.assignedEngineers !== undefined ? idList(body.assignedEngineers) : undefined;
    const clients = body.clients !== undefined ? idList(body.clients) : undefined;
    if (engineers) await this.checkUsers(engineers, () => new BadRequestError('One or more assigned user IDs are invalid', 'INVALID_USER_IDS'));
    if (clients) await this.checkClients(clients);
    const patch: Record<string, unknown> = {};
    if (typeof body.name === 'string') {
      if (!body.name.trim()) throw new BadRequestError('Project name is required', 'NAME_REQUIRED');
      patch.name = body.name.trim().slice(0, 200);
    }
    if (body.description !== undefined) patch.description = typeof body.description === 'string' ? body.description.trim().slice(0, 2000) : null;
    const priority = priorityOf(body.priority);
    if (priority !== undefined) patch.priority = priority;
    await this.work.updateProject(project.id, patch, engineers, clients);
    return (await this.work.findProject(project.id))!;
  }

  async deleteProject(id: string) {
    const project = await this.project(id);
    if (((await this.work.subProjectCounts([project.id])).get(project.id) ?? 0) > 0) {
      throw new BadRequestError('Cannot delete project with existing sub-projects', 'PROJECT_HAS_SUBPROJECTS');
    }
    if ((await this.work.countTasksOf(project.id)) > 0) throw new BadRequestError('Cannot delete project with existing tasks', 'PROJECT_HAS_TASKS');
    await this.work.deleteProject(project.id);
  }

  // ════════════════ Tasks (CTO) ════════════════

  private async task(id: string): Promise<Task> {
    const t = isValidId(id) ? await this.work.findTask(id) : null;
    if (!t) throw taskNotFound();
    return t;
  }

  private async checkAssignees(ids: string[]) {
    await this.checkUsers(ids, () => new AppError('One or more assigned users not found', 404, 'USER_NOT_FOUND'));
  }

  async createTask(actor: Actor, body: Record<string, unknown>) {
    const project = isValidId(body.projectId) ? await this.work.findProject(body.projectId) : null;
    if (!project) throw projectNotFound();
    let subProjectId: string | null = null;
    if (body.subProjectId) {
      const sub = isValidId(body.subProjectId) ? await this.work.findProject(body.subProjectId) : null;
      if (!sub) throw new AppError('Sub-project not found', 404, 'SUBPROJECT_NOT_FOUND');
      if (sub.parentProjectId !== project.id) throw new BadRequestError('Sub-project does not belong to this project', 'SUBPROJECT_MISMATCH');
      subProjectId = sub.id;
    }
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) throw new BadRequestError('Task title is required', 'TITLE_REQUIRED');
    const assignees = idList(body.assignedTo);
    await this.checkAssignees(assignees);
    const id = await this.work.createTask(
      {
        projectId: project.id,
        subProjectId,
        title: title.slice(0, 300),
        description: typeof body.description === 'string' ? body.description.slice(0, 5000) : null,
        priority: priorityOf(body.priority) ?? 3,
        createdById: actor.id,
        dueDate: dateOf(body.dueDate),
        hardDeadline: dateOf(body.hardDeadline),
      },
      assignees,
    );
    if (assignees.length) await this.notifier.tasksAssigned(assignees, title).catch(() => undefined);
    return (await this.work.findTask(id))!;
  }

  tasks(q: Record<string, string | undefined>) {
    return this.work.listTasks({
      status: q.status || undefined,
      priority: q.priority ? Number(q.priority) : undefined,
      assignee: isValidId(q.assignedTo) ? q.assignedTo : undefined,
      projectId: isValidId(q.projectId) ? q.projectId : undefined,
      subProjectId: q.subProjectId === 'none' ? null : isValidId(q.subProjectId) ? q.subProjectId : undefined,
    });
  }

  taskDetails(id: string) {
    return this.task(id);
  }

  async updateTask(id: string, body: Record<string, unknown>) {
    const task = await this.task(id);
    const patch: Record<string, unknown> = {};
    if (typeof body.title === 'string') {
      if (!body.title.trim()) throw new BadRequestError('Task title is required', 'TITLE_REQUIRED');
      patch.title = body.title.trim().slice(0, 300);
    }
    if (body.description !== undefined) patch.description = typeof body.description === 'string' ? body.description.slice(0, 5000) : null;
    const priority = priorityOf(body.priority);
    if (priority !== undefined) patch.priority = priority;
    if (body.status !== undefined) {
      if (!TASK_STATUSES.includes(body.status as InternalTaskStatus)) throw new BadRequestError(`Status must be one of: ${TASK_STATUSES.join(', ')}`, 'INVALID_STATUS');
      patch.status = body.status;
      // Keep the completion time in step with the status (the old CTO edit left it unset).
      if (body.status === 'done' && task.status !== 'done') patch.completedAt = this.now();
      if (body.status !== 'done') patch.completedAt = null;
    }
    if (body.dueDate !== undefined) patch.dueDate = dateOf(body.dueDate);
    if (body.hardDeadline !== undefined) patch.hardDeadline = dateOf(body.hardDeadline);
    const assignees = body.assignedTo !== undefined ? idList(body.assignedTo) : undefined;
    if (assignees) await this.checkAssignees(assignees);
    await this.work.updateTask(task.id, patch, assignees);
    const updated = (await this.work.findTask(task.id))!;

    const before = new Set(task.assignees.map((a) => a.id));
    const added = updated.assignees.map((a) => a.id).filter((a) => !before.has(a));
    if (added.length) await this.notifier.tasksAssigned(added, updated.title).catch(() => undefined);
    if (priority !== undefined && priority !== task.priority && updated.assignees.length) {
      await this.notifier.toUsers(updated.assignees.map((a) => a.id), 'Task Priority Updated', updated.title).catch(() => undefined);
    }
    if (updated.source === 'client' && updated.clientId && patch.status && patch.status !== task.status) {
      const first = task.status === 'pending_review';
      await this.notifier
        .toUsers(
          [updated.clientId],
          first ? 'Request Approved' : 'Request Status Updated',
          first ? `Your request "${updated.title}" has been reviewed and is now underway.` : `Your request "${updated.title}" is now ${updated.status.replace('_', ' ')}.`,
        )
        .catch(() => undefined);
    }
    return updated;
  }

  async declineTask(id: string, reason: unknown) {
    if (typeof reason !== 'string' || !reason.trim()) throw new BadRequestError('A reason is required to decline a request', 'REASON_REQUIRED');
    const task = await this.task(id);
    if (task.source !== 'client') throw new BadRequestError('Only client requests can be declined', 'NOT_CLIENT_TASK');
    await this.work.updateTask(task.id, { status: 'declined', rejectedReason: reason.trim().slice(0, 1000) });
    if (task.clientId) await this.notifier.toUsers([task.clientId], 'Request Declined', `Your request "${task.title}" was declined: ${reason.trim()}`).catch(() => undefined);
    return (await this.work.findTask(task.id))!;
  }

  /** Only tasks not yet started can be deleted. */
  async deleteTask(id: string) {
    const task = await this.task(id);
    if (task.status !== 'todo') {
      throw new BadRequestError(`Cannot delete task with status '${task.status}'. Only tasks with status 'todo' can be deleted.`, 'TASK_NOT_DELETABLE');
    }
    await this.work.deleteTask(task.id);
    for (const img of [...task.attachments, ...task.submissionImages]) await this.storage.remove({ bucket: this.imagesBucket, path: img.publicId });
  }

  private async storeImages(taskId: string, folder: string, files: UploadedFile[] | undefined, extra: Partial<TaskImage>) {
    if (!files || files.length === 0) throw new BadRequestError('No image files provided', 'NO_FILES');
    const stored: TaskImage[] = [];
    for (const file of files) {
      const { path } = await this.storage.upload({
        bucket: this.imagesBucket,
        path: `tasks/${taskId}/${folder}/${this.now().getTime()}-${sanitizeFilename(file.originalname)}`,
        body: file.buffer,
        contentType: file.mimetype,
      });
      stored.push({ publicId: path, ...extra });
    }
    return stored;
  }

  async addAttachments(id: string, files: UploadedFile[] | undefined) {
    const task = await this.task(id);
    const added = await this.storeImages(task.id, 'attachments', files, {});
    const withNames = added.map((a, i) => ({ ...a, name: files![i]!.originalname }));
    const attachments = [...task.attachments, ...withNames];
    await this.work.updateTask(task.id, { attachments });
    return attachments;
  }

  async deleteAttachment(id: string, publicId: string) {
    const task = await this.task(id);
    const key = decodeURIComponent(publicId);
    if (!task.attachments.some((a) => a.publicId === key)) throw new AppError('Attachment not found', 404, 'ATTACHMENT_NOT_FOUND');
    await this.storage.remove({ bucket: this.imagesBucket, path: key });
    await this.work.updateTask(task.id, { attachments: task.attachments.filter((a) => a.publicId !== key) });
  }

  async clientMedia(id: string, actor?: Actor) {
    const task = await this.task(id);
    if (actor && !task.assignees.some((a) => a.id === actor.id)) throw notAssigned();
    return this.mediaWithUrls(task.clientMedia);
  }

  // ════════════════ Engineers ════════════════

  async myProjects(actor: Actor) {
    const list = await this.work.listProjects({ member: { userId: actor.id, role: 'engineer' } });
    const counts = await this.work.statusCounts('project', { projectIds: list.map((p) => p.id), assignee: actor.id });
    return list.map((p) => ({ project: p, myTaskCounts: tally(counts.get(p.id), EMPTY_COUNTS) }));
  }

  async myProject(actor: Actor, id: string) {
    const p = await this.project(id);
    if (!p.engineers.some((e) => e.id === actor.id)) throw projectNotFound();
    return p;
  }

  myTasks(actor: Actor, q: Record<string, string | undefined>) {
    const now = this.now();
    let range: { from: Date; to: Date } | undefined;
    if (q.completionFilter === 'today') range = { from: new Date(now.getFullYear(), now.getMonth(), now.getDate()), to: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) };
    else if (q.completionFilter === 'week') {
      const fromMonday = now.getDay() === 0 ? 6 : now.getDay() - 1;
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - fromMonday);
      range = { from, to: new Date(from.getFullYear(), from.getMonth(), from.getDate() + 7) };
    } else if (q.completionFilter === 'month') range = { from: new Date(now.getFullYear(), now.getMonth(), 1), to: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
    return this.work.listTasks({
      assignee: actor.id,
      status: q.status || undefined,
      priority: q.priority ? Number(q.priority) : undefined,
      projectId: isValidId(q.projectId) ? q.projectId : undefined,
      completedFrom: range?.from,
      completedTo: range?.to,
    });
  }

  private async assignedTask(actor: Actor, id: string) {
    const task = await this.task(id);
    if (!task.assignees.some((a) => a.id === actor.id)) throw notAssigned();
    return task;
  }

  /** todo → in_progress → done (and back one step). */
  async setStatus(actor: Actor, id: string, status: unknown) {
    const valid = ['todo', 'in_progress', 'done'];
    if (!valid.includes(status as string)) throw new BadRequestError(`Invalid status '${String(status)}'. Must be one of: ${valid.join(', ')}`, 'INVALID_STATUS');
    const task = await this.assignedTask(actor, id);
    const allowed: Record<string, string[]> = { todo: ['in_progress'], in_progress: ['todo', 'done'], done: ['in_progress'] };
    if (!(allowed[task.status] ?? []).includes(status as string)) {
      throw new BadRequestError(`Invalid status transition from '${task.status}' to '${String(status)}'.`, 'INVALID_TRANSITION');
    }
    await this.work.updateTask(task.id, { status: status as InternalTaskStatus, completedAt: status === 'done' ? this.now() : null });
    const title = status === 'done' ? 'Task Completed' : status === 'in_progress' ? 'Task In Progress' : null;
    if (title && task.createdById) await this.notifier.toUsers([task.createdById], title, task.title).catch(() => undefined);
    if (task.source === 'client' && task.clientId) {
      await this.notifier.toUsers([task.clientId], 'Request Status Updated', `Your request "${task.title}" is now ${String(status).replace('_', ' ')}.`).catch(() => undefined);
    }
    return (await this.work.findTask(task.id))!;
  }

  async addSubmissionImages(actor: Actor, id: string, files: UploadedFile[] | undefined) {
    const task = await this.assignedTask(actor, id);
    const added = await this.storeImages(task.id, 'submissions', files, { uploadedBy: actor.id, uploadedAt: this.now().toISOString() });
    await this.work.updateTask(task.id, { submissionImages: [...task.submissionImages, ...added] });
    return (await this.work.findTask(task.id))!;
  }

  async deleteSubmissionImage(actor: Actor, id: string, publicId: string) {
    const task = await this.task(id);
    const key = decodeURIComponent(publicId);
    const img = task.submissionImages.find((i) => i.publicId === key);
    if (!img) throw new AppError('Image not found', 404, 'IMAGE_NOT_FOUND');
    if (img.uploadedBy !== actor.id) throw new BadRequestError('You can only delete your own submission images', 'NOT_OWNER');
    await this.storage.remove({ bucket: this.imagesBucket, path: key });
    await this.work.updateTask(task.id, { submissionImages: task.submissionImages.filter((i) => i.publicId !== key) });
  }

  async setSubmission(actor: Actor, id: string, body: { links?: unknown; note?: unknown }) {
    const task = await this.assignedTask(actor, id);
    const patch: Record<string, unknown> = {};
    if (body.links !== undefined) {
      const links = (Array.isArray(body.links) ? body.links : [body.links]).map((l) => (typeof l === 'string' ? l.trim() : '')).filter(Boolean);
      if (links.some((l) => !isHttpsUrl(l))) throw new BadRequestError('One or more links are not valid HTTPS URLs', 'INVALID_LINKS');
      patch.submissionLinks = links;
    }
    if (typeof body.note === 'string') patch.submissionNote = body.note.trim().slice(0, 1000);
    await this.work.updateTask(task.id, patch);
    return (await this.work.findTask(task.id))!;
  }

  // ════════════════ Sub-tasks ════════════════

  async subTasks(taskId: string, actor?: Actor) {
    const task = await this.task(taskId);
    if (actor && !task.assignees.some((a) => a.id === actor.id)) throw new ForbiddenError('You are not assigned to this task', 'NOT_ASSIGNED');
    return this.work.subTasks(task.id);
  }

  async createSubTask(actor: Actor, taskId: string, body: { title?: unknown; note?: unknown }) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) throw new BadRequestError('Sub-task title is required', 'TITLE_REQUIRED');
    const task = await this.task(taskId);
    if (!task.assignees.some((a) => a.id === actor.id)) throw new ForbiddenError('You are not assigned to this task', 'NOT_ASSIGNED');
    return this.work.createSubTask({ taskId: task.id, title: title.slice(0, 500), note: typeof body.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 2000) : null, createdById: actor.id });
  }

  private async subTask(id: string) {
    const s = isValidId(id) ? await this.work.findSubTask(id) : null;
    if (!s) throw new AppError('Sub-task not found', 404, 'SUBTASK_NOT_FOUND');
    return s;
  }

  async toggleSubTask(actor: Actor, id: string) {
    const s = await this.subTask(id);
    if (s.createdById !== actor.id) throw new ForbiddenError('You can only update your own sub-tasks', 'NOT_OWNER');
    return this.work.updateSubTask(s.id, { isDone: !s.isDone });
  }

  /** The CTO can delete any sub-task; engineers only their own. */
  async deleteSubTask(id: string, actor?: Actor) {
    const s = await this.subTask(id);
    if (actor && s.createdById !== actor.id) throw new ForbiddenError('You can only delete your own sub-tasks', 'NOT_OWNER');
    await this.work.deleteSubTask(s.id);
  }

  // ════════════════ Deadline extensions ════════════════

  async requestExtension(actor: Actor, taskId: string, body: { reason?: unknown; proposedDate?: unknown }) {
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (!reason) throw new BadRequestError('Reason is required', 'REASON_REQUIRED');
    if (!body.proposedDate) throw new BadRequestError('Proposed date is required', 'DATE_REQUIRED');
    const task = await this.task(taskId);
    if (!task.assignees.some((a) => a.id === actor.id)) throw new ForbiddenError('You are not assigned to this task', 'NOT_ASSIGNED');
    const proposed = new Date(String(body.proposedDate));
    if (Number.isNaN(proposed.getTime())) throw new BadRequestError('Invalid date', 'INVALID_DATE');
    if ((await this.work.extensions({ taskId: task.id, requestedById: actor.id, status: 'pending' })).length) {
      throw new BadRequestError('You already have a pending extension request for this task', 'ALREADY_PENDING');
    }
    const request = await this.work.createExtension({ taskId: task.id, requestedById: actor.id, reason: reason.slice(0, 1000), proposedDate: proposed });
    if (task.createdById) await this.notifier.toUsers([task.createdById], 'Extension Request', `${actor.name} requested extra time for: ${task.title}`).catch(() => undefined);
    return request;
  }

  myExtensions(actor: Actor, taskId: string) {
    return isValidId(taskId) ? this.work.extensions({ taskId, requestedById: actor.id }) : Promise.resolve([]);
  }

  async cancelExtension(actor: Actor, id: string) {
    const request = isValidId(id) ? await this.work.findExtension(id) : null;
    if (!request) throw new AppError('Request not found', 404, 'REQUEST_NOT_FOUND');
    if (request.requestedById !== actor.id) throw new ForbiddenError('Not your request', 'NOT_OWNER');
    if (request.status !== 'pending') throw new BadRequestError('Only pending requests can be cancelled', 'NOT_PENDING');
    await this.work.deleteExtension(request.id);
  }

  extensions(q: Record<string, string | undefined>) {
    return this.work.extensions({ taskId: isValidId(q.taskId) ? q.taskId : undefined, status: q.status || undefined });
  }

  /** Approving moves the task's due date to the proposed one. */
  async reviewExtension(actor: Actor, id: string, body: { action?: unknown; reviewNote?: unknown }) {
    if (body.action !== 'approved' && body.action !== 'rejected') throw new BadRequestError('action must be "approved" or "rejected"', 'INVALID_ACTION');
    const request = isValidId(id) ? await this.work.findExtension(id) : null;
    if (!request) throw new AppError('Request not found', 404, 'REQUEST_NOT_FOUND');
    const note = typeof body.reviewNote === 'string' ? body.reviewNote.trim().slice(0, 500) : '';
    const reviewed = await this.work.reviewExtension(
      request.id,
      { status: body.action, reviewedById: actor.id, reviewNote: note, reviewedAt: this.now() },
      body.action === 'approved' ? { taskId: request.taskId, date: request.proposedDate } : undefined,
    );
    if (!reviewed) throw new BadRequestError('Request has already been reviewed', 'ALREADY_REVIEWED');
    const title = request.task?.title;
    await this.notifier
      .toUsers(
        [request.requestedById],
        body.action === 'approved' ? 'Extension Approved' : 'Extension Rejected',
        body.action === 'approved' ? `Your extension request for "${title}" was approved` : `Your extension request for "${title}" was rejected${note ? `: ${note}` : ''}`,
      )
      .catch(() => undefined);
    return (await this.work.findExtension(request.id))!;
  }

  // ════════════════ Clients ════════════════

  async clientProjects(actor: Actor) {
    const list = (await this.work.listProjects({ member: { userId: actor.id, role: 'client' } })).filter((p) => !p.parentProjectId);
    const counts = await this.work.statusCounts('project', { projectIds: list.map((p) => p.id), source: 'client' });
    return list
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((p) => ({ project: p, taskCounts: tally(counts.get(p.id), CLIENT_COUNTS) }));
  }

  private async linkedProjectIds(actor: Actor) {
    return (await this.work.listProjects({ member: { userId: actor.id, role: 'client' } })).map((p) => p.id);
  }

  async clientProject(actor: Actor, id: string) {
    const p = await this.project(id);
    if (!p.clients.some((c) => c.id === actor.id)) throw projectNotFound();
    return p;
  }

  async clientTasks(actor: Actor, q: Record<string, string | undefined>) {
    const ids = await this.linkedProjectIds(actor);
    if (ids.length === 0) return [];
    if (q.projectId && !ids.includes(q.projectId)) throw new BadRequestError('You are not linked to this project', 'NOT_LINKED');
    return this.work.listTasks({ projectIds: q.projectId ? [q.projectId] : ids, source: 'client', status: q.status || undefined }, 'newest');
  }

  async clientTask(actor: Actor, id: string) {
    const task = isValidId(id) ? await this.work.findTask(id) : null;
    if (!task || task.source !== 'client' || !(await this.linkedProjectIds(actor)).includes(task.projectId)) throw taskNotFound();
    return task;
  }

  async clientRequest(actor: Actor, body: { projectId?: unknown; title?: unknown; description?: unknown; clientUrgency?: unknown }) {
    if (!body.projectId) throw new BadRequestError('projectId is required', 'MISSING_PROJECT');
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) throw new BadRequestError('Title is required', 'MISSING_TITLE');
    const project = isValidId(body.projectId) ? await this.work.findProject(body.projectId) : null;
    if (!project || !project.clients.some((c) => c.id === actor.id)) throw new BadRequestError('You are not linked to this project', 'NOT_LINKED');
    const urgency = body.clientUrgency || null;
    if (urgency && !['whenever', 'soon', 'urgent'].includes(urgency as string)) throw new BadRequestError('Invalid urgency value', 'INVALID_URGENCY');
    const id = await this.work.createTask(
      {
        projectId: project.id,
        title: title.slice(0, 300),
        description: typeof body.description === 'string' ? body.description.trim().slice(0, 5000) : '',
        priority: 3,
        source: 'client',
        clientId: actor.id,
        clientUrgency: urgency as 'whenever' | 'soon' | 'urgent' | null,
        status: 'pending_review',
        createdById: actor.id,
      },
      [],
    );
    const managers = (await this.work.staff()).filter((u) => ['cto', 'admin', 'superadmin'].includes(u.role)).map((u) => u.id);
    await this.notifier.toUsers(managers, 'New Client Request', `${actor.name} submitted "${title}" on ${project.name}`).catch(() => undefined);
    return (await this.work.findTask(id))!;
  }

  private async ownPending(actor: Actor, id: string, verb: 'added' | 'removed') {
    const task = isValidId(id) ? await this.work.findTask(id) : null;
    if (!task || task.source !== 'client' || task.clientId !== actor.id) throw taskNotFound();
    if (task.status !== 'pending_review') throw new BadRequestError(`Media can only be ${verb} while the request is pending review`, 'NOT_PENDING');
    return task;
  }

  async addMedia(actor: Actor, id: string, file: UploadedFile | undefined, durationSeconds: unknown) {
    const task = await this.ownPending(actor, id, 'added');
    if (!file) throw new BadRequestError('No file provided', 'NO_FILE');
    if (task.clientMedia.length >= MAX_MEDIA_ITEMS) throw new BadRequestError(`Maximum ${MAX_MEDIA_ITEMS} media files per request`, 'MEDIA_LIMIT');
    const kind = MEDIA_KINDS[file.mimetype];
    if (!kind) throw new BadRequestError(`Unsupported file type: ${file.mimetype}`, 'UNSUPPORTED_TYPE');
    if (file.size > MEDIA_MAX_BYTES[kind]) throw new BadRequestError(`${kind} files must be under ${Math.round(MEDIA_MAX_BYTES[kind] / (1024 * 1024))}MB`, 'FILE_TOO_LARGE');
    const { bucket, path } = await this.storage.upload({
      bucket: this.mediaBucket,
      path: `${task.id}/${this.now().getTime()}-${sanitizeFilename(file.originalname)}`,
      body: file.buffer,
      contentType: file.mimetype,
    });
    const duration = durationSeconds !== undefined && durationSeconds !== '' ? Number(durationSeconds) : undefined;
    const item: ClientMedia = {
      _id: newId(),
      kind,
      storageBucket: bucket,
      storagePath: path,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      ...(duration !== undefined && Number.isFinite(duration) ? { durationSeconds: duration } : {}),
      name: file.originalname,
      uploadedAt: this.now().toISOString(),
    };
    await this.work.updateTask(task.id, { clientMedia: [...task.clientMedia, item] });
    return (await this.mediaWithUrls([item]))[0]!;
  }

  async clientMediaList(actor: Actor, id: string) {
    return this.mediaWithUrls((await this.clientTask(actor, id)).clientMedia);
  }

  async deleteMedia(actor: Actor, id: string, mediaId: string) {
    const task = await this.ownPending(actor, id, 'removed');
    const item = task.clientMedia.find((m) => m._id === mediaId);
    if (!item) throw new AppError('Media not found', 404, 'MEDIA_NOT_FOUND');
    await this.storage.remove({ bucket: item.storageBucket, path: item.storagePath });
    await this.work.updateTask(task.id, { clientMedia: task.clientMedia.filter((m) => m._id !== mediaId) });
  }
}
