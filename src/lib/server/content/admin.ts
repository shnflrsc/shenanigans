import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import * as s from '../db/schema';
import type { Db } from './public';
import { slugify, type PostInput, type ProjectInput } from './validation';

/** Business-rule failures the editor can show next to a field or as a banner. */
export class AdminError extends Error {
	constructor(
		readonly code: 'slug_locked' | 'slug_taken' | 'not_found' | 'tag_exists' | 'invalid',
		message: string,
		readonly field?: string
	) {
		super(message);
	}
}

/** Postgres unique violation, however the driver wraps it. */
const isUnique = (error: unknown) =>
	JSON.stringify({
		c: (error as { cause?: { code?: string } })?.cause?.code,
		d: (error as { code?: string })?.code
	}).includes('23505');

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

/** Serialises writers that reorder or swap featured flags, so concurrent requests cannot interleave. */
const lock = (tx: Tx, key: string) =>
	tx.execute(sql`select pg_advisory_xact_lock(hashtext(${key}))`);

// ---------------------------------------------------------------- posts

export type AdminPost = typeof s.posts.$inferSelect & { tagIds: string[] };

export async function listPosts(db: Db, status?: 'draft' | 'published') {
	return db
		.select()
		.from(s.posts)
		.where(status ? eq(s.posts.status, status) : undefined)
		.orderBy(desc(s.posts.updatedAt));
}

export async function getPost(db: Db, id: string): Promise<AdminPost | null> {
	const [post] = await db.select().from(s.posts).where(eq(s.posts.id, id));
	if (!post) return null;
	const links = await db
		.select({ tagId: s.postTags.tagId })
		.from(s.postTags)
		.where(eq(s.postTags.postId, id));
	return { ...post, tagIds: links.map((l) => l.tagId) };
}

async function syncPostTags(tx: Tx, postId: string, tagIds: string[]) {
	await tx.delete(s.postTags).where(eq(s.postTags.postId, postId));
	if (tagIds.length) await tx.insert(s.postTags).values(tagIds.map((tagId) => ({ postId, tagId })));
}

export async function createPost(db: Db, input: PostInput): Promise<string> {
	try {
		return await db.transaction(async (tx) => {
			const [row] = await tx
				.insert(s.posts)
				.values({
					slug: input.slug,
					title: input.title,
					excerpt: input.excerpt,
					body: input.body,
					coverImage: input.coverImage,
					coverAlt: input.coverAlt,
					projectId: input.projectId
				})
				.returning({ id: s.posts.id });
			await syncPostTags(tx, row.id, input.tagIds);
			return row.id;
		});
	} catch (error) {
		if (isUnique(error)) throw new AdminError('slug_taken', 'That slug is already used', 'slug');
		throw error;
	}
}

/** Saves a post. The slug cannot change once the post has been published (FR-19), whatever the form sends. */
export async function updatePost(db: Db, id: string, input: PostInput) {
	try {
		await db.transaction(async (tx) => {
			const [existing] = await tx.select().from(s.posts).where(eq(s.posts.id, id)).for('update');
			if (!existing) throw new AdminError('not_found', 'Post not found');
			if (existing.publishedAt && input.slug !== existing.slug) {
				throw new AdminError('slug_locked', 'The slug is locked after the first publish', 'slug');
			}
			await tx
				.update(s.posts)
				.set({
					title: input.title,
					excerpt: input.excerpt,
					body: input.body,
					coverImage: input.coverImage,
					coverAlt: input.coverAlt,
					projectId: input.projectId,
					updatedAt: new Date(),
					...(existing.publishedAt ? {} : { slug: input.slug })
				})
				.where(eq(s.posts.id, id));
			await syncPostTags(tx, id, input.tagIds);
		});
	} catch (error) {
		if (isUnique(error)) throw new AdminError('slug_taken', 'That slug is already used', 'slug');
		throw error;
	}
}

/** Publishes or unpublishes. The first publish sets published_at; unpublishing keeps it, so the slug stays locked. */
export async function setPostStatus(db: Db, id: string, status: 'draft' | 'published') {
	const [row] = await db
		.update(s.posts)
		.set({
			status,
			updatedAt: new Date(),
			...(status === 'published'
				? { publishedAt: sql`coalesce(${s.posts.publishedAt}, now())` }
				: {})
		})
		.where(eq(s.posts.id, id))
		.returning({ slug: s.posts.slug, coverImage: s.posts.coverImage });
	if (!row) throw new AdminError('not_found', 'Post not found');
	return row;
}

