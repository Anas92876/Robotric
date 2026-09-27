import { drizzle } from 'drizzle-orm/node-postgres';
import type { PgDatabase, PgQueryResultHKT, PgTransaction } from 'drizzle-orm/pg-core';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import { Pool } from 'pg';
import { logger } from '../logger';
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
 * Connects with node-postgres (pg). Works with any Postgres provider:
 *  - Supabase: use the transaction-pooler URL (port 6543).
 *  - Neon: use the pooled connection string.
 * pg runs one query at a time per connection and gives each transaction its own
 * connection. (postgres.js pipelined queries on busy connections, and Supabase's
 * transaction pooler lost them: parallel queries hung the whole server.)
 * A small pool suits serverless, where each instance handles few requests.
 */
export function createDatabase(url: string): { db: Database; close: () => Promise<void> } {
  const pool = new Pool({
    connectionString: url,
    max: 5,
    // Opening a connection (TLS + sign-in) costs a few round trips to the database, so
    // idle connections are kept for a while and reused. TCP keep-alive probes every
    // 10 s stop routers/VPNs from silently dropping them (the next query on a dropped
    // connection fails with "Connection terminated").
    idleTimeoutMillis: 300_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    // A short connect timeout makes a dropped connection fail fast instead of hanging a request.
    connectionTimeoutMillis: 10_000,
  });
  // The pooler closes idle connections; without a listener that error would crash the process.
  pool.on('error', (err) => logger.warn({ err }, 'Idle database connection closed'));
  const db = drizzle(pool, { schema }) as unknown as Database;
  return { db, close: () => pool.end() };
}
