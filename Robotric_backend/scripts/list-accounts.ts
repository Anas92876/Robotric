/**
 * Lists every account in the database (name, email, role, status). Read-only;
 * passwords are never read.   npx tsx scripts/list-accounts.ts
 */
import 'dotenv/config';
import { asc } from 'drizzle-orm';
import { createDatabase } from '../src/shared/db/client';
import { users } from '../src/modules/users/users.table';

async function main(): Promise<void> {
  const { db, close } = createDatabase(process.env.DATABASE_URL!);
  try {
    const rows = await db
      .select({ name: users.name, email: users.email, role: users.role, profile: users.profile, createdAt: users.createdAt })
      .from(users)
      .orderBy(asc(users.role), asc(users.email));
    for (const r of rows) {
      const status = (r.profile as { status?: string } | null)?.status ?? '';
      console.log([r.role, r.email, r.name, status, r.createdAt.toISOString().slice(0, 10)].join('\t'));
    }
    console.error(`${rows.length} accounts`);
  } finally {
    await close();
  }
}
void main();
