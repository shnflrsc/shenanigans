import { sql } from 'drizzle-orm';
import {
	boolean,
	check,
	index,
	integer,
	pgEnum,
	pgPolicy,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';
import { anonRole, authenticatedRole } from 'drizzle-orm/supabase';

export const contentStatus = pgEnum('content_status', ['draft', 'published']);

const slugPattern = sql`'^[a-z0-9]+(-[a-z0-9]+)*$'`;
const timestamps = {
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
};

/**
 * Row Level Security (SR-4). Drizzle connects as a privileged role and bypasses RLS, so the server
 * checks in hooks.server.ts stay the primary control. These policies protect Supabase's public API.
 * `public.is_admin()` is defined in the migration: it checks the caller's GitHub identity against admin_allowlist.
 */
const isAdmin = sql`public.is_admin()`;
const publicReads = (table: string, published: ReturnType<typeof sql>) =>
	pgPolicy(`${table}_public_read`, {
		for: 'select',
		to: [anonRole, authenticatedRole],
		using: published
	});
const adminAll = (table: string) =>
	pgPolicy(`${table}_admin_all`, {
		for: 'all',
		to: authenticatedRole,
		using: isAdmin,
		withCheck: isAdmin
	});

export const projects = pgTable(
	'projects',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		slug: text('slug').notNull().unique(),
		title: text('title').notNull(),
		summary: text('summary').notNull(),
		body: text('body'),
		coverImage: text('cover_image'),
		coverAlt: text('cover_alt'),
		liveUrl: text('live_url'),
		repoUrl: text('repo_url'),
		year: integer('year'),
		role: text('role'),
		team: text('team'),
		featured: boolean('featured').notNull().default(false),
		sortOrder: integer('sort_order').notNull().default(0),
		status: contentStatus('status').notNull().default('draft'),
		...timestamps
	},
	(t) => [
		check('projects_slug_format', sql`${t.slug} ~ ${slugPattern}`),
		check(
			'projects_cover_alt_required',
			sql`${t.coverImage} is null or (${t.coverAlt} is not null and length(trim(${t.coverAlt})) > 0)`
		),
		// At most one featured project (FR-16).
		uniqueIndex('projects_one_featured')
			.on(t.featured)
			.where(sql`${t.featured}`),
		index('projects_status_order_idx').on(t.status, t.sortOrder),
		publicReads('projects', sql`${t.status} = 'published'`),
		adminAll('projects')
	]
).enableRLS();

export const posts = pgTable(
	'posts',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		slug: text('slug').notNull().unique(),
		title: text('title').notNull(),
		excerpt: text('excerpt').notNull(),
		body: text('body').notNull().default(''),
		coverImage: text('cover_image'),
		coverAlt: text('cover_alt'),
		status: contentStatus('status').notNull().default('draft'),
		publishedAt: timestamp('published_at', { withTimezone: true }),
		// The project this post is about; empty if that project is deleted (FR-28, FR-33).
		projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
		...timestamps
	},
	(t) => [
		check('posts_slug_format', sql`${t.slug} ~ ${slugPattern}`),
		check(
			'posts_cover_alt_required',
			sql`${t.coverImage} is null or (${t.coverAlt} is not null and length(trim(${t.coverAlt})) > 0)`
		),
		index('posts_status_published_idx').on(t.status, t.publishedAt),
		publicReads('posts', sql`${t.status} = 'published'`),
		adminAll('posts')
	]
).enableRLS();

export const tags = pgTable(
	'tags',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		slug: text('slug').notNull().unique(),
		name: text('name').notNull()
	},
	(t) => [
		check('tags_slug_format', sql`${t.slug} ~ ${slugPattern}`),
		// Case-insensitive name uniqueness prevents "svelte" and "Svelte".
		uniqueIndex('tags_name_lower_idx').on(sql`lower(${t.name})`),
		// Public sees only tags used by published content.
		publicReads(
			'tags',
			sql`exists (select 1 from post_tags pt join posts p on p.id = pt.post_id where pt.tag_id = ${t.id} and p.status = 'published') or exists (select 1 from project_tags pt join projects p on p.id = pt.project_id where pt.tag_id = ${t.id} and p.status = 'published')`
		),
		adminAll('tags')
	]
).enableRLS();

export const postTags = pgTable(
	'post_tags',
	{
		postId: uuid('post_id')
			.notNull()
			.references(() => posts.id, { onDelete: 'cascade' }),
		tagId: uuid('tag_id')
			.notNull()
			.references(() => tags.id, { onDelete: 'cascade' })
	},
	(t) => [
		primaryKey({ columns: [t.postId, t.tagId] }),
		index('post_tags_tag_idx').on(t.tagId),
		publicReads(
			'post_tags',
			sql`exists (select 1 from posts p where p.id = ${t.postId} and p.status = 'published')`
		),
		adminAll('post_tags')
	]
).enableRLS();

export const projectTags = pgTable(
	'project_tags',
	{
		projectId: uuid('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		tagId: uuid('tag_id')
			.notNull()
			.references(() => tags.id, { onDelete: 'cascade' })
	},
	(t) => [
		primaryKey({ columns: [t.projectId, t.tagId] }),
		index('project_tags_tag_idx').on(t.tagId),
		publicReads(
			'project_tags',
			sql`exists (select 1 from projects p where p.id = ${t.projectId} and p.status = 'published')`
		),
		adminAll('project_tags')
	]
).enableRLS();

/** Login-surface rate limiting (SR-14). RLS on with no policies: unreachable through Supabase's API. */
export const rateLimits = pgTable('rate_limits', {
	key: text('key').primaryKey(),
	count: integer('count').notNull().default(0),
	windowStart: timestamp('window_start', { withTimezone: true }).notNull().defaultNow(),
	blockedUntil: timestamp('blocked_until', { withTimezone: true })
}).enableRLS();

/** GitHub numeric ids allowed to write through Supabase's API. Filled by `bun run db:allow-admin`. No policies. */
export const adminAllowlist = pgTable('admin_allowlist', {
	githubId: text('github_id').primaryKey()
}).enableRLS();
