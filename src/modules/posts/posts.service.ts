import { z } from 'zod';
import { isValidId } from '../../shared/db/ids';
import { AppError, ConflictError } from '../../shared/http/errors';
import { parse } from '../../shared/http/validate';
import type { PostRepository } from './posts.repository';

const required = (field: string) => ({ error: (i: { input: unknown }) => (i.input === undefined ? `"${field}" is required` : `"${field}" must be a string`) });
const tags = z.array(z.string({ error: '"tags" must contain only strings' }), { error: '"tags" must be an array' });
const status = z.enum(['draft', 'published'], { error: '"status" must be one of [draft, published]' });
const createSchema = z.object({
  slug: z.string(required('slug')).trim().min(1, '"slug" is not allowed to be empty'),
  title: z.string(required('title')).min(1, '"title" is not allowed to be empty'),
  body: z.string(required('body')).min(1, '"body" is not allowed to be empty'),
  tags: tags.default([]),
  status: status.default('draft'),
});
const updateSchema = z.object({
  title: z.string().min(1, '"title" is not allowed to be empty').optional(),
  body: z.string().min(1, '"body" is not allowed to be empty').optional(),
  tags: tags.optional(),
  status: status.optional(),
});

const notFound = () => new AppError('Post not found', 404, 'NOT_FOUND');

/** Website posts. Only published ones are readable publicly. */
export class PostService {
  constructor(
    private readonly posts: PostRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  published() {
    return this.posts.published();
  }

  async get(by: { id?: string; slug?: string }) {
    if (by.id !== undefined && !isValidId(by.id)) throw notFound();
    const post = await this.posts.findPublished(by);
    if (!post) throw notFound();
    return post;
  }

  async create(authorId: string, body: unknown) {
    const input = parse(createSchema, body);
    if (await this.posts.slugTaken(input.slug)) throw new ConflictError('A post with this slug already exists', 'SLUG_TAKEN');
    return this.posts.create({ ...input, authorId, publishedAt: input.status === 'published' ? this.now() : null });
  }

  /** Publishing stamps the date once; editing a published post keeps it (it used to reset on every save). */
  async update(id: string, body: unknown) {
    const input = parse(updateSchema, body);
    const current = isValidId(id) ? await this.posts.findById(id) : null;
    if (!current) throw notFound();
    const publishedAt =
      input.status === 'published' ? (current.status === 'published' ? current.publishedAt : this.now()) : input.status === 'draft' ? null : current.publishedAt;
    return (await this.posts.update(id, { ...input, publishedAt }))!;
  }

  async delete(id: string) {
    if (!isValidId(id) || !(await this.posts.delete(id))) throw notFound();
  }
}
