import { and, asc, count, desc, eq, gte, ilike, inArray, lte, or, sql } from 'drizzle-orm';
import type { DbExecutor } from '../../shared/db/client';
import { escapeLike } from '../../shared/db/like';
import { users } from '../users/users.table';
import {
  inventoryProjects,
  type InventoryProjectRow,
  orderItems,
  type OrderRow,
  orders,
  type OrderStatus,
  type PartRow,
  parts,
  stockLedger,
  type StockLevelRow,
  stockLevels,
  type STOCK_REASONS,
} from './inventory.table';

export type StockReason = (typeof STOCK_REASONS)[number];

export interface Order extends OrderRow {
  items: { partId: string; qty: number; part: PartRow | null }[];
}

export interface Movement {
  id: string;
  partId: string;
  partName: string;
  sku: string;
  qtyChange: number;
  reason: string;
  notes: string | null;
  createdAt: Date;
  createdBy: { id: string; name: string } | null;
}

/** Thrown inside a stock transaction when there is not enough to take. */
export class InsufficientStock extends Error {
  constructor(readonly partId: string) {
    super(`Insufficient stock for part ${partId}`);
  }
}

export interface StockChange {
  partId: string;
  /** Added to available (negative takes stock out). */
  available: number;
  /** Added to reserved. */
  reserved: number;
  used?: number;
  damaged?: number;
  ledger: { qtyChange: number; reason: StockReason };
}

export interface InventoryRepository {
  listParts(): Promise<PartRow[]>;
  findPart(id: string): Promise<PartRow | null>;
  createPart(row: typeof parts.$inferInsert): Promise<PartRow>;
  updatePart(id: string, patch: Partial<typeof parts.$inferInsert>): Promise<PartRow | null>;
  deletePart(id: string): Promise<boolean>;
  existingPartIds(ids: string[]): Promise<Set<string>>;

  levels(partIds: string[]): Promise<Map<string, StockLevelRow>>;
  levelPage(f: { category?: string; search?: string; sortBy: 'name' | 'sku' | 'category' | 'createdAt'; limit: number; offset: number }): Promise<{ rows: (StockLevelRow & { part: PartRow })[]; total: number }>;
  stats(): Promise<{ totalParts: number; lowStock: number; outOfStock: number; totalValue: number }>;
  categories(): Promise<{ category: string; count: number; value: number }[]>;
  movements(f: { limit?: number; partId?: string; reason?: string; startDate?: Date; endDate?: Date }): Promise<Movement[]>;
  /**
   * Applies the changes atomically (rows locked), writing one ledger entry
   * each. Throws InsufficientStock if available or reserved would go below zero.
   */
  applyStock(changes: StockChange[], meta: { orderId?: string; createdById: string; notes?: string }): Promise<void>;

  listOrders(studentId?: string): Promise<Order[]>;
  findOrder(id: string): Promise<Order | null>;
  /** Creates the order and reserves its items in one transaction. */
  createOrder(row: { studentId: string; projectId: string | null }, items: { partId: string; qty: number }[]): Promise<string>;
  /** Moves the order from one of `from` to `to` and applies the stock changes, atomically. False when its status was not in `from`. */
  transition(order: Order, from: OrderStatus[], to: OrderStatus, changes: StockChange[], createdById: string): Promise<boolean>;

  listProjects(ownerId?: string): Promise<InventoryProjectRow[]>;
  createProject(row: typeof inventoryProjects.$inferInsert): Promise<InventoryProjectRow>;
  updateProject(id: string, ownerId: string, patch: Partial<typeof inventoryProjects.$inferInsert>): Promise<InventoryProjectRow | null>;
  deleteProject(id: string, ownerId: string): Promise<boolean>;
}

export class DrizzleInventoryRepository implements InventoryRepository {
  constructor(private readonly db: DbExecutor) {}

  // ---- Parts ----

  listParts() {
    return this.db.select().from(parts).orderBy(asc(parts.createdAt));
  }

  async findPart(id: string) {
    const [row] = await this.db.select().from(parts).where(eq(parts.id, id)).limit(1);
    return row ?? null;
  }

  /** Every part gets a (zero) stock row, so it shows up in the stock lists straight away. */
  async createPart(row: typeof parts.$inferInsert) {
    return this.db.transaction(async (tx) => {
      const [created] = await tx.insert(parts).values(row).returning();
      await tx.insert(stockLevels).values({ partId: created!.id });
      return created!;
    });
  }

  async updatePart(id: string, patch: Partial<typeof parts.$inferInsert>) {
    if (Object.keys(patch).length === 0) return this.findPart(id);
    const [row] = await this.db.update(parts).set(patch).where(eq(parts.id, id)).returning();
    return row ?? null;
  }

