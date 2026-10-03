import type { Request, Response } from 'express';
import { currentUser } from '../../shared/http/request-user';
import type { ImageService, UploadedImage } from './images.service';

type IdReq = Request<{ id: string }>;
type ByReq = Request<{ imageType: string; associatedId: string }>;

/**
 * /api/images. Reading an image redirects to its public file, so `<img src>`
 * keeps working. Thumbnails redirect to the same file (the old server-side
 * resizing read a field that was never saved and always failed).
 */
export class ImageController {
  constructor(private readonly images: ImageService) {}

  upload = async (req: Request, res: Response) => {
    const image = await this.images.upload(req.file as UploadedImage | undefined, (req.body ?? {}) as Record<string, unknown>, currentUser(req).id);
    res.status(201).json({ success: true, data: { _id: image.id, url: `/api/images/${image.id}` } });
  };

  get = async (req: IdReq, res: Response) => {
    res.redirect(302, this.images.url(await this.images.byId(req.params.id)));
  };

  byAssociation = async (req: ByReq, res: Response) => {
    res.redirect(302, this.images.url(await this.images.byAssociation(req.params.imageType, req.params.associatedId)));
  };
}
