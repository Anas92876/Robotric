import type { Request, Response } from 'express';
import { parsePagination } from '../../shared/http/pagination';
import { currentUser } from '../../shared/http/request-user';
import type { StudentDocument } from './documents.repository';
import type { DocumentService, UploadedDocument } from './documents.service';

/** The old document; `fileUrl` is now a short-lived link (it used to be a public one). */
function documentDoc(d: StudentDocument, links: Map<string, string | null>, withStudent: boolean) {
  return {
    _id: d.id,
    studentId: withStudent && d.student ? { _id: d.student.id, name: d.student.name, email: d.student.email } : d.studentId,
    documentType: d.documentType,
    fileUrl: links.get(d.id) ?? null,
    storagePath: d.storagePath,
    originalName: d.originalName,
    fileSize: d.fileSize,
    mimeType: d.mimeType,
    verificationStatus: d.verificationStatus,
    verificationNote: d.verificationNote,
    verifiedBy: d.verifiedById ? { _id: d.verifiedById, name: d.verifiedByName } : null,
    verifiedAt: d.verifiedAt,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

type DocReq = Request<{ docId: string }>;

abstract class DocumentDocs {
  constructor(protected readonly documents: DocumentService) {}

  protected async docs(list: StudentDocument[], withStudent: boolean) {
    const links = await this.documents.links(list);
    return list.map((d) => documentDoc(d, links, withStudent));
  }
}

/** /api/student/documents */
export class StudentDocumentController extends DocumentDocs {
  upload = async (req: Request, res: Response) => {
    const type = (req.body as { documentType?: unknown } | undefined)?.documentType;
    const doc = await this.documents.upload(currentUser(req).id, type, req.file as UploadedDocument | undefined);
    res.status(201).json({ success: true, data: (await this.docs([doc], false))[0] });
  };

  list = async (req: Request, res: Response) => {
    const { wroRequired, docs } = await this.documents.mine(currentUser(req).id);
    res.json({ success: true, wroRequired, data: await this.docs(docs, false) });
  };

  delete = async (req: DocReq, res: Response) => {
    await this.documents.deleteOwn(currentUser(req).id, req.params.docId);
    res.json({ success: true, message: 'Document deleted' });
  };

  debugWro = async (req: Request, res: Response) => {
    const studentId = currentUser(req).id;
    const { groups, hasWroAccess } = await this.documents.debugWro(studentId);
    res.json({
      success: true,
      studentId,
      hasWroAccess,
      groups: groups.map((g) => ({ groupId: g.groupId, groupName: g.groupName, courseId: g.courseId, courseTitle: g.courseTitle, courseStatus: g.courseStatus, wroDocumentsRequired: g.wroDocumentsRequired })),
    });
  };
}

/** /api/clo/documents — reviewing WRO documents (CLO role only, as before). */
export class CloDocumentController extends DocumentDocs {
  list = async (req: Request, res: Response) => {
    const q = req.query as Record<string, string | undefined>;
    const page = parsePagination(q);
    const { docs, total } = await this.documents.all(q, page);
    res.json({ success: true, data: await this.docs(docs, true), pagination: { total, page: page.page, limit: page.limit, pages: Math.ceil(total / page.limit) } });
  };

  forStudent = async (req: Request<{ studentId: string }>, res: Response) => {
    res.json({ success: true, data: await this.docs(await this.documents.forStudent(req.params.studentId), true) });
  };

  setStatus = async (req: DocReq, res: Response) => {
    const doc = await this.documents.setStatus(req.params.docId, currentUser(req).id, (req.body ?? {}) as Record<string, unknown>);
    res.json({ success: true, data: (await this.docs([doc], true))[0] });
  };

  download = async (req: DocReq, res: Response) => {
    res.json({ success: true, url: await this.documents.downloadLink(req.params.docId) });
  };

  summary = async (_req: Request, res: Response) => {
    const rows = await this.documents.summary();
    res.json({
      success: true,
      data: rows.map((r) => ({ _id: r.studentId, total: r.total, pending: r.pending, verified: r.verified, rejected: r.rejected, student: { name: r.name, email: r.email } })),
    });
  };
}
