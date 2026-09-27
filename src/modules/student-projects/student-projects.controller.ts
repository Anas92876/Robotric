import type { Request, Response } from 'express';
import { parsePagination } from '../../shared/http/pagination';
import { currentUser } from '../../shared/http/request-user';
import type { StudentProject } from './student-projects.repository';
import type { StudentProjectService, UploadedImage } from './student-projects.service';

const person = (p: { id: string; name: string; email: string } | null, id: string | null) => (p ? { _id: p.id, name: p.name, email: p.email } : id);

/**
 * The old document. Photos are private now: `cloudinaryUrl` is a short-lived
 * link and `cloudinaryPublicId` the storage path. `populated` expands the
 * references, as the read endpoints did.
 */
export function projectDoc(p: StudentProject, links: Map<string, string | null>, populated = true) {
  return {
    _id: p.id,
    title: p.title,
    titleAr: p.titleAr,
    description: p.description,
    descriptionAr: p.descriptionAr,
    ownerId: p.studentId,
    parts: [],
    studentId: populated ? person(p.student, p.studentId) : p.studentId,
    groupId: populated && p.group ? { _id: p.group.id, name: p.group.name } : p.groupId,
    courseId: populated && p.course ? { _id: p.course.id, title: p.course.title } : p.courseId,
    createdBy: populated ? person(p.createdBy, p.createdById) : p.createdById,
    images: p.images.map((img) => ({ _id: img._id, cloudinaryUrl: links.get(img._id) ?? null, cloudinaryPublicId: img.storagePath, order: img.order })),
    components: p.components,
    technologies: p.technologies,
    status: p.status,
    grade: p.grade,
    feedback: p.feedback,
    gradedAt: p.gradedAt,
    gradedBy: populated ? person(p.gradedBy, p.gradedById) : p.gradedById,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

type PReq = Request<{ projectId: string }>;
const body = (req: Request) => (req.body ?? {}) as Record<string, unknown>;
const query = (req: Request) => req.query as Record<string, string | undefined>;

abstract class ProjectDocs {
  constructor(protected readonly projects: StudentProjectService) {}

  protected async docs(list: StudentProject[], populated = true) {
    const links = await this.projects.imageLinks(list);
    return list.map((p) => projectDoc(p, links, populated));
  }

  protected async doc(p: StudentProject, populated = true) {
    return (await this.docs([p], populated))[0]!;
  }

  protected async paged(res: Response, rows: StudentProject[], total: number, page: { page: number; limit: number }) {
    res.json({ success: true, count: rows.length, data: await this.docs(rows), pagination: { page: page.page, limit: page.limit, totalPages: Math.ceil(total / page.limit), total } });
  }
}

/** /api/trainer/projects — trainers manage projects in their own groups. */
export class TrainerProjectController extends ProjectDocs {
  create = async (req: Request, res: Response) => {
    const p = await this.projects.create(currentUser(req).id, body(req));
    res.status(201).json({ success: true, message: 'Project created successfully', data: await this.doc(p, false) });
  };

  details = async (req: PReq, res: Response) => {
    res.json({ success: true, data: await this.doc(await this.projects.details(req.params.projectId, currentUser(req).id)) });
  };

  forGroup = async (req: Request<{ groupId: string }>, res: Response) => {
    const list = await this.projects.forGroup(req.params.groupId, currentUser(req).id);
    res.json({ success: true, count: list.length, data: await this.docs(list) });
  };

  addImages = async (req: PReq, res: Response) => {
    const files = Array.isArray(req.files) ? (req.files as UploadedImage[]) : undefined;
    const { project, added } = await this.projects.addImages(req.params.projectId, currentUser(req).id, files);
    const doc = await this.doc(project, false);
    const addedIds = new Set(added.map((a) => a._id));
    res.status(201).json({ success: true, message: 'Images uploaded successfully', data: { project: doc, uploadedImages: doc.images.filter((i) => addedIds.has(i._id)) } });
  };

  removeImage = async (req: Request<{ projectId: string; imageIndex: string }>, res: Response) => {
    const p = await this.projects.removeImage(req.params.projectId, currentUser(req).id, req.params.imageIndex);
    res.json({ success: true, message: 'Image deleted successfully', data: await this.doc(p, false) });
  };

  update = async (req: PReq, res: Response) => {
    const p = await this.projects.update(req.params.projectId, currentUser(req).id, body(req));
    res.json({ success: true, message: 'Project updated successfully', data: await this.doc(p, false) });
  };

  setStatus = async (req: PReq, res: Response) => {
    const p = await this.projects.setStatus(req.params.projectId, currentUser(req).id, body(req).status);
    res.json({ success: true, message: 'Project status updated successfully', data: await this.doc(p, false) });
  };

  grade = async (req: PReq, res: Response) => {
    const p = await this.projects.grade(req.params.projectId, currentUser(req).id, body(req));
    res.json({ success: true, message: 'Project graded successfully', data: await this.doc(p, false) });
  };

  delete = async (req: PReq, res: Response) => {
    const deletedImagesCount = await this.projects.delete(req.params.projectId, currentUser(req).id);
    res.json({ success: true, message: 'Project deleted successfully', deletedImagesCount });
  };
}

/** /api/student/projects */
export class StudentProjectController extends ProjectDocs {
  list = async (req: Request, res: Response) => {
    const page = parsePagination(query(req));
    const { rows, total } = await this.projects.forStudent(currentUser(req).id, query(req), page);
    await this.paged(res, rows, total, page);
  };

  details = async (req: PReq, res: Response) => {
    res.json({ success: true, data: await this.doc(await this.projects.studentDetails(req.params.projectId, currentUser(req).id)) });
  };
}

/** /api/clo/projects — read-only. */
export class CloProjectController extends ProjectDocs {
  list = async (req: Request, res: Response) => {
    const page = parsePagination(query(req));
    const { rows, total } = await this.projects.all(query(req), page);
    await this.paged(res, rows, total, page);
  };

  details = async (req: PReq, res: Response) => {
    res.json({ success: true, data: await this.doc(await this.projects.get(req.params.projectId)) });
  };
}
