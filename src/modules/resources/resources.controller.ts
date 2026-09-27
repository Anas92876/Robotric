import type { Request, Response } from 'express';
import { currentUser } from '../../shared/http/request-user';
import type { Group } from '../groups/groups.repository';
import type { Assignment, Resource } from './resources.repository';
import type { ResourceService, UploadedPdf } from './resources.service';

/** The old document; `fileUrl` has always been the storage path, not a link. */
function resourceDoc(r: Resource, uploaderFields: 'full' | 'name' = 'full') {
  return {
    _id: r.id,
    title: r.title,
    description: r.description,
    originalName: r.originalName,
    fileSize: r.fileSize,
    mimeType: r.mimeType,
    fileUrl: r.storagePath,
    storageBucket: r.storageBucket,
    storageProvider: 'supabase',
    courseId: r.course ? { _id: r.course.id, title: r.course.title, category: r.course.category, level: r.course.level } : r.courseId,
    version: r.version,
    uploadedBy: r.uploadedBy
      ? uploaderFields === 'full'
        ? { _id: r.uploadedBy.id, name: r.uploadedBy.name, email: r.uploadedBy.email }
        : { _id: r.uploadedBy.id, name: r.uploadedBy.name }
      : r.uploadedById,
    status: r.status,
    archivedAt: r.archivedAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

const sessionBrief = (a: Assignment) => ({
  sessionId: a.session!.id,
  sessionNumber: a.session!.sessionNumber,
  title: a.session!.title,
  scheduledDate: a.session!.scheduledDate,
});
const sessionFull = (a: Assignment) => ({ ...sessionBrief(a), startTime: a.session!.startTime, endTime: a.session!.endTime });

/** Groups a resource's assignments per group, in first-seen order. */
function byGroup<T>(assignments: Assignment[], start: (a: Assignment) => T & { sessions: unknown[] }, session: (a: Assignment) => unknown) {
  const out = new Map<string, T & { sessions: unknown[] }>();
  for (const a of assignments) {
    if (!a.group || !a.session) continue;
    let entry = out.get(a.groupId);
    if (!entry) out.set(a.groupId, (entry = start(a)));
    entry.sessions.push(session(a));
  }
  return [...out.values()];
}

type RReq = Request<{ resourceId: string }>;

const noStore = (res: Response) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
};

/** The caller's address, as the old backend read it (proxy header first). */
function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
  if (first) return first;
  const real = req.headers['x-real-ip'];
  if (typeof real === 'string' && real) return real;
  return req.socket?.remoteAddress ?? req.ip ?? 'unknown';
}

/** /api/clo/resources */
export class CloResourceController {
  constructor(private readonly resources: ResourceService) {}

  upload = async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as { title?: string; description?: string; courseId?: string };
    const resource = await this.resources.upload(body, req.file as UploadedPdf | undefined, currentUser(req).id);
    res.status(201).json({ success: true, message: 'Resource uploaded successfully', data: resourceDoc(resource) });
  };

  list = async (req: Request, res: Response) => {
    const q = req.query as Record<string, string | undefined>;
    const { resources, assignments } = await this.resources.list(q);
    const data = resources.map((r) => {
      const mine = assignments.filter((a) => a.resourceId === r.id);
      const details = byGroup(mine, (a) => ({ groupId: a.groupId, groupName: a.group!.name, sessions: [] as unknown[] }), sessionBrief);
      return { ...resourceDoc(r), assignments: { groupCount: details.length, sessionCount: mine.length, details } };
    });
    res.json({ success: true, count: data.length, data });
  };

  assign = async (req: RReq, res: Response) => {
    const body = (req.body ?? {}) as { assignments?: unknown };
    const r = await this.resources.assign(req.params.resourceId, body.assignments, currentUser(req).id);
    res.status(201).json({
      success: true,
      message: `Resource assigned to ${r.groupCount} group(s), ${r.sessionCount} session(s)`,
      data: {
        assignmentsCreated: r.created,
        totalGroups: r.groupCount,
        totalSessions: r.sessionCount,
        validationErrors: r.errors.length > 0 ? r.errors : undefined,
      },
    });
  };

  assignments = async (req: RReq, res: Response) => {
    const { resource, assignments, counts } = await this.resources.assignmentsOf(req.params.resourceId);
    const groups = byGroup(
      assignments,
      (a) => ({ groupId: a.groupId, groupName: a.group!.name, studentsCount: counts.get(a.groupId) ?? 0, sessions: [] as unknown[] }),
      (a) => ({ assignmentId: a.id, ...sessionFull(a), isVisible: a.isVisible, assignedAt: a.assignedAt }),
    );
    res.json({
      success: true,
      data: {
        resourceId: resource.id,
        resourceTitle: resource.title,
        courseId: resource.courseId,
        courseTitle: resource.course?.title ?? null,
        totalGroups: groups.length,
        totalSessions: assignments.length,
        assignments: groups,
      },
    });
  };

  replaceAssignments = async (req: RReq, res: Response) => {
    const r = await this.resources.replaceForGroup(req.params.resourceId, (req.body ?? {}) as Record<string, unknown>, currentUser(req).id);
    res.json({ success: true, message: `Assignments updated: ${r.sessionCount} sessions`, data: r });
  };

  deleteAssignment = async (req: Request<{ resourceId: string; assignmentId: string }>, res: Response) => {
    await this.resources.removeAssignment(req.params.resourceId, req.params.assignmentId);
    res.json({ success: true, message: 'Assignment removed successfully' });
  };

  delete = async (req: RReq, res: Response) => {
    const permanent = req.query.permanent === 'true';
    await this.resources.delete(req.params.resourceId, permanent);
    res.json({ success: true, message: permanent ? 'Resource permanently deleted' : 'Resource archived (soft deleted)' });
  };

  viewer = async (req: RReq, res: Response) => {
    res.json({ success: true, data: await this.resources.cloViewer(req.params.resourceId) });
  };

  rename = async (req: RReq, res: Response) => {
    const resource = await this.resources.rename(req.params.resourceId, (req.body ?? {}) as Record<string, unknown>);
    res.json({ success: true, message: 'Resource renamed successfully', data: resourceDoc(resource) });
  };
}

