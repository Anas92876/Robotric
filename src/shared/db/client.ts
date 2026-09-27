import { drizzle } from 'drizzle-orm/postgres-js';
import type { PgDatabase, PgQueryResultHKT, PgTransaction } from 'drizzle-orm/pg-core';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from './schema';

export type Schema = typeof schema;

/**
 * The database handle every repository receives. Typed against the generic
 * Postgres dialect so the same repositories run on Supabase/Neon in
 * production and on in-process PGlite in tests.
 */
export type Database = PgDatabase<PgQueryResultHKT, Schema>;
export type Transaction = PgTransaction<PgQueryResultHKT, Schema, ExtractTablesWithRelations<Schema>>;
/** Anything a query can run on: the pool or an open transaction. */
export type DbExecutor = Database | Transaction;

/**
 * Connects with postgres.js. Works with any Postgres provider:
 *  - Supabase: use the transaction-pooler URL (port 6543).
 *  - Neon: use the pooled connection string.
 * `prepare: false` is required by transaction-mode poolers (PgBouncer/Supavisor).
 * A small pool suits serverless, where each instance handles few requests.
 */
export function createDatabase(url: string): { db: Database; close: () => Promise<void> } {
  // A short connect timeout makes a dropped connection fail fast instead of hanging a request.
  const client = postgres(url, { prepare: false, max: 5, idle_timeout: 20, connect_timeout: 10 });
  const db = drizzle(client, { schema }) as unknown as Database;
  return { db, close: () => client.end() };
}
