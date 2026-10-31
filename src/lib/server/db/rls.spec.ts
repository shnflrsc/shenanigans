import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import * as s from './schema';
import { asRole, failure, withRollback, type TestTx } from './test-utils';

const ADMIN_USER = '00000000-0000-4000-8000-0000000000a1';
const OTHER_USER = '00000000-0000-4000-8000-0000000000b2';

async function seed(tx: TestTx) {
	const [tag] = await tx
		.insert(s.tags)
		.values([
			{ slug: 'used', name: 'Used' },
			{ slug: 'unused', name: 'Unused' },
			{ slug: 'draft-only', name: 'Draft only' }
		])
		.returning();
	const [pub] = await tx
		.insert(s.posts)
		.values({
			slug: 'pub',
			title: 'Pub',
			excerpt: 'x',
			status: 'published',
			publishedAt: new Date()
		})
		.returning();
	const [draft] = await tx
		.insert(s.posts)
		.values({ slug: 'draft', title: 'Draft', excerpt: 'x' })
		.returning();
	await tx.insert(s.projects).values([
		{ slug: 'pub-proj', title: 'P', summary: 's', status: 'published' },
		{ slug: 'draft-proj', title: 'D', summary: 's' }
	]);
	await tx.insert(s.postTags).values([{ postId: pub.id, tagId: tag.id }]);
	const [draftTag] = await tx
		.select()
		.from(s.tags)
		.where(sql`slug = 'draft-only'`);
	await tx.insert(s.postTags).values([{ postId: draft.id, tagId: draftTag.id }]);
}

async function createUser(tx: TestTx, id: string, githubId: string) {
	await tx.execute(
		sql`insert into auth.users (id, aud, role, email) values (${id}::uuid, 'authenticated', 'authenticated', ${id + '@example.test'})`
	);
	await tx.execute(
		sql`insert into auth.identities (id, user_id, provider, provider_id, identity_data, last_sign_in_at) values (gen_random_uuid(), ${id}::uuid, 'github', ${githubId}, '{}'::jsonb, now())`
	);
}

describe('row level security', () => {
	it('lets the public read only published rows and tags used by published content', async () => {
		await withRollback(async (tx) => {
			await seed(tx);
			await asRole(tx, 'anon', null, async () => {
				expect((await tx.select().from(s.posts)).map((r) => r.slug)).toEqual(['pub']);
				expect((await tx.select().from(s.projects)).map((r) => r.slug)).toEqual(['pub-proj']);
				expect((await tx.select().from(s.tags)).map((r) => r.slug)).toEqual(['used']);
				expect(await tx.select().from(s.postTags)).toHaveLength(1);
			});
		});
	});

	it('denies the public every write', async () => {
		await withRollback(async (tx) => {
			await asRole(tx, 'anon', null, async () => {
				expect(
					await failure(tx, () =>
						tx.insert(s.posts).values({ slug: 'x', title: 'x', excerpt: 'x' })
					)
				).toMatch(/row-level security|permission denied/);
			});
		});
	});

	it('hides rate_limits and admin_allowlist from the public API roles', async () => {
		for (const role of ['anon', 'authenticated'] as const) {
			await withRollback(async (tx) => {
				await asRole(tx, role, null, async () => {
					expect(await failure(tx, () => tx.select().from(s.rateLimits))).toMatch(
						/permission denied/
					);
				});
			});
			await withRollback(async (tx) => {
				await asRole(tx, role, null, async () => {
					expect(await failure(tx, () => tx.select().from(s.adminAllowlist))).toMatch(
						/permission denied/
					);
				});
			});
		}
	});

	it('lets only the allowlisted GitHub identity write', async () => {
		await withRollback(async (tx) => {
			await tx.insert(s.adminAllowlist).values({ githubId: '4242' });
			await createUser(tx, ADMIN_USER, '4242');
			await createUser(tx, OTHER_USER, '9999');

			await asRole(tx, 'authenticated', OTHER_USER, async () => {
				expect(
					await failure(tx, () =>
						tx.insert(s.posts).values({ slug: 'nope', title: 'n', excerpt: 'x' })
					)
				).toMatch(/row-level security/);
			});
		});
		await withRollback(async (tx) => {
			await tx.insert(s.adminAllowlist).values({ githubId: '4242' });
			await createUser(tx, ADMIN_USER, '4242');
			await asRole(tx, 'authenticated', ADMIN_USER, async () => {
				await tx.insert(s.posts).values({ slug: 'mine', title: 'm', excerpt: 'x' });
				// The admin also sees drafts.
				expect((await tx.select().from(s.posts)).map((r) => r.slug)).toContain('mine');
			});
		});
	});
});