/** /api/student/resources */
export class StudentResourceController {
  constructor(private readonly resources: ResourceService) {}

  viewer = async (req: RReq, res: Response) => {
    const user = currentUser(req);
    const data = await this.resources.viewer(req.params.resourceId, { id: user.id, role: user.role }, {
      mobile: req.headers['x-platform'] === 'mobile',
      ip: clientIp(req),
    });
    noStore(res);
    res.json({ success: true, data });
  };

  download = async (req: RReq, res: Response) => {
    const { body, filename } = await this.resources.download(req.params.resourceId, req.query.token, currentUser(req).id, clientIp(req));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename.replace(/["\r\n]/g, '')}"`);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(body);
  };

  sessionMaterials = async (req: Request<{ sessionId: string }>, res: Response) => {
    const items = await this.resources.sessionMaterials(req.params.sessionId, currentUser(req).id);
    const data = items.map(({ resource: r, assignedAt }) => ({
      id: r.id,
      title: r.title,
      description: r.description || null,
      fileSize: r.fileSize,
      originalName: r.originalName,
      viewerUrl: `/api/student/resources/${r.id}/viewer`,
      assignedAt,
    }));
    res.json({ success: true, count: data.length, data });
  };
}

const groupCourse = (g: Group) => (g.course ? { _id: g.course.id, title: g.course.title, category: g.course.category } : g.courseId);

/** /api/trainer/resources */
export class TrainerResourceController {
  constructor(private readonly resources: ResourceService) {}

  list = async (req: Request, res: Response) => {
    const q = req.query as Record<string, string | undefined>;
    const { resources, assignments, groups } = await this.resources.trainerResources(currentUser(req).id, { groupId: q.groupId, search: q.search });
    const groupMap = new Map(groups.map((g) => [g.id, g]));
    const data = resources.map((r) => {
      const assignedTo = byGroup(
        assignments.filter((a) => a.resourceId === r.id),
        (a) => ({ groupId: a.groupId, groupName: groupMap.get(a.groupId)?.name ?? 'Unknown', courseName: groupMap.get(a.groupId)?.course?.title ?? '', sessions: [] as unknown[] }),
        sessionFull,
      );
      const doc = resourceDoc(r, 'name');
      return { ...doc, courseId: r.course ? { _id: r.course.id, title: r.course.title, category: r.course.category } : r.courseId, assignedTo };
    });
    res.json({ success: true, count: data.length, data });
  };

  groups = async (req: Request, res: Response) => {
    const groups = await this.resources.trainerGroups(currentUser(req).id);
    res.json({ success: true, data: groups.map((g) => ({ _id: g.id, name: g.name, courseId: groupCourse(g) })) });
  };
}