/** Deletes a post; its tag links go with it. Returns the cover path so the caller can clean up storage. */
export async function deletePost(db: Db, id: string) {
	const [row] = await db
		.delete(s.posts)
		.where(eq(s.posts.id, id))
		.returning({ slug: s.posts.slug, coverImage: s.posts.coverImage });
	if (!row) throw new AdminError('not_found', 'Post not found');
	return row;
}

// ------------------------------------------------------------- projects

export type AdminProject = typeof s.projects.$inferSelect & { tagIds: string[] };

export async function listProjects(db: Db, status?: 'draft' | 'published') {
	const rows = await db
		.select()
		.from(s.projects)
		.where(status ? eq(s.projects.status, status) : undefined)
		.orderBy(asc(s.projects.sortOrder), asc(s.projects.title));
	const links = rows.length
		? await db
				.select({ id: s.projectTags.projectId, name: s.tags.name, slug: s.tags.slug })
				.from(s.projectTags)
				.innerJoin(s.tags, eq(s.tags.id, s.projectTags.tagId))
				.where(
					inArray(
						s.projectTags.projectId,
						rows.map((r) => r.id)
					)
				)
				.orderBy(asc(s.tags.name))
		: [];
	return rows.map((r) => ({ ...r, tags: links.filter((l) => l.id === r.id) }));
}

export async function getProject(db: Db, id: string): Promise<AdminProject | null> {
	const [project] = await db.select().from(s.projects).where(eq(s.projects.id, id));
	if (!project) return null;
	const links = await db
		.select({ tagId: s.projectTags.tagId })
		.from(s.projectTags)
		.where(eq(s.projectTags.projectId, id));
	return { ...project, tagIds: links.map((l) => l.tagId) };
}

async function syncProjectTags(tx: Tx, projectId: string, tagIds: string[]) {
	await tx.delete(s.projectTags).where(eq(s.projectTags.projectId, projectId));
	if (tagIds.length)
		await tx.insert(s.projectTags).values(tagIds.map((tagId) => ({ projectId, tagId })));
}

export async function createProject(db: Db, input: ProjectInput): Promise<string> {
	try {
		return await db.transaction(async (tx) => {
			await lock(tx, 'projects-order');
			const [{ next }] = await tx
				.select({ next: sql<number>`coalesce(max(${s.projects.sortOrder}), -1) + 1` })
				.from(s.projects);
			const [row] = await tx
				.insert(s.projects)
				.values({
					slug: input.slug,
					title: input.title,
					summary: input.summary,
					body: input.body,
					year: input.year,
					role: input.role,
					team: input.team,
					liveUrl: input.liveUrl,
					repoUrl: input.repoUrl,
					coverImage: input.coverImage,
					coverAlt: input.coverAlt,
					sortOrder: next
				})
				.returning({ id: s.projects.id });
			await syncProjectTags(tx, row.id, input.tagIds);
			return row.id;
		});
	} catch (error) {
		if (isUnique(error)) throw new AdminError('slug_taken', 'That slug is already used', 'slug');
		throw error;
	}
}

export async function updateProject(db: Db, id: string, input: ProjectInput) {
	try {
		await db.transaction(async (tx) => {
			const [existing] = await tx
				.select()
				.from(s.projects)
				.where(eq(s.projects.id, id))
				.for('update');
			if (!existing) throw new AdminError('not_found', 'Project not found');
			if (existing.firstPublishedAt && input.slug !== existing.slug) {
				throw new AdminError('slug_locked', 'The slug is locked after the first publish', 'slug');
			}
			await tx
				.update(s.projects)
				.set({
					title: input.title,
					summary: input.summary,
					body: input.body,
					year: input.year,
					role: input.role,
					team: input.team,
					liveUrl: input.liveUrl,
					repoUrl: input.repoUrl,
					coverImage: input.coverImage,
					coverAlt: input.coverAlt,
					updatedAt: new Date(),
					...(existing.firstPublishedAt ? {} : { slug: input.slug })
				})
				.where(eq(s.projects.id, id));
			await syncProjectTags(tx, id, input.tagIds);
		});
	} catch (error) {
		if (isUnique(error)) throw new AdminError('slug_taken', 'That slug is already used', 'slug');
		throw error;
	}
}

export async function setProjectStatus(db: Db, id: string, status: 'draft' | 'published') {
	const [row] = await db
		.update(s.projects)
		.set({
			status,
			updatedAt: new Date(),
			...(status === 'published'
				? { firstPublishedAt: sql`coalesce(${s.projects.firstPublishedAt}, now())` }
				: {})
		})
		.where(eq(s.projects.id, id))
		.returning({ slug: s.projects.slug });
	if (!row) throw new AdminError('not_found', 'Project not found');
	return row;
}

