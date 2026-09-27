import { isValidId } from '../../shared/db/ids';
import { AppError, BadRequestError, ForbiddenError } from '../../shared/http/errors';
import type { FileStorage } from '../../shared/storage/file-storage';
import { sanitizeFilename } from '../../shared/storage/file-storage';
import type { Group, GroupRepository } from '../groups/groups.repository';
import type { StudentProjectRepository } from '../student-projects/student-projects.repository';
import type { GalleryFilter, GalleryImage, GalleryRepository } from './gallery.repository';

export interface UploadedImage {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

export interface ImageDetails {
  groupId?: unknown;
  groupIds?: unknown;
  projectId?: unknown;
  title?: unknown;
  description?: unknown;
}

const groupNotFound = () => new AppError('Group not found', 404, 'GROUP_NOT_FOUND');
const imageNotFound = () => new AppError('Image not found', 404, 'IMAGE_NOT_FOUND');
const text = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

/** Reception may send `groupIds` as an array, a JSON array string, or a comma-separated list. */
export function parseGroupIds(input: ImageDetails): string[] {
  let ids: unknown[] = [];
  const raw = input.groupIds;
  if (Array.isArray(raw)) ids = raw;
  else if (typeof raw === 'string' && raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      ids = Array.isArray(parsed) ? parsed : [raw];
    } catch {
      ids = raw.split(',').map((s) => s.trim());
    }
  } else if (input.groupId) ids = [input.groupId];
  return [...new Set(ids.filter((id): id is string => typeof id === 'string' && id.length > 0))];
}

