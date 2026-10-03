import type { Request, Response } from 'express';
import { parsePagination } from '../../shared/http/pagination';
import { currentUser } from '../../shared/http/request-user';
import type { Group } from '../groups/groups.repository';
import type { GalleryImage } from './gallery.repository';
import type { GalleryService, ImageDetails, UploadedImage } from './gallery.service';

const person = (p: { id: string; name: string; email: string } | null, id: string | null) => (p ? { _id: p.id, name: p.name, email: p.email } : id);

/**
 * The old document. Photos are private now: `cloudinaryUrl` and `thumbnailUrl`
 * are the same short-lived link, `cloudinaryPublicId` the storage path.
 */
function imageDoc(i: GalleryImage, links: Map<string, string | null>, opts: { populated: boolean; group?: boolean }) {
  const url = links.get(i.storagePath) ?? null;
  return {
    _id: i.id,
    groupId: opts.group && i.group ? { _id: i.group.id, name: i.group.name } : i.groupId,
    type: i.type,
    uploadedBy: opts.populated ? person(i.uploadedBy, i.uploadedById) : i.uploadedById,
    cloudinaryUrl: url,
    cloudinaryPublicId: i.storagePath,
    thumbnailUrl: url,
    studentId: opts.populated ? person(i.student, i.studentId) : i.studentId,
    projectId: opts.populated && i.project ? { _id: i.project.id, title: i.project.title } : i.projectId,
    title: i.title,
    description: i.description,
    order: i.order,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  };
}

type ImgReq = Request<{ imageId: string }>;
type GroupReq = Request<{ groupId: string }>;
const details = (req: Request) => (req.body ?? {}) as ImageDetails;
const query = (req: Request) => req.query as Record<string, string | undefined>;

abstract class GalleryDocs {
  constructor(protected readonly gallery: GalleryService) {}

  protected async docs(list: GalleryImage[], opts: { populated: boolean; group?: boolean }) {
    const links = await this.gallery.links(list);
    return list.map((i) => imageDoc(i, links, opts));
  }

  protected async sendList(res: Response, list: GalleryImage[]) {
    res.json({ success: true, count: list.length, data: await this.docs(list, { populated: true }) });
  }

  protected async paged(res: Response, rows: GalleryImage[], total: number, page: { page: number; limit: number }) {
    res.json({
      success: true,
      count: rows.length,
      data: await this.docs(rows, { populated: true, group: true }),
      pagination: { page: page.page, limit: page.limit, totalPages: Math.ceil(total / page.limit), total },
    });
  }
}

/** /api/trainer/gallery */
export class TrainerGalleryController extends GalleryDocs {
  moment = async (req: Request, res: Response) => {
    const image = await this.gallery.trainerMoment(currentUser(req).id, details(req), req.file as UploadedImage | undefined);
    res.status(201).json({ success: true, message: 'Image uploaded successfully', data: (await this.docs([image], { populated: false }))[0] });
  };

  project = async (req: Request, res: Response) => {
    const image = await this.gallery.trainerProject(currentUser(req).id, details(req), req.file as UploadedImage | undefined);
    res.status(201).json({ success: true, message: 'Image uploaded successfully', data: (await this.docs([image], { populated: false }))[0] });
  };

  group = async (req: GroupReq, res: Response) => {
    await this.sendList(res, await this.gallery.trainerGroup(req.params.groupId, currentUser(req).id));
  };

  delete = async (req: ImgReq, res: Response) => {
    await this.gallery.delete(req.params.imageId, currentUser(req).id, 'forbidden');
    res.json({ success: true, message: 'Image deleted successfully' });
  };
}

const groupSummary = (g: Group) => ({
  _id: g.id,
  name: g.name,
  courseId: g.course ? { _id: g.course.id, title: g.course.title, category: g.course.category, level: g.course.level } : g.courseId,
  status: g.status,
});

/** /api/reception/gallery */
export class ReceptionGalleryController extends GalleryDocs {
  groups = async (_req: Request, res: Response) => {
    const groups = await this.gallery.activeGroups();
    res.json({ success: true, count: groups.length, data: groups.map(groupSummary) });
  };

  moment = async (req: Request, res: Response) => {
    const images = await this.gallery.receptionMoment(currentUser(req).id, details(req), req.file as UploadedImage | undefined);
    res.status(201).json({ success: true, message: 'Image uploaded successfully', data: await this.docs(images, { populated: false }) });
  };

  group = async (req: GroupReq, res: Response) => {
    await this.sendList(res, await this.gallery.groupGallery(req.params.groupId));
  };

  delete = async (req: ImgReq, res: Response) => {
    await this.gallery.delete(req.params.imageId, currentUser(req).id, 'bad_request');
    res.json({ success: true, message: 'Image deleted successfully' });
  };
}

/** /api/student/gallery */
export class StudentGalleryController extends GalleryDocs {
  list = async (req: Request, res: Response) => {
    const page = parsePagination(query(req));
    const { rows, total } = await this.gallery.forStudent(currentUser(req).id, query(req), page);
    await this.paged(res, rows, total, page);
  };

  details = async (req: ImgReq, res: Response) => {
    const image = await this.gallery.studentImage(req.params.imageId, currentUser(req).id);
    res.json({ success: true, data: (await this.docs([image], { populated: true, group: true }))[0] });
  };
}

/** /api/clo/gallery — read-only. */
export class CloGalleryController extends GalleryDocs {
  list = async (req: Request, res: Response) => {
    const page = parsePagination(query(req));
    const { rows, total } = await this.gallery.all(query(req), page);
    await this.paged(res, rows, total, page);
  };
}
