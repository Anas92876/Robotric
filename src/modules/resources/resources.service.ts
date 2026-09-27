import { createHash, randomBytes } from 'node:crypto';
import { isValidId } from '../../shared/db/ids';
import { AppError, BadRequestError, ForbiddenError, ValidationError } from '../../shared/http/errors';
import type { FileStorage } from '../../shared/storage/file-storage';
import { sanitizeFilename } from '../../shared/storage/file-storage';
import type { CourseRepository } from '../courses/courses.repository';
import type { Group, GroupRepository } from '../groups/groups.repository';
import type { SessionRepository } from '../sessions/sessions.repository';
import type { Assignment, Resource, ResourceRepository } from './resources.repository';

export interface UploadedPdf {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/** Tells students a new resource is available (push notifications arrive in phase 9). */
export interface ResourceNotifier {
  resourceAssigned(studentIds: string[], resource: Resource): Promise<void>;
}
export const silentResourceNotifier: ResourceNotifier = { resourceAssigned: async () => {} };

export interface Viewer {
  id: string;
  role: string;
}

const VIEW_TOKEN_SECONDS = 60;
const SIGNED_URL_SECONDS = 3600;
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const notFound = () => new AppError('Resource not found', 404, 'NOT_FOUND');

export class ResourceService {
  constructor(
    private readonly resources: ResourceRepository,
    private readonly groups: Pick<GroupRepository, 'findById' | 'list' | 'groupIdsOfStudent' | 'isMember' | 'membersOf' | 'memberCounts'>,
    private readonly sessions: Pick<SessionRepository, 'findById'>,
    private readonly courses: Pick<CourseRepository, 'findById'>,
    private readonly storage: FileStorage,
    private readonly bucket: string,
    private readonly notifier: ResourceNotifier,
    private readonly now: () => Date = () => new Date(),
  ) {}

  // ---- CLO ----

  async upload(input: { title?: string; description?: string; courseId?: string }, file: UploadedPdf | undefined, uploadedById: string): Promise<Resource> {
    if (!file) throw new BadRequestError('PDF file is required');
    const title = input.title?.trim() ?? '';
    if (title.length < 3) throw new BadRequestError('Title must be at least 3 characters');
    if (!isValidId(input.courseId)) throw new BadRequestError('Valid course ID is required');
    const courseId = input.courseId;
    if (!(await this.courses.findById(courseId))) throw new AppError('Course not found', 404, 'NOT_FOUND');

    const stored = await this.storage.upload({
      bucket: this.bucket,
      path: `resources/${courseId}/${this.now().getTime()}-${sanitizeFilename(file.originalname)}`,
      body: file.buffer,
      contentType: file.mimetype,
    });
    try {
      const id = await this.resources.create({
        title,
        description: input.description?.trim() ?? '',
        originalName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        storagePath: stored.path,
        storageBucket: stored.bucket,
        courseId,
        uploadedById,
      });
      return (await this.resources.findById(id))!;
    } catch (err) {
      // Nothing is kept from a failed upload.
      await this.storage.remove(stored);
      throw err;
    }
  }

  async list(q: { courseId?: string; status?: string; search?: string; sortBy?: string; order?: string }) {
    if (q.courseId && !isValidId(q.courseId)) throw new BadRequestError('Invalid course ID format');
    const sortBy = q.sortBy === 'updatedAt' || q.sortBy === 'title' ? q.sortBy : 'createdAt';
    const resources = await this.resources.list({
      status: q.status || 'active',
      courseId: q.courseId,
      search: q.search || undefined,
      sortBy,
      order: q.order === 'asc' ? 'asc' : 'desc',
    });
    const assignments = await this.resources.assignments({ resourceIds: resources.map((r) => r.id), visibleOnly: true });
    return { resources, assignments };
  }

