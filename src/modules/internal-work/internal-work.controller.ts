import type { Request, Response } from 'express';
import { currentUser } from '../../shared/http/request-user';
import type { Extension, Person, Project, SubTask, Task, WorkSession } from './internal-work.repository';
import type { InternalWorkService, UploadedFile } from './internal-work.service';
import type { TaskImage, WorkSessionRow } from './internal-work.table';
import type { CtoAnalyticsService, WorkSessionService } from './work-time.service';

const ref = (p: Person | null, id: string | null, fields: 'name' | 'nameEmail' | 'full' = 'nameEmail') =>
  p ? (fields === 'name' ? { _id: p.id, name: p.name } : fields === 'full' ? { _id: p.id, name: p.name, email: p.email, role: p.role } : { _id: p.id, name: p.name, email: p.email }) : id;

function projectDoc(p: Project, opts: { engineers?: boolean; clients?: boolean; creator?: 'name' | 'nameEmail' } = {}) {
  const { engineers = true, clients = true, creator = 'nameEmail' } = opts;
  return {
    _id: p.id,
    name: p.name,
    description: p.description,
    priority: p.priority,
    createdBy: ref(p.createdBy, p.createdById, creator),
    assignedEngineers: engineers ? p.engineers.map((e) => ref(e, e.id)) : p.engineers.map((e) => e.id),
    clients: clients ? p.clients.map((c) => ref(c, c.id)) : p.clients.map((c) => c.id),
    parentProject: p.parent ? { _id: p.parent.id, name: p.parent.name, priority: p.parent.priority } : p.parentProjectId,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

type ImageUrl = (img: TaskImage) => string;

function submissionDoc(t: Task, url: ImageUrl) {
  return {
    images: t.submissionImages.map((i) => ({ url: url(i), publicId: i.publicId, uploadedBy: i.uploadedBy, uploadedAt: i.uploadedAt })),
    links: t.submissionLinks,
    note: t.submissionNote,
  };
}

function taskDoc(t: Task, url: ImageUrl) {
  const place = (x: { id: string; name: string; priority: number } | null, id: string | null) => (x ? { _id: x.id, name: x.name, priority: x.priority } : id);
  return {
    _id: t.id,
    projectId: place(t.project, t.projectId),
    subProjectId: place(t.subProject, t.subProjectId),
    title: t.title,
    description: t.description,
    priority: t.priority,
    status: t.status,
    assignedTo: t.assignees.map((a) => ref(a, a.id)),
    createdBy: ref(t.createdBy, t.createdById),
    dueDate: t.dueDate,
    hardDeadline: t.hardDeadline,
    completedAt: t.completedAt,
    attachments: t.attachments.map((a) => ({ url: url(a), publicId: a.publicId, name: a.name ?? '' })),
    submission: submissionDoc(t, url),
    source: t.source,
    clientId: ref(t.client, t.clientId),
    clientUrgency: t.clientUrgency,
    rejectedReason: t.rejectedReason,
    clientMedia: t.clientMedia,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

const subTaskDoc = (s: SubTask) => ({ _id: s.id, taskId: s.taskId, title: s.title, note: s.note, isDone: s.isDone, createdBy: ref(s.createdBy, s.createdById, 'full'), createdAt: s.createdAt, updatedAt: s.updatedAt });

const extensionDoc = (e: Extension) => ({
  _id: e.id,
  taskId: e.task ? { _id: e.task.id, title: e.task.title, dueDate: e.task.dueDate, hardDeadline: e.task.hardDeadline, projectId: e.task.projectId } : e.taskId,
  requestedBy: ref(e.requestedBy, e.requestedById, 'full'),
  reason: e.reason,
  proposedDate: e.proposedDate,
  status: e.status,
  reviewedBy: e.reviewedBy ? { _id: e.reviewedBy.id, name: e.reviewedBy.name } : e.reviewedById,
  reviewNote: e.reviewNote,
  reviewedAt: e.reviewedAt,
  createdAt: e.createdAt,
  updatedAt: e.updatedAt,
});

const sessionDoc = (s: WorkSessionRow | WorkSession) => ({
  _id: s.id,
  user: 'user' in s && s.user ? { _id: s.user.id, name: s.user.name, email: s.user.email, role: s.user.role } : s.userId,
  clockIn: s.clockIn,
  clockOut: s.clockOut,
  durationMinutes: s.durationMinutes,
  autoClosed: s.autoClosed,
  editedBy: s.editedById,
  createdAt: s.createdAt,
  updatedAt: s.updatedAt,
});

const actor = (req: Request) => {
  const u = currentUser(req);
  return { id: u.id, role: u.role, name: u.name };
};
const body = (req: Request) => (req.body ?? {}) as Record<string, unknown>;
const query = (req: Request) => req.query as Record<string, string | undefined>;
const files = (req: Request) => (Array.isArray(req.files) ? (req.files as UploadedFile[]) : undefined);
type IdReq = Request<{ id: string }>;
type TaskIdReq = Request<{ taskId: string }>;
type ImgReq = Request<{ id: string; publicId: string }>;

/** /api/cto/internal — CTO, admins. */
export class CtoWorkController {
  constructor(
    private readonly work: InternalWorkService,
    private readonly hours: WorkSessionService,
    private readonly analytics: CtoAnalyticsService,
  ) {}

  private tasks = (list: Task[]) => list.map((t) => taskDoc(t, (i) => this.work.imageUrl(i)));
  private taskOne = (t: Task) => taskDoc(t, (i) => this.work.imageUrl(i));

  engineers = async (_req: Request, res: Response) => {
    res.json({ success: true, data: (await this.work.staff()).map((u) => ({ _id: u.id, name: u.name, email: u.email, role: u.role })) });
  };

  clients = async (_req: Request, res: Response) => {
    res.json({ success: true, data: (await this.work.clients()).map((u) => ({ _id: u.id, name: u.name, email: u.email, role: u.role })) });
  };

  getAnalytics = async (_req: Request, res: Response) => {
    res.json({ success: true, data: await this.analytics.overview() });
  };

  setEmployeeOfMonth = async (req: Request, res: Response) => {
    const u = await this.analytics.pick(body(req).userId);
    res.json({ success: true, message: 'Employee of the Month updated', data: { _id: u.id, name: u.name, email: u.email, role: u.role } });
  };

  clearEmployeeOfMonth = async (_req: Request, res: Response) => {
    await this.analytics.clear();
    res.json({ success: true, message: 'Override cleared — score-based selection restored' });
  };

  createProject = async (req: Request, res: Response) => {
    res.status(201).json({ success: true, message: 'Project created', data: projectDoc(await this.work.createProject(actor(req), body(req))) });
  };

  projects = async (_req: Request, res: Response) => {
    const list = await this.work.projects();
    res.json({ success: true, count: list.length, data: list.map((p) => ({ ...projectDoc(p.project), taskCounts: p.taskCounts, subProjectCount: p.subProjectCount })) });
  };

  project = async (req: IdReq, res: Response) => {
    const { project, taskCounts } = await this.work.projectDetails(req.params.id);
    res.json({ success: true, data: { project: projectDoc(project), taskCounts } });
  };

  subProjects = async (req: IdReq, res: Response) => {
    const list = await this.work.subProjects(req.params.id);
    res.json({ success: true, count: list.length, data: list.map((p) => ({ ...projectDoc(p.project, { clients: false }), taskCounts: p.taskCounts })) });
  };

  moveProject = async (req: IdReq, res: Response) => {
    res.json({ success: true, message: 'Project moved successfully', data: projectDoc(await this.work.moveProject(req.params.id, body(req).parentProject)) });
  };

  updateProject = async (req: IdReq, res: Response) => {
    res.json({ success: true, message: 'Project updated', data: projectDoc(await this.work.updateProject(req.params.id, body(req))) });
  };

  deleteProject = async (req: IdReq, res: Response) => {
    await this.work.deleteProject(req.params.id);
    res.json({ success: true, message: 'Project deleted successfully', data: null });
  };

  createTask = async (req: Request, res: Response) => {
    res.status(201).json({ success: true, message: 'Task created', data: this.taskOne(await this.work.createTask(actor(req), body(req))) });
  };

  listTasks = async (req: Request, res: Response) => {
    const list = await this.work.tasks(query(req));
    res.json({ success: true, count: list.length, data: this.tasks(list) });
  };

  task = async (req: IdReq, res: Response) => {
    res.json({ success: true, data: this.taskOne(await this.work.taskDetails(req.params.id)) });
  };

  updateTask = async (req: IdReq, res: Response) => {
    res.json({ success: true, message: 'Task updated', data: this.taskOne(await this.work.updateTask(req.params.id, body(req))) });
  };

  deleteTask = async (req: IdReq, res: Response) => {
    await this.work.deleteTask(req.params.id);
    res.json({ success: true, message: 'Task deleted successfully', data: null });
  };

  declineTask = async (req: IdReq, res: Response) => {
    res.json({ success: true, message: 'Request declined', data: this.taskOne(await this.work.declineTask(req.params.id, body(req).rejectedReason)) });
  };

  clientMedia = async (req: IdReq, res: Response) => {
    res.json({ success: true, data: await this.work.clientMedia(req.params.id) });
  };

  addAttachments = async (req: IdReq, res: Response) => {
    const list = await this.work.addAttachments(req.params.id, files(req));
    res.status(201).json({ success: true, message: 'Attachments uploaded', data: list.map((a) => ({ url: this.work.imageUrl(a), publicId: a.publicId, name: a.name ?? '' })) });
  };

  deleteAttachment = async (req: ImgReq, res: Response) => {
    await this.work.deleteAttachment(req.params.id, req.params.publicId);
    res.json({ success: true, message: 'Attachment deleted', data: null });
  };

  subTasks = async (req: TaskIdReq, res: Response) => {
    const list = await this.work.subTasks(req.params.taskId);
    res.json({ success: true, count: list.length, data: list.map(subTaskDoc) });
  };

  deleteSubTask = async (req: IdReq, res: Response) => {
    await this.work.deleteSubTask(req.params.id);
    res.json({ success: true, message: 'Sub-task deleted', data: null });
  };

  staff = async (_req: Request, res: Response) => {
    const list = await this.hours.staff();
    res.json({ success: true, data: list.map((u) => ({ _id: u.id, name: u.name, email: u.email, role: u.role, isHourly: u.isHourly, workingSince: u.workingSince })) });
  };

  setHourly = async (req: IdReq, res: Response) => {
    const u = await this.hours.setHourly(req.params.id, body(req).isHourly);
    res.json({ success: true, data: { _id: u.id, name: u.name, email: u.email, role: u.role, isHourly: u.isHourly } });
  };

  sessions = async (req: Request, res: Response) => {
    const list = await this.hours.all(query(req));
    res.json({ success: true, count: list.length, data: list.map(sessionDoc) });
  };

  editSession = async (req: IdReq, res: Response) => {
    res.json({ success: true, data: sessionDoc(await this.hours.edit(currentUser(req).id, req.params.id, body(req))) });
  };

  deleteSession = async (req: IdReq, res: Response) => {
    await this.hours.delete(req.params.id);
    res.json({ success: true, data: { _id: req.params.id } });
  };

  extensions = async (req: Request, res: Response) => {
    const list = await this.work.extensions(query(req));
    res.json({ success: true, count: list.length, data: list.map(extensionDoc) });
  };

  reviewExtension = async (req: IdReq, res: Response) => {
    const e = await this.work.reviewExtension(actor(req), req.params.id, body(req));
    res.json({ success: true, message: `Request ${e.status}`, data: extensionDoc(e) });
  };
}

/** /api/engineer — any signed-in staff member working on internal tasks. */
export class EngineerController {
  constructor(
    private readonly work: InternalWorkService,
    private readonly hours: WorkSessionService,
  ) {}

  private taskOne = (t: Task) => taskDoc(t, (i) => this.work.imageUrl(i));

  projects = async (req: Request, res: Response) => {
    const list = await this.work.myProjects(actor(req));
    res.json({ success: true, count: list.length, data: list.map((p) => ({ ...projectDoc(p.project, { engineers: false, clients: false, creator: 'name' }), myTaskCounts: p.myTaskCounts })) });
  };

  project = async (req: IdReq, res: Response) => {
    res.json({ success: true, data: projectDoc(await this.work.myProject(actor(req), req.params.id), { clients: false, creator: 'name' }) });
  };

  tasks = async (req: Request, res: Response) => {
    const list = await this.work.myTasks(actor(req), query(req));
    res.json({ success: true, count: list.length, data: list.map(this.taskOne) });
  };

  setStatus = async (req: IdReq, res: Response) => {
    res.json({ success: true, data: this.taskOne(await this.work.setStatus(actor(req), req.params.id, body(req).status)) });
  };

  clientMedia = async (req: IdReq, res: Response) => {
    res.json({ success: true, data: await this.work.clientMedia(req.params.id, actor(req)) });
  };

  addSubmissionImages = async (req: IdReq, res: Response) => {
    const t = await this.work.addSubmissionImages(actor(req), req.params.id, files(req));
    res.status(201).json({ success: true, message: 'Submission images uploaded', data: submissionDoc(t, (i) => this.work.imageUrl(i)) });
  };

  deleteSubmissionImage = async (req: ImgReq, res: Response) => {
    await this.work.deleteSubmissionImage(actor(req), req.params.id, req.params.publicId);
    res.json({ success: true, message: 'Image deleted', data: null });
  };

  setSubmission = async (req: IdReq, res: Response) => {
    const t = await this.work.setSubmission(actor(req), req.params.id, body(req));
    res.json({ success: true, message: 'Submission updated', data: submissionDoc(t, (i) => this.work.imageUrl(i)) });
  };

  subTasks = async (req: TaskIdReq, res: Response) => {
    const list = await this.work.subTasks(req.params.taskId, actor(req));
    res.json({ success: true, count: list.length, data: list.map(subTaskDoc) });
  };

  createSubTask = async (req: TaskIdReq, res: Response) => {
    res.status(201).json({ success: true, message: 'Sub-task created', data: subTaskDoc(await this.work.createSubTask(actor(req), req.params.taskId, body(req))) });
  };

  toggleSubTask = async (req: IdReq, res: Response) => {
    res.json({ success: true, message: 'Sub-task updated', data: subTaskDoc(await this.work.toggleSubTask(actor(req), req.params.id)) });
  };

  deleteSubTask = async (req: IdReq, res: Response) => {
    await this.work.deleteSubTask(req.params.id, actor(req));
    res.json({ success: true, message: 'Sub-task deleted', data: null });
  };

  workStatus = async (req: Request, res: Response) => {
    const { isHourly, active } = await this.hours.status(currentUser(req).id);
    res.json({ success: true, data: { isHourly, active: active ? sessionDoc(active) : null } });
  };

  startWork = async (req: Request, res: Response) => {
    res.status(201).json({ success: true, data: sessionDoc(await this.hours.start(currentUser(req).id)) });
  };

  stopWork = async (req: Request, res: Response) => {
    res.json({ success: true, data: sessionDoc(await this.hours.stop(currentUser(req).id)) });
  };

  mySessions = async (req: Request, res: Response) => {
    const list = await this.hours.mine(currentUser(req).id, query(req));
    res.json({ success: true, count: list.length, data: list.map((s) => ({ ...sessionDoc(s), user: s.userId })) });
  };

  requestExtension = async (req: TaskIdReq, res: Response) => {
    res.status(201).json({ success: true, message: 'Extension request submitted', data: extensionDoc(await this.work.requestExtension(actor(req), req.params.taskId, body(req))) });
  };

  myExtensions = async (req: TaskIdReq, res: Response) => {
    res.json({ success: true, data: (await this.work.myExtensions(actor(req), req.params.taskId)).map(extensionDoc) });
  };

  cancelExtension = async (req: IdReq, res: Response) => {
    await this.work.cancelExtension(actor(req), req.params.id);
    res.json({ success: true, message: 'Request cancelled', data: null });
  };
}

/** /api/client — client accounts following their projects and sending requests. */
export class ClientController {
  constructor(private readonly work: InternalWorkService) {}

  private taskOne = (t: Task) => {
    const doc = taskDoc(t, (i) => this.work.imageUrl(i));
    return { ...doc, assignedTo: t.assignees.map((a) => ({ _id: a.id, name: a.name })), projectId: t.project ? { _id: t.project.id, name: t.project.name } : t.projectId };
  };

  projects = async (req: Request, res: Response) => {
    const list = await this.work.clientProjects(actor(req));
    res.json({ success: true, count: list.length, data: list.map((p) => ({ ...projectDoc(p.project, { clients: false }), taskCounts: p.taskCounts })) });
  };

  project = async (req: IdReq, res: Response) => {
    res.json({ success: true, data: projectDoc(await this.work.clientProject(actor(req), req.params.id)) });
  };

  tasks = async (req: Request, res: Response) => {
    const list = await this.work.clientTasks(actor(req), query(req));
    res.json({ success: true, count: list.length, data: list.map(this.taskOne) });
  };

  task = async (req: IdReq, res: Response) => {
    res.json({ success: true, data: this.taskOne(await this.work.clientTask(actor(req), req.params.id)) });
  };

  createTask = async (req: Request, res: Response) => {
    res.status(201).json({ success: true, message: 'Request submitted', data: this.taskOne(await this.work.clientRequest(actor(req), body(req))) });
  };

  addMedia = async (req: IdReq, res: Response) => {
    const item = await this.work.addMedia(actor(req), req.params.id, req.file as UploadedFile | undefined, body(req).durationSeconds);
    res.status(201).json({ success: true, message: 'Media uploaded', data: item });
  };

  media = async (req: IdReq, res: Response) => {
    res.json({ success: true, data: await this.work.clientMediaList(actor(req), req.params.id) });
  };

  deleteMedia = async (req: Request<{ id: string; mediaId: string }>, res: Response) => {
    await this.work.deleteMedia(actor(req), req.params.id, req.params.mediaId);
    res.json({ success: true, message: 'Media deleted', data: null });
  };
}
