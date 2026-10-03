import type { Request, Response } from 'express';
import { currentUser } from '../../shared/http/request-user';
import type { PostService } from './posts.service';
import type { PostRow } from './posts.table';

// Bare documents (no `success` wrapper), as before.
const postDoc = (p: PostRow) => ({
  _id: p.id,
  slug: p.slug,
  title: p.title,
  body: p.body,
  tags: p.tags,
  authorId: p.authorId,
  status: p.status,
  publishedAt: p.publishedAt,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
});

type IdReq = Request<{ id: string }>;

/** /api/posts */
export class PostController {
  constructor(private readonly posts: PostService) {}

  manage = async (_req: Request, res: Response) => {
    res.json((await this.posts.all()).map(postDoc));
  };

  manageOne = async (req: IdReq, res: Response) => {
    res.json(postDoc(await this.posts.getAny(req.params.id)));
  };

  list = async (_req: Request, res: Response) => {
    res.json((await this.posts.published()).map(postDoc));
  };

  get = async (req: IdReq, res: Response) => {
    res.json(postDoc(await this.posts.get({ id: req.params.id })));
  };

  bySlug = async (req: Request<{ slug: string }>, res: Response) => {
    res.json(postDoc(await this.posts.get({ slug: req.params.slug })));
  };

  create = async (req: Request, res: Response) => {
    res.status(201).json(postDoc(await this.posts.create(currentUser(req).id, req.body)));
  };

  update = async (req: IdReq, res: Response) => {
    res.json(postDoc(await this.posts.update(req.params.id, req.body)));
  };

  delete = async (req: IdReq, res: Response) => {
    await this.posts.delete(req.params.id);
    res.json({ success: true, message: 'Post deleted successfully' });
  };
}