  /** Links a resource to group sessions; invalid entries are reported but do not block valid ones. */
  async assign(resourceId: string, input: unknown, assignedById: string) {
    if (!isValidId(resourceId)) throw new BadRequestError('Invalid resource ID');
    const resource = await this.resources.findById(resourceId);
    if (!resource || resource.status !== 'active') throw new AppError('Resource not found or inactive', 404, 'NOT_FOUND');
    if (!Array.isArray(input) || input.length === 0) throw new BadRequestError('Assignments array is required');

    const rows: { resourceId: string; groupId: string; sessionId: string; assignedById: string }[] = [];
    const errors: string[] = [];
    const seen = new Set<string>();
    for (const entry of input as { groupId?: unknown; sessionIds?: unknown }[]) {
      const { groupId, sessionIds } = entry ?? {};
      if (typeof groupId !== 'string' || !Array.isArray(sessionIds) || sessionIds.length === 0) {
        errors.push('Each assignment must have groupId and sessionIds array');
        continue;
      }
      const group = isValidId(groupId) ? await this.groups.findById(groupId) : null;
      if (!group) {
        errors.push(`Group ${groupId} not found`);
        continue;
      }
      for (const sessionId of sessionIds) {
        if (!isValidId(sessionId)) {
          errors.push(`Invalid session ID: ${String(sessionId)}`);
          continue;
        }
        const session = await this.sessions.findById(sessionId);
        if (!session) {
          errors.push(`Session ${sessionId} not found`);
          continue;
        }
        if (session.groupId !== groupId) {
          errors.push('Session does not belong to group');
          continue;
        }
        const key = `${groupId}:${sessionId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push({ resourceId, groupId, sessionId, assignedById });
      }
    }
    if (errors.length > 0 && rows.length === 0) {
      throw new ValidationError('Validation failed', errors.map((message) => ({ field: 'assignments', message })));
    }

    // Pairs that were already assigned are skipped, as before.
    const existing = new Set((await this.resources.assignments({ resourceIds: [resourceId] })).map((a) => `${a.groupId}:${a.sessionId}`));
    const fresh = rows.filter((r) => !existing.has(`${r.groupId}:${r.sessionId}`));
    const created = await this.resources.addAssignments(fresh);

    const groupIds = [...new Set(fresh.map((r) => r.groupId))];
    const members = await this.groups.membersOf(groupIds);
    const studentIds = [...new Set([...members.values()].flat().map((m) => m.id))];
    if (studentIds.length > 0) await this.notifier.resourceAssigned(studentIds, resource).catch(() => undefined);

    return { created, groupCount: groupIds.length, sessionCount: fresh.length, errors };
  }

  async assignmentsOf(resourceId: string) {
    if (!isValidId(resourceId)) throw new BadRequestError('Invalid resource ID format');
    const resource = await this.resources.findById(resourceId);
    if (!resource) throw notFound();
    const assignments = (await this.resources.assignments({ resourceIds: [resourceId] })).filter((a) => a.group && a.session);
    const counts = await this.groups.memberCounts([...new Set(assignments.map((a) => a.groupId))]);
    return { resource, assignments, counts };
  }

  /** A group's course must be the resource's course, or one is the bundle of the other. */
  private async sameCourseFamily(resourceCourseId: string, groupCourseId: string): Promise<boolean> {
    if (resourceCourseId === groupCourseId) return true;
    const [rc, gc] = await Promise.all([this.courses.findById(resourceCourseId), this.courses.findById(groupCourseId)]);
    const resourceIsBundleOfGroup = rc?.type === 'bundle' && gc?.parentBundleId === rc.id;
    const groupIsBundleOfResource = gc?.type === 'bundle' && rc?.parentBundleId === gc.id;
    return resourceIsBundleOfGroup || groupIsBundleOfResource;
  }

  /** Replaces the resource's sessions within one group. */
  async replaceForGroup(resourceId: string, input: { groupId?: unknown; sessionIds?: unknown }, assignedById: string) {
    if (!isValidId(resourceId)) throw new BadRequestError('Invalid resource ID');
    if (!isValidId(input.groupId)) throw new BadRequestError('Invalid group ID');
    if (!Array.isArray(input.sessionIds)) throw new BadRequestError('sessionIds must be an array');
    const groupId = input.groupId;
    const resource = await this.resources.findById(resourceId);
    if (!resource) throw notFound();
    const group = await this.groups.findById(groupId);
    if (!group) throw new AppError('Group not found', 404, 'NOT_FOUND');
    if (!(await this.sameCourseFamily(resource.courseId, group.courseId))) throw new BadRequestError("Group does not belong to resource's course");

    // Unlike before, sessions of other groups are dropped instead of being linked to this one.
    const sessionIds = [...new Set(input.sessionIds.filter(isValidId))];
    const valid: string[] = [];
    for (const id of sessionIds) {
      const s = await this.sessions.findById(id);
      if (s && s.groupId === groupId) valid.push(id);
    }
    await this.resources.replaceGroupAssignments(
      resourceId,
      groupId,
      valid.map((sessionId) => ({ resourceId, groupId, sessionId, assignedById })),
    );
    return { groupId, sessionCount: valid.length };
  }

  async removeAssignment(resourceId: string, assignmentId: string): Promise<void> {
    if (!isValidId(resourceId) || !isValidId(assignmentId)) throw new BadRequestError('Invalid ID format');
    if (!(await this.resources.deleteAssignment(resourceId, assignmentId))) throw new AppError('Assignment not found', 404, 'NOT_FOUND');
  }

  /** Soft delete by default; `permanent` also removes the file and its assignments. */
  async delete(resourceId: string, permanent: boolean): Promise<void> {
    if (!isValidId(resourceId)) throw new BadRequestError('Invalid resource ID format');
    const resource = await this.resources.findById(resourceId);
    if (!resource) throw notFound();
    if (permanent) {
      await this.storage.remove({ bucket: resource.storageBucket, path: resource.storagePath });
      await this.resources.delete(resourceId);
    } else {
      await this.resources.update(resourceId, { status: 'deleted', archivedAt: this.now() });
    }
  }

  async rename(resourceId: string, input: { title?: unknown; description?: unknown }): Promise<Resource> {
    const title = typeof input.title === 'string' ? input.title.trim() : '';
    if (!title) throw new BadRequestError('Title is required');
    const resource = isValidId(resourceId) ? await this.resources.findById(resourceId) : null;
    if (!resource || resource.status !== 'active') throw notFound();
    await this.resources.update(resourceId, {
      title,
      ...(typeof input.description === 'string' ? { description: input.description.trim() } : {}),
    });
    return (await this.resources.findById(resourceId))!;
  }

  /** CLO preview: a signed link valid for an hour. */
  async cloViewer(resourceId: string) {
    if (!isValidId(resourceId)) throw new BadRequestError('Invalid resource ID format');
    const resource = await this.resources.findById(resourceId);
    if (!resource || resource.status !== 'active') throw notFound();
    const viewerUrl = await this.storage.signedUrl({ bucket: resource.storageBucket, path: resource.storagePath }, SIGNED_URL_SECONDS);
    return { viewerUrl, expiresIn: SIGNED_URL_SECONDS, title: resource.title, filename: resource.originalName };
  }

  // ---- Students & trainers ----

  private async groupIdsOf(viewer: Viewer): Promise<string[]> {
    if (viewer.role === 'student') return this.groups.groupIdsOfStudent(viewer.id);
    return (await this.groups.list({ trainerId: viewer.id, status: 'active' })).map((g) => g.id);
  }

  /** Students, trainers and teachers only see resources assigned to one of their groups. */
  private async checkAccess(resourceId: string, viewer: Viewer): Promise<void> {
    if (viewer.role !== 'student' && viewer.role !== 'trainer' && viewer.role !== 'teacher') return;
    const groupIds = await this.groupIdsOf(viewer);
    if (groupIds.length === 0) {
      throw new ForbiddenError(viewer.role === 'student' ? 'Access denied: Not enrolled in this course' : 'Access denied: Not assigned to this course as trainer');
    }
    const assignments = await this.resources.assignments({ resourceIds: [resourceId], groupIds, visibleOnly: true });
    if (assignments.length === 0) throw new ForbiddenError('Access denied: Resource not assigned to your group');
    const now = this.now();
    const open = (a: Assignment) => (!a.availableFrom || now >= a.availableFrom) && (!a.availableUntil || now <= a.availableUntil);
    if (!assignments.some(open)) {
      const first = assignments[0]!;
      if (first.availableFrom && now < first.availableFrom) throw new ForbiddenError('Resource not yet available');
      throw new ForbiddenError('Resource no longer available');
    }
  }

  /**
   * Web gets a one-time download link valid for 60 seconds and locked to the
   * caller's IP; the mobile app gets a signed storage link valid for an hour.
   */
  async viewer(resourceId: string, viewer: Viewer, opts: { mobile: boolean; ip: string }) {
    if (!isValidId(resourceId)) throw new BadRequestError('Invalid resource ID format');
    const resource = await this.resources.findById(resourceId);
    if (!resource || resource.status !== 'active') throw notFound();
    await this.checkAccess(resourceId, viewer);

    const base = { title: resource.title, filename: resource.originalName };
    if (opts.mobile) {
      const viewerUrl = await this.storage.signedUrl({ bucket: resource.storageBucket, path: resource.storagePath }, SIGNED_URL_SECONDS);
      return { viewerUrl, expiresIn: SIGNED_URL_SECONDS, ...base };
    }
    const token = randomBytes(32).toString('hex');
    await this.resources.saveViewToken({
      tokenHash: hashToken(token),
      userId: viewer.id,
      resourceId,
      ipAddress: opts.ip,
      expiresAt: new Date(this.now().getTime() + VIEW_TOKEN_SECONDS * 1000),
    });
    return { viewerUrl: `/api/student/resources/${resourceId}/download?token=${token}`, expiresIn: VIEW_TOKEN_SECONDS, ...base };
  }

  async download(resourceId: string, token: unknown, userId: string, ip: string) {
    if (typeof token !== 'string' || !token) throw new AppError('Access token required', 401, 'UNAUTHORIZED');
    const row = await this.resources.consumeViewToken(hashToken(token), this.now());
    const problem = !row
      ? 'Invalid or expired token'
      : row.expiresAt < this.now()
        ? 'Token expired'
        : row.userId !== userId
          ? 'Token user mismatch'
          : row.resourceId !== resourceId
            ? 'Token resource mismatch'
            : row.ipAddress !== ip
              ? 'Token IP address mismatch'
              : null;
    if (problem) throw new ForbiddenError(`Access denied: ${problem}`);

    const resource = await this.resources.findById(resourceId);
    if (!resource || resource.status !== 'active') throw notFound();
    const body = await this.storage.download({ bucket: resource.storageBucket, path: resource.storagePath });
    return { body, filename: resource.originalName };
  }

  async sessionMaterials(sessionId: string, studentId: string) {
    if (!isValidId(sessionId)) throw new BadRequestError('Invalid session ID format');
    const session = await this.sessions.findById(sessionId);
    if (!session) throw new AppError('Session not found', 404, 'NOT_FOUND');
    if (!(await this.groups.isMember(session.groupId, studentId))) throw new ForbiddenError('Access denied');
    const assignments = await this.resources.assignments({ groupIds: [session.groupId], sessionId, visibleOnly: true });
    const resources = await this.resources.list({ ids: [...new Set(assignments.map((a) => a.resourceId))], status: 'active' });
    const byId = new Map(resources.map((r) => [r.id, r]));
    return assignments.flatMap((a) => {
      const r = byId.get(a.resourceId);
      return r ? [{ resource: r, assignedAt: a.assignedAt }] : [];
    });
  }

  async trainerGroups(trainerId: string): Promise<Group[]> {
    return this.groups.list({ trainerId, status: 'active' });
  }

  async trainerResources(trainerId: string, q: { groupId?: string; search?: string }) {
    let groups = await this.trainerGroups(trainerId);
    if (q.groupId && isValidId(q.groupId)) groups = groups.filter((g) => g.id === q.groupId);
    if (groups.length === 0) return { resources: [], assignments: [], groups };
    const assignments = await this.resources.assignments({ groupIds: groups.map((g) => g.id), visibleOnly: true });
    if (assignments.length === 0) return { resources: [], assignments, groups };
    const resources = await this.resources.list({
      ids: [...new Set(assignments.map((a) => a.resourceId))],
      status: 'active',
      search: q.search || undefined,
    });
    return { resources, assignments, groups };
  }
}