  async deletePart(id: string) {
    const rows = await this.db.delete(parts).where(eq(parts.id, id)).returning({ id: parts.id });
    return rows.length > 0;
  }

  async existingPartIds(ids: string[]) {
    if (ids.length === 0) return new Set<string>();
    const rows = await this.db.select({ id: parts.id }).from(parts).where(inArray(parts.id, ids));
    return new Set(rows.map((r) => r.id));
  }

  // ---- Stock ----

  async levels(partIds: string[]) {
    if (partIds.length === 0) return new Map<string, StockLevelRow>();
    const rows = await this.db.select().from(stockLevels).where(inArray(stockLevels.partId, partIds));
    return new Map(rows.map((r) => [r.partId, r]));
  }

  async levelPage(f: { category?: string; search?: string; sortBy: 'name' | 'sku' | 'category' | 'createdAt'; limit: number; offset: number }) {
    const s = f.search ? `%${escapeLike(f.search)}%` : null;
    const where = and(f.category ? eq(parts.category, f.category) : undefined, s ? or(ilike(parts.name, s), ilike(parts.sku, s)) : undefined);
    const [rows, [total]] = await Promise.all([
      this.db
        .select({ level: stockLevels, part: parts })
        .from(stockLevels)
        .innerJoin(parts, eq(parts.id, stockLevels.partId))
        .where(where)
        .orderBy(asc(parts[f.sortBy]))
        .limit(f.limit)
        .offset(f.offset),
      this.db.select({ n: count() }).from(stockLevels).innerJoin(parts, eq(parts.id, stockLevels.partId)).where(where),
    ]);
    return { rows: rows.map((r) => ({ ...r.level, part: r.part })), total: total?.n ?? 0 };
  }

  async stats() {
    const [row] = await this.db
      .select({
        totalParts: sql<number>`count(*)::int`,
        lowStock: sql<number>`count(*) filter (where ${stockLevels.availableQty} < 10)::int`,
        outOfStock: sql<number>`count(*) filter (where ${stockLevels.availableQty} <= 0)::int`,
        // The old API valued every item at 10.
        totalValue: sql<number>`coalesce(sum(${stockLevels.availableQty} * 10), 0)::int`,
      })
      .from(stockLevels);
    return row ?? { totalParts: 0, lowStock: 0, outOfStock: 0, totalValue: 0 };
  }

  categories() {
    return this.db
      .select({ category: parts.category, count: sql<number>`count(*)::int`, value: sql<number>`coalesce(sum(${stockLevels.availableQty} * 10), 0)::int` })
      .from(parts)
      .innerJoin(stockLevels, eq(stockLevels.partId, parts.id))
      .groupBy(parts.category);
  }

  async movements(f: { limit?: number; partId?: string; reason?: string; startDate?: Date; endDate?: Date }) {
    let q = this.db
      .select({
        id: stockLedger.id,
        partId: stockLedger.partId,
        partName: parts.name,
        sku: parts.sku,
        qtyChange: stockLedger.qtyChange,
        reason: sql<string>`${stockLedger.reason}::text`,
        notes: stockLedger.notes,
        createdAt: stockLedger.createdAt,
        userId: users.id,
        userName: users.name,
      })
      .from(stockLedger)
      .innerJoin(parts, eq(parts.id, stockLedger.partId))
      .leftJoin(users, eq(users.id, stockLedger.createdById))
      .where(
        and(
          f.partId ? eq(stockLedger.partId, f.partId) : undefined,
          f.reason ? sql`${stockLedger.reason}::text = ${f.reason}` : undefined,
          f.startDate ? gte(stockLedger.createdAt, f.startDate) : undefined,
          f.endDate ? lte(stockLedger.createdAt, f.endDate) : undefined,
        ),
      )
      .orderBy(desc(stockLedger.createdAt))
      .$dynamic();
    if (f.limit) q = q.limit(f.limit);
    return (await q).map(({ userId, userName, ...m }) => ({ ...m, createdBy: userId ? { id: userId, name: userName ?? '' } : null }));
  }

