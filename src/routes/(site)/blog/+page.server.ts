import { z } from 'zod';
import { readTimeMinutes } from '#lib/markdown/render.js';
import { content } from '#lib/server/content/index.js';
import type { PageServerLoad } from './$types';

/** Posts per page (D4). */
const PAGE_SIZE = 10;

const query = z.object({
	tag: z
		.string()
		.regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
		.optional(),
	page: z.coerce.number().int().min(1).max(10_000).optional()
});

export const load: PageServerLoad = async ({ url }) => {
	const parsed = query.safeParse({
		tag: url.searchParams.get('tag') ?? undefined,
		page: url.searchParams.get('page') ?? undefined
	});
	const requested = parsed.success ? parsed.data : {};

	const tags = await content.postTagCounts();
	const tag = requested.tag && tags.some((t) => t.slug === requested.tag) ? requested.tag : null;

	const first = await content.listPublishedPosts({ tag: tag ?? undefined, limit: PAGE_SIZE });
	const pages = Math.max(1, Math.ceil(first.total / PAGE_SIZE));
	const page = Math.min(requested.page ?? 1, pages);
	const { posts, total } =
		page === 1
			? first
			: await content.listPublishedPosts({
					tag: tag ?? undefined,
					limit: PAGE_SIZE,
					offset: (page - 1) * PAGE_SIZE
				});

	const all = tag ? await content.countPublished() : { posts: total };
	return {
		tags,
		tag,
		page,
		pages,
		total,
		totalAll: all.posts,
		posts: posts.map(({ body, ...post }) => ({ ...post, readTime: readTimeMinutes(body) }))
	};
};
