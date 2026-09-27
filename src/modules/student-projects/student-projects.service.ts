import { z } from 'zod';
import { isValidId, newId } from '../../shared/db/ids';
import { AppError, BadRequestError, ForbiddenError } from '../../shared/http/errors';
import { parse } from '../../shared/http/validate';
import type { FileStorage } from '../../shared/storage/file-storage';
import { sanitizeFilename } from '../../shared/storage/file-storage';
import type { Group, GroupRepository } from '../groups/groups.repository';
import type { ProjectFilter, StudentProject, StudentProjectRepository } from './student-projects.repository';
import { type ProjectImage, STUDENT_PROJECT_STATUSES } from './student-projects.table';

export interface UploadedImage {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

/** Tells the student about a new project (push notifications arrive in phase 9). */
export interface ProjectNotifier {
  projectAssigned(studentId: string, project: StudentProject): Promise<void>;
}
export const silentProjectNotifier: ProjectNotifier = { projectAssigned: async () => {} };

const names = (label: string) => z.array(z.string().trim().max(200, `${label} name cannot exceed 200 characters`));
const detailsSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters').optional(),
  titleAr: z.string().trim().max(200, 'Title (Arabic) cannot exceed 200 characters').optional(),
  description: z.string().optional(),
  descriptionAr: z.string().trim().max(5000, 'Description (Arabic) cannot exceed 5000 characters').optional(),
  components: names('Component').optional(),
  technologies: names('Technology').optional(),
});

const projectNotFound = () => new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
const groupNotFound = () => new AppError('Group not found', 404, 'GROUP_NOT_FOUND');

