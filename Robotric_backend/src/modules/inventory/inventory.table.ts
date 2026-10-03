import { index, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { idRef, primaryId } from '../../shared/db/ids';
import { timestamps } from '../../shared/db/columns';
import { users } from '../users/users.table';

/** An electronic / Lego part kept in the workshop store. */
export const parts = pgTable(
  'parts',
  {
    id: primaryId(),
    name: varchar('name', { length: 300 }).notNull(),
    category: varchar('category', { length: 200 }).notNull().default(''),
    description: text('description'),
    sku: varchar('sku', { length: 200 }).notNull().default(''),
    group: varchar('group', { length: 200 }),
    partNumber: varchar('part_number', { length: 200 }),
    ...timestamps(),
  },
  (t) => [index('parts_name_idx').on(t.name), index('parts_sku_idx').on(t.sku), index('parts_category_idx').on(t.category)],
);

/**
 * Current stock of a part. `availableQty` is what can still be ordered;
 * `reservedQty` is held by open (pending/approved) orders. Both change in the
 * same transaction as the order, so stock cannot be double-booked.
 */
export const stockLevels = pgTable('stock_levels', {
  partId: idRef('part_id')
    .primaryKey()
    .references(() => parts.id, { onDelete: 'cascade' }),
  availableQty: integer('available_qty').notNull().default(0),
  reservedQty: integer('reserved_qty').notNull().default(0),
  usedQty: integer('used_qty').notNull().default(0),
  damagedQty: integer('damaged_qty').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const STOCK_REASONS = ['purchase', 'adjustment', 'used', 'damaged', 'return', 'reserve', 'release', 'fulfill', 'cancel', 'other'] as const;
export const stockReason = pgEnum('stock_reason', STOCK_REASONS);

/** Every stock movement, newest last. `qtyChange` is the change to the part's available (or, for fulfil, reserved) quantity. */
export const stockLedger = pgTable(
  'stock_ledger',
  {
    id: primaryId(),
    partId: idRef('part_id')
      .notNull()
      .references(() => parts.id, { onDelete: 'cascade' }),
    qtyChange: integer('qty_change').notNull(),
    reason: stockReason('reason').notNull(),
    orderId: idRef('order_id'),
    createdById: idRef('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('stock_ledger_part_idx').on(t.partId, t.createdAt), index('stock_ledger_created_idx').on(t.createdAt)],
);

export const ORDER_STATUSES = ['pending', 'approved', 'rejected', 'fulfilled', 'cancelled'] as const;
export const orderStatus = pgEnum('order_status', ORDER_STATUSES);
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** A request for parts from the store. */
export const orders = pgTable(
  'orders',
  {
    id: primaryId(),
    studentId: idRef('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    projectId: idRef('project_id'),
    status: orderStatus('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('orders_student_idx').on(t.studentId, t.createdAt), index('orders_status_idx').on(t.status, t.createdAt)],
);

export const orderItems = pgTable(
  'order_items',
  {
    orderId: idRef('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    partId: idRef('part_id')
      .notNull()
      .references(() => parts.id, { onDelete: 'restrict' }),
    qty: integer('qty').notNull(),
    position: integer('position').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.orderId, t.partId] })],
);

/** A personal build project with its parts list (separate from graded student projects). */
export const inventoryProjects = pgTable(
  'inventory_projects',
  {
    id: primaryId(),
    ownerId: idRef('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 300 }).notNull(),
    description: text('description'),
    parts: jsonb('parts').$type<{ partId: string; qty: number }[]>().notNull().default([]),
    ...timestamps(),
  },
  (t) => [index('inventory_projects_owner_idx').on(t.ownerId, t.createdAt)],
);

export type PartRow = typeof parts.$inferSelect;
export type StockLevelRow = typeof stockLevels.$inferSelect;
export type OrderRow = typeof orders.$inferSelect;
export type InventoryProjectRow = typeof inventoryProjects.$inferSelect;
