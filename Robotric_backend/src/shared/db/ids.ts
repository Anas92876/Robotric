import { randomBytes } from 'node:crypto';
import { varchar } from 'drizzle-orm/pg-core';

/**
 * Record IDs keep MongoDB's ObjectId format — 24 lowercase hex characters —
 * so the web and mobile clients, which store and compare these IDs, see no
 * change. Layout matches ObjectId: 4-byte seconds timestamp, 5-byte
 * per-process random, 3-byte incrementing counter. IDs therefore still sort
 * roughly by creation time.
 */
const processRandom = randomBytes(5);
let counter = randomBytes(3).readUIntBE(0, 3);

export function newId(): string {
  const buf = Buffer.alloc(12);
  buf.writeUInt32BE(Math.floor(Date.now() / 1000), 0);
  processRandom.copy(buf, 4);
  counter = (counter + 1) % 0xffffff;
  buf.writeUIntBE(counter, 9, 3);
  return buf.toString('hex');
}

const ID_PATTERN = /^[a-f0-9]{24}$/i;

export function isValidId(value: unknown): value is string {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

/** Primary key column: `id varchar(24)` defaulting to a fresh ObjectId-style id. */
export const primaryId = () => varchar('id', { length: 24 }).primaryKey().$defaultFn(newId);

/** Foreign key column holding another table's id. */
export const idRef = (name: string) => varchar(name, { length: 24 });