export class StudentProjectService {
  constructor(
    private readonly projects: StudentProjectRepository,
    private readonly groups: Pick<GroupRepository, 'findById' | 'isMember' | 'groupIdsOfStudent'>,
    private readonly storage: FileStorage,
    private readonly bucket: string,
    private readonly notifier: ProjectNotifier,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Short-lived links for a project's private photos, keyed by image id. */
  async imageLinks(projects: StudentProject[]): Promise<Map<string, string | null>> {
    const links = new Map<string, string | null>();
    for (const img of projects.flatMap((p) => p.images)) {
      links.set(img._id, await this.storage.signedUrl({ bucket: this.bucket, path: img.storagePath }).catch(() => null));
    }
    return links;
  }

  private async ownedGroup(groupId: string | null | undefined, trainerId: string): Promise<Group> {
    const group = groupId && isValidId(groupId) ? await this.groups.findById(groupId) : null;
    if (!group) throw groupNotFound();
    if (group.trainerId !== trainerId) throw new ForbiddenError('You do not own this group', 'GROUP_OWNERSHIP_REQUIRED');
    return group;
  }

  private async owned(projectId: string, trainerId: string): Promise<StudentProject> {
    const project = isValidId(projectId) ? await this.projects.findById(projectId) : null;
    if (!project) throw projectNotFound();
    await this.ownedGroup(project.groupId, trainerId);
    return project;
  }

  // ---- Trainer ----

  async create(trainerId: string, body: Record<string, unknown>): Promise<StudentProject> {
    const group = await this.ownedGroup(typeof body.groupId === 'string' ? body.groupId : undefined, trainerId);
    const studentId = body.studentId;
    if (!isValidId(studentId) || !(await this.groups.isMember(group.id, studentId))) throw new BadRequestError('Student is not in this group', 'STUDENT_NOT_IN_GROUP');
    const input = parse(detailsSchema, body);
    if (!input.title) throw new BadRequestError('Title is required');
    const id = await this.projects.create({
      ...input,
      title: input.title,
      studentId,
      groupId: group.id,
      courseId: group.courseId,
      createdById: trainerId,
      status: 'in_progress',
    });
    const project = (await this.projects.findById(id))!;
    await this.notifier.projectAssigned(studentId, project).catch(() => undefined);
    return project;
  }

  async details(projectId: string, trainerId: string) {
    return this.owned(projectId, trainerId);
  }

  async forGroup(groupId: string, trainerId: string) {
    const group = await this.ownedGroup(groupId, trainerId);
    return this.projects.list({ groupId: group.id });
  }

  async addImages(projectId: string, trainerId: string, files: UploadedImage[] | undefined) {
    if (!files || files.length === 0) throw new BadRequestError('No images provided', 'NO_IMAGES');
    const project = await this.owned(projectId, trainerId);
    const added: ProjectImage[] = [];
    try {
      for (const [i, file] of files.entries()) {
        const { path } = await this.storage.upload({
          bucket: this.bucket,
          path: `projects/${project.id}/${this.now().getTime()}-${i}-${sanitizeFilename(file.originalname)}`,
          body: file.buffer,
          contentType: file.mimetype,
        });
        added.push({ _id: newId(), storagePath: path, order: project.images.length + i });
      }
      await this.projects.update(project.id, { images: [...project.images, ...added] });
    } catch (err) {
      for (const img of added) await this.storage.remove({ bucket: this.bucket, path: img.storagePath });
      throw err;
    }
    return { project: (await this.projects.findById(project.id))!, added };
  }

  async removeImage(projectId: string, trainerId: string, imageIndex: string) {
    const project = await this.owned(projectId, trainerId);
    const index = Number.parseInt(imageIndex, 10);
    if (Number.isNaN(index) || index < 0 || index >= project.images.length) throw new BadRequestError('Invalid image index', 'INVALID_IMAGE_INDEX');
    const image = project.images[index]!;
    await this.storage.remove({ bucket: this.bucket, path: image.storagePath });
    const images = project.images.filter((_, i) => i !== index).map((img, order) => ({ ...img, order }));
    await this.projects.update(project.id, { images });
    return (await this.projects.findById(project.id))!;
  }

  async update(projectId: string, trainerId: string, body: unknown) {
    const project = await this.owned(projectId, trainerId);
    const input = parse(detailsSchema, body);
    if (Object.keys(input).length) await this.projects.update(project.id, input);
    return (await this.projects.findById(project.id))!;
  }

  async setStatus(projectId: string, trainerId: string, status: unknown) {
    if (!STUDENT_PROJECT_STATUSES.includes(status as (typeof STUDENT_PROJECT_STATUSES)[number])) throw new BadRequestError('Invalid status', 'INVALID_STATUS');
    const project = await this.owned(projectId, trainerId);
    await this.projects.update(project.id, { status: status as (typeof STUDENT_PROJECT_STATUSES)[number] });
    return (await this.projects.findById(project.id))!;
  }

  async grade(projectId: string, trainerId: string, body: { grade?: unknown; feedback?: unknown }) {
    const project = await this.owned(projectId, trainerId);
    const patch: { grade?: number; feedback?: string } = {};
    if (body.grade !== undefined && body.grade !== null && body.grade !== '') {
      const grade = Number(body.grade);
      if (!Number.isFinite(grade)) throw new BadRequestError('Grade must be a number', 'INVALID_GRADE');
      if (grade < 0) throw new BadRequestError('Grade cannot be negative', 'INVALID_GRADE');
      patch.grade = grade;
    }
    if (typeof body.feedback === 'string') {
      if (body.feedback.length > 5000) throw new BadRequestError('Feedback cannot exceed 5000 characters');
      patch.feedback = body.feedback.trim();
    }
    await this.projects.update(project.id, { ...patch, gradedAt: this.now(), gradedById: trainerId });
    return (await this.projects.findById(project.id))!;
  }

  async delete(projectId: string, trainerId: string): Promise<number> {
    const project = await this.owned(projectId, trainerId);
    for (const img of project.images) await this.storage.remove({ bucket: this.bucket, path: img.storagePath });
    await this.projects.delete(project.id);
    return project.images.length;
  }

  // ---- Student ----

  /** The student's own projects plus their group-mates' (or only their own with `myProjectsOnly`). */
  async forStudent(studentId: string, q: Record<string, string | undefined>, page: { limit: number; offset: number }) {
    let filter: ProjectFilter;
    if (q.myProjectsOnly === 'true') filter = { studentId };
    else {
      const groupIds = await this.groups.groupIdsOfStudent(studentId);
      filter = groupIds.length ? { groupIds } : { studentId };
    }
    if (isValidId(q.courseId)) filter.courseId = q.courseId;
    if (q.status) filter.status = q.status;
    const [rows, total] = await Promise.all([this.projects.list(filter, page), this.projects.count(filter)]);
    return { rows, total };
  }

  async studentDetails(projectId: string, studentId: string) {
    const project = isValidId(projectId) ? await this.projects.findById(projectId) : null;
    if (!project) throw projectNotFound();
    const isOwner = project.studentId === studentId;
    const isGroupMate = project.groupId ? await this.groups.isMember(project.groupId, studentId) : false;
    if (!isOwner && !isGroupMate) throw new ForbiddenError('You do not have access to this project', 'PROJECT_ACCESS_DENIED');
    return project;
  }

  // ---- CLO ----

  async all(q: Record<string, string | undefined>, page: { limit: number; offset: number }) {
    const filter: ProjectFilter = {
      courseId: isValidId(q.courseId) ? q.courseId : undefined,
      groupId: isValidId(q.groupId) ? q.groupId : undefined,
      status: q.status || undefined,
    };
    const [rows, total] = await Promise.all([this.projects.list(filter, page), this.projects.count(filter)]);
    return { rows, total };
  }

  async get(projectId: string) {
    const project = isValidId(projectId) ? await this.projects.findById(projectId) : null;
    if (!project) throw projectNotFound();
    return project;
  }

  /** For gallery uploads: the project and the group it belongs to. */
  async find(projectId: string) {
    return isValidId(projectId) ? this.projects.findById(projectId) : null;
  }
}
