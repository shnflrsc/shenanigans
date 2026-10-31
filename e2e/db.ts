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

/**
 * Temporarily changes which content is public. Tests run one at a time (workers: 1), so they can
 * unpublish things, assert an empty or launch state, and put it back.
 */
export async function snapshotPublished() {
	const posts = await sql<{ id: string }>(`select id from posts where status = 'published'`);
	const projects = await sql<{ id: string }>(`select id from projects where status = 'published'`);
	const featured = await sql<{ id: string }>(`select id from projects where featured`);
	return async () => {
		await sql(`update posts set status = 'draft'`);
		await sql(`update projects set status = 'draft', featured = false`);
		if (posts.length)
			await sql(
				`update posts set status = 'published' where id in (${posts.map((r) => `'${r.id}'`).join(',')})`
			);
		if (projects.length)
			await sql(
				`update projects set status = 'published' where id in (${projects.map((r) => `'${r.id}'`).join(',')})`
			);
		if (featured.length)
			await sql(`update projects set featured = true where id = '${featured[0].id}'`);
	};
}
