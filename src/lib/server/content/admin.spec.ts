import { afterAll, describe, expect, it } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, like } from 'drizzle-orm';
import postgres from 'postgres';
import * as s from '../db/schema';
import { withRollback } from '../db/test-utils';
import {
	AdminError,
	createPost,
	createProject,
	createTag,
	deletePost,
	deleteTag,
	listProjects,
	moveProject,
	renameTag,
	setFeatured,
	setPostStatus,
	setProjectStatus,
	updatePost,
	updateProject,
	getPost
} from './admin';
import { postInput, projectInput, slugify } from './validation';

const post = (slug: string, extra: Record<string, unknown> = {}) =>
	postInput.parse({ title: slug, slug, excerpt: 'x', ...extra });
const project = (slug: string, extra: Record<string, unknown> = {}) =>
	projectInput.parse({ title: slug, slug, summary: 's', ...extra });

describe('slugify', () => {
	it.each([
		['Hello, World!', 'hello-world'],
		['  Café & Crème  ', 'cafe-and-creme'],
		['Svelte 5: runes', 'svelte-5-runes'],
		['---', '']
	])('%s -> %s', (input, expected) => expect(slugify(input)).toBe(expected));
});

describe('validation', () => {
	it('requires alt text when a cover is set', () => {
		const result = postInput.safeParse({
			title: 't',
			slug: 't',
			excerpt: 'x',
			coverImage: 'covers/a.jpg',
			coverAlt: ' '
		});
		expect(result.success).toBe(false);
		expect(result.error?.issues[0].path).toEqual(['coverAlt']);
	});

	it('rejects unsafe cover paths and bad slugs', () => {
		for (const coverImage of [
			'../etc/passwd',
			'a/../b.jpg',
			'/abs.jpg',
			'https://evil.example/x.jpg'
		]) {
			expect(
				postInput.safeParse({ title: 't', slug: 't', excerpt: 'x', coverImage, coverAlt: 'a' })
					.success
			).toBe(false);
		}
		expect(postInput.safeParse({ title: 't', slug: 'Not A Slug', excerpt: 'x' }).success).toBe(
			false
		);
	});

	it('turns empty form values into nulls and accepts only http(s) links', () => {
		const parsed = projectInput.parse({
			title: 't',
			slug: 't',
			summary: 's',
			year: '',
			role: '',
			liveUrl: ''
		});
		expect(parsed).toMatchObject({ year: null, role: null, liveUrl: null, body: null });
		expect(
			projectInput.safeParse({
				title: 't',
				slug: 't',
				summary: 's',
				liveUrl: 'javascript:alert(1)'
			}).success
		).toBe(false);
	});
});

describe('slug locking (FR-19)', () => {
	it('lets a draft post change its slug and locks it after the first publish', async () => {
		await withRollback(async (tx) => {
			const id = await createPost(tx, post('first'));
			await updatePost(tx, id, post('renamed'));
			expect((await getPost(tx, id))?.slug).toBe('renamed');

			await setPostStatus(tx, id, 'published');
			await expect(updatePost(tx, id, post('changed'))).rejects.toMatchObject({
				code: 'slug_locked'
			});
			// Same slug is fine and everything else still saves.
			await updatePost(tx, id, post('renamed', { title: 'New title' }));
			expect((await getPost(tx, id))?.title).toBe('New title');
		});
	});

	it('keeps the slug locked after unpublishing, and keeps the original publish date', async () => {
		await withRollback(async (tx) => {
			const id = await createPost(tx, post('a'));
			await setPostStatus(tx, id, 'published');
			const first = (await getPost(tx, id))!.publishedAt!;
			await setPostStatus(tx, id, 'draft');
			await setPostStatus(tx, id, 'published');
			expect((await getPost(tx, id))!.publishedAt).toEqual(first);
			await expect(updatePost(tx, id, post('b'))).rejects.toMatchObject({ code: 'slug_locked' });
		});
	});

	it('locks a project slug after its first publish, even if it is a draft again', async () => {
		await withRollback(async (tx) => {
			const id = await createProject(tx, project('p'));
			await updateProject(tx, id, project('p2'));
			await setProjectStatus(tx, id, 'published');
			await setProjectStatus(tx, id, 'draft');
			await expect(updateProject(tx, id, project('p3'))).rejects.toMatchObject({
				code: 'slug_locked'
			});
		});
	});

	it('reports a taken slug', async () => {
		await withRollback(async (tx) => {
			await createPost(tx, post('same'));
			await expect(createPost(tx, post('same'))).rejects.toMatchObject({ code: 'slug_taken' });
		});
	});
});

