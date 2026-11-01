import { isrFiltered } from '#lib/server/isr.js';
import { z } from 'zod';
import { content } from '#lib/server/content/index.js';
import type { PageServerLoad } from './$types';

const query = z.object({
	tag: z
		.string()
		.regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
		.optional()
});

export const load: PageServerLoad = async ({ url }) => {
	// A malformed filter is ignored rather than failing the page (SR-7).
	const parsed = query.safeParse({ tag: url.searchParams.get('tag') ?? undefined });
	const tag = parsed.success ? (parsed.data.tag ?? null) : null;

	const [all, tags] = await Promise.all([
		content.listPublishedProjects(),
		content.projectTagCounts()
	]);
	const known = tag !== null && tags.some((t) => t.slug === tag);
	const projects = known ? all.filter((p) => p.tags.some((t) => t.slug === tag)) : all;
	return { projects, tags, total: all.length, tag: known ? tag : null };
};

export const config = isrFiltered;
