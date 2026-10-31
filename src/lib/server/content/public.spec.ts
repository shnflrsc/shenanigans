import { describe, expect, it } from 'vitest';
import * as s from '../db/schema';
import { withRollback } from '../db/test-utils';
import {
	getFeaturedProject,
	getPublishedPost,
	getPublishedProject,
	listPublishedPosts,
	listPublishedProjects,
	postTagCounts,
	projectTagCounts
} from './public';

const at = (day: number) => new Date(Date.UTC(2026, 0, day));

describe('public content queries', () => {
	it('never return drafts', async () => {
		await withRollback(async (tx) => {
			await tx.insert(s.posts).values([
				{ slug: 'live', title: 'Live', excerpt: 'x', status: 'published', publishedAt: at(1) },
				{ slug: 'hidden', title: 'Hidden', excerpt: 'x' }
			]);
			await tx.insert(s.projects).values([
				{ slug: 'live-p', title: 'Live', summary: 's', status: 'published' },
				{ slug: 'hidden-p', title: 'Hidden', summary: 's', featured: true }
			]);
			expect((await listPublishedPosts(tx)).posts.map((p) => p.slug)).toEqual(['live']);
			expect((await listPublishedProjects(tx)).map((p) => p.slug)).toEqual(['live-p']);
			expect(await getPublishedPost(tx, 'hidden')).toBeNull();
			expect(await getPublishedProject(tx, 'hidden-p')).toBeNull();
			// A featured draft is not "the featured project".
			expect(await getFeaturedProject(tx)).toBeNull();
		});
	});

	it('orders projects by showcase order and links previous and next in that order', async () => {
		await withRollback(async (tx) => {
			await tx.insert(s.projects).values([
				{ slug: 'c', title: 'C', summary: 's', status: 'published', sortOrder: 2 },
				{ slug: 'a', title: 'A', summary: 's', status: 'published', sortOrder: 0 },
				{ slug: 'b', title: 'B', summary: 's', status: 'published', sortOrder: 1 },
				{ slug: 'd', title: 'D', summary: 's', sortOrder: 1 }
			]);
			expect((await listPublishedProjects(tx)).map((p) => p.slug)).toEqual(['a', 'b', 'c']);
			const b = await getPublishedProject(tx, 'b');
			expect(b?.previous?.slug).toBe('a');
			expect(b?.next?.slug).toBe('c');
			expect((await getPublishedProject(tx, 'a'))?.previous).toBeNull();
			expect((await getPublishedProject(tx, 'c'))?.next).toBeNull();
		});
	});

	it('lists posts newest first and finds older and newer neighbours among published posts', async () => {
		await withRollback(async (tx) => {
			await tx.insert(s.posts).values([
				{ slug: 'old', title: 'Old', excerpt: 'x', status: 'published', publishedAt: at(1) },
				{ slug: 'mid', title: 'Mid', excerpt: 'x', status: 'published', publishedAt: at(5) },
				{ slug: 'new', title: 'New', excerpt: 'x', status: 'published', publishedAt: at(9) },
				{ slug: 'draft', title: 'Draft', excerpt: 'x', publishedAt: at(7) }
			]);
			expect((await listPublishedPosts(tx)).posts.map((p) => p.slug)).toEqual([
				'new',
				'mid',
				'old'
			]);
			const mid = await getPublishedPost(tx, 'mid');
			expect(mid?.older?.slug).toBe('old');
			expect(mid?.newer?.slug).toBe('new');
			const paged = await listPublishedPosts(tx, { limit: 2, offset: 2 });
			expect(paged.total).toBe(3);
			expect(paged.posts.map((p) => p.slug)).toEqual(['old']);
		});
	});

	it('shows the linked project only when it is published', async () => {
		await withRollback(async (tx) => {
			const [live, hidden] = await tx
				.insert(s.projects)
				.values([
					{ slug: 'live', title: 'Live', summary: 's', status: 'published' },
					{ slug: 'hidden', title: 'Hidden', summary: 's' }
				])
				.returning();
			await tx.insert(s.posts).values([
				{
					slug: 'p1',
					title: 'P1',
					excerpt: 'x',
					status: 'published',
					publishedAt: at(1),
					projectId: live.id
				},
				{
					slug: 'p2',
					title: 'P2',
					excerpt: 'x',
					status: 'published',
					publishedAt: at(2),
					projectId: hidden.id
				},
				{ slug: 'p3', title: 'P3', excerpt: 'x', status: 'published', publishedAt: at(3) }
			]);
			expect((await getPublishedPost(tx, 'p1'))?.project?.slug).toBe('live');
			expect((await getPublishedPost(tx, 'p2'))?.project).toBeNull();
			expect((await getPublishedPost(tx, 'p3'))?.project).toBeNull();
		});
	});

	it('counts tags only from published content and filters by tag', async () => {
		await withRollback(async (tx) => {
			const [svelte, rare] = await tx
				.insert(s.tags)
				.values([
					{ slug: 'svelte', name: 'Svelte' },
					{ slug: 'rare', name: 'Rare' }
				])
				.returning();
			const posts = await tx
				.insert(s.posts)
				.values([
					{ slug: 'a', title: 'A', excerpt: 'x', status: 'published', publishedAt: at(1) },
					{ slug: 'b', title: 'B', excerpt: 'x', status: 'published', publishedAt: at(2) },
					{ slug: 'c', title: 'C', excerpt: 'x' }
				])
				.returning();
			await tx.insert(s.postTags).values([
				{ postId: posts[0].id, tagId: svelte.id },
				{ postId: posts[1].id, tagId: svelte.id },
				{ postId: posts[2].id, tagId: svelte.id },
				{ postId: posts[2].id, tagId: rare.id }
			]);
			expect(await postTagCounts(tx)).toEqual([{ slug: 'svelte', name: 'Svelte', count: 2 }]);
			expect(await projectTagCounts(tx)).toEqual([]);
			const filtered = await listPublishedPosts(tx, { tag: 'svelte' });
			expect(filtered.posts.map((p) => p.slug).sort()).toEqual(['a', 'b']);
			expect(filtered.posts[0].tags.map((t) => t.slug)).toEqual(['svelte']);
			expect((await listPublishedPosts(tx, { tag: 'rare' })).posts).toEqual([]);
		});
	});
});
