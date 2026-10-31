/** Adds ADMIN_GITHUB_ID to admin_allowlist so RLS lets that GitHub identity write through Supabase's API. */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { adminAllowlist } from '../src/lib/server/db/schema';

const url = process.env.DATABASE_URL;
const id = process.env.ADMIN_GITHUB_ID;
if (!url || !id || !/^\d+$/.test(id))
	throw new Error('Set DATABASE_URL and a numeric ADMIN_GITHUB_ID');

const client = postgres(url, { max: 1 });
await drizzle(client).insert(adminAllowlist).values({ githubId: id }).onConflictDoNothing();
await client.end();
console.log(`Allowed GitHub id ${id}`);
