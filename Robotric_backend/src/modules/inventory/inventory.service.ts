import { z } from 'zod';
import { isValidId } from '../../shared/db/ids';
import { AppError, BadRequestError, ConflictError, ForbiddenError } from '../../shared/http/errors';
import { parse } from '../../shared/http/validate';
import { InsufficientStock, type InventoryRepository, type Order, type StockChange } from './inventory.repository';
import type { OrderStatus } from './inventory.table';

export interface Actor {
  id: string;
  role: string;
}

const isAdmin = (a: Actor) => a.role === 'admin' || a.role === 'superadmin';
/** Postgres refused because other rows still point here (foreign key or RESTRICT). */
const isFkError = (err: unknown) => {
  const e = err as { code?: string; cause?: { code?: string } };
  const code = e?.cause?.code ?? e?.code;
  return code === '23503' || code === '23001';
};

// Joi-style messages, as the old API worded them.
const text = z.string().optional();
const isLego = (g: unknown) => typeof g === 'string' && g.toLowerCase() === 'lego';
const partFields = {
  category: text,
  description: text,
  sku: text,
  group: text,
  partNumber: text,
};
const createPartSchema = z
  .object({ name: z.string({ error: '"name" is required' }).min(1, '"name" is not allowed to be empty'), ...partFields })
  .refine((p) => !isLego(p.group) || Boolean(p.partNumber), { message: '"partNumber" is required', path: ['partNumber'] });
const updatePartSchema = z
  .object({ name: z.string().min(1, '"name" is not allowed to be empty').optional(), ...partFields })
  .refine((p) => !isLego(p.group) || Boolean(p.partNumber), { message: '"partNumber" is required', path: ['partNumber'] });

const MANUAL_REASONS = ['purchase', 'adjustment', 'used', 'damaged', 'return', 'other'] as const;
const adjustSchema = z.object({
  partId: z.string({ error: '"partId" is required' }),
  qtyChange: z.coerce.number({ error: '"qtyChange" must be a number' }).int('"qtyChange" must be an integer'),
  reason: z.enum(MANUAL_REASONS, { error: '"reason" must be one of [purchase, adjustment, used, damaged, return, other]' }),
  orderId: z.string().optional(),
  notes: z.string().optional(),
});

const itemsSchema = z
  .array(
    z.object({
      partId: z.string({ error: '"partId" is required' }),
      qty: z.coerce.number({ error: '"qty" must be a number' }).int().min(1, '"qty" must be greater than or equal to 1'),
    }),
    { error: '"items" is required' },
  )
  .min(1, '"items" must contain at least 1 items');
const createOrderSchema = z.object({ projectId: z.string().optional(), items: itemsSchema });

const projectParts = z.array(z.object({ partId: z.string({ error: '"partId" is required' }), qty: z.coerce.number().int().min(1, '"qty" must be greater than or equal to 1') }));
const createProjectSchema = z.object({ title: z.string({ error: '"title" is required' }).min(1, '"title" is not allowed to be empty'), description: text, parts: projectParts.default([]) });
const updateProjectSchema = z.object({ title: z.string().min(1, '"title" is not allowed to be empty').optional(), description: text });
const updatePartsSchema = z.object({ parts: projectParts });

const partNotFound = () => new AppError('Part not found', 404, 'NOT_FOUND');
const orderNotFound = () => new AppError('Order not found', 404, 'NOT_FOUND');
const projectNotFound = () => new AppError('Project not found', 404, 'NOT_FOUND');
const insufficient = () => new BadRequestError('Insufficient stock for one or more items', 'INSUFFICIENT_STOCK');

/** Merges repeated lines for the same part. */
function mergeItems(items: { partId: string; qty: number }[]) {
  const map = new Map<string, number>();
  for (const i of items) map.set(i.partId, (map.get(i.partId) ?? 0) + i.qty);
  return [...map].map(([partId, qty]) => ({ partId, qty }));
}

/**
 * The workshop store: parts, stock and part orders.
 *
 * Stock rules (the old ones were inconsistent: ordering *added* to the
 * available stock and fulfilling never removed anything):
 *  - placing an order moves the quantity from available to reserved;
 *  - rejecting or cancelling moves it back;
 *  - fulfilling removes it from reserved (it has left the store).
 * An order can only be approved while pending, fulfilled while pending or
 * approved, and rejected/cancelled while still open.
 */
export class InventoryService {
  constructor(private readonly store: InventoryRepository) {}

  // ---- Parts ----

  listParts() {
    return this.store.listParts();
  }

  async part(id: string) {
    const part = isValidId(id) ? await this.store.findPart(id) : null;
    if (!part) throw partNotFound();
    return part;
  }

  levels(partIds: string[]) {
    return this.store.levels(partIds);
  }

  createPart(body: unknown) {
    const input = parse(createPartSchema, body);
    return this.store.createPart({ ...input, category: input.category ?? '', sku: input.sku ?? '' });
  }

  async updatePart(id: string, body: unknown) {
    const input = parse(updatePartSchema, body);
    const part = isValidId(id) ? await this.store.updatePart(id, input) : null;
    if (!part) throw partNotFound();
    return part;
  }

  async deletePart(id: string) {
    try {
      if (!isValidId(id) || !(await this.store.deletePart(id))) throw partNotFound();
    } catch (err) {
      if (isFkError(err)) throw new ConflictError('This part appears in orders and cannot be deleted', 'PART_IN_USE');
      throw err;
    }
  }

  // ---- Stock ----