  private async applyIn(tx: DbExecutor, changes: StockChange[], meta: { orderId?: string; createdById: string; notes?: string }) {
    // Lock in a fixed order so two orders touching the same parts cannot deadlock.
    const sorted = [...changes].sort((a, b) => a.partId.localeCompare(b.partId));
    for (const c of sorted) {
      await tx.insert(stockLevels).values({ partId: c.partId }).onConflictDoNothing();
      const [level] = await tx.select().from(stockLevels).where(eq(stockLevels.partId, c.partId)).for('update');
      const available = level!.availableQty + c.available;
      const reserved = level!.reservedQty + c.reserved;
      if (available < 0 || reserved < 0) throw new InsufficientStock(c.partId);
      await tx
        .update(stockLevels)
        .set({ availableQty: available, reservedQty: reserved, usedQty: level!.usedQty + (c.used ?? 0), damagedQty: level!.damagedQty + (c.damaged ?? 0), updatedAt: new Date() })
        .where(eq(stockLevels.partId, c.partId));
      await tx.insert(stockLedger).values({ partId: c.partId, qtyChange: c.ledger.qtyChange, reason: c.ledger.reason, orderId: meta.orderId, createdById: meta.createdById, notes: meta.notes });
    }
  }

  async applyStock(changes: StockChange[], meta: { orderId?: string; createdById: string; notes?: string }) {
    await this.db.transaction((tx) => this.applyIn(tx, changes, meta));
  }

  // ---- Orders ----

  private async hydrate(rows: OrderRow[]): Promise<Order[]> {
    if (rows.length === 0) return [];
    const items = await this.db
      .select({ orderId: orderItems.orderId, partId: orderItems.partId, qty: orderItems.qty, part: parts })
      .from(orderItems)
      .leftJoin(parts, eq(parts.id, orderItems.partId))
      .where(
        inArray(
          orderItems.orderId,
          rows.map((r) => r.id),
        ),
      )
      .orderBy(asc(orderItems.position));
    return rows.map((r) => ({ ...r, items: items.filter((i) => i.orderId === r.id).map(({ orderId: _o, ...i }) => i) }));
  }

  async listOrders(studentId?: string) {
    const rows = await this.db
      .select()
      .from(orders)
      .where(studentId ? eq(orders.studentId, studentId) : undefined)
      .orderBy(asc(orders.createdAt));
    return this.hydrate(rows);
  }

  async findOrder(id: string) {
    const rows = await this.db.select().from(orders).where(eq(orders.id, id)).limit(1);
    return (await this.hydrate(rows))[0] ?? null;
  }

  async createOrder(row: { studentId: string; projectId: string | null }, items: { partId: string; qty: number }[]) {
    return this.db.transaction(async (tx) => {
      const [created] = await tx.insert(orders).values(row).returning({ id: orders.id });
      const id = created!.id;
      await tx.insert(orderItems).values(items.map((i, position) => ({ orderId: id, partId: i.partId, qty: i.qty, position })));
      await this.applyIn(
        tx,
        items.map((i) => ({ partId: i.partId, available: -i.qty, reserved: i.qty, ledger: { qtyChange: -i.qty, reason: 'reserve' as const } })),
        { orderId: id, createdById: row.studentId },
      );
      return id;
    });
  }

  async transition(order: Order, from: OrderStatus[], to: OrderStatus, changes: StockChange[], createdById: string) {
    return this.db.transaction(async (tx) => {
      const moved = await tx
        .update(orders)
        .set({ status: to })
        .where(and(eq(orders.id, order.id), inArray(orders.status, from)))
        .returning({ id: orders.id });
      if (moved.length === 0) return false;
      await this.applyIn(tx, changes, { orderId: order.id, createdById });
      return true;
    });
  }

  // ---- Inventory projects ----

  listProjects(ownerId?: string) {
    return this.db
      .select()
      .from(inventoryProjects)
      .where(ownerId ? eq(inventoryProjects.ownerId, ownerId) : undefined)
      .orderBy(asc(inventoryProjects.createdAt));
  }

  async createProject(row: typeof inventoryProjects.$inferInsert) {
    const [created] = await this.db.insert(inventoryProjects).values(row).returning();
    return created!;
  }

  async updateProject(id: string, ownerId: string, patch: Partial<typeof inventoryProjects.$inferInsert>) {
    const where = and(eq(inventoryProjects.id, id), eq(inventoryProjects.ownerId, ownerId));
    if (Object.keys(patch).length === 0) {
      const [row] = await this.db.select().from(inventoryProjects).where(where).limit(1);
      return row ?? null;
    }
    const [row] = await this.db.update(inventoryProjects).set(patch).where(where).returning();
    return row ?? null;
  }

  async deleteProject(id: string, ownerId: string) {
    const rows = await this.db
      .delete(inventoryProjects)
      .where(and(eq(inventoryProjects.id, id), eq(inventoryProjects.ownerId, ownerId)))
      .returning({ id: inventoryProjects.id });
    return rows.length > 0;
  }
}
