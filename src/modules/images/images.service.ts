import { isValidId } from '../../shared/db/ids';
import { AppError, BadRequestError } from '../../shared/http/errors';
import type { FileStorage } from '../../shared/storage/file-storage';
import { sanitizeFilename } from '../../shared/storage/file-storage';
import type { ImageRepository } from './images.repository';
import { IMAGE_TYPES, type ImageRow } from './images.table';

export interface UploadedImage {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const MODELS = ['User', 'Part', 'Project', 'Post'];
const notFound = () => new AppError('Image not found', 404, 'IMAGE_NOT_FOUND');

/** Public pictures in the images bucket, addressed by id or by the item they belong to. */
export class ImageService {
  constructor(
    private readonly images: ImageRepository,
    private readonly storage: FileStorage,
    private readonly bucket: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  url(image: ImageRow): string {
    return this.storage.publicUrl({ bucket: this.bucket, path: image.storagePath });
  }

  async upload(file: UploadedImage | undefined, body: { imageType?: unknown; associatedId?: unknown; associatedModel?: unknown }, uploadedById: string) {
    if (!file) throw new BadRequestError('No file provided', 'NO_FILE');
    if (!IMAGE_TYPES.includes(body.imageType as (typeof IMAGE_TYPES)[number])) {
      throw new BadRequestError('Invalid imageType. Must be one of: profile, part, project, post, other', 'INVALID_IMAGE_TYPE');
    }
    const filename = `${this.now().getTime()}_${sanitizeFilename(file.originalname)}`;
    const stored = await this.storage.upload({ bucket: this.bucket, path: `uploads/${body.imageType}/${filename}`, body: file.buffer, contentType: file.mimetype });
    try {
      return await this.images.create({
        filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        storagePath: stored.path,
        imageType: body.imageType as (typeof IMAGE_TYPES)[number],
        associatedId: isValidId(body.associatedId) ? body.associatedId : null,
        associatedModel: typeof body.associatedModel === 'string' && MODELS.includes(body.associatedModel) ? body.associatedModel : null,
        uploadedById,
      });
    } catch (err) {
      await this.storage.remove(stored);
      throw err;
    }
  }

  async byId(id: string): Promise<ImageRow> {
    const image = isValidId(id) ? await this.images.findById(id) : null;
    if (!image) throw notFound();
    return image;
  }

  async byAssociation(imageType: string, associatedId: string): Promise<ImageRow> {
    const image = isValidId(associatedId) ? await this.images.latestFor(imageType, associatedId) : null;
    if (!image) throw notFound();
    return image;
  }

  /** Public links to the newest image of each item. */
  async urlsFor(imageType: string, associatedIds: string[]): Promise<Map<string, string>> {
    const latest = await this.images.latestForMany(imageType, associatedIds);
    return new Map([...latest].map(([id, img]) => [id, this.url(img)]));
  }
}
