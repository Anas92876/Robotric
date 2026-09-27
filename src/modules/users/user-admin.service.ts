import { z } from 'zod';
import type { PasswordHasher } from '../../shared/auth/password-hasher';
import { isValidId } from '../../shared/db/ids';
import { AppError, BadRequestError, ConflictError, ForbiddenError } from '../../shared/http/errors';
import { parse } from '../../shared/http/validate';
import type { User, UserFilter, UserRepository } from './users.repository';
import type { UserRole } from './users.table';

/** Roles reception could assign in the old API. */
export const ASSIGNABLE_ROLES = ['student', 'trainer', 'teacher', 'social', 'reception', 'clo', 'admin', 'cto', 'engineer', 'client'] as const;
/**
 * Accounts only an admin may create, edit or promote to. The old API let
 * reception create admins and even promote themselves; now only admins can.
 */
const PRIVILEGED: readonly string[] = ['admin', 'superadmin', 'clo', 'cto'];
const isAdmin = (role: string) => role === 'admin' || role === 'superadmin';

const role = z.enum(ASSIGNABLE_ROLES, { error: (i) => `Invalid role: ${String(i.input)}` });
const phone = z.string().nullish();
const createSchema = z.object({
  name: z.string({ error: 'Please provide name, email, password, and role' }).trim().min(2, '"name" length must be at least 2 characters long').max(100),
  email: z.string({ error: 'Please provide name, email, password, and role' }).trim().email('"email" must be a valid email'),
  password: z.string({ error: 'Please provide name, email, password, and role' }).min(6, '"password" length must be at least 6 characters long'),
  role,
  phone,
});
const updateSchema = z.object({
  name: z.string().trim().min(2, '"name" length must be at least 2 characters long').max(100).optional(),
  email: z.string().trim().email('"email" must be a valid email').optional(),
  role: role.optional(),
  phone,
  password: z.string().min(6, '"password" length must be at least 6 characters long').optional(),
});

const notFound = () => new AppError('User not found', 404, 'NOT_FOUND');
/** Postgres refused because other rows still point here (foreign key or RESTRICT). */
const isForeignKeyError = (err: unknown): boolean => {
  const e = err as { code?: string; cause?: { code?: string } };
  const code = e?.cause?.code ?? e?.code;
  return code === '23503' || code === '23001';
};

/** Staff account management from the reception desk (/api/reception/users). */
export class UserAdminService {
  constructor(
    private readonly users: Pick<UserRepository, 'list' | 'count' | 'findById' | 'emailExists' | 'emailTakenByOther' | 'create' | 'update' | 'delete'>,
    private readonly hasher: PasswordHasher,
  ) {}

  private guard(actorRole: string, targetRole: string | undefined) {
    if (targetRole && PRIVILEGED.includes(targetRole) && !isAdmin(actorRole)) {
      throw new ForbiddenError('Only an admin can manage admin, CLO or CTO accounts', 'PRIVILEGED_ROLE');
    }
  }

  async list(q: Record<string, string | undefined>, page: { limit: number; offset: number }) {
    const filter: UserFilter = { role: q.role || undefined, search: q.search || undefined };
    const [rows, total] = await Promise.all([this.users.list(filter, page), this.users.count(filter)]);
    return { rows, total };
  }

  async create(actorRole: string, body: unknown): Promise<User> {
    const input = parse(createSchema, body);
    this.guard(actorRole, input.role);
    if (await this.users.emailExists(input.email)) throw new ConflictError('User with this email already exists');
    return this.users.create({
      name: input.name,
      email: input.email,
      passwordHash: await this.hasher.hash(input.password),
      role: input.role as UserRole,
      profile: input.phone ? { phone: input.phone } : {},
    });
  }

  /** A role or password change signs the user out everywhere (the role lives in their token). */
  async update(actorRole: string, id: string, body: unknown): Promise<User> {
    const user = isValidId(id) ? await this.users.findById(id) : null;
    if (!user) throw notFound();
    const input = parse(updateSchema, body);
    this.guard(actorRole, user.role);
    this.guard(actorRole, input.role);
    if (input.email && (await this.users.emailTakenByOther(input.email, id))) throw new ConflictError('Email already in use');
    const roleChanged = Boolean(input.role && input.role !== user.role);
    const updated = await this.users.update(
      id,
      {
        ...(input.name && { name: input.name }),
        ...(input.email && { email: input.email }),
        ...(input.role && { role: input.role as UserRole }),
        ...(input.phone !== undefined && { profile: { ...(user.profile ?? {}), phone: input.phone ?? '' } }),
        ...(input.password && { passwordHash: await this.hasher.hash(input.password) }),
      },
      roleChanged || Boolean(input.password),
    );
    return updated!;
  }

  async delete(actorRole: string, id: string): Promise<void> {
    const user = isValidId(id) ? await this.users.findById(id) : null;
    if (!user) throw notFound();
    if (user.role === 'admin' || user.role === 'clo') throw new BadRequestError('Cannot delete admin or CLO users');
    this.guard(actorRole, user.role);
    try {
      await this.users.delete(id);
    } catch (err) {
      if (isForeignKeyError(err)) throw new ConflictError('This user is still linked to other records (for example sessions they teach) and cannot be deleted', 'USER_IN_USE');
      throw err;
    }
  }
}
