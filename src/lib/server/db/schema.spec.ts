import { describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import * as s from './schema';
import { withRollback } from './test-utils';

const project = (slug: string, extra: Partial<typeof s.projects.$inferInsert> = {}) => ({
	slug,
	title: slug,
	summary: 'A project',
	...extra
});

describe('schema constraints', () => {
	it('rejects malformed slugs', async () => {
		await withRollback(async (tx) => {
			await expect(tx.insert(s.projects).values(project('Not A Slug'))).rejects.toThrow();
		});
	});

	it('requires alt text when a cover image is set', async () => {
		await withRollback(async (tx) => {
			await expect(
				tx.insert(s.projects).values(project('has-cover', { coverImage: 'covers/a.jpg' }))
			).rejects.toThrow();
		});
	});

	it('allows at most one featured project', async () => {
		await withRollback(async (tx) => {
			await tx.insert(s.projects).values(project('first', { featured: true }));
			await tx.execute(sql`savepoint dup`);
			await expect(
				tx.insert(s.projects).values(project('second', { featured: true }))
			).rejects.toThrow();
		});
	});

	it('treats tag names case-insensitively', async () => {
		await withRollback(async (tx) => {
			await tx.insert(s.tags).values({ slug: 'svelte', name: 'Svelte' });
			await expect(
				tx.insert(s.tags).values({ slug: 'svelte-2', name: 'svelte' })
			).rejects.toThrow();
		});
	});

	it('empties posts.project_id when the project is deleted', async () => {
		await withRollback(async (tx) => {
			const [p] = await tx.insert(s.projects).values(project('proj')).returning();
			const [post] = await tx
				.insert(s.posts)
				.values({ slug: 'post', title: 'Post', excerpt: 'x', projectId: p.id })
				.returning();
			await tx.delete(s.projects).where(eq(s.projects.id, p.id));
			const [after] = await tx.select().from(s.posts).where(eq(s.posts.id, post.id));
			expect(after.projectId).toBeNull();
		});
	});

	it('removes link rows with their content and keeps content when a tag is deleted', async () => {
		await withRollback(async (tx) => {
			const [tag] = await tx.insert(s.tags).values({ slug: 't', name: 'T' }).returning();
			const [post] = await tx
				.insert(s.posts)
				.values({ slug: 'p', title: 'P', excerpt: 'x' })
				.returning();
			await tx.insert(s.postTags).values({ postId: post.id, tagId: tag.id });
			await expect(
				tx.insert(s.postTags).values({ postId: post.id, tagId: tag.id })
			).rejects.toThrow();
		});
		await withRollback(async (tx) => {
			const [tag] = await tx.insert(s.tags).values({ slug: 't', name: 'T' }).returning();
			const [post] = await tx
				.insert(s.posts)
				.values({ slug: 'p', title: 'P', excerpt: 'x' })
				.returning();
			await tx.insert(s.postTags).values({ postId: post.id, tagId: tag.id });
			await tx.delete(s.tags).where(eq(s.tags.id, tag.id));
			expect(await tx.select().from(s.postTags)).toHaveLength(0);
			expect(await tx.select().from(s.posts).where(eq(s.posts.id, post.id))).toHaveLength(1);
			await tx.delete(s.posts).where(eq(s.posts.id, post.id));
		});
	});
});
