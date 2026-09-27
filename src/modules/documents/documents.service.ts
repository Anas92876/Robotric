import { isValidId } from '../../shared/db/ids';
import { AppError, BadRequestError, ForbiddenError } from '../../shared/http/errors';
import type { FileStorage } from '../../shared/storage/file-storage';
import type { DocumentRepository, StudentDocument } from './documents.repository';
import { DOCUMENT_TYPES, type DocumentType } from './documents.table';

export interface UploadedDocument {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const STATUSES = ['pending', 'verified', 'rejected'] as const;
const notFound = () => new AppError('Document not found', 404, 'NOT_FOUND');

export class DocumentService {
  constructor(
    private readonly documents: DocumentRepository,
    private readonly storage: FileStorage,
    private readonly bucket: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Short-lived links to the (private) files, keyed by document id. */
  async links(docs: StudentDocument[], seconds = 300): Promise<Map<string, string | null>> {
    const links = new Map<string, string | null>();
    for (const d of docs) links.set(d.id, await this.storage.signedUrl({ bucket: this.bucket, path: d.storagePath }, seconds).catch(() => null));
    return links;
  }

  /** WRO documents are only asked of students in a course that requires them. */
  async wroRequired(studentId: string): Promise<boolean> {
    return (await this.documents.groupsOf(studentId)).some((g) => g.wroDocumentsRequired === true);
  }

  // ---- Student ----

  /** Uploads a document, replacing any earlier one of the same type. */
  async upload(studentId: string, documentTypeInput: unknown, file: UploadedDocument | undefined): Promise<StudentDocument> {
    if (!(await this.wroRequired(studentId))) throw new ForbiddenError('WRO document submission is not required for your course');
    if (!file) throw new BadRequestError('Document file is required');
    if (typeof documentTypeInput !== 'string' || !DOCUMENT_TYPES.includes(documentTypeInput as DocumentType)) {
      throw new BadRequestError(`Invalid document type. Allowed: ${DOCUMENT_TYPES.join(', ')}`);
    }
    const type = documentTypeInput as DocumentType;
    const ext = file.originalname.split('.').pop()?.toLowerCase() || 'bin';
    const { path } = await this.storage.upload({
      bucket: this.bucket,
      path: `documents/${studentId}/${type}_${this.now().getTime()}.${ext}`,
      body: file.buffer,
      contentType: file.mimetype,
    });

    // Replace the old one only after the new file is safely stored.
    const existing = await this.documents.findByType(studentId, type);
    const id = await this.documents.create({ studentId, documentType: type, storagePath: path, originalName: file.originalname, fileSize: file.size, mimeType: file.mimetype });
    if (existing) {
      await this.documents.delete(existing.id);
      await this.storage.remove({ bucket: this.bucket, path: existing.storagePath });
    }
    return (await this.documents.findById(id))!;
  }

  async mine(studentId: string) {
    const [wroRequired, docs] = await Promise.all([this.wroRequired(studentId), this.documents.list({ studentId }, 'type')]);
    return { wroRequired, docs };
  }

  async debugWro(studentId: string) {
    const groups = await this.documents.groupsOf(studentId);
    return { groups, hasWroAccess: groups.some((g) => g.wroDocumentsRequired === true) };
  }

  async deleteOwn(studentId: string, docId: string): Promise<void> {
    const doc = isValidId(docId) ? await this.documents.findById(docId) : null;
    if (!doc || doc.studentId !== studentId) throw notFound();
    if (doc.verificationStatus !== 'pending') throw new BadRequestError('Only pending documents can be deleted');
    await this.documents.delete(doc.id);
    await this.storage.remove({ bucket: this.bucket, path: doc.storagePath });
  }

  // ---- CLO ----

  async all(q: Record<string, string | undefined>, page: { limit: number; offset: number }) {
    const filter = {
      status: STATUSES.includes(q.status as (typeof STATUSES)[number]) ? q.status : undefined,
      documentType: q.documentType || undefined,
    };
    const [docs, total] = await Promise.all([this.documents.list(filter, 'newest', page), this.documents.count(filter)]);
    return { docs, total };
  }

  forStudent(studentId: string) {
    return isValidId(studentId) ? this.documents.list({ studentId }, 'type') : Promise.resolve([]);
  }

  async setStatus(docId: string, reviewerId: string, body: { verificationStatus?: unknown; verificationNote?: unknown }): Promise<StudentDocument> {
    const status = body.verificationStatus;
    if (!STATUSES.includes(status as (typeof STATUSES)[number])) throw new BadRequestError('Invalid status. Use: pending, verified, or rejected');
    const doc = isValidId(docId) ? await this.documents.findById(docId) : null;
    if (!doc) throw notFound();
    const pending = status === 'pending';
    await this.documents.update(doc.id, {
      verificationStatus: status as (typeof STATUSES)[number],
      verificationNote: typeof body.verificationNote === 'string' && body.verificationNote ? body.verificationNote : null,
      verifiedById: pending ? null : reviewerId,
      verifiedAt: pending ? null : this.now(),
    });
    return (await this.documents.findById(doc.id))!;
  }

  /** A 60-second download link. */
  async downloadLink(docId: string): Promise<string> {
    const doc = isValidId(docId) ? await this.documents.findById(docId) : null;
    if (!doc) throw notFound();
    return this.storage.signedUrl({ bucket: this.bucket, path: doc.storagePath }, 60);
  }

  summary() {
    return this.documents.summary();
  }
}