  stockLevels(q: Record<string, string | undefined>) {
    const page = Math.max(1, Number.parseInt(q.page ?? '', 10) || 1);
    const limit = Math.min(200, Math.max(1, Number.parseInt(q.limit ?? '', 10) || 20));
    const sortBy = (['name', 'sku', 'category', 'createdAt'] as const).find((s) => s === q.sortBy) ?? 'name';
    return this.store.levelPage({ category: q.category || undefined, search: q.search || undefined, sortBy, limit, offset: (page - 1) * limit }).then((r) => ({ ...r, page, limit }));
  }

  stats() {
    return this.store.stats();
  }

  categories() {
    return this.store.categories();
  }

  recent(limit: string | undefined) {
    return this.store.movements({ limit: Math.min(200, Math.max(1, Number.parseInt(limit ?? '', 10) || 10)) });
  }

  history(q: Record<string, string | undefined>) {
    const day = (v?: string) => {
      const d = v ? new Date(v) : undefined;
      if (d && Number.isNaN(d.getTime())) throw new BadRequestError('"date" must be a valid date');
      return d;
    };
    return this.store.movements({ partId: isValidId(q.partId) ? q.partId : undefined, reason: q.reason || undefined, startDate: day(q.startDate), endDate: day(q.endDate) });
  }

  /** A manual stock correction by an admin (purchase, loss, …). Stock cannot go below zero. */
  async adjust(actor: Actor, body: unknown) {
    const input = parse(adjustSchema, body);
    const part = await this.part(input.partId);
    const change: StockChange = {
      partId: part.id,
      available: input.qtyChange,
      reserved: 0,
      used: input.reason === 'used' ? input.qtyChange : 0,
      damaged: input.reason === 'damaged' ? input.qtyChange : 0,
      ledger: { qtyChange: input.qtyChange, reason: input.reason },
    };
    try {
      await this.store.applyStock([change], { createdById: actor.id, notes: input.notes, orderId: isValidId(input.orderId) ? input.orderId : undefined });
    } catch (err) {
      if (err instanceof InsufficientStock) throw new BadRequestError('Stock cannot go below zero', 'INSUFFICIENT_STOCK');
      throw err;
    }
    return { part, level: (await this.store.levels([part.id])).get(part.id)! };
  }

  // ---- Orders ----

  listOrders(actor: Actor) {
    return this.store.listOrders(isAdmin(actor) ? undefined : actor.id);
  }

  async createOrder(actor: Actor, body: unknown) {
    const input = parse(createOrderSchema, body);
    const items = mergeItems(input.items);
    const known = await this.store.existingPartIds(items.map((i) => i.partId).filter(isValidId));
    if (items.some((i) => !known.has(i.partId))) throw new BadRequestError('One or more parts do not exist', 'PART_NOT_FOUND');
    try {
      const id = await this.store.createOrder({ studentId: actor.id, projectId: isValidId(input.projectId) ? input.projectId : null }, items);
      return (await this.store.findOrder(id))!;
    } catch (err) {
      if (err instanceof InsufficientStock) throw insufficient();
      throw err;
    }
  }

  private async order(id: string): Promise<Order> {
    const order = isValidId(id) ? await this.store.findOrder(id) : null;
    if (!order) throw orderNotFound();
    return order;
  }

  private async move(actor: Actor, order: Order, from: OrderStatus[], to: OrderStatus, effect: 'none' | 'release' | 'fulfill' | 'cancel') {
    const changes: StockChange[] =
      effect === 'none'
        ? []
        : order.items.map((i) =>
            effect === 'fulfill'
              ? { partId: i.partId, available: 0, reserved: -i.qty, used: 0, ledger: { qtyChange: -i.qty, reason: 'fulfill' as const } }
              : { partId: i.partId, available: i.qty, reserved: -i.qty, ledger: { qtyChange: i.qty, reason: effect } },
          );
    const moved = await this.store.transition(order, from, to, changes, actor.id);
    if (!moved) throw new BadRequestError(`Order cannot be ${to} while ${order.status}`, 'INVALID_ORDER_STATUS');
    return (await this.store.findOrder(order.id))!;
  }

  async approve(actor: Actor, id: string) {
    return this.move(actor, await this.order(id), ['pending'], 'approved', 'none');
  }

  async reject(actor: Actor, id: string) {
    return this.move(actor, await this.order(id), ['pending', 'approved'], 'rejected', 'release');
  }

  async fulfill(actor: Actor, id: string) {
    return this.move(actor, await this.order(id), ['pending', 'approved'], 'fulfilled', 'fulfill');
  }

  /** The student who placed it, or an admin. */
  async cancel(actor: Actor, id: string) {
    const order = await this.order(id);
    if (order.studentId !== actor.id && !isAdmin(actor)) throw new ForbiddenError('You do not have permission to cancel this order');
    return this.move(actor, order, ['pending', 'approved'], 'cancelled', 'cancel');
  }

  // ---- Inventory projects ----

  listProjects(actor: Actor) {
    return this.store.listProjects(isAdmin(actor) ? undefined : actor.id);
  }

  createProject(actor: Actor, body: unknown) {
    const input = parse(createProjectSchema, body);
    return this.store.createProject({ ...input, ownerId: actor.id });
  }

  async updateProject(actor: Actor, id: string, body: unknown) {
    const input = parse(updateProjectSchema, body);
    const project = isValidId(id) ? await this.store.updateProject(id, actor.id, input) : null;
    if (!project) throw projectNotFound();
    return project;
  }

  async setProjectParts(actor: Actor, id: string, body: unknown) {
    const input = parse(updatePartsSchema, body);
    const project = isValidId(id) ? await this.store.updateProject(id, actor.id, { parts: input.parts }) : null;
    if (!project) throw projectNotFound();
    return project;
  }

  async deleteProject(actor: Actor, id: string) {
    if (!isValidId(id) || !(await this.store.deleteProject(id, actor.id))) throw projectNotFound();
  }
}