export class GalleryService {
  constructor(
    private readonly gallery: GalleryRepository,
    private readonly groups: Pick<GroupRepository, 'findById' | 'list' | 'groupIdsOfStudent' | 'isMember'>,
    private readonly projects: Pick<StudentProjectRepository, 'findById'>,
    private readonly storage: FileStorage,
    private readonly bucket: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Signed links for the photos (one per stored file). */
  async links(images: GalleryImage[]): Promise<Map<string, string | null>> {
    const links = new Map<string, string | null>();
    for (const path of new Set(images.map((i) => i.storagePath))) {
      links.set(path, await this.storage.signedUrl({ bucket: this.bucket, path }).catch(() => null));
    }
    return links;
  }

  private async store(file: UploadedImage | undefined, folder: string): Promise<string> {
    if (!file) throw new BadRequestError('No image provided', 'NO_IMAGE');
    const { path } = await this.storage.upload({
      bucket: this.bucket,
      path: `${folder}/${this.now().getTime()}-${sanitizeFilename(file.originalname)}`,
      body: file.buffer,
      contentType: file.mimetype,
    });
    return path;
  }

  private async ownedGroup(groupId: unknown, trainerId: string): Promise<Group> {
    const group = isValidId(groupId) ? await this.groups.findById(groupId) : null;
    if (!group) throw groupNotFound();
    if (group.trainerId !== trainerId) throw new ForbiddenError('You do not own this group', 'GROUP_OWNERSHIP_REQUIRED');
    return group;
  }

  private async created(ids: string[]): Promise<GalleryImage[]> {
    return Promise.all(ids.map(async (id) => (await this.gallery.findById(id))!));
  }

  /** Removes the row, and the file once no other row uses it. */
  private async remove(image: GalleryImage): Promise<void> {
    await this.gallery.delete(image.id);
    if ((await this.gallery.countByPath(image.storagePath)) === 0) await this.storage.remove({ bucket: this.bucket, path: image.storagePath });
  }

  // ---- Trainer ----

  async trainerMoment(trainerId: string, input: ImageDetails, file: UploadedImage | undefined) {
    if (!file) throw new BadRequestError('No image provided', 'NO_IMAGE');
    const group = await this.ownedGroup(input.groupId, trainerId);
    const storagePath = await this.store(file, `gallery/${group.id}/moments`);
    const [id] = await this.gallery.createMany([
      { groupId: group.id, type: 'moment', uploadedById: trainerId, storagePath, title: text(input.title, 200), description: text(input.description, 2000) },
    ]);
    return (await this.created([id!]))[0]!;
  }

  async trainerProject(trainerId: string, input: ImageDetails, file: UploadedImage | undefined) {
    if (!file) throw new BadRequestError('No image provided', 'NO_IMAGE');
    const group = await this.ownedGroup(input.groupId, trainerId);
    const project = isValidId(input.projectId) ? await this.projects.findById(input.projectId) : null;
    if (!project) throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    if (project.groupId !== group.id) throw new BadRequestError('Project does not belong to this group', 'PROJECT_GROUP_MISMATCH');
    const storagePath = await this.store(file, `gallery/${group.id}/projects`);
    const [id] = await this.gallery.createMany([
      {
        groupId: group.id,
        type: 'project',
        uploadedById: trainerId,
        storagePath,
        studentId: project.studentId,
        projectId: project.id,
        title: text(input.title, 200),
        description: text(input.description, 2000),
      },
    ]);
    return (await this.created([id!]))[0]!;
  }

  async trainerGroup(groupId: string, trainerId: string) {
    const group = await this.ownedGroup(groupId, trainerId);
    return this.gallery.list({ groupId: group.id });
  }

  async delete(imageId: string, userId: string, ownerError: 'forbidden' | 'bad_request') {
    const image = isValidId(imageId) ? await this.gallery.findById(imageId) : null;
    if (!image) throw imageNotFound();
    if (image.uploadedById !== userId) {
      // Reception answered 400 here, trainers 403; both are kept.
      if (ownerError === 'forbidden') throw new ForbiddenError('You did not upload this image', 'NOT_IMAGE_OWNER');
      throw new BadRequestError('You did not upload this image', 'NOT_IMAGE_OWNER');
    }
    await this.remove(image);
  }

  // ---- Reception ----

  activeGroups() {
    return this.groups.list({ status: 'active', sortBy: 'name', order: 'asc' });
  }

  /** One photo, posted to one or more groups (the file is stored once). */
  async receptionMoment(receptionId: string, input: ImageDetails, file: UploadedImage | undefined) {
    if (!file) throw new BadRequestError('No image provided', 'NO_IMAGE');
    const groupIds = parseGroupIds(input);
    if (groupIds.length === 0) throw new BadRequestError('At least one group must be selected', 'NO_GROUP_SELECTED');
    for (const id of groupIds) {
      if (!isValidId(id) || !(await this.groups.findById(id))) throw new AppError('One or more groups not found', 404, 'GROUP_NOT_FOUND');
    }
    const storagePath = await this.store(file, `gallery/${groupIds[0]}/moments`);
    const ids = await this.gallery.createMany(
      groupIds.map((groupId) => ({ groupId, type: 'moment' as const, uploadedById: receptionId, storagePath, title: text(input.title, 200), description: text(input.description, 2000) })),
    );
    return this.created(ids);
  }

  async groupGallery(groupId: string) {
    const group = isValidId(groupId) ? await this.groups.findById(groupId) : null;
    if (!group) throw groupNotFound();
    return this.gallery.list({ groupId: group.id });
  }

  // ---- Student & CLO ----

  async forStudent(studentId: string, q: Record<string, string | undefined>, page: { limit: number; offset: number }) {
    const groupIds = await this.groups.groupIdsOfStudent(studentId);
    if (groupIds.length === 0) return { rows: [], total: 0 };
    return this.page({ groupIds, type: q.type || undefined, courseId: isValidId(q.courseId) ? q.courseId : undefined }, page);
  }

  async studentImage(imageId: string, studentId: string) {
    const image = isValidId(imageId) ? await this.gallery.findById(imageId) : null;
    if (!image) throw imageNotFound();
    if (!image.group) throw groupNotFound();
    const member = await this.groups.isMember(image.groupId, studentId);
    if (!member && image.group.trainerId !== studentId) throw new ForbiddenError('You are not a member of this group', 'NOT_GROUP_MEMBER');
    return image;
  }

  all(q: Record<string, string | undefined>, page: { limit: number; offset: number }) {
    return this.page(
      { type: q.type || undefined, groupId: isValidId(q.groupId) ? q.groupId : undefined, courseId: isValidId(q.courseId) ? q.courseId : undefined },
      page,
    );
  }

  private async page(filter: GalleryFilter, page: { limit: number; offset: number }) {
    const [rows, total] = await Promise.all([this.gallery.list(filter, page), this.gallery.count(filter)]);
    return { rows, total };
  }
}
