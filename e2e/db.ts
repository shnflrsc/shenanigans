import postgres from 'postgres';

const url = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

/** Test-only database access for e2e setup. Needs the local Supabase stack. */
export async function sql<T extends object = object>(query: string): Promise<T[]> {
	const client = postgres(url, { max: 1, onnotice: () => {} });
	try {
		return (await client.unsafe(query)) as unknown as T[];
	} finally {
		await client.end();
	}
}

/** Every browser in a test run shares one IP, so tests that touch /admin start from empty counters. */
export const resetRateLimits = () => sql('delete from rate_limits');