export async function deleteProject(db: Db, id: string) {
	const [row] = await db
		.delete(s.projects)
		.where(eq(s.projects.id, id))
		.returning({ slug: s.projects.slug, coverImage: s.projects.coverImage });
	if (!row) throw new AdminError('not_found', 'Project not found');
	return row;
}

/**
 * Turns the featured flag on or off. Turning it on clears it on every other project first, in one
 * transaction, so at most one project is ever featured (FR-16). Returns the project that lost the flag.
 */
export async function setFeatured(db: Db, id: string, featured: boolean) {
	return db.transaction(async (tx) => {
		await lock(tx, 'projects-featured');
		const [target] = await tx.select().from(s.projects).where(eq(s.projects.id, id));
		if (!target) throw new AdminError('not_found', 'Project not found');
		let previous: { id: string; title: string } | null = null;
		if (featured) {
			const [other] = await tx
				.select({ id: s.projects.id, title: s.projects.title })
				.from(s.projects)
				.where(and(eq(s.projects.featured, true), ne(s.projects.id, id)));
			if (other) {
				await tx.update(s.projects).set({ featured: false }).where(eq(s.projects.id, other.id));
				previous = other;
			}
		}
		await tx
			.update(s.projects)
			.set({ featured, updatedAt: new Date() })
			.where(eq(s.projects.id, id));
		return { title: target.title, previous };
	});
}

/** Moves a project one step up or down in the showcase (FR-17) by renumbering the whole list. */
export async function moveProject(db: Db, id: string, direction: 'up' | 'down') {
	await db.transaction(async (tx) => {
		await lock(tx, 'projects-order');
		const rows = await tx
			.select({ id: s.projects.id })
			.from(s.projects)
			.orderBy(asc(s.projects.sortOrder), asc(s.projects.title), asc(s.projects.id));
		const index = rows.findIndex((r) => r.id === id);
		if (index === -1) throw new AdminError('not_found', 'Project not found');
		const target = direction === 'up' ? index - 1 : index + 1;
		if (target >= 0 && target < rows.length)
			[rows[index], rows[target]] = [rows[target], rows[index]];
		for (const [position, row] of rows.entries()) {
			await tx.update(s.projects).set({ sortOrder: position }).where(eq(s.projects.id, row.id));
		}
	});
}

// ----------------------------------------------------------------- tags

export async function listTags(db: Db) {
	return db
		.select({
			id: s.tags.id,
			slug: s.tags.slug,
			name: s.tags.name,
			posts: sql<number>`(select count(*)::int from post_tags pt where pt.tag_id = ${s.tags.id})`,
			projects: sql<number>`(select count(*)::int from project_tags pt where pt.tag_id = ${s.tags.id})`
		})
		.from(s.tags)
		.orderBy(asc(s.tags.name));
}

/** Creates a tag, or returns the existing one if the name already exists in any letter case (no near-duplicates). */
export async function createTag(db: Db, name: string) {
	const slug = slugify(name);
	if (!slug) throw new AdminError('invalid', 'Use letters or numbers in the name', 'name');
	const [existing] = await db
		.select()
		.from(s.tags)
		.where(sql`lower(${s.tags.name}) = lower(${name}) or ${s.tags.slug} = ${slug}`);
	if (existing) return { tag: existing, created: false };
	const [tag] = await db.insert(s.tags).values({ name, slug }).returning();
	return { tag, created: true };
}

export async function renameTag(db: Db, id: string, name: string) {
	const slug = slugify(name);
	if (!slug) throw new AdminError('invalid', 'Use letters or numbers in the name', 'name');
	try {
		const [row] = await db.update(s.tags).set({ name, slug }).where(eq(s.tags.id, id)).returning();
		if (!row) throw new AdminError('not_found', 'Tag not found');
		return row;
	} catch (error) {
		if (isUnique(error))
			throw new AdminError('tag_exists', 'A tag with that name already exists', 'name');
		throw error;
	}
}

/** Deletes a tag and its links, never the posts or projects. Returns how many each had. */
export async function deleteTag(db: Db, id: string) {
	const [counts] = (await listTags(db)).filter((t) => t.id === id);
	if (!counts) throw new AdminError('not_found', 'Tag not found');
	await db.delete(s.tags).where(eq(s.tags.id, id));
	return counts;
}

/** Counts for the admin sidebar. */
export async function adminCounts(db: Db) {
	const [[posts], [projects], [tags]] = await Promise.all([
		db.select({ n: sql<number>`count(*)::int` }).from(s.posts),
		db.select({ n: sql<number>`count(*)::int` }).from(s.projects),
		db.select({ n: sql<number>`count(*)::int` }).from(s.tags)
	]);
	return { posts: posts.n, projects: projects.n, tags: tags.n };
}