describe('projects admin', () => {
	it('featuring a second project un-features the first', async () => {
		await withRollback(async (tx) => {
			const a = await createProject(tx, project('a'));
			const b = await createProject(tx, project('b'));
			expect((await setFeatured(tx, a, true)).previous).toBeNull();
			const swap = await setFeatured(tx, b, true);
			expect(swap.previous?.title).toBe('a');
			const rows = await listProjects(tx);
			expect(rows.filter((r) => r.featured).map((r) => r.slug)).toEqual(['b']);
			await setFeatured(tx, b, false);
			expect((await listProjects(tx)).some((r) => r.featured)).toBe(false);
		});
	});

	it('appends new projects to the end and reorders with move up and down', async () => {
		await withRollback(async (tx) => {
			const [a, b, c] = [
				await createProject(tx, project('a')),
				await createProject(tx, project('b')),
				await createProject(tx, project('c'))
			];
			const order = async () => (await listProjects(tx)).map((r) => r.slug);
			expect(await order()).toEqual(['a', 'b', 'c']);
			await moveProject(tx, c, 'up');
			expect(await order()).toEqual(['a', 'c', 'b']);
			await moveProject(tx, a, 'down');
			expect(await order()).toEqual(['c', 'a', 'b']);
			// The first cannot go up and the last cannot go down.
			await moveProject(tx, c, 'up');
			await moveProject(tx, b, 'down');
			expect(await order()).toEqual(['c', 'a', 'b']);
			expect(a).toBeTruthy();
			expect(b).toBeTruthy();
		});
	});
});

describe('projects admin under concurrent requests', () => {
	const url = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
	const client = postgres(url, { max: 10, onnotice: () => {} });
	const db = drizzle(client, { schema: s });
	const prefix = `conc-${Date.now()}`;

	afterAll(async () => {
		await db.delete(s.projects).where(like(s.projects.slug, `${prefix}%`));
		await client.end();
	});

	it('leaves at most one featured project when many toggles race', async () => {
		const ids = await Promise.all(
			Array.from({ length: 6 }, (_, i) => createProject(db, project(`${prefix}-${i}`)))
		);
		const before = await db
			.select({ id: s.projects.id })
			.from(s.projects)
			.where(eq(s.projects.featured, true));
		await Promise.all(ids.map((id) => setFeatured(db, id, true)));
		const featured = await db
			.select({ slug: s.projects.slug })
			.from(s.projects)
			.where(eq(s.projects.featured, true));
		expect(featured).toHaveLength(1);
		expect(featured[0].slug).toMatch(new RegExp(`^${prefix}`));
		await db
			.update(s.projects)
			.set({ featured: false })
			.where(like(s.projects.slug, `${prefix}%`));
		// Put back the development fixture that the swaps above un-featured.
		if (before[0])
			await db.update(s.projects).set({ featured: true }).where(eq(s.projects.id, before[0].id));
	});

	it('keeps sort order a clean sequence when moves race', async () => {
		const ids = (
			await db
				.select({ id: s.projects.id })
				.from(s.projects)
				.where(like(s.projects.slug, `${prefix}%`))
		).map((r) => r.id);
		await Promise.all(ids.map((id, i) => moveProject(db, id, i % 2 ? 'up' : 'down')));
		const orders = (await db.select({ n: s.projects.sortOrder }).from(s.projects))
			.map((r) => r.n)
			.sort((a, b) => a - b);
		expect(orders).toEqual(orders.map((_, i) => i));
	});
});

describe('tags admin', () => {
	it('never creates near-duplicates: an existing name in any letter case is reused', async () => {
		await withRollback(async (tx) => {
			const first = await createTag(tx, 'Svelte');
			expect(first.created).toBe(true);
			const again = await createTag(tx, 'svelte');
			expect(again.created).toBe(false);
			expect(again.tag.id).toBe(first.tag.id);
			expect(first.tag.slug).toBe('svelte');
		});
	});

	it('renames with a fresh slug and refuses a clash', async () => {
		await withRollback(async (tx) => {
			const a = await createTag(tx, 'Alpha');
			await createTag(tx, 'Beta');
			const renamed = await renameTag(tx, a.tag.id, 'Alpha Two');
			expect(renamed.slug).toBe('alpha-two');
			await expect(renameTag(tx, a.tag.id, 'beta')).rejects.toBeInstanceOf(AdminError);
		});
	});

	it('deleting a tag removes only its links and reports the counts', async () => {
		await withRollback(async (tx) => {
			const { tag } = await createTag(tx, 'Gone');
			const postId = await createPost(tx, post('p', { tagIds: [tag.id] }));
			const projectId = await createProject(tx, project('q', { tagIds: [tag.id] }));
			const counts = await deleteTag(tx, tag.id);
			expect(counts).toMatchObject({ posts: 1, projects: 1 });
			expect(await getPost(tx, postId)).toMatchObject({ tagIds: [] });
			expect(await listProjects(tx)).toHaveLength(1);
			expect(projectId).toBeTruthy();
		});
	});

	it('syncs a post to the chosen tags', async () => {
		await withRollback(async (tx) => {
			const a = (await createTag(tx, 'A')).tag;
			const b = (await createTag(tx, 'B')).tag;
			const id = await createPost(tx, post('p', { tagIds: [a.id] }));
			await updatePost(tx, id, post('p', { tagIds: [b.id] }));
			expect((await getPost(tx, id))!.tagIds).toEqual([b.id]);
		});
	});
});

describe('deleting content', () => {
	it('removes the post and its links but returns the cover path for cleanup', async () => {
		await withRollback(async (tx) => {
			const { tag } = await createTag(tx, 'T');
			const id = await createPost(
				tx,
				post('p', { tagIds: [tag.id], coverImage: 'covers/x.jpg', coverAlt: 'alt' })
			);
			const removed = await deletePost(tx, id);
			expect(removed.coverImage).toBe('covers/x.jpg');
			expect(await getPost(tx, id)).toBeNull();
			await expect(deletePost(tx, id)).rejects.toMatchObject({ code: 'not_found' });
		});
	});
});
