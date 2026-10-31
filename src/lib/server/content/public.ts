import { and, asc, desc, eq, gt, inArray, lt, sql } from 'drizzle-orm';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import type { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';
import * as s from '../db/schema';

/** Any Drizzle database or transaction over the postgres driver. */
export type Db = PgDatabase<PostgresJsQueryResultHKT, typeof s>;

export type TagRef = { slug: string; name: string };
export type TagCount = TagRef & { count: number };
export type Project = typeof s.projects.$inferSelect & { tags: TagRef[] };
export type Post = typeof s.posts.$inferSelect & { tags: TagRef[] };

const published = 'published' as const;

async function tagsForProjects(db: Db, ids: string[]) {
	const map = new Map<string, TagRef[]>();
	if (ids.length === 0) return map;
	const rows = await db
		.select({ id: s.projectTags.projectId, slug: s.tags.slug, name: s.tags.name })
		.from(s.projectTags)
		.innerJoin(s.tags, eq(s.tags.id, s.projectTags.tagId))
		.where(inArray(s.projectTags.projectId, ids))
		.orderBy(asc(s.tags.name));
	for (const r of rows) map.set(r.id, [...(map.get(r.id) ?? []), { slug: r.slug, name: r.name }]);
	return map;
}

async function tagsForPosts(db: Db, ids: string[]) {
	const map = new Map<string, TagRef[]>();
	if (ids.length === 0) return map;
	const rows = await db
		.select({ id: s.postTags.postId, slug: s.tags.slug, name: s.tags.name })
		.from(s.postTags)
		.innerJoin(s.tags, eq(s.tags.id, s.postTags.tagId))
		.where(inArray(s.postTags.postId, ids))
		.orderBy(asc(s.tags.name));
	for (const r of rows) map.set(r.id, [...(map.get(r.id) ?? []), { slug: r.slug, name: r.name }]);
	return map;
}

async function withProjectTags(
	db: Db,
	rows: (typeof s.projects.$inferSelect)[]
): Promise<Project[]> {
	const tags = await tagsForProjects(
		db,
		rows.map((r) => r.id)
	);
	return rows.map((r) => ({ ...r, tags: tags.get(r.id) ?? [] }));
}

async function withPostTags(db: Db, rows: (typeof s.posts.$inferSelect)[]): Promise<Post[]> {
	const tags = await tagsForPosts(
		db,
		rows.map((r) => r.id)
	);
	return rows.map((r) => ({ ...r, tags: tags.get(r.id) ?? [] }));
}

/** Published projects in showcase order (FR-17), optionally filtered by tag slug. */
export async function listPublishedProjects(db: Db, opts: { tag?: string } = {}) {
	const rows = await db
		.select()
		.from(s.projects)
		.where(
			and(
				eq(s.projects.status, published),
				opts.tag
					? inArray(
							s.projects.id,
							db
								.select({ id: s.projectTags.projectId })
								.from(s.projectTags)
								.innerJoin(s.tags, eq(s.tags.id, s.projectTags.tagId))
								.where(eq(s.tags.slug, opts.tag))
						)
					: undefined
			)
		)
		.orderBy(asc(s.projects.sortOrder), asc(s.projects.title));
	return withProjectTags(db, rows);
}

/** The one featured published project, if any (FR-24). */
export async function getFeaturedProject(db: Db) {
	const [row] = await db
		.select()
		.from(s.projects)
		.where(and(eq(s.projects.status, published), eq(s.projects.featured, true)))
		.limit(1);
	return row ? (await withProjectTags(db, [row]))[0] : null;
}

/** A published project by slug with previous and next in showcase order (FR-27). */
export async function getPublishedProject(db: Db, slug: string) {
	const all = await db
		.select()
		.from(s.projects)
		.where(eq(s.projects.status, published))
		.orderBy(asc(s.projects.sortOrder), asc(s.projects.title));
	const index = all.findIndex((p) => p.slug === slug);
	if (index === -1) return null;
	const [project] = await withProjectTags(db, [all[index]]);
	const pick = (p?: typeof s.projects.$inferSelect) =>
		p ? { slug: p.slug, title: p.title } : null;
	return { project, previous: pick(all[index - 1]), next: pick(all[index + 1]) };
}

/** Published posts, newest first (FR-3), optionally filtered by tag slug, with a total for pagination. */
export async function listPublishedPosts(
	db: Db,
	opts: { tag?: string; limit?: number; offset?: number } = {}
) {
	const where = and(
		eq(s.posts.status, published),
		opts.tag
			? inArray(
					s.posts.id,
					db
						.select({ id: s.postTags.postId })
						.from(s.postTags)
						.innerJoin(s.tags, eq(s.tags.id, s.postTags.tagId))
						.where(eq(s.tags.slug, opts.tag))
				)
			: undefined
	);
	const [{ total }] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(s.posts)
		.where(where);
	let query = db
		.select()
		.from(s.posts)
		.where(where)
		.orderBy(desc(s.posts.publishedAt), asc(s.posts.id))
		.$dynamic();
	if (opts.limit !== undefined) query = query.limit(opts.limit).offset(opts.offset ?? 0);
	return { posts: await withPostTags(db, await query), total };
}

/** A published post by slug with its linked published project and neighbours (FR-28). */
export async function getPublishedPost(db: Db, slug: string) {
	const [row] = await db
		.select()
		.from(s.posts)
		.where(and(eq(s.posts.slug, slug), eq(s.posts.status, published)));
	if (!row || !row.publishedAt) return null;
	const at = row.publishedAt;
	const [post] = await withPostTags(db, [row]);

	const neighbour = async (older: boolean) => {
		const [n] = await db
			.select({ slug: s.posts.slug, title: s.posts.title })
			.from(s.posts)
			.where(
				and(
					eq(s.posts.status, published),
					older ? lt(s.posts.publishedAt, at) : gt(s.posts.publishedAt, at)
				)
			)
			.orderBy(older ? desc(s.posts.publishedAt) : asc(s.posts.publishedAt))
			.limit(1);
		return n ?? null;
	};

	let project: Project | null = null;
	if (row.projectId) {
		const [p] = await db
			.select()
			.from(s.projects)
			.where(and(eq(s.projects.id, row.projectId), eq(s.projects.status, published)));
		if (p) project = (await withProjectTags(db, [p]))[0];
	}
	return { post, project, older: await neighbour(true), newer: await neighbour(false) };
}

/** Tags used by published projects, with counts (projects page chips). */
export async function projectTagCounts(db: Db): Promise<TagCount[]> {
	return db
		.select({ slug: s.tags.slug, name: s.tags.name, count: sql<number>`count(*)::int` })
		.from(s.projectTags)
		.innerJoin(s.tags, eq(s.tags.id, s.projectTags.tagId))
		.innerJoin(s.projects, eq(s.projects.id, s.projectTags.projectId))
		.where(eq(s.projects.status, published))
		.groupBy(s.tags.id)
		.orderBy(asc(s.tags.name));
}

/** Tags used by published posts, with counts (blog chips). */
export async function postTagCounts(db: Db): Promise<TagCount[]> {
	return db
		.select({ slug: s.tags.slug, name: s.tags.name, count: sql<number>`count(*)::int` })
		.from(s.postTags)
		.innerJoin(s.tags, eq(s.tags.id, s.postTags.tagId))
		.innerJoin(s.posts, eq(s.posts.id, s.postTags.postId))
		.where(eq(s.posts.status, published))
		.groupBy(s.tags.id)
		.orderBy(asc(s.tags.name));
}

/** Slugs and dates of everything public, for the sitemap (FR-31). */
export async function listPublishedEntries(db: Db) {
	const [projects, posts] = await Promise.all([
		db
			.select({ slug: s.projects.slug, updatedAt: s.projects.updatedAt })
			.from(s.projects)
			.where(eq(s.projects.status, published)),
		db
			.select({ slug: s.posts.slug, updatedAt: s.posts.updatedAt })
			.from(s.posts)
			.where(eq(s.posts.status, published))
	]);
	return { projects, posts };
}
